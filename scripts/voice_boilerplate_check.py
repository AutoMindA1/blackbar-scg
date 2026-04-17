#!/usr/bin/env python3
"""voice_boilerplate_check.py — Layer 2a helper for /ultraplan voice-check.

Parses VOICE.md §9 (POINTS OF OPINION — STANDARD BLOCKS) and §10 (CONCLUSION
BOILERPLATE), extracts each canonical block, and checks a target file for
drift against the canonical form. [bracketed] spans are treated as wildcards.

A per-case .voice-allow file may record intentional variances:
    <ISO-timestamp>  <file-path>  <block-id>  <reason>
Matching (file, block-id) rows suppress the drift report for that block.

Exit 0 on PASS, 1 on drift (unless allowed), 2 on missing inputs.

SCG IP — no case-specific facts, names, or excerpts. All examples below are
about the tool itself.
"""
from __future__ import annotations

import argparse
import difflib
import re
import sys
from pathlib import Path
from typing import Iterable, NamedTuple


class Block(NamedTuple):
    block_id: str          # e.g. "§9/Block-3" or "§10/current"
    description: str       # short label from VOICE.md
    pattern: str           # canonical text with [bracketed] wildcard spans
    source_line: int


# ---------- Parsing VOICE.md ----------

SECTION_RE = re.compile(r"^##\s+(\d+)\.\s+(.+?)\s*$")
BLOCK_LABEL_RE = re.compile(r"^\*\*(.+?)\*\*\s*$")
BLOCKQUOTE_LINE_RE = re.compile(r"^>\s?(.*)$")


def parse_voice_md(voice_path: Path) -> list[Block]:
    """Extract §9 and §10 blockquoted canonical blocks."""
    blocks: list[Block] = []
    current_section: int | None = None
    current_label: str | None = None
    buffer: list[str] = []
    buffer_start_line = 0

    def flush(section: int, label: str, lines: list[str], start_line: int) -> None:
        if not lines:
            return
        text = " ".join(s.strip() for s in lines if s.strip())
        if not text:
            return
        # Derive a stable block_id
        section_tag = f"§{section}"
        block_id_match = re.match(r"Block\s+(\d+)", label or "")
        if block_id_match:
            block_id = f"{section_tag}/Block-{block_id_match.group(1)}"
        elif label and "opener" in (label or "").lower():
            block_id = f"{section_tag}/opener"
        elif label and "current" in (label or "").lower():
            block_id = f"{section_tag}/current"
        elif label and "older" in (label or "").lower():
            block_id = f"{section_tag}/older"
        else:
            block_id = f"{section_tag}/{len(blocks) + 1}"
        blocks.append(
            Block(block_id=block_id, description=label or "", pattern=text, source_line=start_line)
        )

    with voice_path.open("r", encoding="utf-8") as fh:
        for lineno, raw in enumerate(fh, 1):
            sec_match = SECTION_RE.match(raw)
            if sec_match:
                # flush pending block before switching sections
                if current_section in (9, 10) and buffer:
                    flush(current_section, current_label or "", buffer, buffer_start_line)
                buffer, current_label = [], None
                current_section = int(sec_match.group(1))
                continue

            if current_section not in (9, 10):
                continue

            label_match = BLOCK_LABEL_RE.match(raw.rstrip())
            if label_match:
                if buffer:
                    flush(current_section, current_label or "", buffer, buffer_start_line)
                    buffer = []
                current_label = label_match.group(1).rstrip(":")
                buffer_start_line = lineno
                continue

            bq_match = BLOCKQUOTE_LINE_RE.match(raw.rstrip())
            if bq_match:
                line_text = bq_match.group(1)
                if not buffer:
                    buffer_start_line = lineno
                buffer.append(line_text)
                continue

            # Non-blockquote, non-label line ends a buffered block
            if buffer:
                flush(current_section, current_label or "", buffer, buffer_start_line)
                buffer = []

        # EOF flush
        if current_section in (9, 10) and buffer:
            flush(current_section, current_label or "", buffer, buffer_start_line)

    return blocks


# ---------- Matching ----------

WILDCARD_RE = re.compile(r"\[[^\[\]\n]+\]")
WS_RE = re.compile(r"\s+")
LEADING_QUOTE_RE = re.compile(r'^["\u201c\u201d\'\u2018\u2019]+')
TRAILING_QUOTE_RE = re.compile(r'["\u201c\u201d\'\u2018\u2019]+$')


def normalize(text: str) -> str:
    """Collapse whitespace, strip surrounding quotes, lowercase."""
    text = WS_RE.sub(" ", text).strip()
    text = LEADING_QUOTE_RE.sub("", text)
    text = TRAILING_QUOTE_RE.sub("", text)
    return text.lower()


