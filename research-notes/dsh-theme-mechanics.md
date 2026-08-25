# Research: Theme mechanics and Geist self-hosting path in DSH (dsh-ood.3)

All paths are repo-relative to the DSH checkout; line anchors are from the
`master` commit the worktree was cut from.

## 1. Theme flow: preference → painted pixels

### 1.1 Persistence model

- `packages/client/ui-theme/src/theme-settings.ts` — the durable contract:
  - L6 `THEME_PREFERENCES = ['light','dark','system']`
  - L9 namespace `ui-theme`, L12 field `preference`, L18 default `system`
  - L27 `ThemeSettingsSchema` (schemastery union with default) — also the wire
    envelope the browser scope validates against.
- Host side `packages/client/ui-theme/src/index.ts`:
  - L35-37 registers the `ui-theme` settings section with the Host settings
    service when it composes.
- Client side `packages/client/ui-theme/src/client/index.ts` L387 binds a
  `settingsScope` (`ctx.settingsScope.bind({ namespace: 'ui-theme' })`);
  `ThemeRuntime` (L168-188) subscribes to the scope and adopts the durable
  preference (`adopt()`, L234-239). Writes go only through `setTheme`
  (L223-231) → `host.set('preference', id)` → publish.

### 1.2 Pre-paint bootstrap (no FOUC)

- `packages/client/ui-theme/src/boot-theme.ts`:
  - L12-22 `bootThemeScript(preference)` builds an inline IIFE: resolves
    `system` via `matchMedia('(prefers-color-scheme: dark)')`, then sets
    `document.documentElement.style.colorScheme` and toggles
    `document.body.toggleAttribute('data-ds-dark-theme', dark)`.
  - L30-33 returns it as an `IndexInjection` with `placement: 'body'` — an
    inline script immediately after the opening `<body>` tag, **before the
    shell mount and the module script**, i.e. before first paint of app
    content.
- Host wiring `packages/client/ui-theme/src/index.ts` L38-40: the Host plugin
  answers every `webserver/index-inject` event by pushing
  `bootThemeInjection(readPreference(ctx))` — the *current durable* preference
  is baked into the served HTML, so no async fetch is needed pre-paint.

### 1.3 Dark-mode keying — exact mechanics

- Dark mode is keyed by the **presence attribute `data-ds-dark-theme` on
  `<body>`** (boolean attribute, value-less; set/removed, never a class on
  `<html>`). `documentElement.style.colorScheme` is set in parallel for native
  UA chrome (scrollbars, form controls).
- There is **no `prefers-color-scheme` CSS media query** in the token sheets:
  the OS query is read only in JS (boot script and `ThemeRuntime`'s
  MediaQueryList listener, client/index.ts L173-185) and translated into the
  body attribute. A restyled `design-platform.css` must keep the
  `body { …light tokens… }` / `body[data-ds-dark-theme] { …dark tokens… }`
  pair structure (current anchors: `packages/client/ui-theme/src/styles/design-platform.css`
  L6 light static palette, L80 dark static palette, L172 light alias layer,
  L248 dark alias layer). Same pattern in `styles/scrollbar.css` (comment at
  L7 explains why the attribute sits on body, not :root — custom properties
  only inherit downward), `styles/shiki.css` L21, and
  `styles/gradient-shadow-text.css` L14.

### 1.4 Runtime presentation

- `packages/client/ui-layout/src/client/theme-presenter.ts` — the single DOM
  writer after plugin activation:
  - L13 `DARK_ATTRIBUTE = 'data-ds-dark-theme'`
  - L37-51 `apply(snapshot)`: sets root `color-scheme`, sets/removes the body
    attribute from `active.colorScheme` (**never from the theme id** — `system`
    is resolved upstream), rewrites the active theme's alias-token overrides
    as inline CSS variables on `body.style`, then syncs a presenter-owned
    `<meta name="theme-color">` from `getComputedStyle(body).backgroundColor`.
