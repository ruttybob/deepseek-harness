# Research: bd graph layout rendering choice (dsh-01e.1)

## Question

How should a dependency graph of ~5–50 nodes (wayfinder-map subtrees, per-ticket ego graphs; DAG with typed edges — `blocks` vs parent-child must render distinctly) be laid out and rendered in the React 18 right-panel of the dsh web GUI:

(a) hand-rolled layered SVG layout (topological columns, like `bd graph`'s LAYER model), or
(b) a maintained layout/canvas library: `@dagrejs/dagre`, `elkjs`, `cytoscape` (+ dagre extension), `vis-network`, `d3-dag`, or `@xyflow/react`.

Deciding constraints:

- Ships inside a dynamic client plugin bundle (tsdown closure). A new runtime dependency lands in `dependencies` and inflates `lib/client.js`; the repo dislikes heavy deps.
- Repo rule (packages/AGENTS.md): "prefer maintained dependencies over hand-rolling when they genuinely delete owned code", but "require evidence for public choices".
- ESM fitness: the client module graph is ESM-only; a CJS-only main in the browser bundle is a problem.
- Per-file 100% coverage gate applies to owned layout code. A hand-rolled layered layout (~150 lines) needs full test coverage; a library needs near-zero.
- Our panel is native React in the slot system, not an iframe, so `bd graph --html`'s embedded-D3 approach is prior art, not a template.

## Candidates table

Measured 2026-09 from the npm registry (`npm view`, `npm pack` + actual dist file sizes). "dist size" is the shipped ESM bundle file, unminified unless noted.

| Candidate | Latest | Last activity | License | ESM | Dist size | Runtime deps | Verdict |
|---|---|---|---|---|---|---|---|
| `@dagrejs/dagre` | 3.1.1 | 2026-08 (active: v1→v3 under dagrejs org) | MIT | yes (`type: module`, dual exports) | 48.6 KB (`dagre.esm.js`) | 1 internal (`@dagrejs/graphlib`) | **Pick** |
| `elkjs` | 0.12.0 | 2026-07 | EPL-2.0 OR GPL-2.0 | **no** (no `exports`, no `module`, CJS `lib/main`) | 1.61 MB `elk.bundled.js` (Java-transpiled GWT) | worker wrappers | Reject: size + CJS-only main |
| `cytoscape` + dagre ext | 3.34.2 | 2026-08 (very active) | MIT | yes | 1.11 MB ESM (~400 KB min) + extension | canvas lib own world | Reject: replaces our React rendering |
| `vis-network` | 10.1.2 | 2026-08 | Apache-2.0 OR MIT | yes | multi-MB (84 MB unpacked, peer+standalone builds), imperative canvas | vis suite | Reject: heaviest, imperative |
| `d3-dag` | 1.2.2 | 2026-07 | MIT | yes | 142 KB (`d3-dag.esm.min.mjs`, minified) | 4 (`d3-array`, `javascript-lp-solver`, `quadprog`, …) | Runner-up; heavier + LP-solver dep for features we don't need |
| `@xyflow/react` | 12.11.5 | 2026-08 (very active) | MIT | yes | ~1.2 MB unpacked pkg; ships CSS, own node/edge model | React 18 canvas lib | Overkill: full canvas framework for a read-mostly 50-node panel; also drags its CSS + interaction model into the slot system |

## Evidence

- **@dagrejs/dagre is actively maintained again.** The original `dagre` was dormant for years, but the `dagrejs` org shipped v1.1.5 → v3.1.1 with releases through 2026-08; renovate/dependabot PRs across orgs track it (e.g. [Kong/public-ui-components#3699](https://github.com/Kong/public-ui-components/pull/3699)). Repo: [dagrejs/dagre](https://github.com/dagrejs/dagre). [Bundlephobia @dagrejs/dagre v3.1.0](https://bundlephobia.com/package/@dagrejs/dagre@3.1.0).
- **Mermaid uses dagre** as its flowchart layout engine — the strongest prior art that a small lib carries production graph layout: [mermaid-js ELK+esm discussion #4449](https://github.com/orgs/mermaid-js/discussions/4449) (also documents mermaid's elkjs ESM pain).
- **React Flow's own docs use dagre for auto-layout** in "plain React + dagre" combos: [React Flow layouting guide](https://reactflow.dev/learn/layouting/layouting) — evidence dagre composes cleanly with React rendering without adopting the xyflow canvas.
- **elkjs is disqualified on the stated constraints**, not on quality: `elk.bundled.js` is 1.61 MB of Java-transpiled (GWT) code, and the package ships no `exports`/`module`/`type: module` — CJS-only main, a real cost in our ESM-only client graph. Long-open modularization issue: [kieler/elkjs#6](https://github.com/kieler/elkjs/issues/6).
- **Bundle sizes** measured directly from `npm pack` tarballs (see table): dagre 48.6 KB unminified ESM (one internal dep bundled logically), d3-dag 142 KB minified ESM + 4 runtime deps including `javascript-lp-solver`, cytoscape 1.11 MB ESM, elkjs 1.61 MB bundled CJS. vis-network: [Bundlephobia vis-network v10](https://bundlephobia.com/package/vis-network@10.0.0). Cytoscape: [Bundlephobia cytoscape v3.33.4](https://bundlephobia.com/package/cytoscape@3.33.4).
- **Local constraints** (packages/AGENTS.md, packages/client/AGENTS.md): ordinary installed implementation libraries go in `dependencies` and are bundled privately into `lib/client.js` ("Silence means a private copy"); owned code sits under the per-file 100% coverage gate. A ~48 KB private dep with a pure `layout()` API deletes the entire owned layout algorithm plus its coverage burden; a canvas lib would instead fight the slot system's props-shares discipline and the "web layer is pure presentation" rule.
- **Typed edges** (blocks vs parent-child) are a rendering concern: we own the SVG edge styles either way; dagre takes `edge.label`/class metadata but styling stays ours.

## Verdict

Use **`@dagrejs/dagre` (v3.x)** in `dependencies`, bundled privately into the dynamic client plugin's `lib/client.js`, with our own React SVG rendering of nodes and typed edges. Layout-only library, no canvas takeover: it computes node positions for a 5–50-node DAG (rank direction TB, its rank model is the same layered idea as `bd graph`'s LAYER model, but with proper crossing minimization), and we keep full control of edge styling (blocks vs parent-child), theming (`--dsw-*` tokens), and slot integration.

Top deciding facts:

1. **Smallest credible option that still deletes the algorithm**: 48.6 KB ESM, MIT, one internal dep (`@dagrejs/graphlib`), zero React coupling — versus 1.61 MB CJS-only elkjs, 1.1 MB cytoscape, multi-MB vis-network, 142 KB + LP-solver-deps d3-dag, or a full canvas framework in xyflow.
2. **Maintenance + prior art**: dagrejs org actively releases (3.1.1, 2026-08); mermaid's flowchart engine and React Flow's documented layout recipes both use dagre.
3. **Repo-policy fit**: it genuinely deletes ~150 lines of owned layout code *and* their 100%-coverage obligation, which satisfies "prefer maintained dependencies when they genuinely delete owned code" with evidence.

## Fallback

If the dagre prototype produces unsatisfactory results at 50 nodes (e.g. edge-routing collisions with typed-edge styles, or rank spacing fights the panel width):

1. First try d3-dag (142 KB ESM, MIT, active) — better edge routing (`zherebko`/`arrow` connectors), same layout-only role.
2. If the dependency route fails wholesale (bundle budget, ESM, or interaction with tsdown closure), fall back to the incumbent hand-rolled topological-column layout (the `bd graph` LAYER model) at ~150 lines with full test coverage; at 5–50 DAG nodes with columns per depth, hand-rolled remains acceptable — dagre is a quality upgrade, not a correctness requirement.
