#!/usr/bin/env bash
# BLACK-BAR repo validation script
# Checks: no placeholder stubs in reference files, valid markdown,
#         no UTF-8 encoding traps, intake handoff files have required fields.
# Exit code: 0 = all green, 1 = failures found

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAILURES=0
LOG_FILE="$REPO_ROOT/reports/validate-log.txt"

mkdir -p "$REPO_ROOT/reports"
: > "$LOG_FILE"

log_fail() {
  echo "FAIL: $1" | tee -a "$LOG_FILE"
  FAILURES=$((FAILURES + 1))
}

log_pass() {
  echo "PASS: $1" | tee -a "$LOG_FILE"
}

echo "========================================" | tee -a "$LOG_FILE"
echo "BLACK-BAR Validation — $(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# ─── CHECK 1: No [BLANK], [PLACEHOLDER], [MISSING] in reference/ ───
echo "--- Check 1: Reference file placeholders ---" | tee -a "$LOG_FILE"
PLACEHOLDER_PATTERN='\[(BLANK|PLACEHOLDER|MISSING)[^]]*\]'
if [ -d "$REPO_ROOT/reference" ]; then
  while IFS= read -r f; do
    hits=$(grep -cEi "$PLACEHOLDER_PATTERN" "$f" 2>/dev/null || true)
    if [ "$hits" -gt 0 ]; then
      log_fail "$f has $hits placeholder(s)"
      grep -nEi "$PLACEHOLDER_PATTERN" "$f" >> "$LOG_FILE" 2>/dev/null || true
    fi
  done < <(find "$REPO_ROOT/reference" -type f -name '*.md')
else
  log_fail "reference/ directory not found"
fi
echo "" | tee -a "$LOG_FILE"

# ─── CHECK 2: Markdown validity (unclosed fenced code blocks) ───
echo "--- Check 2: Markdown — unclosed code blocks ---" | tee -a "$LOG_FILE"
while IFS= read -r f; do
  fence_count=$(grep -c '^\s*```' "$f" 2>/dev/null || true)
  if [ $((fence_count % 2)) -ne 0 ]; then
    log_fail "$f has unclosed fenced code block ($fence_count fence lines)"
  fi
done < <(find "$REPO_ROOT" -name '*.md' -not -path '*/.git/*' -not -path '*/node_modules/*')
echo "" | tee -a "$LOG_FILE"

# ─── CHECK 3: UTF-8 encoding traps (smart quotes, em-dashes) ───
echo "--- Check 3: UTF-8 encoding traps ---" | tee -a "$LOG_FILE"
# Check for smart quotes (U+2018, U+2019, U+201C, U+201D) and em-dashes (U+2014)
# These break btoa() and some CLI tools
# Use literal UTF-8 bytes for macOS compatibility (no -P flag)
SMART_LEFT_SINGLE=$(printf '\xe2\x80\x98')
SMART_RIGHT_SINGLE=$(printf '\xe2\x80\x99')
SMART_LEFT_DOUBLE=$(printf '\xe2\x80\x9c')
SMART_RIGHT_DOUBLE=$(printf '\xe2\x80\x9d')
EM_DASH=$(printf '\xe2\x80\x94')
SMART_PATTERN="${SMART_LEFT_SINGLE}|${SMART_RIGHT_SINGLE}|${SMART_LEFT_DOUBLE}|${SMART_RIGHT_DOUBLE}|${EM_DASH}"
while IFS= read -r f; do
  hits=$(grep -cE "$SMART_PATTERN" "$f" 2>/dev/null || echo 0)
  if [ "$hits" -gt 0 ]; then
    log_fail "$f has $hits line(s) with smart quotes or em-dashes"
  fi
done < <(find "$REPO_ROOT" -name '*.md' -not -path '*/.git/*' -not -path '*/node_modules/*')
# Also check HTML files
while IFS= read -r f; do
  hits=$(grep -cE "$SMART_PATTERN" "$f" 2>/dev/null || echo 0)
  if [ "$hits" -gt 0 ]; then
    log_fail "$f has $hits line(s) with smart quotes or em-dashes (HTML)"
  fi
done < <(find "$REPO_ROOT" -name '*.html' -not -path '*/.git/*' -not -path '*/node_modules/*')
echo "" | tee -a "$LOG_FILE"

# ─── CHECK 4: Intake handoff files have required fields ───
echo "--- Check 4: Intake handoff required fields ---" | tee -a "$LOG_FILE"
REQUIRED_INTAKE_FIELDS=(
  "Incident Date"
  "Defendant"
  "Location"
  "Mechanism"
  "Report Type"
  "Documents Received"
)
if [ -d "$REPO_ROOT/cases" ]; then
  while IFS= read -r intake_file; do
    for field in "${REQUIRED_INTAKE_FIELDS[@]}"; do
      if ! grep -qi "$field" "$intake_file" 2>/dev/null; then
        log_fail "$intake_file missing required field: $field"
      fi
    done
    # Check for INTAKE COMPLETE: YES
    if ! grep -q 'INTAKE COMPLETE.*YES' "$intake_file" 2>/dev/null; then
      log_fail "$intake_file missing 'INTAKE COMPLETE: YES' status"
    fi
  done < <(find "$REPO_ROOT/cases" -name 'intake.md' -type f)
else
  log_pass "No cases/ directory yet — intake check skipped (no live cases)"
fi
echo "" | tee -a "$LOG_FILE"

# ─── CHECK 5: No TBD/TODO/FIXME/XXX in reference files ───
echo "--- Check 5: Reference files — TBD/TODO/FIXME/XXX ---" | tee -a "$LOG_FILE"
if [ -d "$REPO_ROOT/reference" ]; then
  while IFS= read -r f; do
    hits=$(grep -cEi '\b(TBD|TODO|FIXME|XXX)\b' "$f" 2>/dev/null || true)
    if [ "$hits" -gt 0 ]; then
      log_fail "$f has $hits TBD/TODO/FIXME/XXX marker(s)"
      grep -nEi '\b(TBD|TODO|FIXME|XXX)\b' "$f" >> "$LOG_FILE" 2>/dev/null || true
    fi
  done < <(find "$REPO_ROOT/reference" -type f -name '*.md')
fi
echo "" | tee -a "$LOG_FILE"

# ─── SUMMARY ───
echo "========================================" | tee -a "$LOG_FILE"
if [ "$FAILURES" -eq 0 ]; then
  echo "ALL CHECKS PASSED" | tee -a "$LOG_FILE"
  exit 0
else
  echo "FAILURES: $FAILURES" | tee -a "$LOG_FILE"
  echo "See $LOG_FILE for details" | tee -a "$LOG_FILE"
  exit 1
fi
