# Per-engine source audit checklist

Quick lookup table for Phase 1 of `diagramkit-review`. For any disagreement, defer to the engine SKILL.md (it is version-pinned to the renderer behaviour).

---

## Universal rules (every engine)

Apply to every source regardless of extension. Each rule has a one-line rationale so an agent can decide when an exception is justified.

### Authoring hygiene

- [ ] **Hex colours only.** No named colours (`red`, `blue`, `lightblue`, …); behaviour varies by renderer.
- [ ] **No near-white fills** (`#fff`, `#fafafa`, …) — disappear on light backgrounds.
- [ ] **No near-black fills** (`#000`, `#0a0a0a`, …) — disappear on dark backgrounds.
- [ ] **No hardcoded theme directives.** Engines must let diagramkit inject light/dark themes (no `%%{init: {theme: 'dark'}}%%` in Mermaid, no `viewBackgroundColor: "#000"` overrides in Excalidraw, no opaque `bgcolor` in DOT, etc.).
- [ ] **Semantic IDs.** `auth_service`, not `a` / `n1` / hashes.
- [ ] **No hand-edits to anything inside `.diagramkit/`.** All output is regenerated.

### Readability budget (research-backed thresholds)

These thresholds are not arbitrary — they come from cognitive-load and viewport-overflow research. Use them as a hard ceiling; aim for half of each in practice.

- [ ] **One story per diagram.** Each diagram should be comprehensible within ~90 seconds of viewer attention. If a single source covers two unrelated concerns, split it.
- [ ] **Node count budget.** Hard ceiling: **≤ 50 nodes for dense diagrams, ≤ 100 for sparse**. Above that, comprehension drops sharply. Target ≤ 15 for routine diagrams.
- [ ] **Connection budget.** Hard ceiling: **≤ 100 connections per diagram**. Flowcharts are O(n²) in connections — past 100, the visual graph is denser than the underlying logic.
- [ ] **Branching width.** Hard ceiling: **≤ 8 parallel branches** out of a single decision point. Wider fans should be grouped or split.
- [ ] **Aspect ratio inside the readable band.** The rendered SVG ratio (width / height) must fall inside `[1:1.9, 3.3:1]` (target 4:3, tolerance 2.5). Rendered SVGs that overflow typical doc widths (~650–800 px) lose ~39% text legibility when scaled down. Validator emits `ASPECT_RATIO_EXTREME` when this breaks.

### Visual encoding (cognitive-load reduction)

- [ ] **Consistent shape semantics.** Pick a vocabulary and use it everywhere — mixing meaning slows interpretation ~4×.
      | Shape | Meaning |
      |:------|:--------|
      | rectangle | process, service, component |
      | rounded rectangle | external boundary or actor |
      | diamond | decision / branch |
      | cylinder / `[(...)]` | persistent storage |
      | hexagon / `{{...}}` | external system, queue, event |
      | parallelogram / `[/.../]` | input, output, payload |
      | circle | start, end, terminator |
- [ ] **Never rely on colour alone for meaning.** Pair every colour with a shape, label, position, or pattern. Roughly 8% of male engineers have red-green colour-vision deficiency; a colour-only legend is invisible to them.
- [ ] **Reserve red for errors / alerts only.** Don't use it for "primary" or generic emphasis — it carries semantic weight that confuses scanners.

### What the renderer + validator already enforce

- `LOW_CONTRAST_TEXT` — WCAG 2.2 AA scan on every rendered text/background pair.
- `ASPECT_RATIO_EXTREME` — width/height **ratio** sanity check on every SVG (default band `[1:1.9, 3.3:1]` against a 4:3 target).
- `SVG_VIEWBOX_TOO_WIDE` — **absolute** viewBox-width sanity check on every SVG (default threshold 1600 px). Catches the gap left by the ratio check: a near-square 2400×2200 SVG has a "fine" ratio but still scales by ~3× when inlined into a 700-800 px doc column, dropping text to ~33% of native size. Pair both checks — they fail independently.
- `CONTAINS_FOREIGN_OBJECT`, `EXTERNAL_RESOURCE`, `CONTAINS_SCRIPT` — embed-safety scans.
- Mermaid-only: `mermaidLayout: { mode: 'auto' }` in `diagramkit.config.json5` will additionally try direction-flip / ELK rebalance during render. Use it as the project default; the agent loop still handles the residual cases (split / engine swap).

## Mermaid (`.mermaid` / `.mmd` / `.mmdc`)

