import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { CordisInspectRegistryService } from '../src/index.ts'
import type { HostCordisInspectProviderRegistration } from '../src/index.ts'

/**
 * The registry's duplicate policy: a `shared` first-party catalog attaches
 * reference-counted (one host row plus every preset-mounted session of the
 * publishing toolset applies it again into the same process-global registry),
 * while an unmarked duplicate id still fails loudly — two DIFFERENT providers
 * colliding on one id is a composition error, not a share.
 */

const INPUT = { type: 'object', properties: {}, additionalProperties: false } as const
const OUTPUT = { description: 'test output' } as const

function provider(id: string, shared?: boolean): HostCordisInspectProviderRegistration {
  return {
    ...shared === undefined ? {} : { shared },
    manifest: {
      id,
      description: `provider ${id}`,
      methods: [{
        name: 'list',
        description: `list ${id}`,
        inputSchema: INPUT,
        outputSchema: OUTPUT,
      }],
    },
    query: async () => ({ ok: true }),
  }
}

function setup(): CordisInspectRegistryService {
  return new CordisInspectRegistryService(new Context())
}

describe('CordisInspectRegistryService.register', () => {
  it('attaches a shared registration repeatedly and detaches with the last disposer', () => {
    const registry = setup()
    const disposeA = registry.register(provider('Service', true))
    const disposeB = registry.register(provider('Service', true))
    expect(registry.list().map(view => view.id)).toEqual(['Service'])
    disposeA()
    expect(registry.list().map(view => view.id)).toEqual(['Service'])
    disposeB()
    expect(registry.list()).toEqual([])
  })

  it('treats each shared disposer as single-shot', () => {
    const registry = setup()
    const dispose = registry.register(provider('Service', true))
    dispose()
    dispose()
    expect(registry.list()).toEqual([])
  })

  it('refuses an unmarked duplicate id and a shared-over-plain collision', () => {
    const registry = setup()
    registry.register(provider('Mine'))
    expect(() => registry.register(provider('Mine'))).toThrow('Host Cordis inspect provider "Mine" is already registered')
    // A shared registration cannot attach to an unmarked one either.
    expect(() => registry.register(provider('Mine', true))).toThrow('already registered')
  })

  it('refuses a plain registration over a shared one', () => {
    const registry = setup()
    registry.register(provider('Service', true))
    expect(() => registry.register(provider('Service'))).toThrow('already registered')
  })
})
