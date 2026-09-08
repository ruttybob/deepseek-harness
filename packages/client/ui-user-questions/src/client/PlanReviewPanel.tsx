import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, IconEditOutline16, MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PendingQuestion, PlanReview, QuestionComposerProps } from './contract/slots.ts'
import css from './PlanReviewPanel.module.css'

/** The panel's own props: the question domain face, the narrowed review, and the locale seat. */
export type PlanReviewPanelProps =
  { pending: PendingQuestion; review: PlanReview } & Pick<QuestionComposerProps, 't'>

/**
 * Optional-prop spread for a decision button's tooltip: `title` is optional on
 * the DOM props, and exactOptionalPropertyTypes rejects an explicit undefined.
 *
 * @param description - the asker's option description, when it carries one.
 * @param hint - keyboard hint appended to the description's title; the hint
 *   never invents a title for an option carrying no description.
 * @returns The `title` prop to spread, or nothing.
 */
function tooltip(description: string | undefined, hint?: string): { title?: string } {
  if (description === undefined) return {}
  return hint === undefined ? { title: description } : { title: `${description} (${hint})` }
}

/** Return whether a document-level Enter belongs to an active IME composition. */
function isComposingEnter(event: KeyboardEvent): boolean {
  // keyCode 229 is the legacy IME-composition signal engines emit without isComposing.
  // oxlint-disable-next-line typescript/no-deprecated
  return event.isComposing || event.keyCode === 229
}

/** Whether the gesture started inside a field that owns its own Enter semantics. */
function insideTextField(target: EventTarget | null): boolean {
  // The composer's editable root is contenteditable; question textareas and
  // any other inputs keep their own meaning for an accelerated Enter.
  return target instanceof Element && target.closest('input, textarea, [contenteditable]') !== null
}

/**
 * Render a plan review as a decision card.
 *
 * @param props - the question domain face, the narrowed plan review, and `t`.
 * @returns The plan-review takeover for this request.
 */
export function PlanReviewPanel({ pending, review, t }: PlanReviewPanelProps) {
  const markdownLabels = useMemo(() => ({
    code: { copyLabel: t('copy'), copiedLabel: t('copied') },
    diagram: {
      zoomIn: t('markdown.diagram.zoomIn'),
      zoomOut: t('markdown.diagram.zoomOut'),
      expand: t('expand'),
      close: t('close'),
      error: t('markdown.diagram.error'),
    },
    footnotes: t('markdown.footnotes'),
  }), [t])
  // The panel waits for the host's resolved frame before leaving, so repeated
  // clicks must not resubmit. A failed send re-enables it and shows the error.
  // Both verbs are stable callbacks so the keyboard effect below can hold them
  // without re-subscribing on every render.
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const settle = useCallback((send: () => Promise<void>): void => {
    setBusy(true)
    setError(null)
    void send().catch((cause: unknown) => {
      setBusy(false)
      setError(cause instanceof Error ? cause.message : String(cause))
    })
  }, [])
  const decide = useCallback((label: string): void => {
    settle(() => pending.answer({ answers: [{ id: review.id, selected: [label] }] }))
  }, [pending, review, settle])
  const decline = review.decline

  // Cmd/Ctrl+Enter approves from anywhere outside a text field: the composer
  // input keeps its send semantics (its keymap owns Enter), so the panel
  // claims the accelerated gesture only where it cannot mean "send the
  // message". The listener sits out while busy — a settled request must not
  // answer twice — and re-arms with the failed-send recovery above.
  useEffect(() => {
    if (busy) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Enter') return
      if (!(event.metaKey || event.ctrlKey)) return
      if (event.repeat || isComposingEnter(event)) return
      if (insideTextField(event.target)) return
      event.preventDefault()
      decide(review.approve.label)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [busy, decide, review])

  return (
    <div className={css.frame} data-plan-review-key={pending.key}>
      <section className={css.card} aria-label={review.question}>
        <div className={css.strip}>
          <span className={css.dot} />
          {t('plan.header')}
        </div>
        <div className={css.body} data-plan-review-scroll>
          <MarkdownText text={review.plan} labels={markdownLabels} />
        </div>
        <div className={css.footer}>
          <div className={css.feedback} role="status">{error}</div>
          <div className={css.actions}>
            <Button
              variant="ghost" className={css.discuss} icon={<IconEditOutline16 size={14} />}
              disabled={busy} onClick={() => { settle(() => pending.cancel()) }}
            >
              {t('plan.discuss')}
            </Button>
            {decline !== undefined && (
              <Button
                variant="outline" {...tooltip(decline.description)}
                disabled={busy} onClick={() => { decide(decline.label) }}
              >
                {t('plan.decline')}
              </Button>
            )}
            <Button
              variant="primary" {...tooltip(review.approve.description, t('plan.approve.kbd'))}
              disabled={busy} onClick={() => { decide(review.approve.label) }}
            >
              {t('plan.approve')}
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
