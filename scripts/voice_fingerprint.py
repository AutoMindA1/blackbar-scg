#!/usr/bin/env python3
"""voice_fingerprint.py — Layer 2b stylometric fingerprint tool.

Three subcommands:

    extract <dir>
        Aggregates features across every *.md / *.txt in <dir>.
        Emits a JSON object to stdout. Metadata only — no file contents.

    diff <golden.json> <actual.json> --sigma N --report <path>
        Compares actual features to golden's distribution. Flags any feature
        whose delta exceeds N standard deviations (defaults to 2). Writes a
        plain-English markdown report.

    golden-type <id>
        Reads VOICE.md §18 table, returns the canonical report type string
        for <id> (e.g. "Initial Report", "Rebuttal Report", "Supplemental
        Report"). Exit 1 if id unknown.

SCG IP. Consumes Cases/ content only when directed; never logs file bodies.
"""
from __future__ import annotations

import argparse
import json
import re
import statistics
import sys
from pathlib import Path


# ---------- Shared helpers ----------

SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z\"\u201c])")
PARAGRAPH_SPLIT_RE = re.compile(r"\n\s*\n")
WORD_RE = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?")
SYLLABLE_RE = re.compile(r"[aeiouyAEIOUY]+")
PASSIVE_RE = re.compile(
    r"\b(?:was|were|is|are|been|being|be|am)\b\s+(?:\w+\s+){0,2}\w+(?:ed|en)\b",
    re.IGNORECASE,
)
FIG_CAPTION_RE = re.compile(r"^Figure\s+\d+\s*[–-]\s+.+$", re.MULTILINE)
BAD_FIG_CAPTION_RE = re.compile(r"^(?:Fig\.|Figure)\s*\d+[:.]\s*.+$", re.MULTILINE)
HEADER_RE = re.compile(r"^#{1,6}\s+(.+?)\s*$", re.MULTILINE)
CITATION_RE = re.compile(r"\[\d+\]|\[\^\d+\]|\(\d{4}\)")
FOOTNOTE_RE = re.compile(r"^\[\^\d+\]:", re.MULTILINE)

# §5 expected header patterns by report type
EXPECTED_HEADERS = {
    "Initial Report": [
        "identification", "documents reviewed", "qualifications",
        "alleged accident", "points of opinion", "conclusion",
    ],
    "Rebuttal Report": [
        "identification", "scope of rebuttal", "documents reviewed",
        "response to plaintiff expert", "points of opinion", "conclusion",
    ],
    "Supplemental Report": [
        "identification", "scope of supplement", "documents reviewed",
        "additional analysis", "points of opinion", "conclusion",
    ],
}


def split_sentences(text: str) -> list[str]:
    stripped = text.strip()
    if not stripped:
        return []
    return [s for s in SENTENCE_SPLIT_RE.split(stripped) if s.strip()]


def split_paragraphs(text: str) -> list[str]:
    return [p for p in PARAGRAPH_SPLIT_RE.split(text) if p.strip()]


def word_count(text: str) -> int:
    return len(WORD_RE.findall(text))


def syllable_count(word: str) -> int:
    matches = SYLLABLE_RE.findall(word)
    return max(len(matches), 1)


# ---------- Extract ----------

