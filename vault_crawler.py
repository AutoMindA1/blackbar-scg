#!/usr/bin/env python3
"""vault_crawler.py — walk a directory tree, index files, classify by extension."""

import argparse
import csv
import os
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

DEFAULT_EXCLUDES = ["node_modules", ".git", "dist", ".next"]

CLASSIFICATION_MAP = {
    ".pdf": "pdf",
    ".docx": "docx",
    ".doc": "legacy_doc",
    ".jpg": "image",
    ".jpeg": "image",
    ".png": "image",
    ".txt": "text",
}


def classify(extension: str) -> str:
    return CLASSIFICATION_MAP.get(extension.lower(), "unknown")


def crawl(root: Path, excludes: set[str]):
    rows = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in excludes]
        for name in filenames:
            full = Path(dirpath) / name
            try:
                stat = full.stat()
            except (OSError, PermissionError):
                continue
            ext = full.suffix
            rows.append({
                "filepath": str(full),
                "filename": name,
                "extension": ext,
                "classification": classify(ext),
                "size_bytes": stat.st_size,
                "modified_date": datetime.fromtimestamp(stat.st_mtime).isoformat(timespec="seconds"),
            })
    return rows


def write_csv(rows, output_path: Path) -> None:
    fieldnames = ["filepath", "filename", "extension", "classification", "size_bytes", "modified_date"]
    with output_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def print_summary(rows, dry_run: bool, output_path: Path) -> None:
    total_files = len(rows)
    total_size = sum(r["size_bytes"] for r in rows)
    counts = Counter(r["classification"] for r in rows)

    print("=" * 50)
    print("VAULT CRAWLER SUMMARY")
    print("=" * 50)
    print(f"Mode:        {'DRY RUN (no CSV written)' if dry_run else f'wrote {output_path}'}")
    print(f"Total files: {total_files}")
    print(f"Total size:  {total_size:,} bytes ({total_size / (1024 * 1024):.2f} MB)")
    print()
    print("By classification:")
    for label in ["pdf", "docx", "legacy_doc", "image", "text", "unknown"]:
        if counts.get(label):
            print(f"  {label:<12} {counts[label]}")
    extras = set(counts) - {"pdf", "docx", "legacy_doc", "image", "text", "unknown"}
    for label in sorted(extras):
        print(f"  {label:<12} {counts[label]}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Walk a directory tree and index files into a CSV.")
    parser.add_argument("--path", required=True, help="Root directory to crawl")
    parser.add_argument("--dry-run", action="store_true", help="Print summary only; do not write CSV")
    parser.add_argument("--output", default="vault_index.csv", help="Output CSV path (default: vault_index.csv)")
    parser.add_argument(
        "--exclude",
        action="append",
        default=None,
        help=f"Directory name to skip (repeatable). Defaults: {', '.join(DEFAULT_EXCLUDES)}",
    )
    args = parser.parse_args()
    excludes = set(args.exclude) if args.exclude else set(DEFAULT_EXCLUDES)

    root = Path(os.path.expanduser(args.path)).resolve()
    if not root.is_dir():
        print(f"error: {root} is not a directory", file=sys.stderr)
        return 1

    output_path = Path(args.output).resolve()
    rows = crawl(root, excludes)

    if not args.dry_run:
        write_csv(rows, output_path)

    print_summary(rows, args.dry_run, output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
