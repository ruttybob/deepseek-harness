/**
 * The settled ```mermaid fence arm. Rendering ladder: while the engine chunk
 * loads (or the fence is still streaming — the arm only mounts settled), the
 * reader sees the ordinary code block; the swap to SVG itself signals
 * readiness. A parse or render failure falls back to the code block plus a
 * small error pill whose tooltip carries the engine's message. The generated
 * SVG is trusted generator output consumed through innerHTML under the
 * engine's strict security level — the same model as CodeBlock's shiki span
 * trees (ADR 0001): source-authored clicks and HTML labels never execute.
 *
 * The stage is a viewer: the diagram fits the column width by default;
 * Ctrl/⌘+wheel and the banner buttons zoom, drag pans when zoomed, and
 * double-click resets. Zoom/pan live on a transform wrapper around the SVG,
 * so the SVG swapping underneath (a re-render or a theme palette change)
 * never disturbs the reader's position; only a different fence source resets
 * it. View state is per stage instance, and the expand-to-modal arm mounts a
 * second independent instance.
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, useSyncExternalStore } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import clsx from 'clsx'
import { writeClipboard } from '../clipboard.ts'
import { IconCloseOutlineRegular, IconFullscreenOutlineRegular, IconMinusOutlineRegular, IconPlusOutlineRegular, IconWarningOutlineRegular } from '../icons/index.tsx'
import { CodeBlock } from './CodeBlock.tsx'
import { Modal } from '../Modal.tsx'
import { renderMermaidSvg } from './mermaid.ts'
import type { MarkdownLabels } from './render.tsx'
import cssCode from './CodeBlock.module.css'
import css from './DiagramFence.module.css'

/**
 * The app's dark-theme signal is the `data-ds-dark-theme` body attribute,
 * written by the boot-theme script and ui-layout's ThemePresenter. A tiny
 * external store mirrors it for renders (the CodeBlock grammar-loaded store
 * precedent): the MutationObserver exists only to poke subscribers, and the
 * snapshot reads the attribute live — booleans compare by value, so React's
 * snapshot contract holds without caching.
 */
function readDarkTheme(): boolean {
  return typeof document !== 'undefined' && document.body.hasAttribute('data-ds-dark-theme')
}

let darkThemeObserver: MutationObserver | null = null
const darkThemeListeners = new Set<() => void>()

function subscribeDarkTheme(callback: () => void): () => void {
  if (darkThemeObserver === null && typeof document !== 'undefined') {
    darkThemeObserver = new MutationObserver(() => {
      for (const listener of darkThemeListeners) listener()
    })
    darkThemeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })
  }
  darkThemeListeners.add(callback)
  return () => {
    darkThemeListeners.delete(callback)
  }
}

const getDarkThemeSnapshot = readDarkTheme
const getServerDarkThemeSnapshot = (): boolean => false

interface DiagramFenceProps {
  /** The mermaid source, rendered verbatim by the fallback arms and copy-source. */
  code: string
  /** Localized chrome: the code copy pair plus diagram banner copy. */
  labels: MarkdownLabels
}

/** The fence language id; like CodeBlock's infostring it is vocabulary, not locale copy. */
const FENCE_LANGUAGE = 'mermaid'

/** Zoom bounds: the fit scale is the floor, the ceiling keeps text legible. */
const MIN_SCALE = 1
const MAX_SCALE = 8

/** Multiplicative step of the banner zoom buttons. */
const ZOOM_STEP = 1.25

/** Fit view: the diagram at its natural fit-to-width size, unpanned. */
const FIT_VIEW: View = { scale: 1, tx: 0, ty: 0 }

/** Reader position on the diagram: the transform wrapper's zoom and pan. */
interface View {
  scale: number
  tx: number
  ty: number
}

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

/** Banner-facing controls of one stage instance: the fence's zoom buttons drive the inline stage through this. */
interface DiagramStageHandle {
  zoomBy(factor: number): void
}

interface DiagramStageProps {
  /** The fence source; a change resets this instance's view. */
  code: string
  /** The current engine-generated SVG markup. */
  svg: string
}

