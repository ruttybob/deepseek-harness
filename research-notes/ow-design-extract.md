# OW → DSH design-token mapping draft (dsh-ood.2)

Sources (read-only):
- **Canonical spec**: `openworker/DESIGN.md` (repo root). Where implementation diverges, DESIGN.md wins; divergences are noted per token.
- **Implementation cross-check**: `openworker/surfaces/gui/tailwind.config.js`, `surfaces/gui/src/styles.css`, `surfaces/gui/src/tailwind.css`.
- **Target scale**: `deepseek-harness/packages/client/ui-theme/src/styles/design-platform.css` (`--dsw-static-*` primitives + `--dsw-alias-*` / `--dsw-specific-*` semantic layer, `body[data-ds-dark-theme]` dark overrides).

Note: `tailwind.css` contains only `@tailwind base/components/utilities` — no tokens. All implementation tokens live in `styles.css` `:root` / `[data-theme="dark"]`.

---

## 1. Palette — Light theme (DESIGN.md canonical)

| OW token | Hex (DESIGN.md) | Implementation (`styles.css`) | Divergence |
|---|---|---|---|
| Paper | `#F5F6F7` | `--paper: #f5f6f7` | match |
| Panel White | `#FFFFFF` | `--panel: #ffffff` | match |
| Ink | `#17191C` | `--ink: #17191c` | match |
| Muted Slate | `#5B616B` | `--muted: #4d535c` | **diverges** — OPE-126 contrast fix darkened it; DESIGN.md `#5B616B` wins for the draft |
| Faint Steel | `#9AA1AA` | `--faint: #6f7680` | **diverges** — OPE-126 contrast fix; DESIGN.md `#9AA1AA` wins |
| Hairline | `#E8EAED` | `--line: #e8eaed` | match |
| Hairline Strong | `#D8DCE1` | `--line-strong: #d8dce1` | match |
| Work Cobalt | `#2E62D6` | `--accent: #2563eb` | **diverges** — impl uses Tailwind blue-600; DESIGN.md `#2E62D6` (sat < 80%) wins |
| Cobalt soft (impl-only) | — | `--accent-soft: #e9f0fd` | DESIGN.md defines no light accent-soft; impl-only, keep as derived |
| Signal Green | `#2F7D57` / soft `#EEF6F0` / line `#CFE6D6` | `--ok/-soft/-line` match | match; impl adds `--ok-dot: #3f9c5a` (brighter dot, impl-only) |
| Signal Amber | `#B45309` / soft `#FEF3C7` | `--warn-ink: #92400e` (OPE-126), `--warn-soft: #fef3c7` | **ink diverges**; DESIGN.md `#B45309` wins |
| Signal Red | `#B91C1C` | `--danger: #b91c1c`; impl adds `--danger-soft: #f9e7e5` (DESIGN.md lists no red soft; derive via badge recipe) | match |
| Deep Teal | `#0F766E` / soft `#EDFAFA` / line `#CFEBEA` | `--teal-ink/-soft/-line` match | match |

Implementation-only surfaces (not in DESIGN.md, decide individually when porting):
`--canvas: #fafbfc`, `--chrome: #f7f8f9`, `--chrome-hover: #eef0f2`, `--edge-shadow: -14px 0 28px -18px rgba(15,18,22,.12)`, `--solid: #e9ebf0` + `--on-solid: #1f2227` (user bubble), `--glass/-strong/-soft` (frosted bars), `--scrim: rgba(29,27,24,.32)`, `--check-a/b` (checkerboard).

## 2. Palette — Dark theme (DESIGN.md canonical, mirrored token-for-token)

| OW token | DESIGN.md dark | Implementation | Divergence |
|---|---|---|---|
| Paper | `#131417` | `#131417` | match |
| Panel | `#1C1E22` | `#1c1e22` | match |
| Ink | `#E6E8EB` | `#e6e8eb` | match |
| Muted | `#9AA1AB` | `#9aa1ab` | match |
| Faint | `#62686F` | `#62686f` | match |
| Hairline / strong | `#2A2D33` / `#3A3E46` | `#2a2d33` / `#3a3e46` | match |
| Cobalt / soft | `#8CAAF2` / `#1C2A44` | **`#4c8dff`** / `#1c2a44` | **cobalt diverges** — DESIGN.md `#8CAAF2` (desaturated lavender-blue) wins; soft matches |
| Green | `#58B07F` (`#1A2B21`) | match (`--ok-line` impl `#2c4736` is impl-only) | match |
| Amber | `#E8B04B` (`#36280F`) | match | match |
| Red | `#F07067` | match (impl adds `--danger-soft: #3d2422`) | match |
| Teal | `#46C0B2` (`#11302D`) | match | match |

## 3. Typography (DESIGN.md canonical)

