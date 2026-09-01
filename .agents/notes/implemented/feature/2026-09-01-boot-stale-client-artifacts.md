# Agent Note: Boot-time staleness detection for built client artifacts

Status: implemented

English | [中文](2026-09-01-boot-stale-client-artifacts.zh.md)

## Problem

The web surface reads built artifacts — each plugin package's `lib/client.js` and the `apps/web` dist — and none of the three build stages (tsc, tsdown, vite) fails when a stage is skipped, so a checkout that moved sources forward (pull, branch switch, one-package rebuild) boots with an inconsistent set. The symptoms name nothing actionable: the shell's vendored platform modules disagree with freshly served plugin bundles, and the developer sees export-shaped loader errors (`does not provide an export named 'CallId'`), a `require(...) missed the module table` diagnostic, or a plugin-load failure, with no hint that `pnpm run build` is the remedy.

## Decision

One shared primitive, two boot-time comparisons. `@deepseek-ai/dsh-client-modules` exports `newestSourceUnder` (newest file under a set of roots, recursive, missing roots contribute nothing) and `artifactPredates` (an artifact is stale exactly when it is older than that newest file; equal times are fresh, so coarse mtime resolution never demands a rebuild).

**Client bundles** (`packages/client/modules`): after the activation flush, each composed `lib/client.js` is compared with its own package's `src` tree. Stale bundles ride the existing `ClientPackageCompositionError` grouping as a second bucket carrying the same build instruction as missing bundles, with the newest source path and time named per package.

**Frontend dist** (`packages/bundle/web-app`): activation compares the newest `dist` file with the frontend package's own `src` plus the built `lib` products of its direct workspace dependencies — resolved through the frontend's own links and filtered to the workspace packages tree, which is the set the Vite build links. The report names the dist file and the newest input.

Both checks run only at activation. The steady-state reconcile is untouched: a dev watcher sits between a source write and the rebuilt bundle, and a live session must keep the last good graph while that window is open. A package that ships no source tree is never stale, which keeps the rule inert for registry installs; a missing dist stays a request-time concern, since compositions whose page never reaches the static fallback seat boot without one.

## Alternatives considered

**Build stamps** (each build writes a fingerprint manifest that boot compares): rejected — every package's build config would carry the stamp, the stamp itself can go stale, and the failure this targets is precisely an mtime phenomenon: a checkout moves sources forward.

**A repo-wide freshest-source rule** (any source newer than any artifact): rejected — every host-only edit would demand a full rebuild, and a check that cries wolf stops being read.

**Dist sourcemap `sources` as the exact link set**: rejected — parsing multi-megabyte maps on every boot to avoid one documented approximation is the wrong trade.

**A transitive workspace dependency closure for the dist**: rejected for now — a workspace package without a client bundle that the shell reaches only transitively stays undetected; packages with a client bundle are already covered by the per-package comparison.

## Consequences

Both confusing failure modes now name the remedy at the point the process still has the user's attention, and a one-package rebuild can no longer ship a shell that disagrees with the served bundles. The known gaps are deliberate: the transitive closure gap above, and mtime semantics — clock skew or an exotic filesystem can demand an unnecessary rebuild, which costs one build and never produces a wrong result. Coverage: `artifact-freshness` unit specs, the stale bucket in the node-half activation specs, and the `fresh-dist` specs in web-app, including an outside-the-tree dependency, an unresolvable dependency, and a missing dist.
