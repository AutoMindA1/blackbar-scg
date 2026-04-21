---
name: blackbar-legion
description: >
  Spin up multi-agent Claude Code topologies in tmux on Caleb's Mac — from a 2-pane
  Starter to a full BlackBar Legion 3-tier hierarchy with Orchestrator, Team Leads, and
  Workers running in parallel. Customized for the BlackBar forensic report pipeline,
  AISDLC phases, and Caleb's specific project layout (~/BLACK-BAR, ~/AI-STUDIO/Circus Circus).
  Use this skill whenever someone asks to run multiple Claude Code agents, set up multi-agent
  tmux sessions, configure agent teams, spin up parallel Claude sessions, go THUNDERSTRUCK,
  run the Legion, or asks about Agent Teams vs. Subagents. Also triggers on questions about
  tmux + Claude Code, CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS, running parallel agents on a Mac,
  headless Claude Code, AnyDesk remote agent execution, or any request to "run everything at once."
  Always use this skill — don't guess at tmux commands or tier mappings from memory.
---

# BlackBar Legion — Multi-Agent Claude Code on Caleb's Mac

Spin up parallel Claude Code agent topologies on your Mac, from 2-pane Starter to full
BlackBar Legion with AISDLC-integrated 3-tier hierarchy. Three tiers, each buildable
independently, each prerequisite for the next.

---

## Before Anything — One-Time Setup

### 1. Unlock Agent Teams

```bash
echo 'export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1' >> ~/.zshrc
source ~/.zshrc
```

Without this flag, you have sub-agents (children of a single session) — not teams
(independent parallel sessions with their own context windows).

### 2. Prevent Mac Sleep Kill

```bash
caffeinate -s &
```

Run this before any long session. Without it, Mac sleep kills your tmux sessions dead —
this is what killed the Mariz augmentation run overnight.

### 3. Verify Claude Code CLI

```bash
which claude && claude --version
```

If not found: `npm install -g @anthropic-ai/claude-code`

---

## Agent Teams vs. Subagents — The Distinction That Matters

| | Subagents | Agent Teams |
|---|---|---|
| Scope | Child of one session | Independent parallel sessions |
| Context | Shared with parent | Own context window (own CLAUDE.md) |
| Return | Returns result to parent | Coordinates via filesystem / git |
| Use case | Focused sub-task ("verify this quote") | Parallel workstreams ("you do research, you do drafting") |
| Flag needed | No | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` |
| Cost | Parent session tokens only | Each session bills separately |

**BlackBar example:** When the Heikila trial prep needed Steps A-G + Step H + Step I,
subagents would have run them sequentially inside one session. Agent teams would have run
Step H (verification) and Step I (reconciliation) in parallel tmux panes, each with their
own context, finishing in half the time.

---

## STARTER — 2 Panes, Getting Comfortable

**Minimum viable setup.** Two agents, sub-agents on demand.

### tmux Commands

```bash
# Create session
tmux new -s blackbar

# Split vertical: Ctrl+B, then %
# Pane 1: Navigate to project
cd ~/BLACK-BAR/webapp && claude

# Pane 2: Navigate to same or different project
cd ~/BLACK-BAR/webapp && claude
```

### Navigation Cheat Sheet

| Action | Keys |
|---|---|
| Split vertical | `Ctrl+B` then `%` |
| Split horizontal | `Ctrl+B` then `"` |
| Switch panes | `Ctrl+B` then arrow key |
| Detach (keep alive) | `Ctrl+B` then `d` |
| Reattach | `tmux attach -t blackbar` |
| Kill session | `tmux kill-session -t blackbar` |
| List sessions | `tmux ls` |

### Skills to Master First

| Skill | Why It Matters for BlackBar |
|---|---|
| CLAUDE.md | BlackBar has project CLAUDE.md with HARD RULES — agents must read it |
| Permissions | `Shift+Tab` cycles: default → accept edits → bypass. Use "accept edits" for trusted work, bypass for autonomous runs |
| Plan Mode | Review agent's plan before it touches schema.prisma or VOICE.md |
| Git Worktrees | Each agent works on an isolated branch — no merge conflicts |
| Slash Commands | `/resume-hikila`, `/finish-hikila` — custom commands in `.claude/commands/` |
| Subagents | One agent spawns a child for "verify this quote against source" — result returns |
| Esc+Esc | Interrupt a runaway agent without killing the session |
| Self-Verification | Agent checks its own output before handing off (critical for forensic accuracy) |

---

## ADVANCED — Orchestrator + Teams

**One session decomposes the task. Teams receive briefs and execute in parallel.**

### tmux Setup

