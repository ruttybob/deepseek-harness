// @vitest-environment jsdom
// The diagram fence arm ladder at the MarkdownText seam. The engine loader is
// mocked (real SVG layout needs a real browser; the engine module itself is
// covered in mermaid-engine.client.spec.tsx and docs sources by the Node-side
// verify-mermaid gate).
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MarkdownText } from './markdown-test-components.tsx'
import { renderMermaidSvg } from '../src/markdown/mermaid.ts'
import type { MermaidTheme } from '../src/markdown/mermaid.ts'

vi.mock('../src/markdown/mermaid.ts', () => ({
  renderMermaidSvg: vi.fn<(source: string, theme: MermaidTheme) => Promise<string>>(),
}))

const renderMock = vi.mocked(renderMermaidSvg)

const FENCE = '```mermaid\nflowchart TD\nA-->B\n```'
const SVG = '<svg viewBox="0 0 10 10" role="img"><rect width="10" height="10"/></svg>'

function resolvedLoader(svg = SVG): void {
  renderMock.mockImplementation(async () => svg)
}

afterEach(cleanup)

beforeEach(() => {
  renderMock.mockReset()
  resolvedLoader()
  document.body.removeAttribute('data-ds-dark-theme')
})

describe('diagram fence arm ladder', () => {
  it('settled diagram fence renders engine SVG', async () => {
    const { container } = render(<MarkdownText text={FENCE} />)

    await waitFor(() => {
      expect(container.querySelector('svg')).toBeTruthy()
    })
    expect(container.querySelector('pre')).toBeNull()
    expect(renderMock).toHaveBeenCalledWith('flowchart TD\nA-->B', 'light')
  })

  it('several settled diagrams on one page each render', async () => {
    const doc = `${FENCE}\n\n${FENCE.replace('A-->B', 'B-->C')}`
    const { container } = render(<MarkdownText text={doc} />)

    await waitFor(() => {
      expect(container.querySelectorAll('[class*="stage"] svg')).toHaveLength(2)
    })
    expect(renderMock).toHaveBeenCalledTimes(2)
    expect(renderMock).toHaveBeenNthCalledWith(1, 'flowchart TD\nA-->B', 'light')
    expect(renderMock).toHaveBeenNthCalledWith(2, 'flowchart TD\nB-->C', 'light')
  })

  it('streaming diagram fence renders an ordinary code block', () => {
    const { container } = render(<MarkdownText text={FENCE} streaming />)

    expect(container.querySelector('pre')).not.toBeNull()
    expect(container.querySelector('svg')).toBeNull()
    expect(renderMock).not.toHaveBeenCalled()
  })

  it('engine-chunk load keeps the code block visible then swaps without blocking', async () => {
    let release!: (svg: string) => void
    renderMock.mockImplementation(() => new Promise<string>((resolve) => { release = resolve }))
    const { container } = render(<MarkdownText text={FENCE} />)

    // The code block is visible synchronously — the lazy engine import never
    // blocks the first paint of the fence.
    expect(container.querySelector('pre')).not.toBeNull()
    expect(container.querySelector('svg')).toBeNull()

    release(SVG)
    await waitFor(() => {
      expect(container.querySelector('svg')).toBeTruthy()
    })
    expect(container.querySelector('pre')).toBeNull()
  })

  it('failed render falls back to the code block with an error pill carrying the message', async () => {
    renderMock.mockRejectedValue(new Error('Parse error on line 2'))
    const { container } = render(<MarkdownText text={FENCE} />)

    const pill = await screen.findByTitle('Parse error on line 2')
    expect(pill.textContent).toContain('图表无法显示')
    expect(container.querySelector('pre')?.textContent).toContain('flowchart TD')
  })

  it('banner carries the mermaid label and a localized copy-source pair', async () => {
    const { container } = render(<MarkdownText text={FENCE} />)

    await waitFor(() => {
      expect(container.querySelector('svg')).toBeTruthy()
    })
    expect(screen.getByText('mermaid')).toBeTruthy()
    // The copy-source button uses the same localized label pair as code
    // fences; the copied-state flip itself is clipboard-host behavior already
    // covered by the CodeBlock specs.
    expect(screen.getByRole('button', { name: '复制' })).toBeTruthy()
  })

  it('diagram at mount uses the theme from the dark attribute', async () => {
    document.body.setAttribute('data-ds-dark-theme', '')
    const { container } = render(<MarkdownText text={FENCE} />)

    await waitFor(() => {
      expect(container.querySelector('svg')).toBeTruthy()
    })
    expect(renderMock).toHaveBeenCalledWith('flowchart TD\nA-->B', 'dark')
  })
})