def extract_features(root: Path) -> dict:
    files = sorted(
        p for p in root.rglob("*")
        if p.is_file() and p.suffix.lower() in {".md", ".txt"}
    )
    if not files:
        return _empty_features(root)

    all_sentence_lens: list[int] = []
    all_para_lens: list[int] = []
    total_words = 0
    total_sentences = 0
    total_passive = 0
    total_plaintiff_expert = 0
    total_alleged = 0
    total_scg = 0
    total_we_our = 0
    total_syllables = 0
    headers_seen: list[str] = []
    fig_caption_ok = 0
    fig_caption_bad = 0
    citation_count = 0
    footnote_count = 0
    per_file_paths: list[str] = []

    for fp in files:
        text = fp.read_text(encoding="utf-8", errors="replace")
        per_file_paths.append(str(fp.relative_to(root)))

        sentences = split_sentences(text)
        paragraphs = split_paragraphs(text)
        words = WORD_RE.findall(text)

        total_words += len(words)
        total_sentences += len(sentences)
        total_syllables += sum(syllable_count(w) for w in words)

        for s in sentences:
            all_sentence_lens.append(word_count(s))
        for p in paragraphs:
            all_para_lens.append(word_count(p))

        total_passive += len(PASSIVE_RE.findall(text))
        total_plaintiff_expert += len(re.findall(r"\bPlaintiff Expert\b", text))
        total_alleged += len(re.findall(r"\ballegedly?\b|\breportedly\b", text, re.IGNORECASE))
        total_scg += len(re.findall(r"\bSCG\b", text))
        total_we_our += len(re.findall(r"\b(?:we|our)\b", text, re.IGNORECASE))

        for h in HEADER_RE.findall(text):
            headers_seen.append(h.strip().lower())

        fig_caption_ok += len(FIG_CAPTION_RE.findall(text))
        fig_caption_bad += len(BAD_FIG_CAPTION_RE.findall(text)) - fig_caption_ok
        citation_count += len(CITATION_RE.findall(text))
        footnote_count += len(FOOTNOTE_RE.findall(text))

    def stats(values: list[int]) -> dict:
        if not values:
            return {"mean": 0, "median": 0, "p90": 0, "stdev": 0, "n": 0}
        s = sorted(values)
        p90 = s[min(len(s) - 1, int(round(0.9 * (len(s) - 1))))]
        return {
            "mean": round(statistics.fmean(values), 3),
            "median": statistics.median(values),
            "p90": p90,
            "stdev": round(statistics.pstdev(values), 3) if len(values) > 1 else 0,
            "n": len(values),
        }

    words_per_1k = max(total_words / 1000.0, 1e-9)
    fk = 0.0
    if total_sentences > 0 and total_words > 0:
        fk = round(
            0.39 * (total_words / total_sentences)
            + 11.8 * (total_syllables / total_words)
            - 15.59,
            2,
        )

    scg_vs_we = None
    if total_we_our > 0:
        scg_vs_we = round(total_scg / total_we_our, 3)
    elif total_scg > 0:
        scg_vs_we = float("inf")

    return {
        "schema_version": 1,
        "source_root": str(root),
        "file_count": len(files),
        "file_paths": per_file_paths,   # path names only, not contents
        "sentence_len": stats(all_sentence_lens),
        "paragraph_len": stats(all_para_lens),
        "passive_voice_ratio": round(total_passive / max(total_sentences, 1), 4),
        "plaintiff_expert_per_1k": round(total_plaintiff_expert / words_per_1k, 3),
        "alleged_per_1k": round(total_alleged / words_per_1k, 3),
        "scg_count": total_scg,
        "we_our_count": total_we_our,
        "scg_vs_we_ratio": scg_vs_we if scg_vs_we != float("inf") else "inf",
        "headers_seen": headers_seen,
        "figure_caption_compliance": {
            "correct_format": fig_caption_ok,
            "incorrect_format": max(fig_caption_bad, 0),
        },
        "citation_count": citation_count,
        "footnote_count": footnote_count,
        "flesch_kincaid": fk,
        "total_words": total_words,
        "total_sentences": total_sentences,
    }


def _empty_features(root: Path) -> dict:
    return {
        "schema_version": 1,
        "source_root": str(root),
        "file_count": 0,
        "file_paths": [],
        "sentence_len": {"mean": 0, "median": 0, "p90": 0, "stdev": 0, "n": 0},
        "paragraph_len": {"mean": 0, "median": 0, "p90": 0, "stdev": 0, "n": 0},
        "passive_voice_ratio": 0,
        "plaintiff_expert_per_1k": 0,
        "alleged_per_1k": 0,
        "scg_count": 0,
        "we_our_count": 0,
        "scg_vs_we_ratio": 0,
        "headers_seen": [],
        "figure_caption_compliance": {"correct_format": 0, "incorrect_format": 0},
        "citation_count": 0,
        "footnote_count": 0,
        "flesch_kincaid": 0,
        "total_words": 0,
        "total_sentences": 0,
    }


