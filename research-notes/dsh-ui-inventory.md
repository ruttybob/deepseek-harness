# Web-GUI surface inventory — what a design-language restyle touches

Ticket: `dsh-ood.1` (child of map `dsh-ood` — port the OpenWorker design language into the DSH web GUI).
All counts measured with `find`/`rg` on the source trees (`packages/**/src`, `apps/web/src`), excluding `node_modules`, `lib`, `dist`. Commit `b150a551b8`.

## 1. How styling is architected (the one thing that matters first)

- **Token layer** — `packages/client/ui-theme/src/styles/`:
  | file | LOC | role |
  |---|---|---|
  | `design-platform.css` | 338 | `--dsw-static-*` palette (~279 vars on `body`), `--dsw-alias-*` semantic remap (line 157+), `body[data-ds-dark-theme]` dark blocks (lines 80 and 248) |
  | `gradient-shadow-text.css` | 232 | `--dsw-linear-*` gradients, `--dsw-shadow-lv1..3`, `--dsw-mask-blur` (light values on `body`; inline dark overrides) |
  | `scrollbar.css` | 90 | sole consumer of `--dsw-alias-scrollbar-*`; standard + `::-webkit-scrollbar` dual path on `body`, elevation via `--dsh-scrollbar-thumb{,-hover}` rebinding |
  | `shiki.css` | 31 | `--shiki-*` token palette, light on `:root` + dark on `body[data-ds-dark-theme]`; fg/bg alias `--dsw-alias-label-primary` / `--dsw-alias-markdown-code-block` |
  | `base.css` | 15 | minimal resets |
  These sheets are injected at runtime as inline `<style>` tags by `ui-theme/src/client/styles.ts` (`installThemeStyles`), plugin-lifetime-scoped.
- **Everything else** is CSS Modules per package (`.module.css`), which consume the tokens via `var(--dsw-alias-*)` (1,321 references) and `var(--dsw-static-*)` (12 direct references) plus `var(--dsh-*)` locals (87). The discipline is strong: only ~43 hex literals and ~14 `rgba()` literals exist across all 106 module files (16,302 LOC) — and most of those are in comments, theme-picker swatches, or deliberate figma-locked values.
- `apps/web` is a thin Vite entry (`src/main.ts` = 10 LOC, plus `node-module-stub.ts`); no styling of its own. The pre-theme boot screen lives in **`packages/client/web/src/boot-page.module.css`** (self-contained `--dsh-boot-*` mini-palette, light+dark, because "the framework-free boot page cannot depend on theme delivery succeeding").
- `packages/client/web/src/base.css` is the only other global-ish sheet.
- One straggler outside client/extensions: `packages/session-query/session-log-export/src/client/HeaderAction.module.css` (36 LOC).

## 2. Surface enumeration (every pixel-painting package)

Legend: files = `.module.css` count; LOC = summed CSS-module lines; approach = how it gets colors.

### Shell / layout
| package | files | LOC | notes |
|---|---|---|---|
| `ui-layout` (AppFrame) | 1 | 119 | shell frame; some inline `style={{}}` |
| `ui-sidebar` | 1 | 339 | sidebar chrome |
| `ui-conversation` skeleton (ConversationRoot, HeroShell, DetailsPanel) | (part of 21) | (part of 2,930) | app skeleton |
| `packages/client/web` (boot page + base.css) | 2 | ~250 | self-contained `--dsh-boot-*` palette, own dark block |

### Chat transcript + composer
| package | files | LOC | notes |
|---|---|---|---|
| `ui-conversation` | 21 | 2,930 | largest surface: ChatView, MessageItem, AssistantMarkdown, ReasoningRow, StatsLine, InputBar (composer), ApprovalPanel, ContextMeter, QueueDock, TodoPanel, etc. |
| `ui-attachment` | 5 | 289 | composer attachments, drop overlay, lightbox |
| `ui-input-trigger` | 1 | 122 | slash-command menu in composer |
| `ui-message-feedback` | 1 | 144 | message actions |
| `ui-user-questions` | 2 | 581 | question composer, plan-review panel |
| `ui-goal` | 2 | 152 | goal bar |
| `ui-commands` | 1 | 118 | popup select |
| `ui-model-selection` | 1 | 270 | model picker in composer |

