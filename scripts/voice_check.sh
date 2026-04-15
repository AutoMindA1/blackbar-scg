#!/usr/bin/env bash
# voice_check.sh — Layer 2a deterministic rule pipeline.
#
# Runs §21 HARD BLOCK, §11 Never-use, §2 date format, §3 case-name convention,
# and §9/§10 boilerplate verbatim checks against a single file.
#
# Exit codes:
#   0 — PASS
#   1 — §11/§2/§3/§9/§10 violation (warn; Claude Code shows but does not block)
#   2 — §21 HARD BLOCK (Claude Code blocks the tool call that triggered this)
#
# Invoked two ways:
#   1. As a CLI: scripts/voice_check.sh <path>
#   2. As a PostToolUse hook target (see .claude/settings.local.json)
#
# SCG IP. No case-specific facts.
set -u

FILE="${1:-}"
[ -f "$FILE" ] || { echo "[STOP] voice_check.sh requires a file path" >&2; exit 1; }

VOICE="${VOICE_MD:-VOICE.md}"
[ -f "$VOICE" ] || { echo "[STOP] VOICE.md not found. Run from repo root or set VOICE_MD." >&2; exit 1; }

CASE=""
if [ -f ".case" ]; then
  CASE=$(grep '^CASE=' .case 2>/dev/null | cut -d= -f2)
fi
CASE="${CASE:-_tmp}"

REPORT_DIR="Cases/$CASE"
REPORT="$REPORT_DIR/voice-check-$(basename "$FILE").log"
mkdir -p "$REPORT_DIR"
: > "$REPORT"

FAIL=0

# --- §21 Prohibited phrases — HARD BLOCK ---
# Exempt verbatim quotations (phrase appears inside matched double quotes).
BANNED='hired.gun|gun.for.hire|paid expert|bought witness'
if grep -niE "$BANNED" "$FILE" | grep -vE '"[^"]*('"$BANNED"')[^"]*"' >> "$REPORT"; then
  echo "[HARD BLOCK §21] prohibited phrase outside verbatim quote" >> "$REPORT"
  FAIL=2
fi

# --- §11 "Never use" terminology ---
NEVER_PATTERNS=(
  'dangerous condition'
  '\bnegligent\b|\bnegligence\b'
  'slip-and-fall'
  '\bprior to\b'
  '\bclearly\b|\bobviously\b'
  'undoubtedly|certainly|unquestionably'
  'unreasonably dangerous'
  'reasonable care|reasonable person'
  '\bfault\b'
  '\bvictim\b'
  '\bsafe\b|\bunsafe\b'
  '\bcausation\b'
  'in my opinion'
)
for pat in "${NEVER_PATTERNS[@]}"; do
  if grep -niE "$pat" "$FILE" >> "$REPORT" 2>/dev/null; then
    echo "[§11 VIOLATION] banned term: $pat" >> "$REPORT"
    [ "$FAIL" -lt 1 ] && FAIL=1
  fi
done

# First-person "I" in body (non-quoted) — rough heuristic
if grep -nE '(^| )I( |,|\.|;|\?|!|'\'')' "$FILE" | grep -vE '"[^"]*\bI\b[^"]*"' >> "$REPORT"; then
  echo "[§11 VIOLATION] first-person 'I' in body text" >> "$REPORT"
  [ "$FAIL" -lt 1 ] && FAIL=1
fi

# --- §2 Date format — flag US "Month Day, Year" ---
US_DATE='(January|February|March|April|May|June|July|August|September|October|November|December) [0-9]{1,2}(st|nd|rd|th)?,? [0-9]{4}'
if grep -nE "$US_DATE" "$FILE" >> "$REPORT"; then
  echo "[§2 VIOLATION] US date format detected — use European (DD Month YYYY)" >> "$REPORT"
  [ "$FAIL" -lt 1 ] && FAIL=1
fi

# --- §3 Case-name convention — "v." in Subject/Re/Case header lines ---
if grep -nE '^[[:space:]]*(Subject|Re|Case)[^:]*:.* v\. ' "$FILE" >> "$REPORT"; then
  echo "[§3 VIOLATION] use 'adv' not 'v.' in case-name line" >> "$REPORT"
  [ "$FAIL" -lt 1 ] && FAIL=1
fi

# --- §9 / §10 Boilerplate verbatim check ---
python3 scripts/voice_boilerplate_check.py "$VOICE" "$FILE" \
  --allow-file "$REPORT_DIR/.voice-allow" >> "$REPORT" 2>&1 || {
  [ "$FAIL" -lt 1 ] && FAIL=1
}

if [ "$FAIL" -eq 2 ]; then
  echo "[GATE FAIL: voice-check — HARD BLOCK §21 violation in $FILE]" >&2
  tail -20 "$REPORT" >&2
  exit 2
elif [ "$FAIL" -eq 1 ]; then
  echo "[GATE FAIL: voice-check — violations in $FILE, see $REPORT]" >&2
  tail -20 "$REPORT" >&2
  exit 1
else
  echo "[PASS: voice-check] $FILE"
  exit 0
fi
