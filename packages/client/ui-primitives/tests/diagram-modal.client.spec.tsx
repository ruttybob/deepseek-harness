// @vitest-environment jsdom
// The expand-to-modal arm at the MarkdownText seam: the banner expand button
// opens a modal holding the diagram, the modal stage holds zoom state
// independent of the inline stage, Escape and outside click close it, and the
// controls are localized. The engine loader is mocked.
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

async function renderFenceWithSvg(): Promise<RenderResult> {
  const view = render(<MarkdownText text={FENCE} />)
  await act(async () => {})
  await waitFor(() => { expect(view.container.querySelector('[class*="stage"] svg')).toBeTruthy() })
  await act(async () => {})
  return view
}

function stageOf(root: ParentNode): Element {
  const stage = root.querySelector('[class*="stage"]')
  expect(stage).not.toBeNull()
  return stage!
}

function transformOf(stage: Element): string {
  return (stage.firstElementChild as HTMLElement).style.transform
}

function wheelZoom(stage: Element): void {
  const event = new WheelEvent('wheel', { cancelable: true, bubbles: true, ctrlKey: true, deltaY: -240 })
  act(() => { stage.dispatchEvent(event) })
}

async function openModal(): Promise<HTMLElement> {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: '展开' }))
  })
  const dialog = await screen.findByRole('dialog')
  await waitFor(() => { expect(stageOf(dialog).querySelector('svg')).toBeTruthy() })
  return dialog
}

afterEach(cleanup)

beforeEach(() => {
  renderMock.mockReset().mockImplementation(async () => SVG)
  document.body.removeAttribute('data-ds-dark-theme')
})

describe('diagram modal', () => {
  it('the expand button opens a modal holding the diagram', async () => {
    const view = await renderFenceWithSvg()

    await openModal()

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(stageOf(screen.getByRole('dialog')).querySelector('svg')).toBeTruthy()
    // The inline viewer stays mounted underneath.
    expect(stageOf(view.container).querySelector('svg')).toBeTruthy()
  })

  it('the modal viewer holds zoom state independent of the inline viewer', async () => {
    const view = await renderFenceWithSvg()
    const dialog = await openModal()

    // Zoom inside the modal only: the inline view stays at fit.
    wheelZoom(stageOf(dialog))
    expect(transformOf(stageOf(dialog))).toBe(`translate(0px, 0px) scale(${Math.exp(-(-240) * 0.0015)})`)
    expect(transformOf(stageOf(view.container))).toBe('translate(0px, 0px) scale(1)')

    // Closing unmounts the modal stage; reopening starts from fit again.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    })
    expect(screen.queryByRole('dialog')).toBeNull()

    await openModal()
    expect(transformOf(stageOf(screen.getByRole('dialog')))).toBe('translate(0px, 0px) scale(1)')
  })

  it('escape and outside click close the modal', async () => {
    await renderFenceWithSvg()
    await openModal()

    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })
    expect(screen.queryByRole('dialog')).toBeNull()

    await openModal()
    const mask = screen.getByRole('dialog').previousElementSibling as Element
    await act(async () => {
      fireEvent.click(mask)
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('modal controls are localized', async () => {
    await renderFenceWithSvg()
    await openModal()

    expect(screen.getByRole('button', { name: '关闭' })).toBeTruthy()
  })
})
