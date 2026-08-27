/**
 * SessionProjectionCache reopen-across-restart equivalence over the REAL
 * sqlite backend: each era binds a fresh Context and a fresh
 * SqliteStorageBackend instance to one file-backed medium, so the phase
 * boundary is a true process-restart simulation (the shared contract
 * suite's `reopen()` shape, lifted to the domain/service seam). Covers the
 * checkpoint -> restart -> restore equivalence plus the two ladder branches
 * the restart exposes: an unrelated-lifecycle record is discarded and
 * rebound, and a persisted log that shrank below the cached watermark
 * degrades to one full re-read. Prior art: cache.spec.ts models the same
 * branches over the memory-pool double.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { z } from 'zod'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import Storage from '@deepseek-ai/dsh-storage'
import { descriptorOf, DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import { Config as SqliteConfig, SqliteStorageBackend } from '../../../storage/storage-sqlite/src/index.ts'
import SessionProjectionCache, { projectionCacheDomainSpec } from '../src/index.ts'
import type { CheckpointIdentity, CheckpointRecord } from '../src/index.ts'

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionStateMap {
    'cache-test/marks': MarksState
  }
}

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    'cache-test/mark': { marks: string[] }
  }

  interface OutOfBandSessionEventMap {
    'cache-test/mark': true
  }
}

type MarksState = { marks: string[] } | null
const marksUnit = (stateVersion = 1) => ({
  key: 'cache-test/marks',
  stateSchema: z.object({ marks: z.array(z.string()) }).nullable(),
  init: () => null,
  apply: (state, event) => (event.type === 'cache-test/mark' ? (event).data : state),
  wire: {
    viewSchema: z.object({ marks: z.array(z.string()) }),
    view: state => state ?? { marks: [] },
  },
  stateVersion,
}) satisfies ProjectionDefinition<'cache-test/marks', MarksState>

/**
 * A persistence double serving readFrom over a fixed per-id stored log. The
 * served header stamps the identity from {@link identityRef}, so a test can
 * change which lifecycle the log claims BETWEEN eras (a swapped or rebuilt
 * store) without touching the cache medium.
 */
function fakePersistence(logs: Map<string, SessionEvent[]>, identityRef: { current?: CheckpointIdentity }) {
  const readFrom = vi.fn(async (id: SessionId, fromSeq: number) => {
    const events = logs.get(String(id))
    if (events === undefined) throw new Error(`session "${id}" not found`)
    return {
      meta: { version: 0, id, ...(identityRef.current ?? { createdAt: 0 }) },
      events: events.filter(event => event.seq >= fromSeq),
    }
  })
  return { readFrom }
}

/** Header shape for cachedSnapshot calls (the identity witness alone matters). */
const headerOf = (id: SessionId, createdAt: number): Session['header'] => ({ version: 0, id, createdAt })

const mark = (session: Session, marks: string[]): SessionEvent =>
  session.append('cache-test/mark', { marks })

const endTurn = (session: Session): SessionEvent =>
  session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })

/** A minimal stored log whose seq numbering matches the cold-ladder models. */
const storedLog = (marks: string[][]): SessionEvent[] => {
  const events: SessionEvent[] = [
    { type: 'turn/start', seq: 0, time: 0, data: { turn: 1 } },
  ]
  for (const m of marks) {
    events.push({ type: 'cache-test/mark', seq: events.length, time: events.length, data: { marks: m } })
  }
  events.push({ type: 'turn/end', seq: events.length, time: events.length, data: { turn: 1, reason: { kind: 'completed' } } })
  return events
}

interface EraOptions {
  /** File-backed sqlite medium shared across eras. */
  path: string
  logs?: Map<string, SessionEvent[]>
  identityRef?: { current?: CheckpointIdentity }
}

const contexts: Context[] = []
const stops: Array<() => Promise<void>> = []
const dirs: string[] = []