# ---------- Diff ----------

NUMERIC_FEATURES = [
    ("sentence_len.mean", "Sentence length (mean words)"),
    ("sentence_len.p90", "Sentence length (90th percentile)"),
    ("paragraph_len.mean", "Paragraph length (mean words)"),
    ("paragraph_len.p90", "Paragraph length (90th percentile)"),
    ("passive_voice_ratio", "Passive-voice ratio"),
    ("plaintiff_expert_per_1k", "'Plaintiff Expert' per 1k words"),
    ("alleged_per_1k", "'allegedly/reportedly' per 1k words"),
    ("flesch_kincaid", "Flesch-Kincaid grade"),
]


def get_path(obj: dict, dotted: str):
    cur = obj
    for part in dotted.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return None
        cur = cur[part]
    return cur


def _sigma_for(golden_value, stdev_fallback: float) -> float:
    # If stdev is 0 or missing, use 10% of golden value as a pseudo-sigma floor
    if not isinstance(golden_value, (int, float)) or golden_value == 0:
        return max(stdev_fallback, 0.5)
    return max(stdev_fallback, abs(golden_value) * 0.1)


def diff_features(golden: dict, actual: dict, sigma_threshold: float) -> list[dict]:
    findings = []
    for key, label in NUMERIC_FEATURES:
        g = get_path(golden, key)
        a = get_path(actual, key)
        if g is None or a is None:
            continue
        # Use stdev from the corresponding *_len group when available
        stdev_key = key.rsplit(".", 1)[0] + ".stdev"
        stdev = get_path(golden, stdev_key)
        sigma = _sigma_for(g, stdev if isinstance(stdev, (int, float)) else 0)
        delta = a - g
        z = delta / sigma if sigma else 0
        status = "OK" if abs(z) <= sigma_threshold else "DRIFT"
        findings.append(
            {
                "key": key, "label": label, "golden": g, "actual": a,
                "delta": round(delta, 3), "sigma": round(sigma, 3),
                "z": round(z, 2), "status": status,
            }
        )

    # Structural: figure caption compliance
    g_fig = get_path(golden, "figure_caption_compliance.incorrect_format") or 0
    a_fig = get_path(actual, "figure_caption_compliance.incorrect_format") or 0
    if a_fig > g_fig:
        findings.append({
            "key": "figure_caption_compliance",
            "label": "Figure captions deviating from '§14 Figure N – …' format",
            "golden": g_fig, "actual": a_fig, "delta": a_fig - g_fig,
            "sigma": 0, "z": 0, "status": "DRIFT",
        })

    # Section-header set similarity (Jaccard on lowercase header bag)
    g_headers = set(golden.get("headers_seen") or [])
    a_headers = set(actual.get("headers_seen") or [])
    if g_headers:
        jaccard = len(g_headers & a_headers) / max(len(g_headers | a_headers), 1)
        findings.append({
            "key": "section_headers_jaccard",
            "label": "Section-header set overlap vs. golden (Jaccard)",
            "golden": 1.0, "actual": round(jaccard, 3),
            "delta": round(jaccard - 1.0, 3), "sigma": 0.15, "z": 0,
            "status": "OK" if jaccard >= 0.7 else "DRIFT",
        })

    return findings


