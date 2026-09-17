# Agent Note: runtime launch resolves bare imports on the artifact plane

Status: implemented

English | [中文](2026-09-18-runtime-launch-artifact-resolution.zh.md)

> Narrows [dsh source launch through the tsx ESM hook](2026-07-29-dsh-source-launch-tsx-esm.md): the runtime keeps tsx for transformation of the source entry chain and drops its tsconfig `paths` projection for bare imports.

## Problem

Every session failed on its first tool call with `Cannot read properties of undefined (reading 'prepare')`. The agent-loop scheduler looks the staged executor up as `ctx.tools[TOOL_RUNTIME_SCHEDULER]`, where the key is a module-level symbol from `@deepseek-ai/dsh-tools`. With the base `paths` map projected onto the whole process, that package loaded twice under two module identities: the loader's row import constructed the `tools` service from `lib/index.js`, while agent-loop's symbol import bound to `src/index.ts` through the tsx-projected paths. Two identities mean two distinct symbols, so the lookup returned `undefined` regardless of which copy was "correct".

Module-level identities — symbols, registries, singletons — all break the same way; the scheduler was only the first visible crash. Identity duality of this kind is the source/artifact mixing the source-launch decision already rejects; only the direction differed (rows leaking to the artifact plane instead of the entry chain).

## Decision

The runtime launch vector pins the tsx tsconfig to [tsconfig.runtime.json](../../../../tsconfig.runtime.json), which carries no `paths` map. The `dsh` and `demo:inspector` scripts set `TSX_TSCONFIG_PATH` to it, and `demo:ptc` passes the same env to its spawned launch. tsx still transpiles the source entry chain; every bare import now resolves through package `exports` — the artifact plane — matching the published bin, so the whole process sees one module identity per package. The source-launch smoke asserts the script vector and launches with the same env, and the Node compatibility job builds before running it.

Every subprocess test harness that boots a real profile passes the same file to `resolveExampleLaunch` — the recorded-session snapshots and the e2e and expected-output suites — so their `src`-mode children resolve bare imports on the artifact plane too. That smoke's launch case self-skips while built output is absent, keeping the unbuilt coverage lane green, and the primary and consumer aggregates order the smoke after their build.

## Alternatives considered

**Make the vendored loader's row import delegate through the ambient hook chain** so rows bind to `src` like every other import and zero-build survives. Rejected for now: it redesigns vendored resolution order around an upstream interaction (tsx 4.22.4 hooks versus the loader's internal-import fast path) that bisects only with a full build plus a live launch per step. Revisit if upstream fixes the double-loading directly.

**Scope the base `paths` map to exclude built output.** Rejected: tsx applies the nearest tsconfig's paths without consulting `include`, so nothing in the tsconfig language expresses the boundary.

## Consequences

- `pnpm dsh` on a fresh checkout requires one `pnpm run build` first: bare imports resolve to `lib/`, and the stale-bundle guard already enforces the same requirement on the web profile.
- Module-level identities are stable across the runtime again; a package can no longer load once per resolution path.
- The July source-launch decision's zero-build property is narrowed to the entry chain, which tsx still transpiles from source.