async function era(options: EraOptions) {
  const logs = options.logs ?? new Map<string, SessionEvent[]>()
  const identityRef = options.identityRef ?? {}
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(Storage)
  const backend = new SqliteStorageBackend(new SqliteConfig({ path: options.path }))
  ctx.storage.backend.register('sqlite', backend)
  const facility = new DomainFacility(ctx, { backend: 'sqlite' })
  ctx.storage.mount('domain', facility)
  ctx.provide('storageDomain', facility)
  await ctx.plugin(SessionStore)
  await ctx.plugin(SessionProjectionRegistry)
  ctx.sessionProjections.register(marksUnit())
  const persistence = fakePersistence(logs, identityRef)
  // `as never` stands in for the rest of the SessionPersistence interface the
  // injection declares: the fake serves only the cold ladder's readFrom face.
  ctx.provide('sessionPersistence', persistence as never)
  await ctx.plugin(SessionProjectionCache, { writeEveryEvents: 100, writeIntervalMs: 60_000 })
  // Process-exit simulation, in the same order the shipped composition tears
  // down: quiesce the service (timers/listeners), release the domain's unit,
  // close the backend connection.
  stops.push(async () => {
    await ctx.fiber.dispose()
    await facility.closeAll()
    await backend.close()
  })
  return { ctx, logs, cache: ctx.sessionProjectionCache, persistence, identityRef }
}

/** Tear down every era started so far (idempotent; also the afterEach net). */
async function drainStops(): Promise<void> {
  while (stops.length > 0) await stops.pop()!()
}

async function freshDbPath(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-projcache-restart-'))
  dirs.push(dir)
  return join(dir, 'projcache.db')
}

/** Wait until queued fail-soft writes (event-listener fire-and-forget) drain. */
const settle = async (): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 0))
  await new Promise(resolve => setTimeout(resolve, 0))
}

/** The durable record one session id maps to in the sqlite file itself. */
function storedRecord(path: string, id: string): CheckpointRecord | undefined {
  const db = new DatabaseSync(path)
  try {
    const row = db.prepare('SELECT value FROM u_session_projcache_sessions WHERE key = ?').get(id) as
      | { value: string }
      | undefined
    return row === undefined ? undefined : JSON.parse(row.value) as CheckpointRecord
  } finally {
    db.close()
  }
}

/** Seed the medium through the backend's own schema (an older deployment's row). */
async function seedRecord(path: string, id: string, record: CheckpointRecord): Promise<void> {
  const backend = new SqliteStorageBackend(new SqliteConfig({ path }))
  const unit = await backend.kv.open(descriptorOf(projectionCacheDomainSpec))
  await unit.putRecord('sessions', id, record)
  await unit.close()
  await backend.close()
}

afterEach(async () => {
  await drainStops()
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true })
})