/**
 * One viewer instance over a rendered diagram: fit-to-width default,
 * Ctrl/⌘+wheel zoom, drag pan when zoomed, double-click reset. Independent
 * per instance — the inline fence and the expanded modal each hold their own
 * view.
 */
const DiagramStage = forwardRef<DiagramStageHandle, DiagramStageProps>(function DiagramStage({ code, svg }, ref) {
  const stageRef = useRef<HTMLDivElement>(null)
  // Mermaid inlines `style="max-width: …px"` from its layout measurement, which
  // would cap the diagram under the column width; the fit-to-width default
  // overrides it (the viewBox keeps the aspect ratio).
  useEffect(() => {
    stageRef.current?.querySelector('svg')?.style.setProperty('max-width', '100%')
  }, [svg])

  const [view, setView] = useState<View>(FIT_VIEW)

  /**
   * Multiply the zoom keeping the stage-local point `px,py` visually fixed
   * (transform-origin 0 0: screen = t + scale · local). Snapping back to the
   * floor resets the pan, so zooming out always lands on the exact fit view.
   */
  const applyZoom = useCallback((factor: number, px: number, py: number) => {
    setView((current) => {
      const scale = clampScale(current.scale * factor)
      if (scale === current.scale) return current
      if (scale <= MIN_SCALE * 1.001) return FIT_VIEW
      const k = scale / current.scale
      return { scale, tx: px - k * (px - current.tx), ty: py - k * (py - current.ty) }
    })
  }, [])

  useImperativeHandle(ref, () => ({
    zoomBy(factor: number): void {
      const rect = stageRef.current?.getBoundingClientRect()
      applyZoom(factor, (rect?.width ?? 0) / 2, (rect?.height ?? 0) / 2)
    },
  }), [applyZoom])

  // Ctrl/⌘+wheel zoom needs a non-passive native listener: React attaches
  // wheel passively, and the browser's page zoom and page scroll must be
  // prevented, not just the diagram zoomed.
  useEffect(() => {
    const stage = stageRef.current
    if (stage === null) return
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      const rect = stage.getBoundingClientRect()
      applyZoom(Math.exp(-event.deltaY * 0.0015), event.clientX - rect.left, event.clientY - rect.top)
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      stage.removeEventListener('wheel', onWheel)
    }
  }, [applyZoom])

  // Pan while zoomed: track the active drag through a ref and listen on the
  // window so the pointer can leave the stage mid-drag without losing it.
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; baseTx: number; baseTy: number } | null>(null)
  // A different fence source is a different diagram: reset the reader's
  // position. A re-render or theme palette swap re-uses this instance without
  // touching `code`, so its transform survives the SVG swap underneath.
  useEffect(() => {
    setView(FIT_VIEW)
    dragRef.current = null
  }, [code])
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (drag === null || event.pointerId !== drag.pointerId) return
      setView(current => ({
        ...current,
        tx: drag.baseTx + (event.clientX - drag.startX),
        ty: drag.baseTy + (event.clientY - drag.startY),
      }))
    }
    const onEnd = (event: PointerEvent) => {
      if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
    }
  }, [])
  const onStagePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (view.scale <= MIN_SCALE || dragRef.current !== null) return
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseTx: view.tx,
      baseTy: view.ty,
    }
  }
  const onStageDoubleClick = useCallback(() => {
    dragRef.current = null
    setView(FIT_VIEW)
  }, [])

  return (
    <div
      ref={stageRef}
      className={clsx(css.stage, view.scale > MIN_SCALE && css.zoomed)}
      onPointerDown={onStagePointerDown}
      onDoubleClick={onStageDoubleClick}
    >
      <div
        className={css.transform}
        style={{ transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})` }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  )
})

/**
 * Render one settled diagram fence.
 * @param props.code - Mermaid source exactly as authored.
 * @param props.labels - Localized fence and diagram banner copy.
 * @returns The code block while the engine loads or the render failed (with
 *   the error pill), otherwise the diagram viewer with its banner.
 */
export function DiagramFence({ code, labels }: DiagramFenceProps) {
  const dark = useSyncExternalStore(subscribeDarkTheme, getDarkThemeSnapshot, getServerDarkThemeSnapshot)
  const [svg, setSvg] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    setErrorMessage(null)
    renderMermaidSvg(code, dark ? 'dark' : 'light').then(
      (markup) => {
        if (!cancelled) setSvg(markup)
      },
      (error: unknown) => {
        if (!cancelled) setErrorMessage(error instanceof Error ? error.message : String(error))
      },
    )
    return () => {
      cancelled = true
    }
  }, [code, dark])

  const inlineStageRef = useRef<DiagramStageHandle>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const onCopy = useCallback(() => {
    if (copied) return
    void writeClipboard(code).then((ok) => {
      if (!ok) return
      setCopied(true)
      window.setTimeout(() => {
        setCopied(false)
      }, 1000)
    })
  }, [copied, code])

  if (errorMessage !== null) {
    return (
      <div className={clsx(cssCode.block, css.block)}>
        <div className={cssCode.bannerWrap}>
          <div className={cssCode.banner}>
            <div className={cssCode.infostring}>{FENCE_LANGUAGE}</div>
            <div className={cssCode.action}>
              <span className={css.pill} title={errorMessage}>
                <IconWarningOutlineRegular size={14} />
                {labels.diagram.error}
              </span>
              <button type="button" className={cssCode.copyButton} onClick={onCopy}>
                {copied ? labels.code.copiedLabel : labels.code.copyLabel}
              </button>
            </div>
          </div>
        </div>
        <pre className={cssCode.plain}><code>{code}</code></pre>
      </div>
    )
  }
  if (svg === null) {
    // Engine chunk still loading (or streaming handed this fence over mid
    // settle): the ordinary code block stays visible until the swap.
    return <CodeBlock code={`${code}\n`} lang="mermaid" copyLabel={labels.code.copyLabel} copiedLabel={labels.code.copiedLabel} />
  }
  return (
    <div className={clsx(cssCode.block, css.block)}>
      <div className={cssCode.bannerWrap}>
        <div className={cssCode.banner}>
          <div className={cssCode.infostring}>{FENCE_LANGUAGE}</div>
          <div className={clsx(cssCode.action, css.controls)}>
            <button
              type="button"
              className={clsx(cssCode.copyButton, css.bannerButton)}
              aria-label={labels.diagram.zoomOut}
              onClick={() => { inlineStageRef.current?.zoomBy(1 / ZOOM_STEP) }}
            >
              <IconMinusOutlineRegular size={14} />
            </button>
            <button
              type="button"
              className={clsx(cssCode.copyButton, css.bannerButton)}
              aria-label={labels.diagram.zoomIn}
              onClick={() => { inlineStageRef.current?.zoomBy(ZOOM_STEP) }}
            >
              <IconPlusOutlineRegular size={14} />
            </button>
            <button
              type="button"
              className={clsx(cssCode.copyButton, css.bannerButton)}
              aria-label={labels.diagram.expand}
              onClick={() => { setModalOpen(true) }}
            >
              <IconFullscreenOutlineRegular size={14} />
            </button>
            <button type="button" className={cssCode.copyButton} onClick={onCopy}>
              {copied ? labels.code.copiedLabel : labels.code.copyLabel}
            </button>
          </div>
        </div>
      </div>
      <DiagramStage ref={inlineStageRef} code={code} svg={svg} />
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false) }}
        title={FENCE_LANGUAGE}
        headless
        className={css.modal ?? ''}
      >
        <div className={css.modalBody}>
          <button
            type="button"
            className={clsx(cssCode.copyButton, css.modalClose)}
            aria-label={labels.diagram.close}
            onClick={() => { setModalOpen(false) }}
          >
            <IconCloseOutlineRegular size={14} />
          </button>
          <DiagramStage code={code} svg={svg} />
        </div>
      </Modal>
    </div>
  )
}