- **UI/Display**: Geist. **Mono**: Geist Mono (timestamps, durations, model names, IDs, token counts). Banned: Inter, serifs, fake display fonts.
- Weights: 600 headings · 500 controls · 400 body. Headings track `-0.01em`.
- Scale: screen title **22px/600** · section heading **18px/600** · panel heading **15px/600** · body **13px / 1.5** · secondary **12px** · micro-label **11px/500 uppercase +0.04em** · fine print **10px**. Body measure ≤ 65ch.
- **Implementation diverges hard**: `styles.css` ships a different six-size scale (`--fs-title: 20px`, `--fs-heading: 16px`, `--fs-body: 14px/1.6`, `--fs-ui: 13px`, `--fs-mono: 12px`, `--fs-label: 11px/600 +0.08em`) and `--sans: "Inter", …` — **Inter is banned by DESIGN.md**. tailwind.config `fontFamily.sans` also leads with system stack incl. Inter fallback. DESIGN.md's Geist scale wins for the draft.

## 4. Radii, borders, shadows

- **Radius**: buttons/inputs **8px**; cards/panels **14px**; badges **9999px or 8px**. (tailwind config adds only `borderRadius.xl2: 14px`; 8px is Tailwind's default `rounded-lg`.)
- **Borders**: 1px hairlines everywhere; inputs use Hairline Strong. Elevation of resting surfaces comes from border + paper contrast, **no resting shadow**.
- **Shadows**: floating layers only — popovers/menus/modals get soft `0 1px 2px rgba(0,0,0,.2)`. (Implementation uses larger bespoke floats like `0 8px 30px rgba(0,0,0,.16)`; DESIGN.md's minimal recipe wins.)

## 5. Badges / status recipe

Signature pattern: **soft tint bg + tinted 1px border + deep ink text** — e.g. green `#2F7D57` text on `#EEF6F0` bg with `#CFE6D6` border. Radius 9999px or 8px. Never saturated fills, never white-on-color chips. Status colors are semantics, not accents. Toggles/checkboxes checked = Cobalt fill, never green. Primary button = Ink fill + white text; destructive = Red text on its soft tint.

## 6. Motion

- Spring physics: stiffness 100, damping 20; no linear easing.
- Hover: border → Hairline Strong, bg warms one step; 120–150ms. Press: `-1px` translate/scale + darker fill.
- Staggered 30–50ms list mount cascades; exactly one perpetual micro-loop per screen; animate transform/opacity only.
- (Implementation approximates with `transition: 0.12s`/`0.15s` ease and keyframes; no spring constants in code.)

---

## 7. OW → `--dsw-static-*` mapping table

DSH's structure: static primitives per hue → `--dsw-alias-*` semantics → `--dsw-specific-*` components, with light on `body` and dark on `body[data-ds-dark-theme]`. OW maps naturally as: OW palette → new/replacement static primitives, OW roles → alias re-pointing.

### 7a. OW token → DSH treatment

| OW token (light / dark) | Replaces / maps to |
|---|---|
| Paper `#F5F6F7` / `#131417` | new `--dsw-static-paper`; drives `--dsw-alias-bg-base` |
| Panel White `#FFFFFF` / `#1C1E22` | new `--dsw-static-panel`; drives `--dsw-alias-bg-layer-1..3`, `button-elevated/floating-fill` |
| Ink `#17191C` / `#E6E8EB` | new `--dsw-static-ink`; replaces `--dsw-alias-brand-primary`, `brand-text`, `button-primary-fill`, `label-primary` (currently `neutral-bluish-1000` `rgb(15,17,21)` — very close; `#17191C` = `rgb(23,25,28)`) |
| Muted Slate `#5B616B` / `#9AA1AB` | new `--dsw-static-muted`; replaces `--dsw-alias-label-secondary` (now `neutral-bluish-700`) |
| Faint Steel `#9AA1AA` / `#62686F` | new `--dsw-static-faint`; replaces `--dsw-alias-label-tertiary`, `label-caption` (now `neutral-bluish-600/400`) |
| Hairline `#E8EAED` / `#2A2D33` | new `--dsw-static-hairline`; replaces the rgba-alpha `--dsw-alias-border-l1..l4` family with **opaque 1px grays** |
| Hairline Strong `#D8DCE1` / `#3A3E46` | new `--dsw-static-hairline-strong`; input borders, ghost-active borders |
| Work Cobalt `#2E62D6` / `#8CAAF2` (+ soft `#1C2A44` dark, `#E9F0FD` impl light) | new `--dsw-static-cobalt`, `--dsw-static-cobalt-soft`; the ONLY accent. Replaces every use of `--dsw-static-blue-*` and `--dsw-static-deepseek-*` in accent roles: links, focus rings (2px Cobalt), selected/active states, checked toggles, `--dsw-alias-state-business-primary/tertiary`, `button-info-fill/hover`, `sidebar-nav-item-active-accent`, `bubble-highlight` |
| Signal Green `#2F7D57` / `#58B07F` + soft `#EEF6F0` / `#1A2B21` + line `#CFE6D6` | new `--dsw-static-ok`, `-ok-soft`, `-ok-line`; replaces `--dsw-alias-state-success-primary` (`green-500` `rgb(34,197,94)` — vivid Tailwind green dies) |
| Signal Amber `#B45309` / `#E8B04B` + soft `#FEF3C7` / `#36280F` | new `--dsw-static-warn`, `-warn-soft`; replaces `--dsw-alias-state-warn-*` (`amber-400/500/600`); no line variant defined — reuse soft |
| Signal Red `#B91C1C` / `#F07067` + soft (impl `#F9E7E5` / `#3D2422`) | new `--dsw-static-danger`, `-danger-soft`; replaces `--dsw-alias-state-error-*` (`red-400/600` Tailwind hues) |
| Deep Teal `#0F766E` / `#46C0B2` + soft `#EDFAFA` / `#11302D` + line `#CFEBEA` | new `--dsw-static-teal`, `-teal-soft`, `-teal-line`; **no DSH counterpart exists** — informational/automation semantics are new to DSH |
| Geist / Geist Mono + 22/18/15/13/12/11/10 scale | new `--dsw-static-font-sans` / `-mono` + `--dsw-static-text-{title,heading,panel,body,secondary,label,fine}`; DSH currently has no type tokens in design-platform.css at all — entirely new layer |
| Radii 8/14, badge 9999 | new `--dsw-static-radius-control: 8px`, `--dsw-static-radius-panel: 14px`, `--dsw-static-radius-badge: 9999px` |
| Floating shadow `0 1px 2px rgba(0,0,0,.2)`, no resting shadow | new `--dsw-static-shadow-float`; resting card shadows removed (border+contrast elevation) |
| Spring (100/20), hover 120–150ms, stagger 30–50ms | new motion vars, e.g. `--dsw-static-ease-spring`, `--dsw-static-duration-hover: 130ms` — DSH has no motion tokens today |

**Count**: ~21 OW color tokens per theme + ~10 type tokens + 3 radii + 1 shadow + 2–3 motion vars ⇒ **≈ 35 new `--dsw-static-*` primitives**, all theme-paired via `body` / `body[data-ds-dark-theme]`.

### 7b. Kill-list (single-accent canon: Work Cobalt is the only accent)

Dies outright under OW canon:
- **`--dsw-static-blue-*`** (all 12: 50, 50p, 75, 100, 300, 400, 450, 500, 600, 800, 900, 950) — a second blue family besides deepseek; OW bans neon/saturated blues and any accent besides Cobalt.
- **`--dsw-static-deepseek-*`** (all 11, incl. `deepseek-700-delete`) — replaced by `cobalt`/`cobalt-soft`.
- **`--dsw-static-neutral-bluish-*` duplicates vs `neutral-*`**: OW mandates one Zinc-family gray ramp; two gray ramps contradict "one family, no warm/cool fluctuation". The bluish ramp's near-duplicates (`60`≈`50`, `150`≈`100`) collapse; long-term only one neutral ramp survives — recommend keeping the bluish ramp's spacing but renaming/re-anchoring to the OW hairline/muted/faint/ink anchors, then deleting the unused `neutral-*` ramp.
- Vivid status hues: `green-400/500`, `amber-400/500`, `red-400/500` in their current saturations (replaced by Signal inks + soft tints).
- Alpha-black `--dsw-alias-border-l1..l4` rgba borders (replaced by opaque Hairline family), and any resting card shadows/glows.

### 7c. Semantic mismatch flags

1. **Links/selection/focus**: DSH spreads these across `deepseek-500/400`, `blue-500/600`, `interactive-bg-hover-accent` (bluish alpha). OW expresses all three as **Work Cobalt** (links, 2px focus ring, selected/active) — one token, no per-context hue drift.
2. **Primary buttons**: DSH `brand-primary`/`button-primary-fill` is near-black on light / near-white on dark — accidentally close to OW's Ink primary. But `button-info-fill` (deepseek blue) is a second "primary-looking" button; OW bans accent-filled primaries — info buttons become hairline ghosts or soft-tint badges.
3. **Status rendering**: DSH uses saturated fills (`state-success-primary` green-500 etc.) for meaning; OW renders status **only** as soft-tinted badges (tint bg + tinted border + deep ink text) — never saturated fills, never white-on-color.
4. **Selection / multi-select**: DSH `bg-multi-select` is a neutral tint; OW selected state is Cobalt (fill for toggles, soft tint + Cobalt text for list rows).
5. **Success-as-green toggles**: any DSH green checked-state must become Cobalt; green is reserved for connected/success semantics.
6. **`label-primary-bluish`** (blue-900 text on light) — a blue-tinted body-text role OW has no equivalent for; becomes plain Ink.
7. **Bubble colors**: DSH chat bubbles use `deepseek-50/200`; OW chat uses neutral `--solid` `#E9EBF0` / `#2E3138` with `--on-solid` ink — assistant bubbles become Cobalt-soft or neutral per canon (accent never a large fill ⇒ neutral solid).

---

*Findings for beads ticket dsh-ood.2 (parent map dsh-ood). Generated read-only; no source code modified.*
