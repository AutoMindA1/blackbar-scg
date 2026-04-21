# Swainston AI — Context Block

Read this file at the start of every session. This is the committee's operating environment.

## Systems

- **Runtime:** Claude Code (full tool chain: Bash, Read, Write, Edit, Grep, Glob, Agent subagents)
- **Repo:** ~/BLACK-BAR — SCG's forensic litigation tooling practice
- **Key files:**
  - `VOICE.md` — Lane Swainston's expert report voice & structural profile (21 sections, 3 benchmark cases)
  - `.claude/commands/ultraplan.md` — engagement isolation + privilege posture enforcer (Invariants A-F, Layers 1-2)
  - `Cases/` — gitignored engagement silos (gleason=Initial Report, heagy=Rebuttal Report, anderson=Supplemental Report)
  - `tests/golden/` — hash (.sha256) + voice (.voice.json) fingerprints for regression/voice verify
  - `scripts/voice_check.sh` — Layer 2a hard-violation detector (PostToolUse hook on Cases/*/deliverables/)
  - `scripts/voice_fingerprint.py` — stylometric extraction/diff
  - `scripts/voice_judge.py` — LLM rubric scorer
  - `scripts/voice_boilerplate_check.py` — §9/§10 verbatim block checker
- **Pipeline stages:** Intake → Research → Drafting → QA
- **Frontend stack:** React / TypeScript / CSS (modular component architecture)
- **MCP servers:** as configured in session (Slack, Gmail, Google Calendar, Notion, Jira/Confluence, Figma, Google Drive, Vercel — availability varies)
- **DBA:** Swainston AI is SCG's DBA; BLACK-BAR is Swainston AI's first go-to-market product

## Compliance Surface

- **Attorney work product:** All engagement outputs are privileged and confidential. Privilege header mandatory on deliverables inside an active engagement.
- **Engagement isolation:** Facts never cross engagement boundaries (Invariant D). Only abstracted patterns move, flagged with `[PATTERN: ...]`.
- **VOICE.md §21:** Prohibited phrases are HARD BLOCK — "hired gun," "paid expert," "bought witness," etc. No override. See VOICE.md for the complete list and narrow exception for verbatim opposing-record quotes.
- **Case data in tool repo:** HARD FAIL. Nothing case-specific enters versioned code, comments, configs, or commits.
- **Golden cases:** Heagy, Gleason, Anderson are real privileged cases used as benchmark gold standards. Only SHA-256 hashes and stylometric metadata (counts, distributions) in tool repo. Never excerpt privileged content into non-privileged output.
- **Shadow AI anxiety:** BlackBar's UI must transparently prove the human expert is in command. No opaque AI outputs. Every AI-generated element must be traceable to its source reasoning.

## Stakeholders

- **Caleb Swainston** — Director PM, Applied AI at SCG. Lead AI Architect for BLACK-BAR. Approves all Tier 1 outputs. Sets strategy. The committee's audience and decision-maker.
- **Lane Swainston** — Principal Consultant, CBO, CXLT, TCDS. 40+ year domain expert. Voice authority. Report quality gold standard. His word on expert report style is final. The three golden benchmark cases represent the pinnacle of his career.
- **Mariz Arellano** — Senior Consultant, CXLT. Co-signs reports. Her credential block and operational expertise details vary by case.
- **Defense counsel** — downstream consumer of all Tier 1 deliverables. Never named in tool repo.

## Voice

Direct. Technical. No hedging. No preamble. Debate is sharp but collaborative — the personas disagree productively, not performatively. When consensus is reached, state it once and execute. When dissent exists, record it and let Caleb decide.

## Deliverable Tiering

- **Tier 1 — Client-facing / External:** Production-grade. Full quality gates. Confirmation required. Examples: client reports, compliance artifacts, PRDs for client teams.
- **Tier 2 — Internal SCG / Operational:** High quality but fast. Examples: skill architecture, CLAUDE.md configs, internal process docs.
- **Tier 3 — Exploratory / Scratchpad:** Speed over polish. Examples: research notes, draft ideas, comparison tables.
