---
description: BLACK-BAR case isolation + output privilege posture enforcer
allowed-tools: Bash, Read, Write, Edit, Grep, Glob
argument-hint: "[audit | engage <case> | label <path> | verify [<benchmark>|all] | bless <benchmark> | voice-check <path> | voice-verify [<id>|all] | voice-score [<id>|all] | voice-bless <id> | voice-allow <path> <block-id> | exit] [--strict]"
---

# /ultraplan — BLACK-BAR Case Boundary & Privilege Posture

You are operating inside SCG's BLACK-BAR practice. This command has one job: **enforce the confidentiality boundary between SCG-owned tooling and per-case work product, and apply the correct output posture to any artifact produced inside an active case.**

This command is domain-agnostic — it does not care what the tool analyzes. It cares that the tool stays reusable IP and that its outputs wear the right privilege label when consumed inside a case.

Reconciled to BLACK-BAR's actual convention: case silos live under `Cases/`, state file is `.case`. Both are already gitignored per project `CLAUDE.md`.

## Invariants

**Invariant A — Tooling is SCG IP, not case IP.**
- Code, schemas, skills, prompts, and docs under the tool root are versioned as SCG IP.
- Template language with placeholders (`[Plaintiff surname]`, `[Defendant]`, `[date]`) in `VOICE.md`, `PIPELINE.md`, `ENTERPRISE_BRAIN.md`, and `agents/**/*.md` is **IP, not a leak** — those files are the tool itself.
- What IS a leak: real party names, docket numbers, deposition text, venue addresses, or quoted expert opinions appearing in tool files instead of `Cases/`.