### Settings
| package | files | LOC | notes |
|---|---|---|---|
| `ui-settings-general` | 4 | 261 | settings root/modal shell |
| `ui-settings-models` | 4 | 765 | models section, onboarding modals |
| `ui-settings-plugins` | 3 | 355 | plugin cards/fields |
| `ui-settings-plugin-inventory` | 1 | 279 | inventory tab |
| `ui-theme` AppearanceRow | 1 | 57 | theme picker row (swatch hexes by design) |
| `locale` LanguageRow | 1 | ~60 | language row |

### Panels: trajectory / workspace / jobs / workflow / subagents / plan
| package | files | LOC | notes |
|---|---|---|---|
| `ui-trajectory` | 8 | 2,597 | second-largest surface: table/timeline/turn views; 2 hardcoded `rgba` box-shadows |
| `ui-workspace` | 3 | 882 | workspace browser/picker; 6 hardcoded hex text colors in `rows/Rows.module.css` |
| `ui-jobs` | 1 | 125 | |
| `ui-workflow-run` | 1 | 254 | |
| `ui-subagent` | 2 | 346 | |
| `ui-plan` | 1 | 49 | |
| `ui-agent-preset` | 4 | 611 | preset seats/rows/labels |
| `ui-skill` | 1 | 212 | skill rows |
| `ui-permission-presets` | 1 | 60 | |
| `ui-deliverables` | 1 | 105 | |
| `ui-directory-picker-browse` | 1 | 428 | |
| `ui-directory-picker-native` | 0 | 0 | no styles |

