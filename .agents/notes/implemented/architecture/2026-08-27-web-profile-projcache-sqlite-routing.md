# Agent Note: The web profile routes the Projection cache to per-record sqlite

Status: implemented

English | [中文](2026-08-27-web-profile-projcache-sqlite-routing.zh.md)

## Problem

Two facts shipped together for the dsh-yfd hot-loop ticket. First, the web profile persisted every Projection-cache checkpoint as one whole-domain JSON file (`<storage root>/session_projcache.json`): each flush rewrote the entire file, so the write cost grew with every stored session instead of with the session being checkpointed, and unrelated sessions shared one durable medium. Second, the source launch could not even rehearse a composition change: the vendored cordis declared `FiberState` as a `const enum`, which per-file transpilers (tsx) erase, so the profile boot failed ESM linking before `dsh --profile web --dump-config` could print anything.

## Decision

The web profile's `packages/bundle/web-app/cordis.patch.yml` gains two configuration rows and nothing else changes: a `storage-sqlite` row registering the sqlite backend at `<storage root>/projcache.db`, and the `storage-domain` row restating `backend: json` plus the per-domain route `routes: { session_projcache: sqlite }`. The storage-domain facility resolves each domain's medium from its route at open time, so each Projection-cache checkpoint lands as its own durable record (one row per session in the sqlite medium) while every other domain keeps the json backend. No consumer, domain spec, or backend code changed: which domain rides which medium is deployment configuration, and the sqlite backend was already a shipped storage package.

The rehearse blocker was a vendor divergence, logged as local modification 19 in `vendor/README.md`: `cordis/src/fiber.ts` declares `FiberState` as a regular runtime enum. The vendored source boots through tsx per the source-launch contract, per-file transpilation erases `const enum` objects, and any cross-module value import of `FiberState` (the profile boot path) failed ESM linking. A regular enum keeps the runtime object; consumers that inlined constants lose nothing.

## Alternatives considered

- **Flip the default medium to sqlite** (make sqlite the storage-domain default or change the domain spec): would move every deployment's durable layout — not just the hot loop's — and silently relocates other domains' data. Routing scopes the change to the composition that needs it; the json default stays the right medium for cold, small domains.
- **Give session-projection-cache its own medium Config field**: duplicates the medium decision the storage-domain facility already owns, creating two sources of truth for one fact (route vs. consumer config) that could disagree. The domain's medium is storage-domain's to route.
- **Build the vendored source instead of fixing the enum** (compile cordis before source launch): a real build step reintroduces a compile gate on every source boot, against the source-launch decision that per-file transpilation is the supported path. The runtime enum is one vendored line with no consumer-visible loss.

## Consequences

- Web-profile checkpoints are per-record durable writes: flushing one session no longer rewrites every other session's stored state, and the checkpoint write stays O(session) instead of O(domain).
- Rollback is pure configuration: deleting the `routes` line leaves the `storage-sqlite` row registered but unrouted, and json serves every domain again exactly as the base composition does.
- Deployments diverge in medium: the web profile's Projection cache lives in `projcache.db` while other deployments keep `session_projcache.json`. Documentation states that routing decides the medium; tooling reading the medium must follow the storage-domain route, not assume a file name.
- One vendored file diverges from upstream (mod 19) and must be re-applied after a vendor sync; the divergence is logged in `vendor/README.md` per the vendoring contract.