**Invariant B — Case work is siloed.**
- All case artifacts live under `Cases/<case-id>/` — analysis, exports, notebooks, intermediate files, raw inputs, derived outputs.
- A tool used inside a case is invoked with `DATA_DIR=Cases/<case-id>/data` (or the tool's equivalent env var). The tool writes outputs there, never into its own repo root.
- `Cases/` is gitignored. Period.

**Invariant C — Output posture is automatic inside a case.**
- Any deliverable (docx, pdf, pptx, xlsx, md, csv) generated while a case is active gets the header:
  *"Prepared at the direction of counsel — privileged and confidential — attorney work product."*
- The header goes on the first page/sheet/row. No exceptions, no "internal draft" bypass.

**Invariant D — Cross-case movement is abstraction-only.**
- Facts never cross a case boundary.
- Patterns, frameworks, and parsers can be lifted back into tool IP — but only after being abstracted to remove case-specific context. Flag with `[PATTERN: … abstractable to SCG IP]`.

**Invariant E — Golden benchmarks never leak into tool repo.**
- Recognized golden set: `gleason`, `heagy`, `anderson`. All three are real privileged cases.
- Inputs + outputs + diffs live under `Cases/<id>/` (gitignored). Same posture as any other case.
- Only SHA-256 hashes of expected outputs are tracked in tool repo at `tests/golden/<id>.sha256`. Hashes are one-way; they are not privileged content.
- `verify` computes hashes of a fresh pipeline run and compares to the tracked `.sha256`. Never writes privileged content into `tests/`.
- `bless <id>` promotes the current `Cases/<id>/expected/` hash set to `tests/golden/<id>.sha256` after human review. This is the only path by which hashes update.

**Invariant F — Voice drift is a defect, not a preference.**
- `VOICE.md` is the authored gold standard. Tier 2 SCG IP.
- Any draft that fails Layer 2a (§21 prohibited phrases, §11 "Never use" terminology, §2 date format, §3 case-name convention, §9/§10 boilerplate verbatim) is rejected automatically. §21 violations are HARD BLOCK with no override.
- Layer 2b (stylometric fingerprint) failures flag for review but do not auto-reject (legitimate case-specific variance exists).
- Layer 2c (LLM Judge rubric) scores below threshold require human sign-off before Tier 1 delivery.
- Stylometric fingerprints at `tests/golden/<id>.voice.json` are metadata (counts, distributions, path names) — not privileged content. Safe in tool repo.

## Case ID Convention

Per `PIPELINE.md`: case IDs follow `[attorney-surname]-[plaintiff-surname]-[YYYY]`.
Benchmark cases already recognized in project: `gleason`, `heagy`, `anderson`.

## Arguments

Parse `$ARGUMENTS` into one of:

- `audit` (default) — scan for boundary violations. No writes.
- `engage <case>` — activate case `<case>`: create the directory tree, write `.case` state file, enable posture headers for this session.
- `label <path>` — apply/refresh the privilege header on a specific artifact.
- `verify [<id>|all]` — recompute hashes from `Cases/<id>/` pipeline run, diff against tracked `.sha256`. No privileged content touches the tool repo.
- `bless <id>` — after manual review, promote the current expected-output hashes for `<id>` into `tests/golden/<id>.sha256`. Blessing is the only way hashes change. Guarded by a confirmation gate.
- `voice-check <path>` — run Layer 2a only (deterministic rules). Fast. Auto-fires on every Write/Edit inside `Cases/$CASE/deliverables/` during an engagement (via PostToolUse hook).
- `voice-verify [<id>|all]` — run Layer 2a + 2b (stylometric fingerprint diff) against a golden's `.voice.json`. Used pre-QA.
- `voice-score [<id>|all]` — full 2a + 2b + 2c (LLM Judge rubric). Used pre-Tier-1 delivery.
- `voice-bless <id>` — regenerate `tests/golden/<id>.voice.json` from `Cases/<id>/expected/`. Confirmation-gated.
- `voice-allow <path> <block-id>` — record an intentional variance on a §9 boilerplate block for this file (logged to `Cases/$CASE/.voice-allow`).
- `exit` — deactivate case mode, remove `.case`, confirm no case data is staged in the tool repo.

`--strict` elevates every WARN to a blocking FAIL.

---

## Tool-IP exclusions (applied to leak scans)

These files contain legitimate template language with placeholder party names and must be excluded from boundary-leak regexes:

- `VOICE.md`
- `PIPELINE.md`
- `ENTERPRISE_BRAIN.md`
- `AISDLC_MASTER_PROCESS.md`
- `agents/**/*.md`
- `.claude/**` (skills, commands)
- `Brand/**`
- `Docs/**`
- `lane-responses-*.md` (schema-design discussions)

A finding in any of these is IP, not a leak — unless it contains an actual party name (not a bracketed placeholder).

---

## Phase 1 — Research

No narrative. Emit a fact block.

Run:
1. `!pwd`
2. `!git rev-parse --show-toplevel 2>/dev/null || echo not_a_git_repo`
3. `!grep -E '^Cases/?$' .gitignore 2>/dev/null || echo MISSING_Cases_gitignore`
4. `!grep -E '^\.case$' .gitignore 2>/dev/null || echo MISSING_case_state_gitignore`
5. `!test -d Cases && find Cases -maxdepth 1 -mindepth 1 -type d | head -20 || echo no_Cases_dir`
6. `!test -f .case && cat .case || echo no_case_state_file`
7. Tool-repo leak scan (excluding known-IP files and `tests/golden/`):
   `!grep -rniE '(plaintiff|defendant|docket|case no\.)[^a-z]' --include='*.py' --include='*.md' --include='*.yaml' --include='*.yml' . 2>/dev/null | grep -vE '^\./(Cases/|tests/golden/|VOICE\.md|PIPELINE\.md|ENTERPRISE_BRAIN\.md|AISDLC_MASTER_PROCESS\.md|agents/|\.claude/|Brand/|Docs/|lane-responses-|node_modules/|\.git/)' | grep -vE '\[(plaintiff|defendant|attorney|client)' | head -40 || true`
8. `!test -d tests/golden && ls tests/golden 2>/dev/null || echo no_golden_dir`
9. `!for id in gleason heagy anderson; do test -f "tests/golden/$id.sha256" && echo "golden:$id:hashes_tracked" || echo "golden:$id:MISSING_hashes"; done`
10. Negative check — no privileged content leaked into `tests/`:
    `!find tests/golden -type f ! -name '*.sha256' ! -name 'README.md' 2>/dev/null | head`
    Any output here is a HARD FAIL — only `.sha256` files and a README may live under `tests/golden/`.
11. Cross-contamination scan — a benchmark ID appearing inside a different `Cases/<other>/`:
    `!for id in gleason heagy anderson; do grep -rniE "\\b${id}\\b" Cases/ 2>/dev/null | grep -v "Cases/${id}/" | head -5; done`

Output table:

| Check | State |
|---|---|
| repo root | … |
| `.gitignore` has `Cases/` | yes / MISSING |
| `.gitignore` has `.case` | yes / MISSING |
| `Cases/` directory exists | yes / no |
| active case (`.case` state file) | `<case-id>` / none |
| real party/docket strings in tool code (after IP exclusions) | 0 / N hits |
| posture header required this session | yes / no |
| golden hashes tracked (gleason / heagy / anderson) | … / … / … |
| `tests/golden/` contains only `.sha256` + README | PASS / HARD FAIL |
| cross-contamination (benchmark ID in wrong `Cases/`) | 0 / N hits — HARD FAIL if > 0 |

---

## Phase 2 — Synthesis

Pick one branch based on arg + facts:

- `audit` → Phase 3.A (read-only report).
- `engage <case>` → Phase 3.B.
- `label <path>` → Phase 3.C.
- `exit` → Phase 3.D.
- `verify [<id>|all]` → Phase 3.E.
- `bless <id>` → Phase 3.F.
- `voice-check <path>` → Phase 3.G.
- `voice-verify [<id>|all]` → Phase 3.H.
- `voice-score [<id>|all]` → Phase 3.I.
- `voice-bless <id>` → Phase 3.J.
- `voice-allow <path> <block-id>` → Phase 3.K.

State chosen branch in one line. Proceed.

---

## Phase 3 — Deliver

### 3.A Audit (read-only)

Report, in this order:
1. **Boundary leaks** — real party/docket strings found in Phase 1 step 7. For each hit, print `path:line — snippet`. Recommend moving the fact to `Cases/<case-id>/` or redacting.
2. **Missing gitignore rules** — if `Cases/` or `.case` is missing from `.gitignore`, print the exact lines to add.
3. **Orphan case data** — any files under `Cases/*/` that got committed despite gitignore:
   `!git ls-files Cases 2>/dev/null | head -20`
   Any result here is a **HARD FAIL** — privileged content in git history.
4. **Posture gaps** — deliverables under `Cases/` missing the privilege header:
   `!grep -rLE 'Prepared at the direction of counsel' Cases/*/analysis Cases/*/deliverables 2>/dev/null | head -20`
   List each. Offer to run `/ultraplan label <path>` on each.
5. **IP contamination check** — TODO/FIXME in tool code that references a real case or client (excluding IP files):
   `!grep -rniE 'TODO|FIXME|XXX' --include='*.py' --include='*.md' . 2>/dev/null | grep -vE '^\./(Cases/|\.claude/|node_modules/|\.git/)' | grep -viE 'example|placeholder' | head -20`

If `--strict` and any WARN exists, exit with `[GATE FAIL]` and stop.

### 3.B Engage `<case-id>`

Stop conditions:
- No `<case-id>` provided → STOP, ask for the ID (format: `[attorney]-[plaintiff]-[YYYY]`, or known benchmark: `gleason|heagy|anderson`).
- Not in a BLACK-BAR repo (no `BLACK-BAR/CLAUDE.md` or equivalent) → STOP, confirm.

**Preflight — both layers must be green before engaging anything:**

```bash
if ! /ultraplan verify all --strict > /tmp/ultraplan-hash.log 2>&1; then
  echo "[GATE FAIL: hash — tool broken, see /tmp/ultraplan-hash.log]"
  [ "$FORCE" = "1" ] || exit 1
fi
if ! /ultraplan voice-verify all > /tmp/ultraplan-voice.log 2>&1; then
  echo "[GATE FAIL: voice — style drift against goldens, see /tmp/ultraplan-voice.log]"
  [ "$FORCE" = "1" ] || exit 1
fi
```

Hash verify is hard-blocking. Voice-verify is hard-blocking on 2a, advisory on 2b (non-zero exit only if 2b features fall outside ±3σ — a stricter "obviously broken" envelope).

**Cross-contamination hard gate — a benchmark ID must never appear inside a different case's silo:**

```bash
for id in gleason heagy anderson; do
  hits=$(grep -rniE "\\b${id}\\b" Cases/ 2>/dev/null | grep -v "Cases/${id}/" | head -5)
  if [ -n "$hits" ]; then
    echo "[GATE FAIL: cross-contamination — '$id' found inside a different Cases/]"
    echo "$hits"; exit 1
  fi
done
```

Set up the silo:

```bash
CASE="<case-id>"
mkdir -p "Cases/$CASE"/{data/raw,data/warehouse,data/exports,analysis,deliverables,notes,inputs}
test -s "Cases/$CASE/README.md" || cat > "Cases/$CASE/README.md" <<EOF
# Case: $CASE
Classification: Privileged & Confidential — Attorney Work Product
Matter opened: $(date +%Y-%m-%d)
Counsel of record: <TBD>
Tool(s) in use: BLACK-BAR
Boundary rule: Nothing in this directory leaves. Patterns may be abstracted
and lifted to SCG IP only after review.
EOF
```

Enforce gitignore — both the silo and the state file:

```bash
grep -qxF 'Cases/' .gitignore 2>/dev/null || echo 'Cases/' >> .gitignore
grep -qxF '.case'  .gitignore 2>/dev/null || echo '.case'  >> .gitignore
```

Write the repo-scoped state file (not an exported env var):

```bash
cat > .case <<EOF
CASE=$CASE
DATA_DIR=Cases/$CASE/data
ACTIVATED=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
```

**Do not `export` anything.** The state file is the source of truth for this repo only. Scope dies the moment the user `cd`s out.

Print the activation block:

```
[CASE ACTIVE: <case-id>]  (repo-scoped via ./.case)
  DATA_DIR=Cases/<case-id>/data
  Privilege header: ENABLED for file writes within this repo.
  Subprocess invocations should prefix env inline, e.g.:
     DATA_DIR=Cases/<case-id>/data python scripts/run.py ingest
  Reminder: no case facts in tool code, configs, or commits.
```

From this point forward, every file written under `Cases/<case-id>/` (or anywhere in this repo if the artifact is a deliverable) must include the privilege header as the first block:

```
Prepared at the direction of counsel — privileged and confidential — attorney work product.
Case: <case-id>    Prepared: <YYYY-MM-DD>    By: Swainston Consulting Group
```

For structured formats:
- **docx / pdf**: header on every page, footer on cover page.
- **xlsx**: row 1 across all used columns, frozen; cover sheet named `PRIVILEGE`.
- **pptx**: footer on every slide; full statement on title slide.
- **md / csv**: first line / commented header row.

### 3.C Label `<path>`

Inspect the file. If it already contains the privilege line, exit OK. Otherwise, prepend the correct form for its type:

- `.md` / `.txt` — prepend the two-line block above.
- `.csv` — prepend a `#` header row (confirm with user before writing — some CSV consumers choke on this).
- `.py` / `.sql` — prepend a `#`-commented block.
- `.docx` / `.pptx` / `.xlsx` / `.pdf` — **refuse to edit binary blindly**; report the correct skill to use (`docx`, `pptx`, `xlsx`, `pdf`) and the exact header text to insert.

Confirm before writing if the file is Tier 1 (client-facing / external).

### 3.D Exit

```bash
CASE=$(grep '^CASE=' .case 2>/dev/null | cut -d= -f2)
rm -f .case
```

Re-run Phase 1 checks. Confirm:
- `.case` state file removed.
- No real party strings present in tool repo outside `Cases/`.
- No case files staged in git (`git status --short | grep '^.. Cases/'` must be empty).
- Print: `[CASE CLOSED: <case-id>]  Tool repo clean. Deliverables remain under Cases/<case-id>/.`

### 3.E Verify `[<id>|all]`

Recompute hashes from a fresh pipeline run and diff against the tracked `.sha256`. Every file this phase writes lands inside `Cases/<id>/` — which is gitignored. The tool repo stays clean. Nothing under `tests/golden/` is ever written here; that directory updates only via `bless`.

```bash
IDS="${1:-all}"
if [ "$IDS" = "all" ]; then IDS="gleason heagy anderson"; fi
FAIL=0
for ID in $IDS; do
  case "$ID" in gleason|heagy|anderson) ;; *)
    echo "[SKIP] $ID not in recognized benchmark set"; continue ;;
  esac
  if [ ! -d "Cases/$ID" ]; then
    echo "[FAIL] $ID — Cases/$ID missing (privileged input not present on this machine)"; FAIL=1; continue
  fi
  if [ ! -f "tests/golden/$ID.sha256" ]; then
    echo "[FAIL] $ID — tests/golden/$ID.sha256 missing. Run \`/ultraplan bless $ID\` after manual review."; FAIL=1; continue
  fi

  # Run pipeline against the real case. Output lands inside Cases/<id>/ only.
  OUT="Cases/$ID/verify-run"
  rm -rf "$OUT" && mkdir -p "$OUT"
  DATA_DIR="Cases/$ID/data" python scripts/run.py verify --out "$OUT" \
    > "Cases/$ID/verify.log" 2>&1 || { echo "[FAIL] $ID — pipeline errored, see Cases/$ID/verify.log"; FAIL=1; continue; }

  # Hash the fresh outputs. Compare to tracked hashes. Nothing privileged leaves Cases/.
  ( cd "$OUT" && find . -type f -print0 | sort -z | xargs -0 shasum -a 256 ) \
    > "Cases/$ID/actual.sha256"
  if diff -u "tests/golden/$ID.sha256" "Cases/$ID/actual.sha256" > "Cases/$ID/hash.diff"; then
    echo "[PASS] $ID"
  else
    echo "[FAIL] $ID — hash drift. Investigate inside Cases/$ID/hash.diff (privileged)."
    FAIL=1

    # ── Plain-English failure diagnosis ──
    # Built from hash-list metadata only (counts, path names, file sizes).
    # Never from file content. Path names are already tracked in tests/golden/<id>.sha256,
    # so echoing them here does not leak privileged content.
    EXPECTED="tests/golden/$ID.sha256"
    ACTUAL="Cases/$ID/actual.sha256"

    n_exp=$(wc -l < "$EXPECTED" | tr -d ' ')
    n_act=$(wc -l < "$ACTUAL"   | tr -d ' ')

    exp_paths=$(awk '{print $2}' "$EXPECTED" | sort)
    act_paths=$(awk '{print $2}' "$ACTUAL"   | sort)
    added=$(  comm -13 <(echo "$exp_paths") <(echo "$act_paths"))
    removed=$(comm -23 <(echo "$exp_paths") <(echo "$act_paths"))
    common=$( comm -12 <(echo "$exp_paths") <(echo "$act_paths"))

    changed=0
    while IFS= read -r p; do
      [ -z "$p" ] && continue
      e=$(grep " $p\$" "$EXPECTED" | awk '{print $1}')
      a=$(grep " $p\$" "$ACTUAL"   | awk '{print $1}')
      [ "$e" != "$a" ] && changed=$((changed+1))
    done <<< "$common"

    n_added=$(echo "$added"   | grep -c . || true)
    n_removed=$(echo "$removed" | grep -c . || true)

    echo ""
    echo "── Why $ID failed (plain English) ──"
    echo "Expected files: $n_exp     Actual files: $n_act"
    echo "New files: $n_added     Missing files: $n_removed     Same path, different hash: $changed"
    echo ""

    if [ "$n_added" -gt 0 ] && [ "$n_removed" -eq 0 ] && [ "$changed" -eq 0 ]; then
      echo "Diagnosis: pipeline produced NEW output files that weren't in the blessed set."
      echo "Likely cause: a new stage or report was added to the pipeline since the last bless."
      echo "Action: review the new files in Cases/$ID/verify-run/. If correct, run: /ultraplan bless $ID"
    elif [ "$n_removed" -gt 0 ] && [ "$n_added" -eq 0 ] && [ "$changed" -eq 0 ]; then
      echo "Diagnosis: pipeline STOPPED producing some files that used to exist."
      echo "Likely cause: a stage was removed, renamed, or silently skipped."
      echo "Action: check logs at Cases/$ID/verify.log for skipped/errored stages."
    elif [ "$changed" -gt 0 ] && [ "$n_added" -eq 0 ] && [ "$n_removed" -eq 0 ]; then
      if [ "$changed" -eq "$n_exp" ]; then
        echo "Diagnosis: EVERY output file differs. This usually means a non-determinism leak"
        echo "(timestamp, random seed, unsorted records) — not an analytical change."
        echo "Action: check for un-pinned timestamps or unsorted output in scripts/run.py verify."
      else
        echo "Diagnosis: $changed of $n_exp files have different content; structure is intact."
        echo "Likely cause: pipeline logic change affecting specific outputs."
        echo "Action: compare the differing files inside Cases/$ID/hash.diff to see which reports changed,"
        echo "then inspect those files directly inside Cases/$ID/verify-run/ vs Cases/$ID/expected/."
      fi
    elif [ "$n_added" -gt 0 ] || [ "$n_removed" -gt 0 ]; then
      echo "Diagnosis: the pipeline's output SHAPE changed — files added AND removed/changed."
      echo "This is usually a schema or structural change, not a bug."
      echo "Action: decide whether the new shape is correct. If so: /ultraplan bless $ID."
    else
      echo "Diagnosis: hashes match but diff still reports drift — check line endings or trailing whitespace."
    fi

    echo ""
    echo "Privileged detail (not shown here) lives at: Cases/$ID/hash.diff and Cases/$ID/verify-run/"
    echo "Previous known-good is derived from Cases/$ID/expected/ (also privileged)."
  fi
done
test $FAIL -eq 0 && echo "[GOLDEN: all green]" || echo "[GOLDEN: failures — tool is in a broken state]"
```

The analyst reads the plain-English block and knows *what kind of drift* happened before opening anything privileged. Determinism leak → fix the pipeline. Real analytical change → dive into the privileged diff to evaluate.

### 3.F Bless `<id>`

Bless is Tier 1: it changes what "correct" means for the whole pipeline. The confirmation gate is mandatory, not skippable.

```bash
ID="$1"
case "$ID" in gleason|heagy|anderson) ;; *)
  echo "[STOP] bless requires one of: gleason heagy anderson"; exit 1 ;;
esac
if [ ! -d "Cases/$ID/expected" ]; then
  echo "[STOP] Cases/$ID/expected missing — nothing to bless."; exit 1
fi

echo "About to overwrite tests/golden/$ID.sha256 from Cases/$ID/expected/."
echo "This promotes the current outputs as the new regression truth."
read -r -p "Confirm [yes/NO]: " ans
[ "$ans" = "yes" ] || { echo "[ABORT] not blessed"; exit 1; }

( cd "Cases/$ID/expected" && find . -type f -print0 | sort -z | xargs -0 shasum -a 256 ) \
  > "tests/golden/$ID.sha256"
echo "[BLESSED] $ID — tests/golden/$ID.sha256 updated. Commit this file."
```

### 3.G Voice-check (Layer 2a — deterministic rules)

Fast, deterministic pass. Runs §21 HARD BLOCK + §11 "Never use" + §2 date format + §3 case-name convention + §9/§10 boilerplate verbatim.

**Runtime:** `scripts/voice_check.sh <path>` — this is the enforced implementation. The script reads `.case` for the active `CASE=`, writes per-file logs under `Cases/<case>/voice-check-*.log`, and calls `scripts/voice_boilerplate_check.py` for §9/§10 matching with `.voice-allow` support.

**Auto-fire:** PostToolUse hook in `.claude/settings.local.json` invokes `voice_check.sh` on every Write/Edit whose `tool_input.file_path` matches `/Cases/*/deliverables/`. Exit 2 blocks the tool call (§21 HARD BLOCK); exit 1 surfaces violations without blocking; exit 0 passes silently.

**Contract:**
- Input: single file path, absolute or repo-relative.
- Exit 0 = PASS; exit 1 = §11/§2/§3/§9/§10 violations; exit 2 = §21 HARD BLOCK.
- Never writes outside `Cases/<case>/`. Never mutates the input file.
- `VOICE.md` at repo root is the standard; `VOICE_MD` env var overrides.

Invoked manually: `bash scripts/voice_check.sh path/to/draft.md`.

### 3.H Voice-verify (Layer 2a + 2b)

```bash
IDS="${1:-all}"
[ "$IDS" = "all" ] && IDS="gleason heagy anderson"

for ID in $IDS; do
  case "$ID" in gleason|heagy|anderson) ;; *)
    echo "[SKIP] $ID not in recognized benchmark set"; continue ;;
  esac
  [ -d "Cases/$ID" ] || { echo "[SKIP] $ID — Cases/$ID not present"; continue; }
  FP="tests/golden/$ID.voice.json"
  [ -f "$FP" ] || { echo "[FAIL] $ID — $FP missing. Run: /ultraplan voice-bless $ID"; continue; }

  # Run pipeline draft stage against the case. Output lands inside Cases/<id>/ only.
  OUT="Cases/$ID/voice-run"
  rm -rf "$OUT" && mkdir -p "$OUT"
  DATA_DIR="Cases/$ID/data" python scripts/run.py draft --out "$OUT" \
    > "Cases/$ID/voice.log" 2>&1 || { echo "[FAIL] $ID — draft errored, see Cases/$ID/voice.log"; continue; }

  # 2a on every draft file
  for f in "$OUT"/*.md "$OUT"/*.docx; do
    [ -f "$f" ] && /ultraplan voice-check "$f" || true
  done

  # 2b stylometric diff
  python3 scripts/voice_fingerprint.py extract "$OUT" > "Cases/$ID/actual.voice.json"
  python3 scripts/voice_fingerprint.py diff "$FP" "Cases/$ID/actual.voice.json" \
    --sigma 2 --report "Cases/$ID/voice-diff.md"
  echo "[REPORT] $ID — see Cases/$ID/voice-diff.md"
done
```

All output paths live under `Cases/<id>/`. Fingerprint metadata is the only thing that touches `tests/golden/`, and only through `voice-bless`.

### 3.I Voice-score (Layer 2a + 2b + 2c — LLM Judge rubric)

Layer 2c runs the Judge. Input: VOICE.md + fresh draft + golden reference for report type (from §18 map). Output: scorecard under `Cases/<id>/`.

```bash
ID="$1"
[ -d "Cases/$ID" ] || { echo "[STOP] Cases/$ID missing"; exit 1; }

# Short-circuit if 2a/2b fail hard
/ultraplan voice-verify "$ID" || { echo "[STOP] voice-verify failed; fix before scoring"; exit 1; }

TYPE=$(python3 scripts/voice_fingerprint.py golden-type "$ID")

python3 scripts/voice_judge.py \
  --voice VOICE.md \
  --golden "Cases/$ID/expected" \
  --draft "Cases/$ID/voice-run" \
  --report-type "$TYPE" \
  --out "Cases/$ID/voice-scorecard.md"

echo "[REPORT] scorecard: Cases/$ID/voice-scorecard.md  (privileged)"
```

Scorecard structure:

```
# Voice Scorecard — <id> (<report-type>)

## §16 Attack Patterns                 [x/10 present, scored 1–5 each]
## §17 Peterson Playbook               [if applicable]
## §12 Code Citation Methodology       [sequence adherence 1–5]
## §20 Voice Test                      [1–5]
## §18 Benchmark Match                 [1–5, with rationale referencing the golden]

## Overall Threshold: ≥ 4.0 average, no dimension < 3
## Status: PASS | REVIEW | FAIL
```

Full scorecard (with quotes from the draft) stays in `Cases/<id>/` — privileged.

### 3.J Voice-bless

```bash
ID="$1"
case "$ID" in gleason|heagy|anderson) ;; *)
  echo "[STOP] voice-bless requires one of: gleason heagy anderson"; exit 1 ;;
esac
[ -d "Cases/$ID/expected" ] || { echo "[STOP] Cases/$ID/expected missing"; exit 1; }

echo "About to overwrite tests/golden/$ID.voice.json from Cases/$ID/expected/."
echo "This redefines the voice fingerprint for report type: $(python3 scripts/voice_fingerprint.py golden-type "$ID")"
read -r -p "Confirm [yes/NO]: " ans
[ "$ans" = "yes" ] || { echo "[ABORT] not blessed"; exit 1; }

mkdir -p tests/golden
python3 scripts/voice_fingerprint.py extract "Cases/$ID/expected" > "tests/golden/$ID.voice.json"
echo "[BLESSED] $ID.voice.json updated. Commit this file."
```

Tier 1 confirmation gate. The fingerprint JSON is metadata only — safe to commit.

### 3.K Voice-allow

```bash
FILE="$1"; BLOCK_ID="$2"
[ -n "$FILE" ] && [ -n "$BLOCK_ID" ] || { echo "usage: voice-allow <path> <block-id>"; exit 1; }
[ -f ".case" ] || { echo "[STOP] not in an active engagement"; exit 1; }
CASE=$(grep '^CASE=' .case | cut -d= -f2)

mkdir -p "Cases/$CASE"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)  $FILE  $BLOCK_ID  intentional variance" \
  >> "Cases/$CASE/.voice-allow"
echo "[ALLOW] $FILE / $BLOCK_ID — recorded."
```

`.voice-allow` is under `Cases/` (gitignored). Layer 2a reads it when checking §9/§10 boilerplate. Auditable inside the case silo.

---

## Quality gate table (emit at end of every run)

| Check | Status |
|---|---|
| `Cases/` gitignored | … |
| `.case` gitignored | … |
| No real party/docket strings leaked into tool repo | … |
| `.case` state file matches requested case | … / n/a |
| No `export CASE` / `export DATA_DIR` in shell (scope stays repo-local) | … |
| Privilege header applied to deliverables this session | … / n/a |
| Cross-case movement flagged with `[PATTERN: …]` when used | … / n/a |
| Tier 1 artifacts confirmed before write | … / n/a |
| Golden hashes tracked (gleason / heagy / anderson) | … / … / … |
| Golden benchmarks last run: PASS / N/A | … |
| `tests/golden/` contains only `.sha256` + README (no privileged content) | PASS / HARD FAIL |
| Cross-contamination check (benchmark ID in wrong `Cases/`) | PASS / HARD FAIL |
| Bless action this session required explicit confirmation | PASS / n/a |
| `verify` wrote no files outside `Cases/<id>/` | PASS / HARD FAIL |
| VOICE.md present and parseable | … |
| All three goldens have `.voice.json` fingerprints | … / N missing |
| Latest voice-check on Tier 1 output | PASS / FAIL |
| Latest voice-score ≥ 4.0 avg, no dim < 3 | PASS / REVIEW / FAIL |
| `.voice-allow` variances this session | N logged / n/a |
| §21 HARD BLOCK — no prohibited phrase in any output | PASS / HARD FAIL |

Any FAIL = `[GATE FAIL: <dimension> — <one-line finding>]` inline before further action.

## Stop conditions

- `engage` invoked without `<case-id>` → STOP, ask for the ID.
- `engage` invoked inside a non-SCG repo → STOP, confirm with user.
- Attempt to write a case fact into a tool-repo file → STOP, route write into `Cases/<case-id>/`.
- `--strict` + any audit WARN → STOP.
- Any file committed under `Cases/` (orphan in git history) → STOP, escalate immediately.
- `verify <id>` where `<id>` ∉ `{gleason, heagy, anderson}` → STOP, list recognized set.
- `tests/golden/<id>.sha256` missing → STOP, instruct to run `bless <id>` after review.
- `Cases/<id>/` missing during verify → STOP with note: privileged input not present on this machine.
- Any file under `tests/golden/` that is not `.sha256` or `README.md` → HARD STOP, this is a privilege-leak vector.
- Golden FAIL during `engage <case>` without `--force` → STOP, print `hash.diff` path inside `Cases/<id>/`.
- Cross-contamination hit (benchmark ID found inside a different case's silo) → HARD STOP.
- `voice-check` returns exit 2 (§21 HARD BLOCK) → HARD STOP. No override. The phrase must be removed or placed inside a verbatim quote with attribution per §21's narrow exception.
- `voice-score` below threshold with no human review recorded → STOP before Tier 1 delivery.
- `VOICE.md` missing when Layer 2 is invoked → STOP with `[GATE FAIL: voice-reference-missing]`.
- Fresh `voice-bless` performed without regenerating dependent fingerprints → WARN, surface list of affected cases.

## Pipeline requirement — determinism

This command assumes the tool pipeline exposes a `verify` subcommand that:
- Reads `$DATA_DIR` (or `--data-dir`) for inputs.
- Writes deterministic outputs to `--out`.
- Produces byte-identical results given identical inputs — no timestamps in headers, no random seeds, sorted output.

Without determinism, the hash check will false-fail. If the current pipeline is non-deterministic, treat that as a blocker for enabling the verify/bless gates.

## Pattern flag

`[PATTERN: case boundary enforcement + automatic privilege posture — abstractable across every SCG tool (forensic pipelines, review systems, scorecards) regardless of domain.]`

End of runbook.
