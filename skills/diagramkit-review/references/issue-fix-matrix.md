# `diagramkit validate` issue → fix matrix

Maps every validation code emitted by `diagramkit validate ... --json` to its severity, root cause, and the engine-specific fix tactic. Used by Phase 4 of `diagramkit-review`.

The canonical descriptions live in `node_modules/diagramkit/REFERENCE.md` (and the per-engine SKILL.md "Iterative Error Correction" sections). When in doubt, read the locally installed REFERENCE.md.

---

## Errors (must fix — render fails downstream embeds)

### `NO_VISUAL_ELEMENTS`

- **Means**: SVG was produced but contains no visual elements — the source has a syntax error the engine swallowed.
- **Mermaid fix**: re-read the source for unquoted labels containing `()` / `|` / `:` / `<` / `>`, missing diagram keyword, or an invalid directive line. Quote labels and re-render.
- **Excalidraw fix**: empty `elements[]`, malformed JSON, or every element has `isDeleted: true`. Restore at least one visible shape.
- **Draw.io fix**: `<root>` is missing the `id="0"` / `id="1"` cells, or all cells are `vertex="0" edge="0"`.
- **Graphviz fix**: usually an unclosed brace, missing semicolon ambiguity, or wrong arrow operator (`->` in `graph`, `--` in `digraph`).

### `MISSING_SVG_CLOSE`

- **Means**: render crashed mid-output; the SVG is truncated.
- **Fix**: same as `NO_VISUAL_ELEMENTS`, plus check the render JSON's `failedDetails[]` for the engine-level error message; the source typically has an unrecoverable parse error.

### `EMPTY_FILE`

- **Means**: output file is zero bytes.
- **Fix**: verify Chromium is installed (`npx diagramkit warmup`), confirm the engine matches the extension (Mermaid sources renamed to `.dot` will produce empty output), then re-render with `--force`.

### `CONTAINS_SCRIPT`

- **Means**: SVG contains `<script>` — blocked in `<img>` embeds.
- **Fix**: never hand-edit the SVG; re-render with the stock diagramkit pipeline (it strips scripts). If the source uses a custom Mermaid plugin or unknown shape library that emits scripts, remove the dependency.

### Severity policy

Errors block the review from completing. Phase 5 must report zero errors before the review is declared clean.

---

## Warnings (must fix when SVGs are embedded via `<img>` / Markdown)

### `CONTAINS_FOREIGN_OBJECT`

- **Means**: Mermaid emitted HTML labels inside `<foreignObject>`. Markdown image embeds, GitHub `<picture>`, Safari image previews, and many static-site generators silently drop these.
- **Engine**: Mermaid only.
- **Fix**: add **`%%{init: {'htmlLabels': false}}%%`** before the diagram keyword (flat top-level form — the nested `{'flowchart': {'htmlLabels': false}}` form is silently ignored on Mermaid 11). Convert any `<br/>` in labels to `\n` and quote the label. Re-render with `--force`.

### `EXTERNAL_RESOURCE`

- **Means**: SVG references external URLs — blocked in `<img>` embeds.
- **Fix per engine**:
  - **Draw.io**: strip outer `<a xlink:href="…">` wrappers from the source XML and any external image references.
  - **Mermaid**: avoid `themeCSS` / external CSS / icon URLs; use built-in theme variables only.
  - **Excalidraw / Graphviz**: rare; usually a manually-inserted `<image href="https://…">` — replace with an inlined element.

### `LOW_CONTRAST_TEXT`

