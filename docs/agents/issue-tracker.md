# Issue tracker: bd (beads)

Issues and specs for this repo live in a local [bd (beads)](https://github.com/gastownhall/beads) database — an embedded Dolt store in the repo's `.beads/` directory (no server, no external service). Use the `bd` CLI for all operations; it emits JSON via `--json`, so an agent session drives it directly (treat it like `gh`).

**Commands live in one place: the CLI's own reference.** Run `bd prime` (or `<cmd> --help`) for the full, up-to-date syntax — this doc deliberately caches no CLI reference. What follows are **this repo's flow conventions** only: what the fields mean, which labels exist, and how the skills use them.

> **Recorded values** (set once by `/setup-matt-bd-skills`):
>
> - Prefix: `dsh` — issue identifiers look like `dsh-<hash>` (`dsh-a3f2dd`).
> - Visibility: `stealth` — `.beads/` is kept local via `.git/info/exclude`: not committed, no remote sync.
> - Sync remote: _none_ (stealth).

**Scope**: the flow conventions and the recorded values above — nothing else; `/setup-matt-bd-skills` owns this file. A repo-specific tracker fact (a second store, a related repo, where related work is tracked) is **bd memory**, not a doc edit: `bd remember "<fact>"`.

Init and sync are **setup-time procedures**, not runtime conventions — they live in the `/setup-matt-bd-skills` skill, not here.

## Model

One layer: the repo's `.beads/` directory holds an embedded Dolt database. There is **no workspace/project split** and **no per-feature project** — every issue in this repo shares one flat space, scoped only by types, parent-child links, labels, and dependency edges. Each issue carries a **status** (lifecycle), **type** (what kind of work it is), **priority** (0–4), **assignee**, **labels**, and **dependency edges** (bd's first-class feature).

## Memory (persistent)

bd holds persistent project memory in the same database — insights that survive across sessions. Loading is deliberate, not automatic: recall what a task needs when it needs it. This is the replacement for ad-hoc `NOTES.md` / memory files. Conventions:

- **Store** with `bd remember "<insight>"` (`--key <slug>` for a stable, re-recordable key); **recall** with `bd recall <key>`; **search** with `bd memories "<phrase>"`; **forget** with `bd forget <key>`.
- Use it for the unwritten conventions, gotchas, and reasons-behind-choices a new session needs but no config confesses. Do **not** use it for issue state (issues are for that) or per-session scratch (`bd note` on an issue is).

## Types (hard convention — what kind of work it is)

Every issue gets exactly one type, and the type comes from **how the work was born**, not from taste:

| Type | Meaning | Born from |
| --- | --- | --- |
| `epic` | A container, never claimed: a spec or a wayfinder map. Closed when its last child closes. | `/to-spec`, `/wayfinder` |
| `task` | A tracer-bullet ticket from a spec. | `/to-tickets` |
| `bug` | A ticket from a bug-fix spec. | `/to-tickets` |
| `feature` | A ticket from a new-capability spec. | `/to-tickets` |
| `chore` | A small, well-understood task with no spec — one session, no unknowns. | direct `bd create` |
| `decision` | A recorded decision (ADR-like); rare. | ad hoc |

## Labels (the only two workflow labels)

No triage vocabulary, no go-labels: work is born from specs, tickets, and chores, already ready — readiness is computed, not stamped; an open issue with no active blockers is ready. Exactly two workflow labels exist:

- **`needs-info`** — the issue is parked waiting on the user's answer. Any skill may add it when a question blocks the work; the answer removes it. While present, the issue is outside the frontier.
- **`human`** — bd's native label: the work must be done by a **person**, not an agent. Surfaces in `bd human list`; a skill that hits work it must not do unattended parks it here.

Anything else you'd want to say about an issue goes in its type, status, priority, notes, or close reason — not in a new label. The `wayfinder:*` labels are the one standing exception: `/wayfinder` owns them, and its bd operations (maps, child tickets, wiring, the scoped frontier) live in that skill.

## Conventions

The flow's conventions, one line each — syntax from `bd prime`:

- **Create**: `bd create "Title" -t <type> -p 2`; multiline bodies via `--stdin`. **A child born from a labelled parent passes `--no-inherit-labels`** — labels never propagate: the flow's labels are per-issue statements (`needs-info`, `human`, `wayfinder:*`), not inheritable taxonomy.
- **Claim** before work: `bd update <id> --claim` (sets assignee + `in_progress`; idempotent if already yours) — or `bd ready --claim` for the atomic frontier claim. The claim _is_ the assignment; do not bare-`--assignee` (that leaves status `open` and the issue in the frontier).
- **Read** an issue: `bd show <id>` (`--json --include-comments` for full context).
- **Conversation** on an issue is `bd comment`; **persistent state** is `bd note`.

## Dependencies and the frontier

`bd dep add <issue> <depends-on>` wires a hard `blocks` edge (`bd prime` carries the full dep reference); a ticket is unblocked when every blocker is `closed`. The **frontier** is built in — open issues with no active blockers, minus anything parked on the user, minus containers (see *Labels*):

```bash
bd ready --exclude-label needs-info --exclude-type epic
```

## Closing an issue

`bd close <id> --reason "Landed in PR #42, commit abc1234"` — `closed` means *landed / worked*, and the reason is the link to where the work shipped (bd has no auto-linking to git). **Won't do** is not a label: the close reason is the record — `--reason "wontfix: <why>"`. Closed issues fall out of every active scan automatically.

## Spec lifecycle (epics)

A spec published by `/to-spec` is an `epic` — a container, never claimed, never labelled. Its tickets (`/to-tickets` output) are children (`--parent <spec-id>`): the edge is containment, not blocking. The session that closes the **last** ticket also closes the spec:

```bash
bd close <spec-id> --reason "all tickets done"
```
