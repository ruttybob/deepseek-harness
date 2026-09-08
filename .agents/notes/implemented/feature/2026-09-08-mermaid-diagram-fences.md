# Agent Note: Mermaid diagram fences render in the web UI

Status: implemented

English | [中文](2026-09-08-mermaid-diagram-fences.zh.md)

## Problem

The web chat rendered ```mermaid fenced blocks as highlighted source code, so every diagram the model drew — architecture sketches, sequence flows, state machines — had to be copied into an external renderer to be seen. The gap recurred on every markdown surface (chat, trajectories, plan reviews, tool answers) because they all share one renderer.

## Decision

A settled mermaid fence renders as a diagram through a new `DiagramFence` primitive in `dsh-client-ui-primitives`, mirroring the math fence arm's settled-only rule: while a message streams, or while the lazy engine chunk loads, the reader sees the ordinary code block, and a source that fails to parse or render falls back to the code block plus a localized error pill whose tooltip carries the engine message. The engine sits behind one loader seam, `renderMermaidSvg(source, theme)`, in the primitives package: the only `import('mermaid')` in the client, dynamic, initialized per render at `securityLevel: 'strict'` (ADR 0001 — source-authored clicks and HTML labels never execute), with renders serialized through one queue under a unique diagram id. The generated SVG is consumed as trusted generator output, the same model as CodeBlock's shiki span trees. A transform-wrapper viewer adds fit-to-width, Ctrl/⌘+wheel and button zoom, drag pan when zoomed, double-click reset, per-instance view state that survives svg and theme swaps and resets only when the fence source changes, and an expand-to-modal arm whose viewer holds its own independent view. New banner and pill copy flows through `MarkdownLabels.diagram` and the locale dictionaries (en, zh); the copy-source button reuses the code-fence label pair.

The mermaid dependency lands on `dsh-client-ui-primitives` (aligned with the root pin), and the final Vite build code-splits the dynamic import into on-demand diagram chunks, so the index and vendor entry chunks do not grow. Component coverage lives at the `MarkdownText` seam with the loader mocked; the engine module is covered against a mocked `mermaid` package (serialization, unique ids, queue survival, strict initialization); diagram fences are excluded from the DOM-parity corpus because the engine stamps nondeterministic ids into its SVG. A keyless cold-history web e2e scenario (`diagram-fence.e2e.ts`) boots a throwaway instance with a fresh home and asserts the ladder, palette re-render, zoom preservation, and modal in a real browser with semantic assertions.

## Alternatives considered

**Server-side or precomputed rendering.** The diagram would leave the client's trust model and add a host surface for a presentation-only feature; rejected.

**Render during streaming.** Partial fences would flash broken diagrams on every chunk; the settled-only rule keeps the code block visible until the swap itself signals readiness.

**Sanitize and allow source-authored clicks.** ADR 0001 defers click actions behind a future sanitizer decision; the viewer layer is the only interactivity, and its controls belong to the reader.

## Consequences

Diagrams render everywhere `MarkdownText` renders, on every theme, in every locale, with no host involvement and no main-bundle cost beyond the small viewer primitive. Engine version bumps stay inside the primitives package's seam. The SVG ids stay nondeterministic, so this surface remains excluded from DOM-parity recordings and aria goldens; behavioral coverage owns it instead. Real-user ctrl/⌘+wheel zoom is pinned by unit specs and the throwaway-instance browser scenario, whose wheel gesture is dispatched as a real `WheelEvent` because Playwright's `mouse.wheel` does not carry keyboard modifiers.
