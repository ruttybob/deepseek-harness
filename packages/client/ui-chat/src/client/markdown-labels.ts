/** Localized copy adapters for Cordis-free Markdown primitives. */

import type { MarkdownLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ChatViewSlotProps } from './contract/slots.ts'

/**
 * Build the complete Markdown chrome copy for one locale revision.
 * @param t - Chat locale seat.
 * @returns Labels for code fences, diagram fences, and footnotes.
 */
export function markdownLabels(t: ChatViewSlotProps['t']): MarkdownLabels {
  return {
    code: { copyLabel: t('copy'), copiedLabel: t('copied'), toolbarLabels: { codeLabel: t('codeBlock.title'), wrapLabel: t('codeBlock.wrap'), unwrapLabel: t('codeBlock.unwrap') } },
    diagram: {
      zoomIn: t('markdown.diagram.zoomIn'),
      zoomOut: t('markdown.diagram.zoomOut'),
      expand: t('expand'),
      close: t('close'),
      error: t('markdown.diagram.error'),
    },
    footnotes: t('markdown.footnotes'),
  }
}
