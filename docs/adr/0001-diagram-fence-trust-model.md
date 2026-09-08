# Diagram fences render with mermaid `securityLevel: 'strict'`; the generated SVG is consumed as trusted generator output

English | [中文](0001-diagram-fence-trust-model.zh.md)

Diagram-fence source is model-authored text — arbitrary model output, not user-configured content. We therefore keep mermaid's default `strict` security level: HTML labels are sanitized, and click actions authored inside diagram source (`click Node href/callback`) never execute. The only interactivity a fence offers is the viewer layer (zoom, pan, reset, expand-to-modal, copy-source), whose controls belong to the reader, not to the diagram. The SVG mermaid generates under `strict` is consumed through `innerHTML`, the same trust model already applied to shiki's span trees in CodeBlock and KaTeX's output: a trusted generator's static output, not raw model HTML.

## Considered Options

- `securityLevel: 'loose'` — enables source-authored click targets, but disables label sanitization on arbitrary model output; rejected for v1. Revisit only behind a sanitizer that whitelists `http(s)` hrefs extracted from the source.
- Extract hrefs ourselves under `strict` — keeps sanitization but adds a hand-rolled parse/handler layer; deferred as out of scope for v1 viewer-only interactivity.

## Consequences

- Diagrams that rely on HTML labels or source-authored clicks render inert/sanitized; the diagram still renders, only interactions are dropped.
- Any future move to source-authored clicks must change this ADR first: the trust boundary, not the feature flag, is the decision being reversed.
