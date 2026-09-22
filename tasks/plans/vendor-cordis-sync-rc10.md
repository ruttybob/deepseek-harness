# Vendor sync: cordiverse/cordis 4.0.0-rc.7 → v4.0.0-rc.10 (full vendored set)

Epic: dsh-5xb. Ledger state lives in bd; this file is the readable companion.

Scope decision: sync **all** vendored packages that have upstream movement. Fork
remotes (`deepseek-harness/{cordis,cosmokit,schemastery}`) are unreachable (HTTPS 404,
SSH not-found) and the fork pin `abb0a30` is not in cordiverse history — the fork
ancestry is lost. All fork packages exist in `cordiverse/cordis` rc.10 with content
close to vendored, so **the single cordiverse checkout is the source for everything**;
the manifest gets rc.10 SHAs for all of them. `~/repos/cordis-workspace` is a
convention, not a requirement.

Version status: cordis/loader rc.7→rc.10; timer 1.1.2→1.1.3; hmr 1.0.15→1.1.0
(+#128 `hmr.watch()`); include 1.0.4→1.1.0 (+#121 journal reconcile, new
`src/journal.ts` + `src/patch.ts`); group 1.0.0, cosmokit 1.8.1, schemastery 3.18.0
— already current, no sync needed.

## Delta (pin `56b3d4f` → `f8ea3cd`, packages/core + packages/loader only)

285 insertions / 112 deletions across 13 files. Key upstream commits:

- `2df12b5` fix(loader): detect internal API by runtime shape — **a port of our own
  harness commit** → local mod 19 retires on sync
- `988df36` widen optional properties for `exactOptionalPropertyTypes` (touches core
  `context.ts`, loader `config/entry.ts`; the `include` twin of mod 13 lives in the
  fork, not this repo)
