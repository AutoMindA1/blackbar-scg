#!/bin/bash
# ──────────────────────────────────────────────
# BlackBar Pre-Deploy Gate
# OODA: Observe → Orient → Decide → Act
# Run this before every Railway deploy.
# ──────────────────────────────────────────────

set -e  # Exit on first failure

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "═══════════════════════════════════════════"
echo "  BlackBar Pre-Deploy Gate"
echo "  OODA Phase 3 QA → Phase 5 Governance"
echo "═══════════════════════════════════════════"
echo ""

# ─── OBSERVE: Static Analysis ───
echo -e "${YELLOW}[OBSERVE]${NC} Lint + TypeCheck..."

echo -n "  ESLint server/... "
npx eslint server/ --max-warnings 0 --quiet 2>/dev/null && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗ LINT FAILED${NC}"; exit 1; }

echo -n "  TypeScript server... "
npx tsc -p tsconfig.server.json --noEmit 2>/dev/null && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗ TYPE CHECK FAILED${NC}"; exit 1; }

echo -n "  TypeScript client... "
npx tsc -b --noEmit 2>/dev/null && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗ CLIENT TYPE CHECK FAILED${NC}"; exit 1; }

# ─── ORIENT: Golden Tests ───
echo ""
echo -e "${YELLOW}[ORIENT]${NC} Golden Tests (regression baseline)..."

npm run test:golden 2>&1
GOLDEN_EXIT=$?

if [ $GOLDEN_EXIT -ne 0 ]; then
  echo ""
  echo -e "${RED}[GATE FAIL] Golden tests failed — deploy blocked.${NC}"
  echo "Fix all golden test failures before deploying."
  exit 1
fi
echo -e "${GREEN}  Golden tests passed ✓${NC}"

# ─── DECIDE: Adversarial Delta (informational) ───
echo ""
echo -e "${YELLOW}[DECIDE]${NC} Adversarial Tests (security posture — informational only)..."

ADVERSARIAL_OUTPUT=$(npm run test:adversarial 2>&1 || true)
ADVERSARIAL_FAILURES=$(echo "$ADVERSARIAL_OUTPUT" | grep -oP '\d+ failed' | head -1 || echo "0 failed")
echo "  Adversarial: $ADVERSARIAL_FAILURES (expected — these document known vulnerabilities)"

# ─── ACT: Build ───
echo ""
echo -e "${YELLOW}[ACT]${NC} Building for production..."

npm run build 2>&1
BUILD_EXIT=$?

if [ $BUILD_EXIT -ne 0 ]; then
  echo ""
  echo -e "${RED}[GATE FAIL] Build failed — deploy blocked.${NC}"
  exit 1
fi
echo -e "${GREEN}  Build succeeded ✓${NC}"

# ─── Verify dist ───
echo ""
echo -n "  dist/server/index.js exists... "
[ -f dist/server/index.js ] && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗ MISSING${NC}"; exit 1; }

echo -n "  dist/client/index.html exists... "
[ -f dist/client/index.html ] && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗ MISSING${NC}"; exit 1; }

# ─── GOVERNANCE GATE ───
echo ""
echo "═══════════════════════════════════════════"
echo -e "${GREEN}  ALL GATES PASSED — CLEAR TO DEPLOY${NC}"
echo "═══════════════════════════════════════════"
echo ""
echo "  Lint:        ✓"
echo "  TypeCheck:   ✓"
echo "  Golden:      ✓"
echo "  Build:       ✓"
echo "  Artifacts:   ✓"
echo ""
echo "Next: git push origin main  (Railway auto-deploys from main)"
echo ""

# ─── ENV VAR CHECKLIST (reminder) ───
echo -e "${YELLOW}[REMINDER]${NC} Verify these Railway env vars are set:"
echo "  REQUIRED:"
echo "    DATABASE_URL         (Railway Postgres internal URL)"
echo "    JWT_SECRET           (random 64+ char string)"
echo "    PORT                 (Railway sets automatically)"
echo "    ANTHROPIC_API_KEY    (for agent pipeline)"
echo "    ALLOWED_ORIGINS      (your Railway public domain, e.g. https://blackbar-production.up.railway.app)"
echo "    NODE_ENV=production"
echo ""
echo "  OPTIONAL (dormant — not needed for v1):"
echo "    PROWL_ENABLED, SENTINEL_MODEL, SUPERVISED_MODE"
echo "    AGENT_SPECS_DIR, BRAIN_MD_PATH, VOICE_MD_PATH"
echo ""