- The client service `packages/client/ui-theme/src/client/index.ts`:
  - L119-122 built-ins `light`/`dark` (no token overrides — palettes come from
    the base stylesheets); L151+ `ThemeRuntime` owns preference, registry,
    `prefers-color-scheme` listener, `overrideTokens` layer stacking, and
    emits `theme/change` snapshots.
  - L385-415 `apply()`: `installThemeStyles(ctx)` mounts the five token
    stylesheets (`styles.ts` L10-16: base, design-platform, scrollbar,
    gradient-shadow-text, shiki — all imported `?inline` and appended as
    `<style data-plugin=…>` tags for exactly the plugin lifetime), provides
    `ctx.theme`, registers i18n, and registers the Appearance settings row.

### 1.5 Appearance row and its store

- `packages/client/ui-theme/src/client/AppearanceRow.tsx` — L31-35 the three
  cubes (light/dark/system with primitives icons); L42-63 renders selection
  from `useStore(s => s.preference)` (the *persisted preference*, never the
  resolved active theme) and calls injected `setTheme(id)`.
- `packages/client/ui-theme/src/client/settings-store.ts` — zustand-style
  engine store; L26-37 `sync(draft, preference, revision)` guarded by a
  monotonic revision (`-1` init so revision 0 lands).
- `packages/client/ui-theme/src/client/index.ts` L393-415 wires the loop:
  plugin `apply` holds `bound`; `ctx.on('theme/change', sync)` mirrors every
  snapshot into the store; the slot `inject` callback re-syncs from
  `theme.getTheme()` so no event between registration and first render is
  lost.

### 1.6 What a restyled design-platform.css must preserve

1. Both `body { … }` / `body[data-ds-dark-theme] { … }` blocks per layer
   (static palette at L6/L80, alias layer at L172/L248) — all three
   preferences (light, dark, system-resolved) funnel through this single
   attribute; nothing else switches palettes.
2. The alias-token names consumed by every `packages/client/*` CSS Module
   (`--dsw-alias-*`, `--dsw-specific-*`) and the `--dsw-static-*` palette
   names, because the override API (`overrideTokens`,
   `BUILTIN_INSPECT_TOKENS` L124-138) and third-party themes address tokens
   by name.
3. `--dsw-font-family` / `--ds-font-family-code` and motion variables in
   `styles/base.css` L7-15 (defined on `:root`) — the composite
   `--dsw-font-markdown-*` variables in `gradient-shadow-text.css` build on
   them.
4. The mount mechanism is content-identical inline `<style>` tags
   (`styles.ts`), so `url(...)` references inside design-platform.css will
   NOT be asset-processed — see the font section.

## 2. Geist / Geist Mono self-hosting

### 2.1 The KaTeX precedent (how fonts already enter the build)

- Entry point: `packages/client/ui-primitives/src/markdown/MarkdownText.tsx`
  L23 `import 'katex/dist/katex.min.css'` — a **plain side-effect CSS import**
  inside a workspace package that participates in the apps/web Vite build
  graph (not `?inline`).
