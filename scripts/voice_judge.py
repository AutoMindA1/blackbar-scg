#!/usr/bin/env python3
"""voice_judge.py — Layer 2c LLM Judge harness for /ultraplan voice-score.

Scores a fresh draft against VOICE.md and a reference golden on five rubric
dimensions drawn from the authored standard:

    §16  Recurring Analytical Attack Patterns   (coverage + quality, 1-5)
    §17  Peterson Playbook                      (if applicable, 1-5)
    §12  Code Citation Methodology              (sequence adherence, 1-5)
    §20  Voice Test                             (institutional vs. personal, 1-5)
    §18  Benchmark Match                        (does it read like the golden?, 1-5)

Writes a markdown scorecard to --out. Full scorecard (with quotes from the
draft) is privileged — lives under Cases/<id>/. The scorecard file itself is
what the caller passes, which is why --out is required.

Model: claude-sonnet-4-6 by default. Override via ANTHROPIC_MODEL.
Uses prompt caching on the static system prompt (VOICE.md + rubric instructions).

SCG IP. No case-specific facts baked in. Draft and golden paths are supplied
at invocation; their contents are privileged and stay inside Cases/.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

try:
    from anthropic import Anthropic
except ImportError:
    Anthropic = None  # handled at call time


MODEL_DEFAULT = "claude-sonnet-4-6"
RUBRIC_DIMENSIONS = [
    ("attack_patterns", "§16 Recurring Analytical Attack Patterns"),
    ("peterson_playbook", "§17 Peterson Playbook"),
    ("code_citation", "§12 Code Citation Methodology"),
    ("voice_test", "§20 Voice Test"),
    ("benchmark_match", "§18 Benchmark Match"),
]

SYSTEM_PROMPT = """You are the Voice & Craft Judge for Swainston Consulting Group (SCG).

Your job: score a fresh AI-drafted forensic expert report against Lane Swainston's authored voice standard (VOICE.md) and a golden reference report of the same type. You are a rubric scorer, not a rewriter.

Scoring scale, every dimension:
  5 = Indistinguishable from Lane's filed reports. Would pass trier-of-fact scrutiny without edits.
  4 = Strong; minor rhythm or word-choice differences. Would ship after light review.
  3 = Recognizable SCG voice but notable drift in precision, structure, or rhetorical stance.
  2 = Voice leaks (personal voice, hedging, academic detachment, plaintiff-sympathetic framing).
  1 = Does not read like SCG. Would fail the §20 "could this appear verbatim in Clark County District Court" test.

