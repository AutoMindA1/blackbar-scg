#!/bin/bash
# BlackBar → GitHub push script
# Run from the BLACK-BAR directory on your local machine

set -e

# 1. Remove stale lock if present
rm -f .git/index.lock

# 2. Add .gitignore (excludes Cases/ and benchmarks/)
cat > .gitignore << 'EOF'
# macOS
.DS_Store

# Confidential case files — privileged work product
Cases/
benchmarks/

# Editor
*.swp
*.swo
*~

# Push script (one-time use)
push-to-github.sh
EOF

# 3. Point to new repo (replaces old blackbar-for-lane remote)
git remote set-url origin https://github.com/AutoMindA1/blackbar-scg.git 2>/dev/null \
  || git remote add origin https://github.com/AutoMindA1/blackbar-scg.git

# 4. Stage everything except Cases/benchmarks
git add .gitignore README.md VOICE.md PIPELINE.md index.html
git add BlackBar_Architecture.html BlackBar_For_Lane.html
git add blackbar-gtm-sprint-strategy.html
git add "2026-03-26_agent-team-pressure-test.md"
git add agents/ Brand/ Docs/ Legal/ Media/ Workflows/

# 5. Commit
git commit -m "BlackBar v1.0 — full system deploy

4-agent pipeline (Intake → Research → Drafting → QA) for SCG premises
liability expert reports. Includes VOICE.md v2.0, brand assets, architecture
docs, and workflow specs. Cases/benchmarks excluded per confidentiality."

# 6. Force push to main (overwriting the seed README commit from the web UI)
git branch -M main
git push -u origin main --force

echo ""
echo "✓ Pushed to https://github.com/AutoMindA1/blackbar-scg"
echo "✓ GitHub Pages will deploy to https://autominda1.github.io/blackbar-scg"
echo ""
echo "You can delete this script now: rm push-to-github.sh"