- Vite processes that CSS, rewrites the `url(fonts/KaTeX_*.woff2)` references,
  and emits each font as a hashed asset. Routing is configured in
  `apps/web/vite.config.ts`:
  - L94-95 `FONT_EXTENSIONS = ['.woff2','.woff','.ttf']` ("KaTeX's woff2/woff/ttf
    faces")
  - L131-135 `assetFileNames`: font assets go to `assets/fonts/[name]-[hash][extname]`.
- Verified output: `apps/web/dist/assets/fonts/` contains the hashed
  `KaTeX_*-{hash}.woff2/.woff/.ttf` faces; the `@font-face` rules ride
  `dist/assets/vendor-*.css` (katex is in `VENDOR_PACKAGES`, L59-79, so its
  CSS lands in the vendor chunk).

### 2.2 Recommended mechanism for Geist

Mechanism (follow KaTeX exactly):

1. Put the woff2 files (Geist Regular/Medium/SemiBold = 400/500/600, and
   Geist Mono 400 [+500 if needed]) in a package that is part of the apps/web
   Vite bundle graph — `packages/client/ui-theme/src/styles/fonts/` is the
   natural owner (theme/typography is ui-theme's charter), with
   `packages/client/ui-primitives` as the precedent-shaped alternative.
2. Add `packages/client/ui-theme/src/styles/geist.css` with `@font-face`
   rules and import it **as a plain CSS side-effect** from a module in the
   Vite graph — NOT via the `?inline` path used by `installThemeStyles`
   (`styles.ts` L2-6): `?inline` text is injected verbatim into `<style>` tags
   and its `url()` references would never be rewritten or hashed. Concretely:
   either import `geist.css` from ui-theme's client entry that the shell
   bundle already includes, or import it from a shell-graph module (the way
   `MarkdownText.tsx` imports katex CSS). If instead the sheet must stay in
   the inline `<style>` set, the only working URL form is an absolute path
   into `apps/web/public/geist/…` (public files are copied verbatim to dist
   root and absolute URLs survive inline CSS) — but the hashed-asset route is
   preferred (cache-busting, no manual copying).
3. `@font-face` strategy: one rule per family/weight, `font-weight: 400|500|600`,
   `font-style: normal`, `src: url(./fonts/Geist[wght]-or-static.woff2) format('woff2')`
   (woff2 only — KaTeX ships woff/ttf fallbacks but modern-only is fine here;
   no `unicode-range` needed for Latin Geist, though splitting Latin/Latin-ext
   is a valid optional optimization), and `font-display: swap` so first paint
   never blocks on font download (the boot script already guarantees palette,
   not type, pre-paint).
4. Fallback stack: prepend `'Geist'` to `--dsw-font-family` and
   `'Geist Mono'` to `--ds-font-family-code` in
   `packages/client/ui-theme/src/styles/base.css` L7-11, keeping the existing
   system/CJK tail intact (the file deliberately keeps a CJK-aware tail; note
   the code stack omits a bare `monospace` tail on purpose — see the file's
   own comment about Windows CJK falling back to SimSun).
5. `packages/client/*` consumers need no changes: they reference
   `var(--dsw-font-family)` / `var(--ds-font-family-code)` (or composites like
   `--dsw-font-markdown-h1-font-family`, gradient-shadow-text.css L22-44), so
   updating the two base tokens plus loading the faces covers every package.
   `design-platform.css` L1-3 notes font-weight 510 renders as 500 — Geist's
   static weights 400/500/600 map cleanly onto that convention (Geist also
   ships a variable face if weight fidelity beyond the three steps is ever
   wanted).
6. `apps/web/vite.config.ts` needs no change: the existing
   `FONT_EXTENSIONS`/`assetFileNames` rule already routes any `.woff2` in the
   graph to `assets/fonts/`.

### 2.3 What NOT to do

- Do not put `@font-face` with relative `url()` into a `?inline`-imported
  sheet (the five installThemeStyles sheets) — the URLs resolve against the
  document, not the CSS file, and break.
- Do not rely on `apps/web/dist/assets/fonts/` contents manually — that
  directory is build output, regenerated by `vite build`.
- `apps/web/public/` currently holds only `favicon.svg` and
  `manifest.webmanifest` (copied verbatim); it is the fallback location only
  if inline-CSS referencing is unavoidable.

## 3. Token-layer bypasses (input for the token-mapping ticket)

Concrete list of places where colors/styles bypass the `--dsw-*` alias layer.
"Hex in comment only" files were excluded; these are live values:

CSS Modules with hardcoded colors (package · file · what):

1. `packages/client/web/src/boot-page.module.css` L4-8 — boot-page palette
   (`#fff`, `#0f1115`, `#61666b`, `#81858c`, `rgb(0 0 0 / 10%)`) as its own
   `--dsh-boot-*` variables. (Pre-plugin boot page; may be deliberately
   outside the token layer — the mapping ticket should rule.)
2. `packages/client/ui-primitives/src/JsonTree.module.css` L2-5+ — full
   hardcoded VS Code JSON palette (`#881391`, `#c41a16`, `#1c00cf`, …).
3. `packages/client/ui-primitives/src/HoverCard.module.css` L14, L41 —
   `--dsw-hovercard-bg: #2C2C2E` (both themes, figma value) and `#FFFFFF` text.
4. `packages/client/ui-primitives/src/OnboardingSurface.module.css` L16 —
   `rgba(0, 0, 0, 0.24)` mask instead of `--dsw-alias-bg-mask-1`.
5. `packages/client/ui-conversation/src/client/skeleton/InputBar.module.css`
   L371-385 — send button `#3964FE` light / `#679EFE` dark and `color: #fff`.
6. `packages/client/ui-conversation/src/client/skeleton/ContextMeter.module.css`
   L120 — `--meter-tint: rgb(167, 139, 250)`.
7. `packages/client/ui-workspace/src/client/rows/Rows.module.css` L299-322 —
   `#FFFFFF`, `#CFD3D6`, `#ADB2B8` text tones.
8. `packages/client/ui-trajectory/src/client/TrajectoryTable.module.css`
   L274, L1797 — `rgba(0,0,0,.12/.14)` box-shadows.
9. `packages/client/ui-primitives/src/markdown/CodeBlock.module.css` L60 and
   `MarkdownText.module.css` L67-70 — `rgb(255 255 255 / 0)` transparent
   borders/hit-areas (likely fine — transparency, not palette).

JS/TS-driven colors:

10. `packages/client/ui-primitives/src/markdown/katex.tsx` L80 — inline
    `style={{ color: '#cc0000' }}` for render-error text.
11. `packages/client/ui-primitives/src/ansi.ts` L413-416 — ANSI SGR codes
    composed into literal `rgb(${r}, ${g}, ${b})` strings.
12. `packages/client/ui-theme/src/styles/shiki.css` — hardcoded hex
    `--shiki-token-*` values for both palettes (this IS the token sheet for
    code highlighting, but the hexes are not derived from `--dsw-static-*`;
    the mapping ticket decides whether they should be).

Structural note: inline `style={{…}}` in TSX is widespread
(ui-trajectory virtual spacers, ui-layout AppFrame, ui-renderer scoped-slots,
tooltips, model editors) but the audited instances set **geometry/CSS
variables only** — no JS color bypasses beyond items 10-11 were found.

## 4. Rebuild + verify at 127.0.0.1:3080

- One-shot rebuild of web artifacts (repo root `package.json` L25):
  `pnpm run build:web` → `pnpm --filter @deepseek-ai/dsh-web-frontend run build`
  (Vite build rewriting `apps/web/dist`). A full-fidelity rebuild including
  the compile-shell `lib/` products is the top-level `pnpm run build`.
- Watch loop: `pnpm run dev:web` (L146) → `tsx scripts/dev-web.ts --poll`.
  Per `scripts/dev-web.ts` L1-27: three incremental stages — `tsc -b
  tsconfig.client.json` (types), tsdown `lib/index.js`/`lib/client.js` plugin
  bundles, `vite build` for `apps/web/dist`. Reload signaling belongs to
  `dsh web` (it stat-polls served bundles and broadcasts `rebuilt`), so any
  process rewriting `lib/client.js` triggers reloads. Caveats documented
  there: it requires one prior `pnpm run build`, must not run concurrently
  with `pnpm run build`, and `--poll` (default 500 ms) is needed on network
  mounts. Client-plugin HMR without refresh additionally needs `dsh web`
  running from the same checkout (see `apps/web/vite.config.ts` L8-10).
- Screenshot audit:
  - `apps/web/tests/smoke-real.e2e.ts` — spawns `dsh web` with a real key,
    walks screens in real Chromium, and screenshots each into `.artifacts/`
    (L123-125 `w5-<name>.png`; self-skips without `DEEPSEEK_API_KEY`).
  - `apps/web/tests/lifecycle-chrome.e2e.ts` L243-270 — the theme scenario:
    toggles `document.body.setAttribute/removeAttribute('data-ds-dark-theme')`
    and asserts painted colors cascade (aria snapshots are color-blind by
    lane scope, so color assertions are explicit).
  - Playwright suites run through vitest: `pnpm run test:e2e`
    (`vitest run --config vitest.e2e.config.ts`; repo-root projects include
    `apps/web/tests/**/*.e2e.ts`).
  - Manual: `pnpm dsh web` from the checkout serves the built shell at
    127.0.0.1:3080; a hard refresh picks up rebuilt `apps/web/dist`.

## Ambiguities / notes

- `boot-page.module.css` (#1 above) predates plugin activation by design; the
  ticket should decide whether it consumes the token layer or keeps its own
  palette.
- I did not verify at runtime which exact ui-theme client entry lands in the
  apps/web Vite graph versus the runtime plugin-bundle path (ui-theme's
  client code is loaded through `packages/extensions/cordis-client-runner`);
  the `?inline` vs plain-import distinction in §2.2 is the operative
  constraint either way: the `geist.css` import must be added where Vite's
  CSS pipeline processes it.