def render_report(findings: list[dict], golden_path: str, actual_path: str) -> str:
    lines = [
        "# Voice fingerprint diff",
        "",
        f"- Golden: `{golden_path}`",
        f"- Actual: `{actual_path}`",
        "",
        "| Feature | Golden | Actual | Δ | σ | z | Status |",
        "|---|---:|---:|---:|---:|---:|---|",
    ]
    drift = 0
    for f in findings:
        if f["status"] == "DRIFT":
            drift += 1
        lines.append(
            f"| {f['label']} | {f['golden']} | {f['actual']} | {f['delta']} "
            f"| {f['sigma']} | {f['z']} | {f['status']} |"
        )
    lines.append("")
    lines.append(f"**Drift features:** {drift} of {len(findings)}")
    if drift == 0:
        lines.append("")
        lines.append("Diagnosis: actual draft is stylometrically within envelope of the golden.")
    else:
        lines.append("")
        lines.append("Diagnosis: features outside ±σ envelope. Review drifted rows; if change is "
                     "deliberate (new report type, structural revision), run `/ultraplan voice-bless`.")
    return "\n".join(lines) + "\n"


# ---------- golden-type ----------

def lookup_golden_type(case_id: str, voice_path: Path) -> str | None:
    """Read VOICE.md §18 table, find the row for case_id, return Report Type."""
    if not voice_path.is_file():
        return None
    in_section = False
    for line in voice_path.read_text(encoding="utf-8").splitlines():
        if line.startswith("## 18."):
            in_section = True
            continue
        if in_section and line.startswith("## "):
            break
        if not in_section:
            continue
        # Rows look like: | `file` | NP Santa Fe, LLC adv Gleason | Initial Report | date | sig |
        if line.startswith("|") and "|" in line[1:]:
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if len(cells) >= 3:
                # Cell 1 = case description; look for id as a lowercase word
                desc = cells[1].lower()
                if re.search(rf"\b{re.escape(case_id.lower())}\b", desc):
                    return cells[2]
    return None


# ---------- CLI ----------

def cmd_extract(args: argparse.Namespace) -> int:
    root = Path(args.dir)
    if not root.is_dir():
        print(f"[STOP] not a directory: {root}", file=sys.stderr)
        return 2
    features = extract_features(root)
    json.dump(features, sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


def cmd_diff(args: argparse.Namespace) -> int:
    golden_path = Path(args.golden)
    actual_path = Path(args.actual)
    if not golden_path.is_file() or not actual_path.is_file():
        print("[STOP] golden or actual JSON missing", file=sys.stderr)
        return 2
    golden = json.loads(golden_path.read_text(encoding="utf-8"))
    actual = json.loads(actual_path.read_text(encoding="utf-8"))
    findings = diff_features(golden, actual, args.sigma)
    report = render_report(findings, str(golden_path), str(actual_path))
    if args.report:
        Path(args.report).parent.mkdir(parents=True, exist_ok=True)
        Path(args.report).write_text(report, encoding="utf-8")
    else:
        sys.stdout.write(report)
    drift = sum(1 for f in findings if f["status"] == "DRIFT")
    return 1 if drift > 0 else 0


def cmd_golden_type(args: argparse.Namespace) -> int:
    voice_path = Path(args.voice or "VOICE.md")
    rtype = lookup_golden_type(args.id, voice_path)
    if not rtype:
        print(f"[STOP] no §18 row for id={args.id}", file=sys.stderr)
        return 1
    print(rtype)
    return 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0] if __doc__ else "")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_ext = sub.add_parser("extract", help="emit feature JSON for a directory")
    p_ext.add_argument("dir")
    p_ext.set_defaults(func=cmd_extract)

    p_diff = sub.add_parser("diff", help="diff actual vs. golden JSON")
    p_diff.add_argument("golden")
    p_diff.add_argument("actual")
    p_diff.add_argument("--sigma", type=float, default=2.0)
    p_diff.add_argument("--report", default=None)
    p_diff.set_defaults(func=cmd_diff)

    p_type = sub.add_parser("golden-type", help="look up report type from VOICE.md §18")
    p_type.add_argument("id")
    p_type.add_argument("--voice", default=None)
    p_type.set_defaults(func=cmd_golden_type)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
