// @vitest-environment jsdom
// The real engine module against a mocked `mermaid` package: render
// serialization, unique per-render ids, queue survival after a failed render,
// and the strict security-level initialization (ADR 0001).
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    parse: vi.fn(async () => true),
    render: vi.fn(),
  },
}))

import mermaid from 'mermaid'
import { renderMermaidSvg } from '../src/markdown/mermaid.ts'

const initializeMock = vi.mocked(mermaid.initialize)
const parseMock = vi.mocked(mermaid.parse)
const renderMock = vi.mocked(mermaid.render)

beforeEach(() => {
  initializeMock.mockClear()
  parseMock.mockClear().mockResolvedValue({ diagramType: 'flowchart', config: {} })
  renderMock.mockClear().mockResolvedValue({ svg: '<svg/>', diagramType: 'flowchart' })
})

describe('mermaid engine integration', () => {
  it('renders are serialized and each render passes a unique diagram id', async () => {
    let release!: (result: { svg: string; diagramType: string }) => void
    renderMock.mockImplementationOnce(() => new Promise<{ svg: string; diagramType: string }>((resolve) => { release = resolve }))
      .mockImplementationOnce(async () => ({ svg: '<svg two/>', diagramType: 'flowchart' }))

    const first = renderMermaidSvg('flowchart TD\nA-->B', 'light')
    const second = renderMermaidSvg('flowchart TD\nC-->D', 'light')

    // The second render cannot reach the engine while the first is in flight.
    await vi.waitFor(() => {
      expect(renderMock).toHaveBeenCalledTimes(1)
    })
    release({ svg: '<svg one/>', diagramType: 'flowchart' })

    expect(await first).toBe('<svg one/>')
    expect(await second).toBe('<svg two/>')
    expect(renderMock).toHaveBeenCalledTimes(2)
    const ids = renderMock.mock.calls.map(call => call[0])
    expect(ids).toHaveLength(new Set(ids).size)
    for (const id of ids) expect(id).toMatch(/^dsh-mermaid-\d+$/)
  })

  it('a failed render does not poison the queue', async () => {
    parseMock.mockRejectedValueOnce(new Error('Parse error on line 2'))

    await expect(renderMermaidSvg('not a diagram', 'light')).rejects.toThrow('Parse error on line 2')
    await expect(renderMermaidSvg('flowchart TD\nA-->B', 'light')).resolves.toBe('<svg/>')
    expect(renderMock).toHaveBeenCalledTimes(1)
  })

  it('engine initializes at security level strict with the mapped stock theme', async () => {
    await renderMermaidSvg('flowchart TD\nA-->B', 'light')
    expect(initializeMock).toHaveBeenCalledWith(
      expect.objectContaining({ startOnLoad: false, securityLevel: 'strict', theme: 'default' }),
    )

    await renderMermaidSvg('flowchart TD\nA-->B', 'dark')
    expect(initializeMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ startOnLoad: false, securityLevel: 'strict', theme: 'dark' }),
    )
  })
})
