# OW restyle prototype (dsh-ood.5)

Throwaway UI prototype for beads ticket dsh-ood.5 on map dsh-ood. Question:
how do the key DSH web-GUI surfaces look and feel once restyled per the locked
OW-to-DSH token mapping (dsh-ood.4)?

## Shape

Dynamic Cordis client plugin (runtime `owsty-1/pkg-2`, density probe fixed
in `pkg-3`), run live against the
web GUI — no rebuild. A floating pill bar (registered in the `shell.overlay`
list slot as `ow-proto-bar`) switches between four cumulative variants:

1. `DSH` — no overrides; the current GUI for before/after comparison.
2. `foundation` — the locked mapping as one `ctx.theme.overrideTokens` layer:
   Zinc ramp (Paper `#F5F6F7` / Panel White / Ink), single Work Cobalt
   `#2E62D6`/`#8CAAF2`, Signal status quads, opaque hairlines, neutral solid
   assistant bubble `#E9EBF0`/`#2E3138`, Paper sidebar.
3. `+Geist` — foundation plus Geist / Geist Mono font variables. Fonts arrive
   via a Google Fonts CDN `@import` (prototype only; the production port
   self-hosts woff2 per the dsh-ood.3 findings, KaTeX precedent).
4. `+плотность` — Geist plus a density probe: antialiasing, motion durations
   130/90 ms, cobalt focus ring. Probe v3 (pkg-3) removed the first run's
   global `letter-spacing: -0.005em` and `text-rendering:
   optimizeLegibility` — they desynced the prompt-editor caret ~one character
   ahead of typed text (human report). Rollout rule: never apply
   letter-spacing or text-rendering to editable surfaces.

Every token override is a `{ light, dark }` pair, so the stock theme switcher
evaluates both palettes live.

## Verdict (2026-08-26)

The human flipped through all four variants and took the maximum — mapping +
Geist + density probe («ок, пойдёт»). Recorded in the ticket resolution.

## Limits carried to the rollout tickets

- Runtime token layers prove color, typography, and motion only. Geometry
  density (radii 8/14, paddings, hairline input borders) is not
  token-reachable in the live GUI — CSS Modules hash class names — so the
  rollout's foundation PR must carry it.
- The 12 token-bypass sites (dsh-ood.3) were not visually judged.

## Re-run

Re-define a dynamic client plugin whose `apply` returns the plugin in
`client.js`, then run it; the bar appears at the bottom of the web GUI.