- [ ] **No leading YAML frontmatter block.** Sources must NOT start with a `---` / `title: …` / `---` block. Mermaid silently swallows the title in the SVG output and the block hides the diagram keyword from any tool that expects it on the first non-comment line. Replace with `%% Diagram: <name>` and `%% Type: <flowchart|sequence|…>` comments. The `validate-build.ts` script enforces this for `docs/**/*.mermaid`.
- [ ] First non-comment line is the diagram keyword (`flowchart`, `sequenceDiagram`, `classDiagram`, `stateDiagram-v2`, `erDiagram`, …).
- [ ] **`%%{init: {'htmlLabels': false}}%%`** is present **before** the diagram keyword for every flowchart / class / state / ER diagram. Use the **flat** form — the nested `{'flowchart': {'htmlLabels': false}}` form is silently ignored on Mermaid 11 and produces `<foreignObject>` in the output.
- [ ] Multi-line labels use `\n`, **not** `<br/>`, **and the label is quoted** so the escape survives parsing: `PHYSICAL["Physical Clocks\nNTP, PTP, TrueTime"]`.
- [ ] No inline HTML (`<b>`, `<i>`, `<code>`) in labels — renders as literal text when `htmlLabels` is off.
- [ ] No `classDef` named `root`, `default`, `node`, `cluster` (collides with Mermaid internal class names).
- [ ] WCAG 2.2 AA palette in use (white text only on the AA-compliant darker palette below — never on the legacy pastels).
- [ ] **Direction matches destination width.** `flowchart LR` for ≤ 4-5 nodes per rank, otherwise `flowchart TB`. A 12-node `LR` chain produces a 12:1 SVG that is unreadable at 650 px.
- [ ] **`mermaidLayout: { mode: 'auto' }` is set in `diagramkit.config.json5`** for the project. This makes the renderer try direction-flip / ELK automatically; the agent loop only has to handle residuals (split / engine swap). The `validate-build.ts` script warns when `docs/**` contains `.mermaid` flowcharts but the project root has no config (or the config omits `mermaidLayout`); fix this **before** any per-source `LR ↔ TB` flips so a single config change can clear most `ASPECT_RATIO_EXTREME` warnings at once.
- [ ] **Diamond shapes only for decisions.** `{label}` is reserved for branching points; do NOT use it as a decoration shape — semantic shape mapping reduces interpretation latency ~4×.

### Mermaid colour swap table (legacy → AA-compliant)

When fixing `LOW_CONTRAST_TEXT` warnings, swap legacy mid-tones for the AA-compliant set:

| Role         | Old (fails AA) | New (passes AA, white text) |
| ------------ | -------------- | --------------------------- |
| Primary      | `#4C78A8`      | `#2E5A88`                   |
| Secondary    | `#72B7B2`      | `#1F6E68`                   |
| Accent       | `#E45756`      | `#B43A3A`                   |
| Storage/Data | `#E4A847`      | `#8B5E15`                   |
| Success      | `#54A24B`      | `#2D7A2D`                   |
| Neutral      | `#9B9B9B`      | `#5A5A5A`                   |

Update the matching `stroke` per the engine SKILL.md palette.

## Excalidraw (`.excalidraw`)

- [ ] Top-level shape: `{ "type": "excalidraw", "version": 2, "source": "diagramkit", "elements": [...], "appState": {...}, "files": {} }`.
- [ ] Valid JSON (no trailing commas, all strings quoted).
- [ ] No diamond shapes used as labelled elements (arrows attach poorly).
- [ ] **Every labelled shape has both sides of the binding**: shape `boundElements: [{ type: "text", id: "<text-id>" }]` AND text `containerId: "<shape-id>"`. Missing either side drops the label.
- [ ] Text positioned with the documented formulas (`text.x = shape.x + 5`, `text.y = shape.y + (shape.height - text.height) / 2`, `text.width = shape.width - 10`, `textAlign: "center"`, `verticalAlign: "middle"`).
- [ ] Elbow arrows have **all three** flags: `roughness: 0`, `roundness: null`, `elbowed: true`.
- [ ] Arrow `width` / `height` equals the bounding box of `points[]`.
- [ ] Arrow start/end coordinates land on shape edges (top/bottom/left/right formulas in the engine SKILL.md).
- [ ] Every `id` is unique.
- [ ] Pastel palette paired with default dark text (`#1e1e1e`); AA-compliant palette paired with `#ffffff` text — never mix.
- [ ] **Bounding box stays within the readable band.** Excalidraw renders the SVG at the exact pixel extent of the rightmost / bottommost element. Lay out shapes so the overall bounding box is roughly 4:3 — don't string 8 boxes horizontally without wrapping. The engine SKILL.md has horizontal/vertical/hub-and-spoke grids; pick the one that keeps width ≈ 1.3× height.