describe('SessionProjectionCache across restarts over real sqlite', () => {
  it('restores the pre-restart checkpoint cut identically through the cold-read ladder', async () => {
    const path = await freshDbPath()
    const first = await era({ path })
    const session = first.ctx.sessions.create(SessionId('persist'))
    first.identityRef.current = { createdAt: session.header.createdAt }
    // Collect every committed event: at restart these form the persisted log
    // the store kept (the fake persistence serves exactly what was written).
    const committed: SessionEvent[] = [mark(session, ['a']), mark(session, ['a', 'b'])]
    const end = endTurn(session)
    committed.push(end)
    first.logs.set('persist', committed)
    await settle()

    const listed = first.cache.cachedSnapshot(headerOf(session.id, session.header.createdAt))
    expect(listed).toEqual({ asOfSeq: end.seq, values: { 'cache-test/marks': { marks: ['a', 'b'] } } })

    // Simulated process exit: every handle of the first era is released, the
    // file stays behind, and the durable record carries the whole cut.
    await drainStops()
    const durable = storedRecord(path, String(session.id))
    expect(durable?.identity).toEqual(first.identityRef.current)
    expect(durable?.rows['cache-test/marks']).toEqual({ ver: 1, seq: end.seq, val: { marks: ['a', 'b'] } })

    // Second boot: brand-new Context, backend instance, and service over the
    // SAME file. The restored cut must equal the pre-restart listing.
    const second = await era({ path, logs: first.logs, identityRef: first.identityRef })
    const restored = await second.cache.coldSnapshot(SessionId('persist'))
    expect(restored.values['cache-test/marks']).toEqual({ marks: ['a', 'b'] })
    expect(restored.asOfSeq).toBe(end.seq)
    // The cache floor anchored the tail: exactly one bounded read at the
    // durable watermark, never a full replay from zero.
    expect(second.persistence.readFrom).toHaveBeenCalledTimes(1)
    expect(second.persistence.readFrom).toHaveBeenCalledWith(SessionId('persist'), end.seq, undefined)
    // And the zero-I/O listing face serves straight from the reopened table.
    expect(second.cache.cachedSnapshot(headerOf(SessionId('persist'), first.identityRef.current.createdAt)))
      .toEqual({ asOfSeq: end.seq, values: { 'cache-test/marks': { marks: ['a', 'b'] } } })
  })

  it('discards a record bound to an unrelated lifecycle and rebinds the identity on write-back', async () => {
    const path = await freshDbPath()
    // A row left behind by a PRIOR lifecycle of the same session id passes
    // every watermark check; only the identity witness can reject it.
    await seedRecord(path, 'reborn', {
      identity: { createdAt: 0 },
      rows: { 'cache-test/marks': { ver: 1, seq: 2, val: { marks: ['phantom'] } } },
    })
    const logs = new Map([['reborn', storedLog([['real']])]])
    const identityRef: { current?: CheckpointIdentity } = { current: { createdAt: 999 } }
    const { cache, persistence } = await era({ path, logs, identityRef })

    const snapshot = await cache.coldSnapshot(SessionId('reborn'))
    expect(snapshot.values['cache-test/marks']).toEqual({ marks: ['real'] })
    // Anchored tail first (floor 2), then the slow rung: one full re-read.
    expect(persistence.readFrom).toHaveBeenNthCalledWith(1, SessionId('reborn'), 2, undefined)
    expect(persistence.readFrom).toHaveBeenNthCalledWith(2, SessionId('reborn'), 0, undefined)

    // The write-back rebinds the durable record to the ACTUAL log's identity;
    // no phantom value survives in the file.
    await settle()
    const rebound = storedRecord(path, 'reborn')
    expect(rebound?.identity).toEqual({ createdAt: 999 })
    expect(rebound?.rows['cache-test/marks']).toEqual({ ver: 1, seq: 2, val: { marks: ['real'] } })
  })

  it('degrades to one full re-read when the log shrank below the cached watermark across restarts', async () => {
    const path = await freshDbPath()
    const logs = new Map<string, SessionEvent[]>()
    const first = await era({ path, logs })
    const session = first.ctx.sessions.create(SessionId('shrunk'))
    first.identityRef.current = { createdAt: session.header.createdAt }
    for (const m of [['a'], ['b'], ['c'], ['d']]) mark(session, m)
    const end = endTurn(session)
    await settle()
    await drainStops()

    // Between the runs crash-repair truncates the persisted log: shorter log,
    // SAME lifecycle (identity untouched), so the cached watermark now points
    // past the log end and only the truncation retry may recover the session.
    logs.clear()
    logs.set('shrunk', storedLog([['late']]))

    const second = await era({ path, logs, identityRef: first.identityRef })
    const snapshot = await second.cache.coldSnapshot(SessionId('shrunk'))
    expect(snapshot.values['cache-test/marks']).toEqual({ marks: ['late'] })
    expect(snapshot.asOfSeq).toBe(2)
    expect(second.persistence.readFrom).toHaveBeenNthCalledWith(1, SessionId('shrunk'), end.seq, undefined)
    expect(second.persistence.readFrom).toHaveBeenNthCalledWith(2, SessionId('shrunk'), 0, undefined)

    await settle()
    const durable = storedRecord(path, 'shrunk')
    expect(durable?.rows['cache-test/marks']).toEqual({ ver: 1, seq: 2, val: { marks: ['late'] } })
  })
})
