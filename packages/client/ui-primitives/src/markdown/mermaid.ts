/**
 * The client's one mermaid engine integration. The engine stays behind this
 * single seam ({@link renderMermaidSvg}) so tests substitute it and the
 * engine can be swapped later; the `import('mermaid')` here is the only one,
 * it is dynamic (the engine lands in its own lazy chunk and the main web
 * bundle never pays for it), and every render serializes through one queue
 * because the engine's global config and ids are not safe for concurrent
 * renders on one page.
 */

/** Stock engine palettes, mapped from the app's dark-theme attribute. */
export type MermaidTheme = 'light' | 'dark'

type MermaidEngine = typeof import('mermaid').default

/** Cached dynamic import: the first fence pays the chunk load, later fences reuse it. */
let enginePromise: Promise<MermaidEngine> | null = null

function loadEngine(): Promise<MermaidEngine> {
  enginePromise ??= import('mermaid').then(module => module.default)
  return enginePromise
}

/**
 * Tail of every enqueued render; `.catch` keeps one failed render from
 * poisoning the queue, so later diagrams still render.
 */
let queue: Promise<unknown> = Promise.resolve()

/** Monotonic render counter; its value is each diagram's unique engine id. */
let renderCount = 0

/**
 * Render one mermaid source to SVG markup.
 * @param source - Diagram source exactly as authored in the fence.
 * @param theme - Stock palette to initialize the engine with.
 * @returns The generated SVG markup. Rejects with the engine's parse or
 *   render error — its `message` is display-safe and feeds the fallback
 *   pill's tooltip; the SVG itself is consumed as trusted generator output
 *   under `securityLevel: 'strict'` (ADR 0001: source-authored clicks and
 *   HTML labels never execute).
 */
export async function renderMermaidSvg(source: string, theme: MermaidTheme): Promise<string> {
  const run = queue.then(async () => {
    const mermaid = await loadEngine()
    renderCount += 1
    // Initialize per render: the queue makes the engine's global config
    // private to this render, so a theme flip re-initializes before the next
    // SVG is generated instead of leaking the previous palette. `parse`
    // precedes `render` because a ParseError from it carries a useful
    // message, while `render` failures often arrive as opaque errors.
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: theme === 'dark' ? 'dark' : 'default',
    })
    await mermaid.parse(source, { suppressErrors: false })
    const { svg } = await mermaid.render(`dsh-mermaid-${renderCount}`, source)
    return svg
  })
  queue = run.catch(() => undefined)
  return run
}
