# QA Pipeline — Reusable Multi-Agent Review Workflow

## PURPOSE
Automated quality assurance for BlackBar pipeline documentation and report outputs. Spawns three independent sub-agents in parallel, each with a distinct audit mandate, then compiles findings into a single consolidated QA report with confidence ratings.

## WHEN TO USE
- After any agent prompt update (Intake, Research, Drafting, QA)
- After VOICE.md revisions
- Before promoting pipeline to next phase
- After integrating pressure test fixes
- On any new case output (intake.md, research.md, draft.md, qa-report.md)

## WORKFLOW

### Step 1: DISCOVER
```
Glob all *.md files in target directory (excluding .claude/, .git/, node_modules/)
Inventory file count and total size
```

### Step 2: SPAWN (parallel)
Launch 3 sub-agents simultaneously using the Agent tool:

**Agent A — Accuracy Verification**
- Cross-file contradictions (paths, names, dates, versions)
- Internal factual errors
- Claims vs. actual repo structure
- Credential/terminology inconsistencies
- Each finding rated: HIGH / MEDIUM / LOW confidence + BLOCKING / NOTABLE / MINOR severity

**Agent B — Logical Consistency**
- Workflow gaps: handoff inputs not produced by prior agent
- Missing dependencies: files/fields required but never created
- Contradictory rules between agents
- Escalation logic alignment across QA agent, pipeline, and pressure test
- Schema alignment: Intake → Research → Drafting → QA data flow
- Each finding rated: HIGH / MEDIUM / LOW confidence + BLOCKING / NOTABLE / MINOR severity

**Agent C — Source Quality**
- Standards/codes cited with version/year
- Benchmark PDFs consistently referenced with correct dates
- External dependencies described with enough specificity
- Credential claims consistent across files
- Boilerplate block numbering consistent
- VOICE.md section cross-references valid
- File path conventions consistent
- Each finding rated: HIGH / MEDIUM / LOW confidence + BLOCKING / NOTABLE / MINOR severity

### Step 3: COMPILE
- Deduplicate findings across agents (retain higher severity on overlaps)
- Group into BLOCKING / NOTABLE / MINOR tables
- Calculate severity and confidence distributions
- Identify top 5 priority actions that resolve multiple findings each

### Step 4: SAVE
```
Save consolidated report to: reports/[YYYY-MM-DD]_qa-report.md
```

## OUTPUT FORMAT
```
# BlackBar Pipeline — Consolidated QA Report
**Date:** [date]
**Scope:** [file count] markdown files
**Status:** [N] FINDINGS — [B] BLOCKING, [N] NOTABLE, [M] MINOR

## BLOCKING FINDINGS
[Table: #, Source Agent, Issue, Files, Confidence]

## NOTABLE FINDINGS
[Table: #, Source Agent, Issue, Files, Confidence]

## MINOR FINDINGS
[Table: #, Source Agent, Issue, Files, Confidence]

## SEVERITY DISTRIBUTION BY AGENT
[Summary table]

## TOP 5 PRIORITY ACTIONS
[Each resolves multiple findings; includes specific action steps]
```

## CONFIDENCE RATINGS
- **HIGH** — Multiple cross-references confirm; verifiable against source materials
- **MEDIUM** — Identified by implication or single-source; not directly verifiable
- **LOW** — Speculative or dependent on unavailable information

## SEVERITY RATINGS
- **BLOCKING** — Prevents agents from completing task or produces unreliable output
- **NOTABLE** — Degrades quality or creates ambiguity; requires human review
- **MINOR** — Editorial or formatting; does not affect functionality
