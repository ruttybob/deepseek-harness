import { describe, expect, it } from 'vitest'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import type { ExternalEventIntent, SessionEventType } from '@deepseek-ai/dsh-session'

describe('Session.append ignorable marker for repository-external events', () => {
  const externalType = 'plugin/informational' as SessionEventType

  it('logs an external informational event with the ignorable marker', () => {
    const session = Session.create(SessionId('external-ignorable'))
    const event = session.append(externalType, { text: 'note' }, { ignorable: true })
    expect(event).toMatchObject({ type: 'plugin/informational', ignorable: true })
    expect(session.snapshotEvents().at(-1)).toMatchObject({ type: 'plugin/informational', ignorable: true })
  })

  it('refuses a marker that is not exactly true', () => {
    const session = Session.create(SessionId('external-marker-value'))
    const wrong = { ignorable: false } as unknown as ExternalEventIntent
    expect(() => session.append(externalType, { text: 'note' }, wrong))
      .toThrow('session event "plugin/informational" carries ignorable false; the marker must be true when present')
    expect(session.seq).toBe(0)
  })

  it('refuses the marker on a repository-known type', () => {
    const session = Session.create(SessionId('external-known-type'))
    expect(() => session.append('turn/start', { turn: 1 }, { ignorable: true }))
      .toThrow('session event "turn/start" cannot be marked ignorable: the repository vocabulary knows this type')
    expect(session.seq).toBe(0)
  })
})
