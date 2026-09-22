# Loop Constraints

> Add rules below with `/constraints <rule>` in your agent.
> The `loop-constraints` skill reads this file at the start of every run.
> Constraints here are **binding** — the agent MUST follow them.

## Week one — report-only (L1)
- No source edits, no branches, no commits, no PRs
- Only STATE.md and loop-run-log.md may be modified
- Sub-agent spawns: 0 (see LOOP.md budget)

## Data sources (deepseek-harness)
- CI failures: `gh run list --status failure --limit 20`
- Tickets: `bd ready` (beads — this repo's tracker, not Linear)
- Recent commits: `git log --oneline --since="48 hours ago" master`
- No chat/Slack ingestion: skip that loop-triage input

## Push & Merge
- Don't push before telling me
- Never auto-merge to main without human approval
- Always create a draft PR first; let me review before marking ready

## Paths
- Never edit .env, .env.*, auth/, payments/, secrets/, credentials/
- Never edit infrastructure configs without human approval

## Code
- Always run tests before proposing a fix
- Never disable tests to make CI green
- Never refactor unrelated code — one fix per run
- Max 3 fix attempts per item; escalate after
- Enforce the attempt limit mechanically: log each try to `loop-ledger.json` and run `loop-context --check` before retrying (see the `loop-guard` skill)

## Communication
- Always tell me what you're about to do before doing it
- Never close an issue or PR without my approval

## Budget
- If token spend hits 80% of daily cap, switch to report-only
- If loop-pause-all is active, exit immediately

---
<!-- Add your own rules below. Use plain English. The loop reads this verbatim. -->