```bash
tmux new-session -d -s legion -n orchestrator

# Orchestrator window
tmux send-keys -t legion:orchestrator "cd ~/BLACK-BAR && claude" Enter

# Team windows
tmux new-window -t legion -n team-frontend
tmux send-keys -t legion:team-frontend "cd ~/BLACK-BAR/webapp && claude" Enter

tmux new-window -t legion -n team-backend
tmux send-keys -t legion:team-backend "cd ~/BLACK-BAR/webapp && claude" Enter

tmux new-window -t legion -n team-agents
tmux send-keys -t legion:team-agents "cd ~/BLACK-BAR/agents && claude" Enter

tmux attach -t legion
```

### Model Tier Routing — Don't Burn Budget

Every session bills separately. Route by role weight:

| Role | Model | Monthly Cost Estimate | When |
|---|---|---|---|
| Orchestrator | Opus | ~$15-25/day active | Task decomposition, architecture decisions, AISDLC phase transitions |
| Team Lead | Sonnet | ~$5-10/day active | Code review, testing strategy, deploy checklist |
| Worker | Haiku or Sonnet | ~$2-5/day active | Execution tasks, file edits, test runs |
| QA Worker | Sonnet | ~$5-8/day active | Structured verification, adversarial testing |

Set model per session:
```bash
# In each tmux pane, before starting claude:
export ANTHROPIC_MODEL=claude-sonnet-4-6  # or claude-opus-4-6, claude-haiku-4-5
claude
```

### BlackBar Team Assignments

| Team | Window | Responsibility | Model |
|---|---|---|---|
| Orchestrator | `orchestrator` | AISDLC phase routing, task decomposition, governance gates | Opus |
| Frontend | `team-frontend` | React pages, Tailwind styling, Zustand state, TanStack Query | Sonnet |
| Backend | `team-backend` | Express routes, Prisma schema, auth, security hardening | Sonnet |
| Agents | `team-agents` | Agent specs (Intake/Research/Drafting/QA), prompt engineering, VOICE.md compliance | Opus (voice-critical) |
| QA | (spawn on demand) | Build verification, lint, type-check, adversarial test generation | Sonnet |

### Coordination Pattern — Filesystem as Message Bus

Agent teams don't share context windows. They coordinate through the filesystem:

```
~/BLACK-BAR/
├── .legion/                    # Coordination directory
│   ├── orchestrator-brief.md   # Current task decomposition
│   ├── team-frontend.md        # Frontend team's current assignment
│   ├── team-backend.md         # Backend team's current assignment
│   ├── team-agents.md          # Agents team's current assignment
│   └── status.json             # Who's done, who's blocked
```

Orchestrator writes briefs. Teams read their brief, execute, commit to their branch,
and update status.json. Orchestrator polls status.json and assigns next task when a
team signals "done."

---

## LEGION — Full 3-Tier Hierarchy

**Orchestrator -> Leads -> Workers. Nothing waits for anyone.**

### spin-legion.sh — One Command Launch

Save to `~/BLACK-BAR/spin-legion.sh`:

```bash
#!/bin/bash
# BlackBar Legion — 3-tier multi-agent topology
set -e

PROJECT_ROOT=~/BLACK-BAR
WEBAPP=$PROJECT_ROOT/webapp

echo "Preventing Mac sleep..."
caffeinate -s &

echo "Spinning up BlackBar Legion..."

# Tier 1: Orchestrator
tmux new-session -d -s legion -n orchestrator
tmux send-keys -t legion:orchestrator \
  "cd $PROJECT_ROOT && export ANTHROPIC_MODEL=claude-opus-4-6 && claude --dangerously-skip-permissions" Enter

# Tier 2: Team Leads
for lead in frontend backend agents; do
  tmux new-window -t legion -n "lead-$lead"
  tmux send-keys -t legion:lead-$lead \
    "cd $WEBAPP && export ANTHROPIC_MODEL=claude-sonnet-4-6 && claude --dangerously-skip-permissions" Enter
done

# Tier 3: Workers (2 per lead)
for lead in frontend backend agents; do
  for i in 1 2; do
    tmux new-window -t legion -n "worker-$lead-$i"
    tmux send-keys -t legion:worker-$lead-$i \
      "cd $WEBAPP && export ANTHROPIC_MODEL=claude-sonnet-4-6 && claude --dangerously-skip-permissions" Enter
  done
done

echo "Legion is live. $(tmux list-windows -t legion | wc -l) windows."
echo "Attach: tmux attach -t legion"
echo "Switch windows: Ctrl+B then window number"

tmux attach -t legion
```

```bash
chmod +x ~/BLACK-BAR/spin-legion.sh
~/BLACK-BAR/spin-legion.sh
```

### Legion Topology — BlackBar Specific

