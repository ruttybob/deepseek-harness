# Fork maintenance (ruttybob/deepseek-harness)

This checkout is a published fork: `origin` = `ruttybob/deepseek-harness`,
`upstream` = `deepseek-ai/deepseek-harness`. Fork-local commits live on
`master` and are merged from upstream periodically. This file is fork-owned
and must never conflict with upstream (upstream has no `FORK.md`).

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

`rerere` is enabled in this repo (`git config rerere.enabled true`, set
2026-09-24): git remembers each conflict resolution and re-applies it
automatically when the same conflict reappears in a later merge. If a
fresh clone is made, re-enable it — it is local config, not committed.

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

### tool-skill: `allowUserInvocable` loader gate (37def6e634)

`packages/skill/tool-skill` — an `allowUserInvocable` config (default
`false`). When set, the `skill` tool loads user-invocable skills the
catalog does not advertise (`disable-model-invocation`); the catalog
itself stays filtered. Skills with `user-invocable: false` stay blocked.

- Mounted with `allowUserInvocable: true` on the pstack/pstack-team preset
  rows in `~/.dsh/profiles/{web,web-team}/cordis.patch.yml`.
- Tests: `pnpm vitest run packages/skill/tool-skill`
  (the `fork: allowUserInvocable loader gate` describe block).
- Watch on merge: upstream refactors of the `execute` invocation gate or
  of the tool `description` string.