## Draw.io (`.drawio` / `.drawio.xml` / `.dio`)

- [ ] Well-formed XML with the `<mxfile>` → `<diagram>` → `<mxGraphModel>` → `<root>` skeleton; `<mxCell id="0"/>` and `<mxCell id="1" parent="0"/>` are present.
- [ ] Every `mxCell` that carries content has `vertex="1"` (shape) or `edge="1"` (edge), and a non-empty `parent` (usually `"1"`).
- [ ] Every edge has both `source=` and `target=` referencing live cell IDs (no dangling edges).
- [ ] No `<a xlink:href="…">` wrappers around shapes — they survive into the SVG and trigger `EXTERNAL_RESOURCE` warnings; strip them.
- [ ] Cloud vendor icons reference shape libraries actually available in the renderer (mxgraph builtins). Custom stencils not bundled with the renderer fail silently.
- [ ] WCAG palette used for `fillColor` / `fontColor` / `strokeColor`. White text only on the AA-compliant darker palette.
- [ ] **Layout fits the readable band.** Tally the bounding box of every `<mxGeometry>` — the resulting `(maxX - minX) / (maxY - minY)` ratio should sit inside `[0.53, 3.33]`. Drawio gives you full positioning control, so the fix is mechanical: shorten one axis by reflowing rows/columns, or split into multiple `<diagram>` pages (overview + detail).
- [ ] **One semantic shape style per role.** Pick a small palette of `style=` strings (e.g. one for "service", one for "datastore", one for "external") and reuse them; mixing styles for the same role slows comprehension.

## Graphviz (`.dot` / `.gv` / `.graphviz`)

- [ ] Correct graph type: `digraph` for directed (uses `->`), `graph` for undirected (uses `--`). Mismatched edges cause parse errors.
- [ ] Default attributes set at the top: `graph [...]`, `node [...]`, `edge [...]` so per-node attrs stay minimal.
- [ ] `bgcolor="transparent"` (let diagramkit inject the theme background).
- [ ] Cluster subgraphs use the `cluster_` prefix — `subgraph backend { ... }` silently renders without a bounding box.
- [ ] No reserved keywords as IDs (`node`, `edge`, `graph`, `digraph`, `subgraph`, `strict`); quote them or rename.
- [ ] Statements end with `;` for unambiguous parsing.
- [ ] Strings with spaces / special chars are quoted.
- [ ] Pastel palette paired with `fontcolor="#1a1a1a"` (or `#333333`); AA-compliant palette paired with `fontcolor="#ffffff"`. Never mix.
- [ ] **`rankdir` matches the diagram's natural shape.** `rankdir=LR` for short pipelines (≤ 5 stages), `rankdir=TB` for taller hierarchies. If both axes are crowded, split or constrain ranks (`{rank=same; a; b; c}`).
- [ ] **Use `ratio=` only when the natural layout is too wide.** `ratio="compress"` fits to page; `ratio="0.75"` targets 4:3. **Trap**: applying `ratio="0.75"` to a `rankdir=TB` diagram that's already tall-and-thin will FORCE it WIDE again to hit the 0.75 target — validated regression: 308 px → 1808 px on a markdown-pipeline diagram. Always check the natural width first (`rankdir` flip alone), and add `ratio=` only when the SVG would otherwise be wider than ~4:3.
- [ ] **Cap branching with `nodesep`/`ranksep`.** Wide fans become unreadable past 8 parallel children; either group them under a synthetic parent (`{rank=same; …}` cluster) or split the diagram.

---

## Cross-engine WCAG 2.2 AA palette (use for white text)

This is the canonical safe set referenced by every engine's SKILL.md:

| Purpose             | Fill      | Stroke    | Text      | Contrast vs `#fff` |
| ------------------- | --------- | --------- | --------- | ------------------ |
| Primary / API       | `#2E5A88` | `#1F4870` | `#ffffff` | 7.1:1              |
| Secondary / Service | `#1F6E68` | `#155752` | `#ffffff` | 5.9:1              |
| Accent / Alert      | `#B43A3A` | `#8E2828` | `#ffffff` | 5.5:1              |
| Storage / Data      | `#8B5E15` | `#6E4810` | `#ffffff` | 5.4:1              |
| Success             | `#2D7A2D` | `#1E5A1E` | `#ffffff` | 5.4:1              |
| Neutral             | `#5A5A5A` | `#3D3D3D` | `#ffffff` | 7.0:1              |

Pastel fills + dark text (`#1a1a1a` / `#1e1e1e`) are also AA-safe; only the legacy mid-tones + white-text combinations fail.
