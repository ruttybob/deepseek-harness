/**
 * REAL-composition proof over the vendored Loader (packages/AGENTS.md "Test
 * the real entry path"): the shipped web-profile storage shape — storage hub,
 * json + sqlite backends, and the storage-domain row restating
 * `{ backend: json, routes: { session_projcache: sqlite } }` — boots from a
 * test-only cordis.yml beside the session stack, and a real turn's checkpoint
 * lands as per-record sqlite state on the routed medium while the json medium
 * stays untouched. A second Loader boot over the same roots restores the cut
 * through the composed service. The hand-built era suites (cache.spec.ts,
 * cache-sqlite-restart.spec.ts) stay the domain-level specs; this file pins
 * that the Loader-selected composition routes and serves.
 */

import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import { DatabaseSync } from 'node:sqlite'
import Storage from '@deepseek-ai/dsh-storage'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import type { Session } from '@deepseek-ai/dsh-session'
import SessionPersistenceJsonl from '../../session-persistence-jsonl/src/index.ts'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import SessionProjectionCache from '../src/index.ts'
import * as StorageJson from '../../../storage/storage-json/src/index.ts'
import * as StorageSqlite from '../../../storage/storage-sqlite/src/index.ts'
import * as StorageDomain from '@deepseek-ai/dsh-storage-domain'

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionStateMap {
    'loader-comp/turns': { turns: number } | null
  }

  interface SessionProjectionMap {
    'loader-comp/turns': { turns: number }
  }
}

type TurnsState = { turns: number } | null
/**
 * The composed-registry unit under test, folding KNOWN session events only:
 * the jsonl cold read refuses event types unknown to the harness, so the
 * composition must exercise the real vocabulary end to end.
 */
const turnsUnit = () => ({
  key: 'loader-comp/turns',
  stateSchema: z.object({ turns: z.number().int().nonnegative() }).nullable(),
  init: () => null,
  apply: (state, event) => (event.type === 'turn/end'
    ? { turns: (state?.turns ?? 0) + 1 }
    : state),
  wire: {
    viewSchema: z.object({ turns: z.number().int().nonnegative() }),
    view: (state: TurnsState) => state ?? { turns: 0 },
  },
  stateVersion: 1,
}) satisfies ProjectionDefinition<'loader-comp/turns', TurnsState>

let root: string | undefined
let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

/**
 * Boot the shipped-shape storage composition from a test-only cordis.yml in
 * `bootRoot` through the vendored Loader; plugin specifiers resolve to the
 * already-imported source modules (the session-stats composition suite's
 * substitution), so the config plane is real while imports stay source-plane.
 */
async function bootComposition(bootRoot: string): Promise<Context> {
  const configPath = join(bootRoot, 'cordis.yml')
  await writeFile(configPath, [
    "- name: '@deepseek-ai/dsh-storage'",
    "- name: '@deepseek-ai/dsh-storage-json'",
    '  config:',
    `    root: ${JSON.stringify(join(bootRoot, 'storages'))}`,
    "- name: '@deepseek-ai/dsh-storage-sqlite'",
    '  config:',
    `    path: ${JSON.stringify(join(bootRoot, 'storages', 'projcache.db'))}`,
    "- name: '@deepseek-ai/dsh-storage-domain'",
    '  config:',
    '    backend: json',
    '    routes:',
    '      session_projcache: sqlite',
    "- name: '@deepseek-ai/dsh-session'",
    "- name: '@deepseek-ai/dsh-session-persistence-jsonl'",
    '  config:',
    `    root: ${JSON.stringify(join(bootRoot, 'sessions'))}`,
    '    compression: none',
    "- name: '@deepseek-ai/dsh-session-projection'",
    "- name: '@deepseek-ai/dsh-session-projection-cache'",
    '  config:',
    '    writeEveryEvents: 200',
    '    writeIntervalMs: 5000',
    '',
  ].join('\n'))

  const ctx = new Context()
  ctx.baseUrl = pathToFileURL(bootRoot).href + '/'
  await ctx.plugin(Loader)
  ctx.loader.builtins.include = Include
  const modules = new Map<string, unknown>([
    ['@deepseek-ai/dsh-storage', Storage],
    ['@deepseek-ai/dsh-storage-json', StorageJson],
    ['@deepseek-ai/dsh-storage-sqlite', StorageSqlite],
    ['@deepseek-ai/dsh-storage-domain', StorageDomain],
    ['@deepseek-ai/dsh-session', SessionStore],
    ['@deepseek-ai/dsh-session-persistence-jsonl', SessionPersistenceJsonl],
    ['@deepseek-ai/dsh-session-projection', SessionProjectionRegistry],
    ['@deepseek-ai/dsh-session-projection-cache', SessionProjectionCache],
  ])
  ctx.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
      return modules.get(specifier)
    },
  } as unknown as NonNullable<typeof ctx.loader.internal>
  await ctx.loader.create({
    name: 'cordis:include',
    config: { path: pathToFileURL(configPath).href },
  })
  await ctx.loader.await()
  return ctx
}

