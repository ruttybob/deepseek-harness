import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button, extractMarkdownPlainText, IconEditOutlineRegular, StateDot,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PendingQuestion, PlanReview, QuestionComposerProps } from './contract/slots.ts'
import css from './PlanReviewPanel.module.css'

/** The panel's own props: the question domain face, the narrowed review, and the locale seat. */
export type PlanReviewPanelProps =
  { pending: PendingQuestion; review: PlanReview } & Pick<QuestionComposerProps, 't' | 'renderSlot'>

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
 * Render plan review controls; the submitted document opens in the sidebar.
 *
 * @param props - the question domain face, the narrowed plan review, and `t`.
 * @returns The plan-review takeover for this request.
 */
export function PlanReviewPanel({ pending, review, t, renderSlot }: PlanReviewPanelProps) {
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
  const summary = useMemo(() => {
    const title = extractMarkdownPlainText(review.plan, { mode: 'first-line' })
    const description = extractMarkdownPlainText(review.plan, { mode: 'first-paragraph' })
    return { title, description: description === title ? '' : description }
  }, [review.plan])

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
      <section className={css.card} aria-label={review.question} aria-busy={busy}>
        <div className={css.strip}>
          <StateDot state={busy ? 'ongoing' : 'warning'} />
          {t('plan.header')}
          <div className={css.previewActions}>
            {renderSlot('conversation.plan-review.actions', { review, requestKey: pending.key })}
          </div>
        </div>
        <div className={css.summary}>
          <h3 className={css.title}>{summary.title}</h3>
          {summary.description !== '' && <p className={css.description}>{summary.description}</p>}
        </div>
        <div className={css.footer}>
          <div className={css.feedback} role="status">{error}</div>
          <div className={css.actions}>
            <Button
              variant="outline" className={css.discuss} icon={<IconEditOutlineRegular size={14} />}
              disabled={busy} onClick={() => { settle(() => pending.cancel()) }}
            >
              {t('plan.discuss')}
            </Button>
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
