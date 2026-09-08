# dsh host harness

Host harness running AI coding sessions: Cordis-based loader, typert remotes, web GUI. This glossary covers the host/session side of the system and the web shell's panel language.

## Language

**Fold**:
The web shell's panel folding: each frame panel (sidebar, details) is either wide or folded — the sidebar folds to its compact icon rail, details folds to zero width. A live fold passes through published collapse phases (`wide → fading → rail`) that the frame owns as its animation contract.
_Avoid_: collapse state, panel visibility, sidebar toggle

**Workspace**:
A registry record binding one canonical project directory (`path`, fs.realpath stamped at create) to its owned sessions (`sessionIds`, ordered; one-owner accounting). Sessions of one Workspace share that directory's `.beads` store.
_Avoid_: project directory, repo, folder

**Projection**:
A pure synchronous fold of a session's committed log events into one JSON value under a stable key (title, stats, token usage, todo, goal, plan, …). Log events carry complete post-change state, never deltas.
_Avoid_: reducer, view model

**Projection cache**:
Durable per-session persistence of projection checkpoints (domain `session_projcache`, table `sessions` keyed by SessionId), so cold opens resume from the last cut instead of refolding the whole log. Rebuildable from session logs.
_Avoid_: session cache, snapshot store

**Fork boundary**:
A `turn/end` session-log seq — the only point a session can fork from; forking inside an open turn fails. Projected onto the bb wire as `providerCheckpointId`. Distinct from durability checkpoints (crash-safety flushes) and from the compaction summary the web UI renders as a checkpoint node.
_Avoid_: semantic checkpoint, checkpoint id

**SDK protocol**:
The newline-delimited JSON-RPC wire of `dsh --profile sdk`: a hand-written, transport-agnostic method map (client→server requests, server→client requests, notifications) mirrored by the TypeScript and Python SDKs. The only wire an external automation client speaks; a process-wide handshake precedes every session-scoped method.
_Avoid_: Typert RPC, ACP wire

**Typert remote**:
An in-process `@Remote` method surface declared on a cordis service (SessionController, AgentPresets, LlmRuntime, CommandRuntime) and consumed by the web client through the Typert RPC gateway. Product-internal: never projected onto the SDK protocol; wire needs are met by consuming services, not by adding remotes.
_Avoid_: SDK protocol, public API

**Provider-enforced approvals**:
The bb-provider handshake choice (`approvalEnforcedBy: "provider"`, claude-code precedent): the dsh session approval policy is the single authority for every ask; bb relays each ask to the human and never auto-answers from its own permission rules. The bridge answers only asks of agents it owns, one-shot per ask, and never derives durable policy from an answer.
_Avoid_: runtime enforcement, dual policy engine

**Preset provider**:
A bb agent provider representing exactly one dsh agent-preset (id `dsh-<presetId>`, grouped under the `dsh` family). A bb thread picks its preset by picking its provider at creation and never switches; dsh locks the preset after the thread's first turn.
_Avoid_: preset picker, per-thread preset switch

**Preset roster**:
The dsh agent-presets a deployment exposes: shipped presets from the checkout's system root plus authored presets from `$DSH_HOME/.agent-presets`, each with id, name, description, trust, default flag, and validity. The single source of truth for what the dsh family lists in bb.
_Avoid_: preset list endpoint, plugin-side preset scan

**Diagram fence**:
A ` ```mermaid ` fenced block inside message markdown. Once the fence has settled it renders as a diagram, never as highlighted code; its source stays the single input the diagram re-derives from (theme change, re-render).
_Avoid_: mermaid block, chart, picture

**Viewer**:
The affordance layer wrapped around a rendered diagram fence: zoom, pan, reset, expand-to-modal, copy-source. Viewer clicks belong to the reader, not to the diagram — click actions authored in diagram source are out of scope and never execute.
_Avoid_: zoom controls, lightbox, interactive diagram