/** The projection unit the composed registry drives; identical in both eras. */
function registerTurns(ctx: Context): void {
  ctx.sessionProjections.register(turnsUnit())
}

const endTurn = (session: Session) =>
  session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })

/** The durable record one session id maps to in the routed sqlite medium. */
function storedRecord(path: string, id: string): unknown {
  const db = new DatabaseSync(path)
  try {
    const row = db.prepare('SELECT value FROM u_session_projcache_sessions WHERE key = ?').get(id) as
      | { value: string }
      | undefined
    return row === undefined ? undefined : JSON.parse(row.value)
  } finally {
    db.close()
  }
}

describe('shipped storage-shape Loader composition', () => {
  it('routes the checkpoint domain to sqlite and persists per-record state across Loader boots', async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-projcache-loader-'))
    const first = await bootComposition(root)
    context = first
    const unloaded = [...first.loader.entries()]
      .filter(entry => entry.fiber === undefined && !entry.disabled)
      .map(entry => entry.options.name)
    expect(unloaded).toEqual([])
    // The domain the shipped route names is open on the booted facility.
    expect(first.storageDomain.get('session_projcache')?.name).toBe('session_projcache')

    registerTurns(first)
    const session = first.sessions.create(SessionId('composed'), { meta: { cwd: root } })
    const turnEnd = endTurn(session)

    // The turn/end write is fail-soft fire-and-forget; the listing face reads
    // the domain's in-memory state, which lands only after the backend write
    // (durability first), so visible here means durable on the medium.
    await vi.waitFor(() => {
      expect(first.sessionProjectionCache.cachedSnapshot(session.header)).toEqual({
        asOfSeq: turnEnd.seq,
        values: { 'loader-comp/turns': { turns: 1 } },
      })
    })

    await first.fiber.dispose()

    // The routed medium holds the checkpoint as its own record; the json
    // medium the route bypasses never materializes the domain's file.
    const dbPath = join(root, 'storages', 'projcache.db')
    expect(existsSync(dbPath)).toBe(true)
    expect(existsSync(join(root, 'storages', 'session_projcache.json'))).toBe(false)
    const db = new DatabaseSync(dbPath)
    try {
      expect(db.prepare("SELECT version FROM units WHERE name = 'session_projcache'").get())
        .toEqual({ version: 3 })
    } finally {
      db.close()
    }
    expect(storedRecord(dbPath, String(session.id))).toMatchObject({
      identity: { createdAt: session.header.createdAt },
      rows: {
        'loader-comp/turns': { ver: 1, seq: turnEnd.seq, val: { turns: 1 } },
      },
    })

    // Second Loader boot over the same roots: the route reopens the domain on
    // sqlite and the cold ladder serves the durable cut through the composed
    // service (rows first, one real persistence tail read at the watermark).
    const second = await bootComposition(root)
    context = second
    registerTurns(second)
    const restored = await second.sessionProjectionCache.coldSnapshot(SessionId('composed'))
    expect(restored.values['loader-comp/turns']).toEqual({ turns: 1 })
    expect(restored.asOfSeq).toBe(turnEnd.seq)
    expect(second.sessionProjectionCache.cachedSnapshot(session.header)).toEqual({
      asOfSeq: turnEnd.seq,
      values: { 'loader-comp/turns': { turns: 1 } },
    })
  })
})
