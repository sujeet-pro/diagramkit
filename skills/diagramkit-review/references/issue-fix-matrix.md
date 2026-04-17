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