- `5b195b3` guard waterfall continuations (#44) — overlaps locally hardened `fiber.ts`
- `2ceea23` do not leave fiber failures unhandled (#109)
- `1b7d0f2` await nested reconciliation during config update — overlaps transactional
  Loader config reconciliation (mod 8)
- `c2835d8` loader `resolve.ts` (new file): resolve bare specifiers from the project
- `1c1a10e` symbol/prototype-named events; `29581f6` event-dispatch perf — both touch
  `events.ts`, which local mod 15 also modifies
- `caab4e`/`f8ea3cd` line: version bumps to rc.10

## Dependency graph

```
T1 sources ready ──▶ T2 vendor/cordis (core) ──▶ T3 vendor/loader ──▶ T4 vendor/include ──▶ T5 vendor/hmr + timer + group + logger-console ──▶ T6 rescope+manifest ──▶ T7 verify
```

Vertical slices: each task ends with a compiling, testable tree — no horizontal
"re-apply all mods first" layer.

## Hunk attribution (ours vs theirs, per differing file)

Diff sizes are vendored-content vs cordiverse rc.10 (includes rescope noise, which
`rescope-vendor --apply` re-applies mechanically and which is never a real conflict).

| File (diff lines) | Ours (must survive) | Theirs (take upstream) | Verdict |
|---|---|---|---|
| `cordis/src/fiber.ts` | mods 6 (reentrant-disposal hardening), 15 (lazy config), 20 (runtime `FiberState`) | #98 no re-entry from failed outcome, #44 waterfall guard, #109 handled failures, #40 canonical wrapped state — upstream fixed some of the **same gaps** mod 6 closed | Hunk-by-hunk: retire mod-6 halves upstream now covers; keep the disposal-ownership half. Risk: highest |
| `cordis/src/events.ts` (75 ln upstream) | mod 15 (raw-config retention) | #51 symbol/prototype events, #38 dispatch perf | Both sides keep; lazy-config hooks re-planted onto their dispatcher |
| `cordis/src/utils.ts`, `logger.ts`, `reflect.ts`, `context.ts` | mod 7 (JSDoc) | behavior fixes + some upstream JSDoc (see `internal.ts`) | Take upstream, re-add missing `@param`/`@returns` (website generator hard-errors) |
| `loader/src/internal.ts` | mod 19 | `2df12b5` is a **port of our own fix** | Mod 19 retires verbatim |
| `loader/src/config/entry.ts` | mods 15, 18 (`disabled: !!js`) | `988df36` widening (≈ mod 13 twin), reconciliation | Keep mod 18 (upstream has no equivalent); mod 15 re-plant |
| `loader/src/config/{group,tree}.ts` | mod 8 (transactional update/undo) | `1b7d0f2` await nested reconciliation | Semantic check: does the journal path subsume our undo/rollback? Covered by `config-reload.spec.ts` either way |
| `include/src/index.ts` (717 ln + new `journal.ts`, `patch.ts`) | mods 8/11/12/13/14/15 | #121 rewrote reconciliation as a journal — overlaps our mods 8+12 | **Sacrifice candidate:** mods 8+12 (include side) likely retire in favor of the upstream journal, *if* `config-reload.spec.ts` + `loader-composition.spec.ts` pass unchanged. Mod 11 (`applyEntryPatches`/`entryListSchema` exports) is consumed by `dsh --dump-config` — must re-apply onto `patch.ts`. Mods 13/14 (durable writes) and 15 (EntryGroup.key marker) keep |
| `hmr/src/index.ts` (636 ln), `error.ts` | mods 1 (no i18n/YAML), 9 (exact config watching), 12 (`ignoreInitial`), 15 | upstream re-added `locales/` (drop again), #128 `hmr.watch()` | Mods 1/9/12 keep; upstream watch() feature merges around mod 9's watchers |
| `timer/src/index.ts` (95 ln) | JSDoc only (fork-added) | async-iterator refactor of `interval()` | Take upstream wholesale; re-add specifiers/JSDoc |
| `logger-console/src/{index,browser,shared}.ts` (~70 ln) | none logged | upstream drift | Take upstream |
| `group/src/index.ts` (7 ln) | mod 8 semantics (behavioral, likely already upstream) | drift | Trivial merge |
| `cosmokit/`, `schemastery/` | — | — | No new version; **skip** |

## Sacrifice ledger (what we give up and why)

1. **Mod 19** — upstreamed (`2df12b5`), retire from the README log.
2. **Mods 8+12 include-side transactional reconciliation** — candidate for upstream's
   journal (#121); retire only if the existing specs pass without behavior loss.
3. **Mod 6 halves duplicated by #98/#44/#109** — retire the duplicates; the
   ownership/rollback half of the hardening stays.
4. **Fork ancestry** — lost; manifest pins move to cordiverse rc.10 SHAs, noted in the log.

## Checkpoints

- **CP-A (after T1):** upstream checkout at target SHA; decision recorded whether the
  private fork packages (`include`, `group`, `timer`, `hmr`, `logger-console`,
  `cosmokit`, `schemastery`) are in this cycle or deferred — public remotes 404, so a
  reachable SSH remote or explicit deferral is required.
- **CP-B (after T3):** `pnpm run typecheck` green; every mod in the collision map
  either re-applied or explicitly retired in the README log.
- **CP-C (after T5):** verification suite green; manifest + log updated; single PR.

## Verification per task

- T1: `git -C ~/pets/harnesses-ai/ya-ow/cordis rev-parse HEAD` matches rc.10 tag target.
- T2/T3: `pnpm run typecheck`; focused `app-boot` (config-reload, hmr-config,
  user-patches), `cmdline`, `webserver`, `directory-picker-auto/loader-composition` tests.
- T4: `pnpm run hygiene` (`verify-vendored-links`); manifest table shows
  `4.0.0-rc.10` / `f8ea3cd…`; README log retires entry 19.
- T5: `pnpm run build` (both faces); `pnpm run test:snapshot -t web`; node-compat
  matrix 24.9 pin (upstream now covers the mistagged-range bug — pin may be relaxed).