### Tool cards / renderers / primitives
| package | files | LOC | notes |
|---|---|---|---|
| `ui-tool` | 4 | 605 | ToolRow, ToolCallTree, ToolDetails, bash-sample |
| `ui-primitives` | 46 | 4,518 | the shared kit: Button, Input, Menu, Modal, Toast, Tooltip, HoverCard, Pill, markdown/* (CodeBlock, MarkdownText, MessageText, JsonBlock), Diff/Read/Search/Web/Terminal blocks, JsonTree, OnboardingSurface, StateDot, RiskConfirmation |
| `ui-renderer` | 0 | 0 | logic only, but `scoped-slots.tsx` uses inline `style={{}}` |
| `extensions/ui-cordis` | 3 | 797 | CordisDefineRow, CordisPanel, CordisRunRow (run panels) |
| `session-query/session-log-export` | 1 | 36 | header action |

Packages with no styling at all: `ui-brand-official`, `ui-reference`, `ui-slots`, `ui-settings` (container only), `ui-directory-picker-native`, `ui-renderer`.

**Totals: 106 `.module.css` files, 16,302 LOC, across 25 styled packages + `ui-theme` global sheets (706 LOC).**

## 3. Dark corners

- **shiki code theme**: colors come from `ui-theme/src/styles/shiki.css` (`--shiki-token-*`, hardcoded hex pairs light/dark, fg/bg aliased to markdown tokens). `ui-primitives/src/markdown/CodeBlock.tsx` uses shiki's css-variables theme so token colors stay on the custom properties. Token-reachable only via that one file.
- **KaTeX**: `ui-primitives/src/markdown/katex.tsx` renders KaTeX HTML; math inherits current color (`--dsw-alias-label-*`) — no separate KaTeX palette sheet. Inline `style` strings from KaTeX output are converted verbatim (positional SVG glyphs), not themable.
- **Scrollbar**: entirely `ui-theme/src/styles/scrollbar.css` — dual-path (standard `scrollbar-color` + `::-webkit-scrollbar`) driven by `--dsw-alias-scrollbar-bg/hover-l1/l2`; surfaces rebind `--dsh-scrollbar-thumb*` for elevation. Token-reachable.
- **Markdown rendering**: `ui-primitives/src/markdown/*` (MarkdownText/MessageText/CodeBlock/JsonBlock `.module.css`) + `AssistantMarkdown.module.css` in ui-conversation; all consume `--dsw-alias-markdown-*` tokens. `ansi.ts` in ui-primitives holds a hardcoded 16-color ANSI palette mapping to `--dsw-static-*` — ANSI colors are semantic, restyle only if the palette itself changes.
- **Boot page**: `packages/client/web/src/boot-page.module.css` — deliberate fallback palette (`--dsh-boot-*`) with its own dark block; needs a parallel edit if brand colors change.
- **JsonTree**: `ui-primitives/src/JsonTree.module.css` carries its own hardcoded devtools-style syntax palette (`--json-tree-*`, light+dark, 12 hexes) — a mini shiki-analogue outside the token layer.

## 4. Hardcoded-value audit (what bypasses tokens)

Real hardcoded color literals in `.module.css` (excluding comments), ~57 occurrences total:
- `packages/client/web/src/boot-page.module.css` — 12 (intentional, self-contained).
- `ui-primitives/src/JsonTree.module.css` — 12 (own syntax palette).
- `ui-workspace/src/client/rows/Rows.module.css` — 6 text colors (`#FFFFFF/#CFD3D6/#ADB2B8`, dark-mode cell spec).
- `ui-conversation/src/client/skeleton/InputBar.module.css` — 4 (send-button `#fff`, mostly tokenized otherwise).
- `ui-primitives/src/HoverCard.module.css` — 3 (`--dsw-hovercard-bg: #2C2C2E` both themes, figma-locked).
- `ui-trajectory/src/client/TrajectoryTable.module.css` — 2 rgba box-shadows.
- `ui-primitives/src/OnboardingSurface.module.css` / `Modal.module.css` — rgba mask (documented as matching `--dsw-alias-bg-mask-1`).
- Singles: AppearanceRow (theme swatch), ModelsSection (data-URI SVG that cannot resolve CSS vars), ModelSelect, LanguageRow.
- Inline `style={{}}` in TSX: 22 occurrences across 14 files (trajectory timeline/table, StateDot, JsonTree, Tooltip/HoverCard positioning, ContextMeter, katex, etc.) — mostly layout/positioning, a few colored.

## 5. Restyle-front size estimate

Split by how a change propagates:

### Token-reachable (~80–90% of the visual surface, ~5 files)
Edit `packages/client/ui-theme/src/styles/*` and nearly everything follows:
- `design-platform.css` (338 LOC): the `--dsw-static-*` palette + `--dsw-alias-*` remap + dark blocks. Because module CSS references **aliases 1,321× vs statics 12×**, remapping aliases alone re-skins the entire component library.
- `gradient-shadow-text.css` (232 LOC): shadows/gradients.
- `shiki.css` (31 LOC): code highlighting.
- `scrollbar.css` (90 LOC): scrollbars.
- `base.css` (15 LOC).
Affected: shell, sidebar, chat transcript, composer, settings, trajectory, workspace, tool cards, cordis panels, dialogs, markdown — all of them.

### Needs per-package edits (~10–20%)
1. `packages/client/web/src/boot-page.module.css` (~250 LOC) — parallel boot palette, must be hand-synced.
2. `ui-primitives/src/JsonTree.module.css` — own 12-hex syntax palette.
3. `ui-primitives/src/ansi.ts` — ANSI→static palette map.
4. Hardcoded literals listed in §4 (~40 non-comment occurrences over ~10 files; largest: ui-workspace Rows, ui-conversation InputBar, ui-primitives HoverCard, ui-trajectory TrajectoryTable).
5. Layout/spacing/typography restyle: CSS Modules own their geometry — a design language that changes radii, spacing scale, font stacks, or component shapes (not just colors) touches all 106 module files (16.3k LOC), concentrated in `ui-primitives` (4.5k), `ui-conversation` (2.9k), `ui-trajectory` (2.6k) = ~62% of module CSS.
6. Missing-alias gaps: 87 `var(--dsh-*)` local references and 12 direct `var(--dsw-static-*)` references in modules bypass the alias layer and may need retargeting if the OpenWorker language renames semantics.

### Suggested slicing order
1. `design-platform.css` alias remap (biggest single lever) + shiki + scrollbar + shadows.
2. Boot page + JsonTree + ansi.ts + the ~40 hardcoded literals.
3. Per-surface geometry work: primitives → conversation → trajectory → the long tail of small panels.

## 6. Verification notes for implementers

- `ui-theme` has tests pinning behavior: `client-styles.client.spec.ts`, `scrollbar-styles.client.spec.ts` — restyles that change which sheets mount or scrollbar mechanics will trip them.
- The dark theme flips via `body[data-ds-dark-theme]`; any new tokens need both blocks.
- Modules live in package `src/`, not `lib/` (build output) — edit sources only.