- **Means**: a text colour vs background pair fails WCAG 2.2 AA (4.5:1 normal, 3:1 large >=18px or >=14px bold).
- **Fix**: swap to the cross-engine WCAG 2.2 AA palette in [`audit-checklist.md`](./audit-checklist.md#cross-engine-wcag-22-aa-palette-use-for-white-text). Specifically:
  - **Mermaid**: replace legacy mid-tones in `classDef` (e.g. `#54A24B` → `#2D7A2D`, `#72B7B2` → `#1F6E68`).
  - **Excalidraw**: if shapes use the AA-compliant palette, ensure `strokeColor` of text labels is `#ffffff`; if shapes use the pastel palette, ensure text uses dark `#1e1e1e` (default).
  - **Draw.io**: update `fillColor=` and matching `fontColor=` in the cell `style=` string.
  - **Graphviz**: update `fillcolor=` and pair `fontcolor="#ffffff"` (AA palette) or `fontcolor="#1a1a1a"` (pastel palette). Never pair white text with the pastel palette.
- **Always re-validate after a swap** — palette changes can cascade if `classDef`/`style` is reused across diagrams.

### `SVG_VIEWBOX_TOO_WIDE`

- **Means**: the rendered SVG's _absolute_ viewBox width exceeds the readable threshold (default 1600 px). The aspect-ratio check passes when ratio is fine, but a near-square 2400×2200 SVG still forces a ~3× downscale when inlined into a typical 700–800 px doc column, dropping text to ~33% of native size and harming legibility just as much as a wrong-direction flowchart.
- **Why it's a separate code from `ASPECT_RATIO_EXTREME`**: a 1300×400 SVG fails `ASPECT_RATIO_EXTREME` but passes `SVG_VIEWBOX_TOO_WIDE`. A 2400×2200 SVG passes `ASPECT_RATIO_EXTREME` (~1.1:1 ratio) but fails `SVG_VIEWBOX_TOO_WIDE` (2400 > 1600 px). They catch independent failure modes; do not deduplicate.
- **Engine-specific fix tactics** (in order — apply earlier ones first; they're cheaper):
  - **Mermaid** — see [Width-reduction patterns](../../diagramkit-mermaid/SKILL.md#width-reduction-patterns-for-svg_viewbox_too_wide) in the mermaid SKILL.md for the full empirically-validated table. Headlines:
    1. Outer `flowchart LR` → `flowchart TB` (cheap, only helps for linear pipelines).
    2. **COLLAPSE REPLICAS** for `N×M` cross-subgraph fan (`GW1 & GW2 & GW3 --> RLS1 & RLS2 & RLS3` becomes one `GW` node feeding one `RLS` node) — single most powerful fix, 60-80% width reduction.
    3. **SPLIT** when the diagram has 6+ subgraphs or 25+ nodes — group by concern (ingress vs delivery, data path vs side concerns).
    4. Last resort: swap to `.dot` if the structure is purely a DAG.
  - **Drawio**: reflow `<mxGeometry>` rows into columns; the bounding-box width is mechanical to shrink in drawio.
  - **Graphviz**: flip `rankdir` from `LR` to `TB` first (cheapest, most effective for linear pipelines). `ratio="0.75"` is **only useful when the natural layout is wider than ~4:3** — for diagrams that already lay out vertically with `rankdir=TB`, `ratio=` can FORCE them WIDE again to hit the 0.75 target. Validated: removing `ratio="0.75"` from a `rankdir=TB` markdown-pipeline diagram dropped its width from 1808 → 308 px. **Always try `rankdir` flip alone first; add `ratio=` only if the result is tall-and-thin and you want to force squarer dimensions.**
  - **Excalidraw**: reposition shapes so the rightmost element doesn't dictate a wide canvas.
- **Suppression**: pass `--no-max-width` (CLI), `maxWidth: false` (API), or raise the threshold via `--max-width <px>` for sites with wider columns. Record any suppression in the review report.
- **Anti-patterns that don't reduce width** (skip these — they waste an iteration):
  - Replacing `<br/>` with `\n` alone — cosmetic, same layout.
  - Adding `direction TB` to subgraphs whose horizontal layout is driven by cross-subgraph edges (the most common case for "wide architecture" diagrams).
  - Re-enabling `mermaidLayout: { mode: 'auto' }` when it's already on — the renderer already tried flip + ELK during render.

### `ASPECT_RATIO_EXTREME`

- **Means**: rendered SVG width/height ratio is outside the readable band (default `[1:1.9, 3.3:1]` against a 4:3 target). Diagrams that overflow typical doc widths (~650–800 px) lose ~39% text legibility when scaled down — fixing this is part of accessibility, not aesthetics.
- **Engine-specific fix tactics** (apply in this order — escalate only if the previous step doesn't bring the SVG inside the band):

  | Step                         | Mermaid                                                                                                                           | Drawio                                                                                           | Graphviz                                                                                                                                                     | Excalidraw                                                                                              |
  | :--------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------ |
  | 1. Tweak directive           | Flip `flowchart LR` ↔ `TB` (or `RL` ↔ `BT`); set `mermaidLayout: { mode: 'auto' }` so the renderer also tries ELK                 | Reflow rows / columns so the bounding box of every `<mxGeometry>` becomes more square            | Add `ratio="compress"` or `ratio="0.75"` to the `graph [...]` block; flip `rankdir` (`LR` ↔ `TB`); add `{rank=same; …}` constraints to balance the long axis | Reflow shape positions so width / height is closer to 1.3:1; switch a horizontal grid to a 2-row layout |
  | 2. Reduce complexity         | Merge low-information nodes; extract subgraphs into separate diagrams                                                             | Move secondary detail into another `<diagram>` page (drawio multi-page)                          | Cluster wide fans under a synthetic parent; reduce `nodesep`/`ranksep`                                                                                       | Drop labels that aren't load-bearing; combine adjacent shapes                                           |
  | 3. Split the diagram         | Two diagrams (overview + detail) usually beats one wide one — keeps the engine, restores readability                              | Use multi-page (`<diagram name="Overview"/>` + `<diagram name="Detail-1"/>`); link from overview | Split into one `.dot` per concern; cross-reference in surrounding markdown                                                                                   | Save as two `.excalidraw` files; embed both with `<picture>`                                            |
  | 4. Swap engine (last resort) | Convert to `.drawio` (when icon density / precision is the issue) or `.dot` (when graph structure is the only thing that matters) | —                                                                                                | —                                                                                                                                                            | Convert to `.mermaid` (for structured types) or `.dot` (for pure graphs)                                |
  | 5. Record residual           | If steps 1–4 still leave the SVG outside the band, mark it in the Phase 5 report and surface to the user — don't infinite-loop    | Same                                                                                             | Same                                                                                                                                                         | Same                                                                                                    |

- **Decision shortcuts**:
  - **Mermaid + flowchart**: step 1 (flip / `mode: 'auto'`) fixes ~70% of cases. Try it first, render, re-check.
  - **Mermaid + sequence/gantt/journey/state/class/ER**: these are inherently directional — flipping does not apply. Go straight to step 2 (reduce) or step 3 (split).
  - **Graphviz**: step 1 (`ratio=`) is the most powerful single knob — graphviz honours it directly, unlike mermaid.
  - **Drawio / Excalidraw**: step 1 (reflow) is mostly a positioning edit. Use the layout grids in their engine SKILL.md.
- **Re-render with `--force` after every source edit** — the manifest hashes the source, so an unchanged-on-disk fix will be skipped without `--force`.

### Severity policy

Warnings are fixed by default in this review (matches the dominant `<img>`-embed case). Only suppress when the user explicitly confirms outputs are consumed only by SVG-aware viewers; record the suppression in the Phase 5 report.

---

## Render-phase failures (no validate code; appear in `result.failed[]`)

When `diagramkit render --json` reports a failed source, the matching `result.failedDetails[]` entry carries the engine error. Common patterns:

| Engine     | Failure pattern                                       | Fix                                                                                         |
| ---------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Mermaid    | `Parse error on line N: …`                            | Quote the offending label / fix the directive.                                              |
| Mermaid    | `No diagram type detected`                            | First non-comment line must be the diagram keyword.                                         |
| Excalidraw | `SyntaxError: Unexpected token … in JSON`             | Trailing comma or unquoted key; validate JSON.                                              |
| Excalidraw | `Cannot read properties of undefined (boundElements)` | Text element references a non-existent `containerId` (or vice-versa); fix the binding.      |
| Draw.io    | `mxGraphModel could not be parsed`                    | Malformed XML — confirm root cells (`id="0"`, `id="1"`) are intact.                         |
| Draw.io    | Stuck render / timeout                                | Custom stencil not in the bundled library; replace with a built-in shape.                   |
| Graphviz   | `syntax error in line N near 'X'`                     | Reserved keyword used as ID, missing semicolon, or wrong arrow operator for the graph type. |
| Graphviz   | `cluster has no nodes`                                | Empty `subgraph cluster_*` block — either remove or add at least one node.                  |

For every render failure, fix the source, then re-run `diagramkit render <single-file> --force --json` for that file before re-broadcasting Phase 3.