```
         ┌─────────────────────┐
         │    ORCHESTRATOR     │
         │   AISDLC routing    │
         │   Opus · ~/BLACK-BAR │
         └──────────┬──────────┘
     ┌──────────────┼──────────────┐
     ▼              ▼              ▼
  LEAD-FRONTEND  LEAD-BACKEND   LEAD-AGENTS
  React/Vite     Express/Prisma  Pipeline specs
  Sonnet         Sonnet          Opus
   ┌┼┐            ┌┼┐            ┌┼┐
   w  w           w  w           w  w
   pages  styles  routes  schema intake research
```

### --dangerously-skip-permissions

This flag runs Claude Code in full autonomous mode — no permission prompts. The agents
execute without stopping to ask. Use it for Legion because permission prompts on 10
simultaneous windows would be unmanageable.

**Safety net:** Each agent still respects CLAUDE.md HARD RULES. The rules travel with
the project, not the permission mode. And git worktrees mean every agent works on an
isolated branch — nothing hits main without a merge.

**Alternative (less aggressive):** Instead of --dangerously-skip-permissions, use
`Shift+Tab` in each pane to cycle to "accept edits" mode. Still prompts for bash
commands but auto-accepts file edits.

---

## AnyDesk Remote Legion

Run Legion on your Mac, control it from anywhere via AnyDesk:

1. Install AnyDesk on your Mac
2. Set unattended access password
3. From any device: connect to your Mac's AnyDesk ID
4. Open Terminal/iTerm2
5. `tmux attach -t legion` — you're back in all your agents

**Key advantage:** Your Mac stays awake (caffeinate), agents keep running, you can
check in from your phone or another computer. Perfect for overnight runs.

### Headless Mode (No UI)

For fully autonomous execution without even attaching to tmux:

```bash
# Each agent reads from a task file and writes results
claude -p "$(cat .legion/team-frontend.md)" \
  --output-format json \
  > .legion/results/frontend-$(date +%s).json 2>&1 &
```

This is headless — Claude Code runs as a background process, reads the task from
the brief file, and writes structured output. No tmux needed, but you lose the
ability to interrupt or monitor in real-time.

---

## Two Accounts on the Same Mac

Running two Claude accounts (e.g., personal + work) in iTerm2:

```bash
# Terminal 1 — personal account
CLAUDE_CONFIG_DIR=~/.claude-personal claude

# Terminal 2 — work account
CLAUDE_CONFIG_DIR=~/.claude-work claude
```

**iTerm2 setup:** Preferences -> Profiles -> New profile -> Environment tab ->
set `CLAUDE_CONFIG_DIR` per profile. Save as Window Arrangement.
Each pane authenticates independently. No session bleed.

---

## Cost Control — Non-Negotiable at Legion Scale

Every session bills separately. 10 agents at Sonnet = 10x the cost of one.

| Control | How |
|---|---|
| Model tiers | Haiku for workers, Sonnet for leads, Opus only for orchestrator |
| Time-box sessions | Kill workers after task complete — don't leave them idling |
| Budget cap | Set at console.anthropic.com/settings (you have $40 credit, $30 cap recommended) |
| Monitor | `claude --usage` per session, or check console.anthropic.com/usage |
| Kill switch | `tmux kill-session -t legion` — stops ALL agents instantly |

### Cost Estimate by Topology

| Topology | Agents | Est. Cost/Hour | Est. Cost/Day (8hr) |
|---|---|---|---|
| Starter (2 panes) | 2 | $0.50-1.00 | $4-8 |
| Advanced (4 windows) | 4 | $1.50-3.00 | $12-24 |
| Legion (10 windows) | 10 | $4.00-8.00 | $32-64 |

[ASSUMPTION: Sonnet 4.6 at $3/$15 per 1M tokens, moderate activity per session]

---

## BlackBar-Specific CLAUDE.md Integration

Every agent session in the BlackBar repo auto-loads the project CLAUDE.md which contains:

- **HARD RULES**: No tsx in start script, no schema.prisma without migration, prowl dormant
- **VOICE.md**: Lane's voice profile, Section 21 prohibited phrases
- **ENTERPRISE_BRAIN.md**: Domain knowledge for agent pipeline
- **Directory map**: Where everything lives

This means every agent in the Legion already knows the rules. The Orchestrator's job is
task decomposition and governance — the rules enforcement is automatic.

---

## Quick Reference — BlackBar Legion Checklist

```
□ CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 in ~/.zshrc
□ caffeinate -s & before any session
□ API key funded at console.anthropic.com ($30 spend cap)
□ Starter: 2 panes working, CLAUDE.md loading confirmed
□ Advanced: Orchestrator + 3 team windows, model tiers set
□ Legion: spin-legion.sh saved + chmod +x, cost tracking active
□ AnyDesk: unattended access configured for remote monitoring
□ Kill switch tested: tmux kill-session -t legion
```
