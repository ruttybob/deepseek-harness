// Web e2e scenario: settled mermaid fences render as diagrams in the live GUI.
// A throwaway scaffold instance (fresh temp home, real web composition, built
// dist) is seeded with one cold session whose assistant reply carries a valid
// mermaid fence and a syntactically broken one; a real chromium then checks
// the diagram swap, the fallback pill, the theme-palette re-render with zoom
// preserved, and the expand-to-modal arm. Keyless: no model calls, no replay
// fixture. Assertions stay semantic — the engine stamps nondeterministic ids
// into its SVG, so this surface is deliberately excluded from DOM/aria
// recordings (the markdown-dom-parity exclusion, mirrored here).
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import { launchWebScaffold, seedSession, watchConsole, type WebScaffold } from './scaffold.ts'
import { newEnglishPage, saveFailureShot } from './support.ts'

const SEED_ID = 'diagram-fence-web-e2e'

const MERMAID_REPLY = [
  'Here are two diagrams.',
  '',
  '```mermaid',
  'flowchart TD',
  '  A[Start] --> B[End]',
  '```',
  '',
  'The broken one follows.',
  '',
  '```mermaid',
  'flowchart TD',
  '  A -> -> B',
  '```',
].join('\n')

/** Author the cold session: header, one user turn, one text-only assistant reply. */
function buildFixture(): string {
  const stream = [
    { type: 'chunk', time: 0, chunk: { type: 'block-start', index: 0, blockType: 'text' } },
    { type: 'text-chunks', time0: 0, index: 0, dt: [0], texts: [MERMAID_REPLY] },
    { type: 'chunk', time: 0, chunk: { type: 'block-end', index: 0, block: { type: 'text', text: MERMAID_REPLY } } },
    { type: 'chunk', time: 0, chunk: { type: 'usage', usage: { inputTokens: 10, outputTokens: 10 } } },
    { type: 'chunk', time: 0, chunk: { type: 'finish', reason: { kind: 'stop' } } },
  ]
  const userText = 'Draw me a diagram.'
  const events = [
    { type: 'session', version: 2, id: '{{session:1}}', createdAt: 0, cwd: '{{cwd}}', isSeeded: false, delegationDepth: 0 },
    { type: 'permission/preset', data: { preset: 'danger-full-access' } },
    { type: 'sandbox/mode', data: { mode: 'danger-full-access' } },
    { type: 'approval/policy', data: { policy: 'never' } },
    { type: 'turn/start', data: { turn: 1 } },
    { type: 'user/message', data: { content: [{ type: 'text', text: userText }], source: { kind: 'user' }, role: 'user', id: '{{message:1}}' }, surfaceOp: 'append' },
    { type: 'step/start', data: { turn: 1, step: 1 } },
    {
      type: 'assistant/message',
      data: {
        turn: 1,
        step: 1,
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: MERMAID_REPLY }],
          source: { kind: 'model', provider: 'deepseek-official', model: 'deepseek-v4-flash' },
          id: '{{message:2}}',
        },
        usage: { inputTokens: 10, outputTokens: 10 },
        stream,
      },
      surfaceOp: 'append',
    },
    { type: 'step/end', data: { turn: 1, step: 1 } },
    { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } },
  ]
  return `${events.map(event => JSON.stringify(event)).join('\n')}\n`
}

describe.skipIf(process.env.DSH_SNAPSHOT === 'record')('web e2e: diagram fence surfaces', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>

  beforeAll(async () => {
    scaffold = await launchWebScaffold({})
    await seedSession(scaffold, buildFixture(), SEED_ID)
    browser = await chromium.launch()
    page = await newEnglishPage(browser)
    tripwire = watchConsole(page)
    await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
    await page.waitForSelector('[role="treeitem"]', { timeout: 30_000 })
    // The sidebar group collapses on boot; expand it, then open the session.
    await page.locator('[role="treeitem"]').first().click()
    const sessionRow = page.locator('[role="treeitem"]').nth(1)
    await sessionRow.waitFor({ timeout: 15_000 })
    await sessionRow.click()
    // The settled valid fence swaps from the code block to the engine SVG.
    await page.locator('[class*="stage"] svg').first().waitFor({ timeout: 30_000 })
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
    await scaffold?.close()
  })

  it('renders the settled diagram and the failure fallback pill', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-diagram-fence'))
    const diagrams = page.locator('[class*="stage"] svg')
    await expect.poll(() => diagrams.count()).toBe(1)
    // The invalid fence stays a code block and gains the localized error pill
    // with the engine message in its tooltip.
    const pill = page.locator('[class*="pill"]')
    await expect.poll(() => pill.count()).toBe(1)
    await expect.poll(() => pill.textContent()).toBe('Diagram unavailable')
    expect(await pill.getAttribute('title')).toBeTruthy()
    // The broken source stays readable as code.
    expect(await page.locator('pre', { hasText: 'A -> -> B' }).count()).toBe(1)
  })

  it('zooms by ctrl+wheel, keeps zoom through a theme palette re-render, and expands to a modal', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-diagram-viewer-modal'))
    const stage = page.locator('[class*="stage"]').first()
    const transformOf = async (): Promise<string> => await stage.locator('[style*="transform"]').first().getAttribute('style') ?? ''

    // Ctrl/⌘+wheel zoom. Playwright's mouse.wheel does not carry keyboard
    // modifiers, so the ctrl gesture is dispatched as a real WheelEvent at the
    // stage; the non-passive listener path under test is identical.
    await page.evaluate(() => {
      const stage = document.querySelector('[class*="stage"]')
      stage?.dispatchEvent(new WheelEvent('wheel', { ctrlKey: true, deltaY: -240, cancelable: true, bubbles: true }))
    })
    await expect.poll(async () => await transformOf()).toContain('scale(1.')
    const zoomed = await transformOf()
    expect(zoomed).not.toContain('scale(1)')

    // Theme flip: the real DOM signal the boot script and ThemePresenter write.
    // The engine re-renders the dark palette; the reader's zoom survives.
    const markupBefore = await stage.innerHTML()
    await page.evaluate(() => { document.body.toggleAttribute('data-ds-dark-theme', true) })
    await expect.poll(async () => await stage.innerHTML()).not.toBe(markupBefore)
    expect(await transformOf()).toBe(zoomed)

    // Expand to modal: independent viewer instance over the same diagram.
    await page.getByRole('button', { name: 'Expand' }).click()
    const dialog = page.getByRole('dialog')
    await expect.poll(() => dialog.count()).toBe(1)
    const modalTransform = await dialog.locator('[class*="stage"] [style*="transform"]').first().getAttribute('style')
    expect(modalTransform).toContain('scale(1)')

    // Escape closes; outside click is Modal-owned and covered at unit level.
    await page.keyboard.press('Escape')
    await expect.poll(() => dialog.count()).toBe(0)
  })

  it('leaves no page errors behind', async () => {
    expect(tripwire.pageErrors).toEqual([])
  })
})
