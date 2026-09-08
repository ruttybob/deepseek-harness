// @vitest-environment jsdom
// The diagram viewer at the MarkdownText seam: fit-to-width default, zoom
// (Ctrl/⌘+wheel and banner buttons) that never hijacks page scroll, drag pan,
// double-click reset, per-instance view state surviving svg and theme swaps,
// theme-palette re-render, and localized accessible control names. The engine
// loader is mocked (see mermaid-engine.client.spec.tsx for the engine module).
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { RenderResult } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MarkdownText } from './markdown-test-components.tsx'
import { renderMermaidSvg } from '../src/markdown/mermaid.ts'
import type { MermaidTheme } from '../src/markdown/mermaid.ts'

vi.mock('../src/markdown/mermaid.ts', () => ({
  renderMermaidSvg: vi.fn<(source: string, theme: MermaidTheme) => Promise<string>>(),
}))

const renderMock = vi.mocked(renderMermaidSvg)

const FENCE = '```mermaid\nflowchart TD\nA-->B\n```'
const SVG = '<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>'
const DARK_SVG = '<svg viewBox="0 0 10 10" data-palette="dark"><rect width="10" height="10"/></svg>'
const FIT_TRANSFORM = 'translate(0px, 0px) scale(1)'

/** Flush React work scheduled outside act (store pokes, loader promises). */
async function flush(): Promise<void> {
  await act(async () => {})
}

/** The diagram svg — scoped to the stage, the banner icons are svgs too. */
function stageSvgOf(container: HTMLElement): SVGElement {
  const svg = container.querySelector('[class*="stage"] svg')
  expect(svg).not.toBeNull()
  return svg as SVGElement
}

async function renderFenceWithSvg(): Promise<RenderResult> {
  const view = render(<MarkdownText text={FENCE} />)
  await flush()
  await waitFor(() => { expect(containerHasStageSvg(view.container)).toBe(true) })
  await flush()
  return view
}

function containerHasStageSvg(container: HTMLElement): boolean {
  return container.querySelector('[class*="stage"] svg') !== null
}

function transformOf(container: HTMLElement): string {
  const stage = container.querySelector('[class*="stage"]')
  expect(stage).not.toBeNull()
  return (stage!.firstElementChild as HTMLElement).style.transform
}

function scaleOf(transform: string): number {
  const match = /scale\(([\d.]+)\)/.exec(transform)
  expect(match).not.toBeNull()
  return Number(match![1])
}

function wheelOn(container: HTMLElement, init: WheelEventInit): WheelEvent {
  const stage = container.querySelector('[class*="stage"]')!
  const event = new WheelEvent('wheel', { cancelable: true, bubbles: true, ...init })
  stage.dispatchEvent(event)
  return event
}

function dragBy(container: HTMLElement, dx: number, dy: number): void {
  const stage = container.querySelector('[class*="stage"]')!
  fireEvent.pointerDown(stage, { pointerId: 1, clientX: 0, clientY: 0 })
  fireEvent.pointerMove(window, { pointerId: 1, clientX: dx, clientY: dy })
  fireEvent.pointerUp(window, { pointerId: 1, clientX: dx, clientY: dy })
}

afterEach(cleanup)

beforeEach(() => {
  renderMock.mockReset().mockImplementation(async () => SVG)
  document.body.removeAttribute('data-ds-dark-theme')
})

