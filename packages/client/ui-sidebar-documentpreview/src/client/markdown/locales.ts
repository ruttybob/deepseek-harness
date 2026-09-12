/** Markdown implementation labels and primitive chrome. */
export const zh = {
  'viewer.label': 'Markdown',
  'code.copy': '复制',
  'code.copied': '已复制',
  'markdown.diagram.zoomIn': '放大',
  'markdown.diagram.zoomOut': '缩小',
  'markdown.diagram.expand': '展开',
  'markdown.diagram.close': '关闭',
  'markdown.diagram.error': '图表无法显示',
  'footnotes': '脚注',
} satisfies Record<string, string>

/** Markdown namespace keys. */
export type MarkdownPreviewKey = keyof typeof zh

/** English labels, paired with the Chinese key set. */
export const en = {
  'viewer.label': 'Markdown',
  'code.copy': 'Copy',
  'code.copied': 'Copied',
  'markdown.diagram.zoomIn': 'Zoom in',
  'markdown.diagram.zoomOut': 'Zoom out',
  'markdown.diagram.expand': 'Expand',
  'markdown.diagram.close': 'Close',
  'markdown.diagram.error': 'Diagram unavailable',
  'footnotes': 'Footnotes',
} satisfies Record<MarkdownPreviewKey, string>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Markdown document renderer, its code/diagram chrome, and footnote notice. */
    documentMarkdown: MarkdownPreviewKey
  }
}
