# Fork maintenance (ruttybob/deepseek-harness)

This checkout is a published fork: `origin` = `ruttybob/deepseek-harness`,
`upstream` = `deepseek-ai/deepseek-harness`. Fork-local commits live on
`master` and are merged from upstream periodically. This file is fork-owned
and must never conflict with upstream (upstream has no `FORK.md`).

## 2026-10-18 rebaseline

`master` was rebaselined onto upstream `dsh-v0.2.1-rc.2` (upstream/master
at merge time) through a merge whose resolution took the upstream side for
every former fork-local behavior patch. The fork previously carried 70
commmits of patches; all were dropped in that merge resolution except the
two listed below, because upstream had absorbed or superseded them. History
was preserved (merge, no rebase, no force-push).

## Sync strategy: merge, never rebase or cherry-pick

`master` is pushed to `origin` and cloned on multiple machines, so its
history must stay stable. The sync is always:

```sh
git fetch upstream
git merge upstream/master
# resolve conflicts once — the resolution persists across future merges
```

- **No rebase**: it rewrites every fork-local commit hash (force-push,
  clone divergence) and replays the same conflicts on every sync.
- **No cherry-pick as a sync mechanism**: it duplicates commits and seeds
  future merge conflicts. Cherry-pick is only for backporting one urgent
  upstream fix ahead of the next full merge.

`rerere` is enabled in this repo (`git config rerere.enabled true`): git
remembers each conflict resolution and re-applies it automatically when the
same conflict reappears in a later merge. If a fresh clone is made,
re-enable it — it is local config, not committed.

## Ritual after every sync

1. `pnpm run build` from the checkout root — mandatory; the fresh-bundle
   guard rejects launches when `lib/` or `apps/web/dist` is older than the
   merged sources. Several minutes; relaunch hosts only after it finishes.
2. Re-run the tests of every package carrying a fork-local behavior patch
   (list below). A failing fork test means upstream changed the semantics
   the patch depends on — resolve it in the merge, not after.
3. `git log --oneline --no-merges master --not upstream/master` — the
   always-current inventory of fork-local commits.

## Fork-local behavior patches

The always-current commit inventory is
`git log --oneline --no-merges master --not upstream/master`. The table
maps every master behavior patch to the suite ritual step 2 runs.

| Package | Fork patch | Suite after sync |
|---|---|---|
| `packages/skill/tool-skill` | `allowUserInvocable` loader gate, default `true`: the `skill` tool loads user-invocable skills the catalog does not advertise, by exact name, with no preset wiring | `pnpm vitest run packages/skill/tool-skill` |
| `vendor/cordis/src/fiber.ts` | `FiberState` is a runtime enum so tsx source launch keeps cross-module value imports working (vendor/README.md divergence 24) | any source-launch boot, e.g. `pnpm dsh --profile headless "say ok"` |

Watch on merge:

- tool-skill: upstream refactors of the `execute` invocation gate or of the
  tool `description` string.
- vendor/cordis: an upstream flip back to `const enum FiberState` re-breaks
  source launch; re-apply the runtime enum.