describe('diagram viewer', () => {
  it('the diagram fits the column width by default', async () => {
    const { container } = await renderFenceWithSvg()

    expect(transformOf(container)).toBe(FIT_TRANSFORM)
    expect(stageSvgOf(container).style.maxWidth).toBe('100%')
  })

  it('ctrl and command wheel zoom the diagram without scrolling the page', async () => {
    const { container } = await renderFenceWithSvg()

    let ctrlWheel!: WheelEvent
    await act(async () => { ctrlWheel = wheelOn(container, { ctrlKey: true, deltaY: -240 }) })
    expect(ctrlWheel.defaultPrevented).toBe(true)
    const ctrlScale = scaleOf(transformOf(container))
    expect(ctrlScale).toBeGreaterThan(1)

    let metaWheel!: WheelEvent
    await act(async () => { metaWheel = wheelOn(container, { metaKey: true, deltaY: -240 }) })
    expect(metaWheel.defaultPrevented).toBe(true)
    expect(scaleOf(transformOf(container))).toBeGreaterThan(ctrlScale)

    // Plain wheel is the page's: not intercepted, not consumed.
    const scaleBeforePlain = scaleOf(transformOf(container))
    let plainWheel!: WheelEvent
    await act(async () => { plainWheel = wheelOn(container, { deltaY: -240 }) })
    expect(plainWheel.defaultPrevented).toBe(false)
    expect(scaleOf(transformOf(container))).toBe(scaleBeforePlain)
  })

  it('zoom buttons in the banner zoom in and out', async () => {
    const { container } = await renderFenceWithSvg()

    fireEvent.click(screen.getByRole('button', { name: '放大' }))
    expect(transformOf(container)).toBe('translate(0px, 0px) scale(1.25)')

    fireEvent.click(screen.getByRole('button', { name: '放大' }))
    expect(transformOf(container)).toBe('translate(0px, 0px) scale(1.5625)')

    fireEvent.click(screen.getByRole('button', { name: '缩小' }))
    expect(transformOf(container)).toBe('translate(0px, 0px) scale(1.25)')

    fireEvent.click(screen.getByRole('button', { name: '缩小' }))
    expect(transformOf(container)).toBe(FIT_TRANSFORM)
  })

  it('drag pans when zoomed and double-click resets zoom and pan', async () => {
    const { container } = await renderFenceWithSvg()

    fireEvent.click(screen.getByRole('button', { name: '放大' }))
    dragBy(container, 30, 15)
    expect(transformOf(container)).toBe('translate(30px, 15px) scale(1.25)')

    // At the fit scale a drag is not a pan; it stays put.
    fireEvent.doubleClick(container.querySelector('[class*="stage"]') as Element)
    dragBy(container, 30, 15)
    expect(transformOf(container)).toBe(FIT_TRANSFORM)
  })

  it('zoom and pan persist across svg and theme swaps and reset when the source changes', async () => {
    // Theme-distinct markup makes the svg swap observable in the DOM.
    renderMock.mockImplementation(async (_source, theme) => (theme === 'dark' ? DARK_SVG : SVG))
    const { container, rerender } = await renderFenceWithSvg()

    fireEvent.click(screen.getByRole('button', { name: '放大' }))
    dragBy(container, 12, 6)
    expect(transformOf(container)).toBe('translate(12px, 6px) scale(1.25)')

    // Theme flip: the engine re-renders the palette; the reader's position stays.
    await act(async () => {
      document.body.setAttribute('data-ds-dark-theme', '')
    })
    await waitFor(() => { expect(renderMock).toHaveBeenCalledWith('flowchart TD\nA-->B', 'dark') })
    await waitFor(() => { expect(stageSvgOf(container).dataset.palette).toBe('dark') })
    expect(transformOf(container)).toBe('translate(12px, 6px) scale(1.25)')

    // A different fence source is a different diagram: reset.
    rerender(<MarkdownText text={FENCE.replace('A-->B', 'A-->C')} />)
    await flush()
    expect(transformOf(container)).toBe(FIT_TRANSFORM)
  })

  it('a theme flip re-renders the diagram in the matching palette preserving zoom and pan', async () => {
    renderMock.mockImplementation(async (_source, theme) => (theme === 'dark' ? DARK_SVG : SVG))
    const { container } = await renderFenceWithSvg()

    fireEvent.click(screen.getByRole('button', { name: '放大' }))
    expect(transformOf(container)).toBe('translate(0px, 0px) scale(1.25)')

    await act(async () => {
      document.body.setAttribute('data-ds-dark-theme', '')
    })
    await flush()
    expect(stageSvgOf(container).dataset.palette).toBe('dark')
    expect(transformOf(container)).toBe('translate(0px, 0px) scale(1.25)')
    expect(renderMock).toHaveBeenLastCalledWith('flowchart TD\nA-->B', 'dark')

    await act(async () => {
      document.body.removeAttribute('data-ds-dark-theme')
    })
    await flush()
    expect(stageSvgOf(container).dataset.palette).toBeUndefined()
    expect(renderMock).toHaveBeenLastCalledWith('flowchart TD\nA-->B', 'light')
  })

  it('viewer controls carry localized accessible names', async () => {
    await renderFenceWithSvg()

    expect(screen.getByRole('button', { name: '放大' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '缩小' })).toBeTruthy()
  })
})