Rules:
- Cite specific passages (quote + location) when you dock points.
- If a dimension does not apply to this report type (e.g. §17 Peterson Playbook when the Plaintiff Expert isn't Peterson), mark it N/A and do not score.
- Do not rewrite. Do not suggest alternative phrasings. This is judgment, not editing.
- Return STRICT JSON matching the schema in the user message. No prose outside the JSON.
"""

USER_TEMPLATE = """REPORT TYPE: {report_type}
CASE ID: {case_id}

You will receive three things below:
  1. VOICE.md — the authored voice standard.
  2. GOLDEN — the reference report for this report type (from the §18 canonical set).
  3. DRAFT — the fresh AI-drafted report to be scored.

Score each of the five rubric dimensions. Return ONLY a JSON object matching this schema:

{{
  "attack_patterns":   {{"score": 1-5|null, "na": false, "rationale": "...", "quotes": ["..."]}},
  "peterson_playbook": {{"score": 1-5|null, "na": true|false, "rationale": "...", "quotes": ["..."]}},
  "code_citation":     {{"score": 1-5|null, "na": false, "rationale": "...", "quotes": ["..."]}},
  "voice_test":        {{"score": 1-5|null, "na": false, "rationale": "...", "quotes": ["..."]}},
  "benchmark_match":   {{"score": 1-5|null, "na": false, "rationale": "...", "quotes": ["..."]}},
  "overall_average":   <float, excluding N/A>,
  "min_dimension":     <int>,
  "status":            "PASS"|"REVIEW"|"FAIL",
  "summary":           "one-paragraph plain-English summary"
}}

Status rules:
  PASS   — overall_average >= 4.0 AND min_dimension >= 3
  REVIEW — overall_average >= 3.5 AND min_dimension >= 3
  FAIL   — anything else, including any dimension scored 1 or 2

=== VOICE.md (authored standard) ===
{voice_md}

=== GOLDEN ({report_type}, reference) ===
{golden_text}

=== DRAFT (to be scored) ===
{draft_text}
"""


def _concat_dir(root: Path, limit_bytes: int = 200_000) -> str:
    """Read *.md and *.txt under root into a single string. Truncates at
    limit_bytes with a clear marker. Used to bundle golden and draft for
    the Judge."""
    files = sorted(
        p for p in root.rglob("*")
        if p.is_file() and p.suffix.lower() in {".md", ".txt"}
    )
    buf: list[str] = []
    used = 0
    for fp in files:
        header = f"\n\n--- {fp.relative_to(root)} ---\n"
        body = fp.read_text(encoding="utf-8", errors="replace")
        if used + len(header) + len(body) > limit_bytes:
            remaining = limit_bytes - used - len(header)
            if remaining > 200:
                buf.append(header + body[:remaining] + "\n\n[...truncated at byte limit...]")
            else:
                buf.append("\n\n[...remaining files truncated at byte limit...]")
            break
        buf.append(header + body)
        used += len(header) + len(body)
    return "".join(buf).lstrip()


def _parse_model_json(raw: str) -> dict:
    """Extract the first JSON object from a model response. Handles the case
    where the model wraps it in ```json fences or adds leading prose."""
    # Fenced block
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    if fence_match:
        return json.loads(fence_match.group(1))
    # Bare object
    obj_match = re.search(r"\{[\s\S]*\}", raw)
    if obj_match:
        return json.loads(obj_match.group(0))
    raise ValueError("no JSON object found in model response")


def _render_scorecard(result: dict, case_id: str, report_type: str,
                      golden_path: str, draft_path: str) -> str:
    lines: list[str] = [
        f"# Voice Scorecard — {case_id} ({report_type})",
        "",
        f"- Golden reference: `{golden_path}`",
        f"- Draft scored:    `{draft_path}`",
        "",
        "| Dimension | Score | Rationale |",
        "|---|:-:|---|",
    ]
    for key, label in RUBRIC_DIMENSIONS:
        entry = result.get(key) or {}
        if entry.get("na"):
            score_display = "N/A"
        else:
            score_display = str(entry.get("score", "?"))
        rationale = (entry.get("rationale") or "").replace("\n", " ").strip()
        lines.append(f"| {label} | {score_display} | {rationale} |")
    lines += [
        "",
        f"**Overall average:** {result.get('overall_average', '?')}  ",
        f"**Minimum dimension:** {result.get('min_dimension', '?')}  ",
        f"**Threshold:** ≥ 4.0 average, no dimension < 3",
        "",
        f"## Status: {result.get('status', '?')}",
        "",
        "### Summary",
        "",
        str(result.get("summary", "")).strip(),
        "",
        "### Quoted passages (privileged)",
        "",
    ]
    for key, label in RUBRIC_DIMENSIONS:
        entry = result.get(key) or {}
        quotes = entry.get("quotes") or []
        if not quotes:
            continue
        lines.append(f"**{label}**")
        for q in quotes:
            q_clean = str(q).replace("\n", " ").strip()
            lines.append(f"- {q_clean}")
        lines.append("")
    return "\n".join(lines) + "\n"


def run_judge(
    voice_path: Path,
    golden_dir: Path,
    draft_dir: Path,
    report_type: str,
    out_path: Path,
    case_id: str,
    model: str,
    dry_run: bool,
) -> int:
    voice_md = voice_path.read_text(encoding="utf-8")
    golden_text = _concat_dir(golden_dir)
    draft_text = _concat_dir(draft_dir)

    user_msg = USER_TEMPLATE.format(
        report_type=report_type,
        case_id=case_id,
        voice_md=voice_md,
        golden_text=golden_text,
        draft_text=draft_text,
    )

    if dry_run:
        synthetic = {
            "attack_patterns":   {"score": 0, "na": False, "rationale": "dry-run", "quotes": []},
            "peterson_playbook": {"score": None, "na": True, "rationale": "dry-run", "quotes": []},
            "code_citation":     {"score": 0, "na": False, "rationale": "dry-run", "quotes": []},
            "voice_test":        {"score": 0, "na": False, "rationale": "dry-run", "quotes": []},
            "benchmark_match":   {"score": 0, "na": False, "rationale": "dry-run", "quotes": []},
            "overall_average": 0,
            "min_dimension": 0,
            "status": "FAIL",
            "summary": "Dry-run — no model invoked; schema + rendering smoke test only.",
        }
        scorecard = _render_scorecard(synthetic, case_id, report_type,
                                      str(golden_dir), str(draft_dir))
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(scorecard, encoding="utf-8")
        print(f"[DRY-RUN] scorecard written to {out_path}")
        return 0

    if Anthropic is None:
        print("[STOP] anthropic SDK not installed. pip install anthropic", file=sys.stderr)
        return 2

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("[STOP] ANTHROPIC_API_KEY not set", file=sys.stderr)
        return 2

    client = Anthropic(api_key=api_key)

    resp = client.messages.create(
        model=model,
        max_tokens=4096,
        system=[{
            "type": "text",
            "text": SYSTEM_PROMPT,
            "cache_control": {"type": "ephemeral"},
        }],
        messages=[{"role": "user", "content": user_msg}],
    )

    raw = "".join(block.text for block in resp.content if getattr(block, "text", None))
    try:
        result = _parse_model_json(raw)
    except ValueError as e:
        print(f"[FAIL] judge returned unparseable response: {e}", file=sys.stderr)
        sys.stderr.write(raw[:2000])
        return 1

    scorecard = _render_scorecard(result, case_id, report_type,
                                  str(golden_dir), str(draft_dir))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(scorecard, encoding="utf-8")
    print(f"[REPORT] {out_path}  status={result.get('status', '?')}")

    status = str(result.get("status", "FAIL")).upper()
    return 0 if status == "PASS" else 1


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0] if __doc__ else "")
    parser.add_argument("--voice", required=True, help="Path to VOICE.md")
    parser.add_argument("--golden", required=True, help="Path to Cases/<id>/expected/")
    parser.add_argument("--draft", required=True, help="Path to Cases/<id>/voice-run/")
    parser.add_argument("--report-type", required=True, help="e.g. 'Initial Report'")
    parser.add_argument("--out", required=True, help="Scorecard output path")
    parser.add_argument("--case-id", default=None, help="Case ID for scorecard header (defaults to draft parent name)")
    parser.add_argument("--model", default=os.environ.get("ANTHROPIC_MODEL", MODEL_DEFAULT))
    parser.add_argument("--dry-run", action="store_true", help="Render a synthetic scorecard without calling the API (self-test)")
    args = parser.parse_args(argv)

    voice_path = Path(args.voice)
    golden_dir = Path(args.golden)
    draft_dir = Path(args.draft)
    out_path = Path(args.out)

    if not voice_path.is_file():
        print(f"[STOP] VOICE.md missing: {voice_path}", file=sys.stderr)
        return 2
    if not golden_dir.is_dir():
        print(f"[STOP] golden dir missing: {golden_dir}", file=sys.stderr)
        return 2
    if not draft_dir.is_dir():
        print(f"[STOP] draft dir missing: {draft_dir}", file=sys.stderr)
        return 2

    case_id = args.case_id or draft_dir.parent.name
    return run_judge(voice_path, golden_dir, draft_dir, args.report_type,
                     out_path, case_id, args.model, args.dry_run)


if __name__ == "__main__":
    sys.exit(main())