def pattern_to_regex(pattern: str) -> re.Pattern[str]:
    """Convert canonical text with [bracketed] wildcards to a loose regex.

    - [...] spans → .{0,80}? (non-greedy wildcard up to 80 chars)
    - Whitespace → \\s+
    - Everything else is escaped literally.
    """
    parts = WILDCARD_RE.split(pattern)
    escaped = [re.escape(normalize(p)) for p in parts]
    # Collapse normalized whitespace in pattern segments to flexible \s+
    escaped = [re.sub(r"\\ +", r"\\s+", p) for p in escaped]
    regex_str = r".{0,80}?".join(escaped)
    return re.compile(regex_str, re.DOTALL)


def fingerprint_tokens(pattern: str, n: int = 8) -> list[str]:
    """First N non-wildcard words from the pattern — used to decide whether
    a given block is even being attempted in the target file."""
    clean = WILDCARD_RE.sub(" ", pattern)
    words = [w for w in re.findall(r"[A-Za-z]+", clean) if len(w) > 2]
    return [w.lower() for w in words[:n]]


def block_appears_in_target(block: Block, target_norm: str) -> bool:
    """Heuristic: at least 5 of the first 8 content words appear within
    a 400-char window of each other."""
    tokens = fingerprint_tokens(block.pattern)
    if len(tokens) < 5:
        return False
    positions = [target_norm.find(t) for t in tokens]
    hits = [p for p in positions if p >= 0]
    if len(hits) < 5:
        return False
    return (max(hits) - min(hits)) < 800


# ---------- .voice-allow ----------

def load_allow(allow_path: Path) -> set[tuple[str, str]]:
    allowed: set[tuple[str, str]] = set()
    if not allow_path.exists():
        return allowed
    for line in allow_path.read_text(encoding="utf-8").splitlines():
        parts = re.split(r"\s+", line.strip(), maxsplit=3)
        if len(parts) >= 3:
            _ts, fpath, bid = parts[0], parts[1], parts[2]
            allowed.add((fpath, bid))
    return allowed


# ---------- Main ----------

def check(voice_path: Path, target_path: Path, allow_path: Path | None) -> int:
    blocks = parse_voice_md(voice_path)
    if not blocks:
        print(f"[STOP] parsed 0 blocks from {voice_path}", file=sys.stderr)
        return 2

    target_raw = target_path.read_text(encoding="utf-8", errors="replace")
    target_norm = normalize(target_raw)

    allowed = load_allow(allow_path) if allow_path else set()
    target_str = str(target_path)

    drift_count = 0
    for block in blocks:
        if not block_appears_in_target(block, target_norm):
            continue
        regex = pattern_to_regex(block.pattern)
        if regex.search(target_norm):
            continue
        # Drift detected
        if (target_str, block.block_id) in allowed:
            print(f"[ALLOW] {block.block_id} ({block.description}) — variance recorded in .voice-allow")
            continue
        drift_count += 1
        print(f"[§9/§10 DRIFT] {block.block_id} — {block.description}")
        # Show a short approximate diff for human triage
        canonical = normalize(block.pattern)
        # Try to locate the closest span
        tokens = fingerprint_tokens(block.pattern, n=4)
        anchor = tokens[0] if tokens else ""
        idx = target_norm.find(anchor) if anchor else -1
        if idx >= 0:
            excerpt_len = min(len(canonical) + 100, 600)
            excerpt = target_norm[idx : idx + excerpt_len]
            ratio = difflib.SequenceMatcher(None, canonical[:400], excerpt[:400]).ratio()
            print(f"    similarity={ratio:.2f}   (lower = more drift)")

    if drift_count == 0:
        print(f"[PASS] §9/§10 boilerplate verbatim check — {target_path}")
        return 0
    return 1


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0] if __doc__ else "")
    parser.add_argument("voice", help="Path to VOICE.md")
    parser.add_argument("target", help="File to check")
    parser.add_argument("--allow-file", help="Per-case .voice-allow override log", default=None)
    args = parser.parse_args(list(argv) if argv is not None else None)

    voice_path = Path(args.voice)
    target_path = Path(args.target)
    if not voice_path.is_file():
        print(f"[STOP] VOICE.md not found: {voice_path}", file=sys.stderr)
        return 2
    if not target_path.is_file():
        print(f"[STOP] target not found: {target_path}", file=sys.stderr)
        return 2
    allow_path = Path(args.allow_file) if args.allow_file else None

    return check(voice_path, target_path, allow_path)


if __name__ == "__main__":
    sys.exit(main())
