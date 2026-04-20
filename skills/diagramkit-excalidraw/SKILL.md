---
name: diagramkit-excalidraw
description: Generate Excalidraw diagrams (.excalidraw) and render to SVG/PNG/JPEG/WebP/AVIF with diagramkit. Freeform hand-drawn-style architecture overviews, system context maps, concept diagrams, and whiteboard visuals. Use when creating diagrams that need flexible layout, a hand-drawn aesthetic, or when the audience benefits from an approachable whiteboard-style visual.
---

# Excalidraw Diagram Generation with diagramkit

## When to use

Use this skill when the task calls for:

- **Architecture overviews** — system context, high-level component maps, deployment topologies
- **Freeform explanation** — concept maps, onboarding visuals, decision summaries
- **Codebase maps** — module relationships, data flow across services
- **Presentation visuals** — whiteboard-style diagrams for slides, docs, or blog posts
- **Hub-and-spoke layouts** — orchestrator patterns, event-driven systems

**Prefer over Mermaid** when layout flexibility matters more than structured diagram types (flowchart, sequence, ER, etc.), or when a hand-drawn aesthetic makes the diagram more approachable.

**Prefer over Draw.io** when you don't need cloud vendor icons, multi-page support, or pixel-precise positioning, and the hand-drawn feel adds value.

**Prefer Mermaid instead** when the content maps directly to a structured type (sequence diagram, ER diagram, gantt chart, state machine, etc.).

**Prefer Draw.io instead** when the diagram needs AWS/Azure/GCP icons, containers/swimlanes, or enterprise-grade layout precision.

## Step 1 — Resolve diagramkit (always prefer the local install)

Anchor on the locally installed CLI/API so this skill targets the version pinned in this repo. Do NOT fall back to a globally installed `diagramkit`.

1. **Read** `node_modules/diagramkit/REFERENCE.md` first — it is version-pinned to the installed package.
2. If `./node_modules/.bin/diagramkit` is missing, install locally:

   ```bash
   npm add diagramkit
   ```

3. Always invoke through `npx` so the local bin is used:

   ```bash
   DIAGRAMKIT="npx diagramkit"
   ```

If this is the first run or Chromium is missing, warm up the browser (Excalidraw uses Chromium):

```bash
$DIAGRAMKIT warmup
```

## Step 2 — Read project config

Check for project-level config that may affect output directory, default formats, or other settings:

- `diagramkit.config.json5` or `diagramkit.config.ts` in the project root (or any parent directory)
- Look for `outputDir`, `defaultFormats`, `sameFolder`, `theme`, `contrastOptimize` settings
- If no config exists, diagramkit uses sensible defaults: SVG output, both themes, `.diagramkit/` output folder

## Step 3 — Create the diagram

### Planning

Before writing JSON, plan the layout on paper (mentally):

1. **Identify components** — list every box, service, database, or concept
2. **Choose a layout pattern**:
   - **Vertical flow** — layered architectures (client → API → service → database)
   - **Horizontal flow** — pipelines, request paths, data transformation chains
   - **Hub-and-spoke** — orchestrators, event buses, central services
3. **Decide grouping** — which components belong in the same logical zone
4. **Map connections** — which arrows connect which components, and in which direction

### Minimal file structure

Every `.excalidraw` file must have this structure:

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "diagramkit",
  "elements": [],
  "appState": {
    "gridSize": 20,
    "viewBackgroundColor": "#ffffff"
  },
  "files": {}
}
```

### Critical rules

**1. Use semantic IDs.** Every element must have a descriptive `id` like `"api-server"`, `"auth-db"`, `"user-request-arrow"`. Never use `"a"`, `"n1"`, or auto-generated hashes.

**2. DO NOT use diamond shapes.** Arrow attachments render poorly on diamonds. Use styled rectangles instead.

**3. Labels require TWO elements.** Every labeled shape needs a shape element with `boundElements` referencing a text element, and a text element with `containerId` pointing back to the shape:

Shape element (partial):

```json
{
  "id": "api-box",
  "type": "rectangle",
  "width": 180,
  "height": 80,
  "boundElements": [{ "type": "text", "id": "api-box-text" }]
}
```

Text element (partial):

```json
{
  "id": "api-box-text",
  "type": "text",
  "containerId": "api-box",
  "text": "API Server",
  "originalText": "API Server",
  "textAlign": "center",
  "verticalAlign": "middle"
}
```

Both sides of the link MUST be present. A shape without `boundElements` will render without its label. A text without `containerId` will float free.

**4. Position text explicitly.** Use these formulas to place text inside its container:

- `text.x = shape.x + 5`
- `text.y = shape.y + (shape.height - text.height) / 2`
- `text.width = shape.width - 10`
- Set `textAlign: "center"` and `verticalAlign: "middle"`

**5. Elbow arrows need three properties.** Orthogonal (right-angle) arrows require all three:

```json
{
  "type": "arrow",
  "roughness": 0,
  "roundness": null,
  "elbowed": true
}
```

Missing any one of these causes rendering artifacts.

**6. Arrow anchors at shape edges.** Compute arrow start/end points from shape geometry:

| Edge   | x                   | y                    |
| ------ | ------------------- | -------------------- |
| Top    | `shape.x + width/2` | `shape.y`            |
| Bottom | `shape.x + width/2` | `shape.y + height`   |
| Left   | `shape.x`           | `shape.y + height/2` |
| Right  | `shape.x + width`   | `shape.y + height/2` |

**7. Arrow width and height must match point bounding box.** The arrow's `width` and `height` properties must equal the bounding box of its `points` array. If points are `[[0,0],[0,120]]`, then `width` = 0 and `height` = 120.

**8. Use hex colors only.** Never use named colors like `red` or `blue`. Use the palette in the Color palette section below.

**9. No duplicate IDs.** Every element `id` must be unique across the entire file.

**10. Valid JSON always.** The file must be valid JSON. Validate before rendering.

For full element property specifications and arrow binding patterns, read `references/element-reference.md`.

### Layout grid reference

**Vertical flow** (layered architectures):

| Column | x position |
| ------ | ---------- |
| 1      | 100        |
| 2      | 300        |
| 3      | 500        |
| 4      | 700        |
| 5      | 900        |

- Element width: 160–200, height: 80–90
- Vertical spacing between rows: 120–150 (leaves room for arrows)

**Horizontal flow** (pipelines):

| Stage | x position |
| ----- | ---------- |
| 1     | 100        |
| 2     | 350        |
| 3     | 600        |
| 4     | 850        |
| 5     | 1100       |

- Common y position: 200
- Element width: 180–200, height: 80

**Hub-and-spoke** (orchestrators):

- Center hub: `x=500`, `y=350`
- Spokes at ~45-degree increments around the hub
- Spoke distance: 250–300 from hub center

## Step 4 — Color palette

Excalidraw text defaults to dark grey (`#1e1e1e`). Pair its labels with
the **light pastel palette** below for light-mode legibility — the dark
mode contrast post-processor will darken these fills automatically.

### Pastel palette (use with `strokeColor=#1e1e1e` text)

| Component          | Background | Stroke    |
| ------------------ | ---------- | --------- |
| Frontend / UI      | `#a5d8ff`  | `#1971c2` |
| Backend / API      | `#d0bfff`  | `#7048e8` |
| Database           | `#b2f2bb`  | `#2f9e44` |
| Storage            | `#ffec99`  | `#f08c00` |
| AI / ML            | `#e599f7`  | `#9c36b5` |
| External API       | `#ffc9c9`  | `#e03131` |
| Orchestration      | `#ffa8a8`  | `#c92a2a` |
| Network / Security | `#dee2e6`  | `#495057` |

### AA-compliant darker palette (use with white text)

When you need shapes that work with white labels in both modes, prefer
this WCAG 2.2 AA-verified palette (each pair clears 4.5:1 vs `#ffffff`
text):

| Purpose             | Background | Stroke    | Contrast |
| ------------------- | ---------- | --------- | -------- |
| Primary / API       | `#2E5A88`  | `#1F4870` | 7.1:1    |
| Secondary / Service | `#1F6E68`  | `#155752` | 5.9:1    |
| Accent / Alert      | `#B43A3A`  | `#8E2828` | 5.5:1    |
| Storage / Data      | `#8B5E15`  | `#6E4810` | 5.4:1    |
| Success             | `#2D7A2D`  | `#1E5A1E` | 5.4:1    |
| Neutral             | `#5A5A5A`  | `#3D3D3D` | 7.0:1    |

**Colors to avoid:**

- `#ffffff` or near-white fills — disappear on light backgrounds
- `#000000` or near-black fills — disappear on dark backgrounds
- Named colors (`red`, `blue`) — behavior varies across renderers
- Saturated neon colors — poor contrast in both modes
- White text on the lighter pastel palette — fails WCAG 2.2 AA

After rendering, validate the SVGs:

```bash
npx diagramkit validate ./.diagramkit --recursive --json
```

`LOW_CONTRAST_TEXT` warnings list each (text color, background color)
pair with its measured ratio so you know exactly what to change.

For the full universal palette, dark mode details, and WCAG contrast rules, read `references/color-and-theming.md`.

## Step 5 — Render

Render the diagram with diagramkit:

```bash
$DIAGRAMKIT render path/to/diagram.excalidraw
```

This produces both light and dark SVG variants in the `.diagramkit/` folder next to the source file:

```
path/to/
  diagram.excalidraw
  .diagramkit/
    diagram-light.svg
    diagram-dark.svg
```

For raster output (PNG / JPEG / WebP / AVIF):

```bash
$DIAGRAMKIT render path/to/diagram.excalidraw --format png
$DIAGRAMKIT render path/to/diagram.excalidraw --format svg,png            # both
$DIAGRAMKIT render path/to/diagram.excalidraw --format svg,png,webp,avif  # all
$DIAGRAMKIT render path/to/diagram.excalidraw --format jpeg --quality 85  # JPEG quality
```

Raster conversion is performed by the same locally installed `diagramkit` CLI — you do not need a separate image tool.

## Step 6 — Validate

After rendering, validate the SVG output:

```bash
$DIAGRAMKIT validate path/to/.diagramkit/
```

Excalidraw-specific validation issues to watch for:

| Code                   | Severity | Meaning                                                                                                                                                                                 |
| ---------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LOW_CONTRAST_TEXT`    | warning  | Shape `backgroundColor` and text `strokeColor` pair fails WCAG 2.2 AA. Swap to the AA palette in [Step 4](#step-4--color-palette).                                                      |
| `ASPECT_RATIO_EXTREME` | warning  | Bounding box of all elements is too wide / tall (outside `[1:1.9, 3.3:1]`). See [Readability](#readability-budget-and-aspect-ratio) below — excalidraw lets you reflow shapes manually. |
| `NO_VISUAL_ELEMENTS`   | error    | Empty `elements[]` or every element has `isDeleted: true`. Restore at least one visible shape.                                                                                          |
| `MISSING_SVG_CLOSE`    | error    | Almost always invalid JSON or a missing required property (see `references/element-reference.md`).                                                                                      |

## Readability budget and aspect ratio

Excalidraw renders the SVG at the exact pixel extent of the rightmost / bottommost element. This means the diagram's overall shape is whatever you draw — apply these limits:

| Dimension                 | Hard ceiling                                     | Why                                                                                                                                                               |
| :------------------------ | :----------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shapes per file           | **≤ 50 dense / ≤ 100 sparse** (target ≤ 25)      | Past these caps comprehension drops sharply.                                                                                                                      |
| Arrows per file           | **≤ 100**                                        | Visual graph density past this point exceeds underlying logic density.                                                                                            |
| Branching width           | **≤ 8 outgoing arrows** from any single shape    | Wider fans force the reader to lose their place.                                                                                                                  |
| Bounding-box aspect ratio | **inside `[1:1.9, 3.3:1]`** against a 4:3 target | Diagrams overflowing typical doc widths (~650–800 px) get scaled down and lose ~39% text legibility. The validator emits `ASPECT_RATIO_EXTREME` when this breaks. |

### Visual encoding

- **Use shape semantics consistently.** rectangle = process / service, ellipse = external boundary or actor, **diamond is poor in Excalidraw (arrows attach badly) — use a rectangle with a "Decision:" label prefix instead**, cylinder shape is unavailable so use a rectangle with a 📦/🗄 emoji or a "Storage" label.
- **Never rely on colour alone for meaning.** Pair every fill with a shape, label, or position. ~8% of male engineers have red-green colour-vision deficiency.
- **Reserve red (`#B43A3A` / `#ffc9c9`) for errors / alerts.** Don't use it for "primary" or generic emphasis.

### When `ASPECT_RATIO_EXTREME` fires

Excalidraw is positional, so the fix is mechanical. Apply the steps in this order — re-render with `--force` after each step and re-validate. Cap at 8 iterations per file.

1. **Reflow the layout.** Compute the current bounding box: `maxX = max(element.x + element.width)`, `minX = min(element.x)`, similarly for Y. If `(maxX − minX) / (maxY − minY)` is too wide, wrap a horizontal row into 2–3 rows; if too tall, do the inverse. The layout grids in [Step 3](#step-3--create-the-diagram) (vertical, horizontal, hub-and-spoke) give you target coordinates.
2. **Reduce shape count.** Merge low-information shapes; drop labels that aren't load-bearing.
3. **Split the diagram.** Save as two `.excalidraw` files — `<name>-overview.excalidraw` (the high-level shapes) and `<name>-detail-<N>.excalidraw` (zoomed-in sections). Embed both with `<picture>` in the surrounding markdown.
4. **Swap engine (last resort).** When the hand-drawn aesthetic isn't the value being added, convert to `.mermaid` (with `mermaidLayout: { mode: 'auto' }` for structured types) or `.dot` (graphviz, with `ratio="0.75"` for algorithmic layout). Follow `../diagramkit-mermaid/SKILL.md` or `../diagramkit-graphviz/SKILL.md` for the rewrite.
5. **Record residual** in the review report if the loop hasn't cleared the warning.

## Step 7 — Iterative error correction

If rendering fails or output looks wrong, check these common issues:

1. **Invalid JSON** — Trailing commas, missing quotes, unescaped characters. Validate JSON before rendering.
2. **Missing boundElements/containerId** — Labels won't appear. Both the shape's `boundElements` array AND the text's `containerId` must be set.
3. **Arrow points not matching edges** — Arrows will float in space. Recompute start/end positions using the edge formulas in Step 3.
4. **Duplicate IDs** — Later elements silently overwrite earlier ones. Ensure every `id` is unique.
5. **Arrow width/height mismatch** — The arrow's `width`/`height` must match the bounding box of its `points` array.
6. **Missing required properties** — Every element needs all required properties. See `references/element-reference.md` for the full list.
7. **Elbow arrows without all three flags** — `roughness: 0`, `roundness: null`, AND `elbowed: true` must all be set.

**Error correction loop:**

1. Render the diagram
2. If validation fails, read the error message
3. Fix the specific issue in the `.excalidraw` source
4. Re-render with `--force` to bypass cache
5. Repeat until validation passes

```bash
$DIAGRAMKIT render path/to/diagram.excalidraw --force
$DIAGRAMKIT validate path/to/.diagramkit/
```

## Step 8 — Raster, embed, and dark mode

### Raster output

For PNG/JPEG/WebP/AVIF output, `sharp` must be available as a peer dependency:

```bash
npm add sharp
$DIAGRAMKIT render path/to/diagram.excalidraw --format png --scale 2
```

### Markdown embedding

**GitHub README / generic markdown** — use `<picture>` for theme switching:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./.diagramkit/overview-dark.svg" />
  <source media="(prefers-color-scheme: light)" srcset="./.diagramkit/overview-light.svg" />
  <img alt="System overview" src="./.diagramkit/overview-light.svg" />
</picture>
```

**Pagesmith content sites** — use consecutive markdown images:

```md
![System overview](./.diagramkit/overview-light.svg 'How the system processes requests.')
![System overview](./.diagramkit/overview-dark.svg)
```

Light image first, dark image immediately after, identical alt text on both.

**Pagesmith docs** — use figure with theme classes:

```html
<figure>
  <img src="./.diagramkit/overview-light.svg" class="only-light" alt="System overview" />
  <img src="./.diagramkit/overview-dark.svg" class="only-dark" alt="System overview" />
  <figcaption>System overview</figcaption>
</figure>
```

### Dark mode

Excalidraw uses the native `exportWithDarkMode` flag — diagramkit handles this automatically. Background is `#111111` (dark) and `#ffffff` (light). The WCAG contrast post-processor (`postProcessDarkSvg`) runs on dark output to ensure fills remain readable.

## Review Mode

Use this section when invoked from [`diagramkit-review`](../diagramkit-review/SKILL.md) (or whenever the user asks to audit/fix existing `.excalidraw` sources rather than create new ones).

### Source-file audit (per `.excalidraw`)

Every check is fast and mechanical. Apply the minimum textual fix for each rule that fails:

1. **Valid JSON** — no trailing commas, all strings quoted. Parse with a JSON tool before any other check.
2. **Top-level shape** — `type: "excalidraw"`, `version: 2`, `source: "diagramkit"`, plus `elements`, `appState`, and `files`.
3. **No diamond shapes used as labelled elements** — arrows attach poorly. Replace with styled rectangles.
4. **Label bindings are bidirectional** — every labelled shape has `boundElements: [{ "type": "text", "id": "<text-id>" }]` AND the matching text element has `containerId: "<shape-id>"`. Missing either side drops the label.
5. **Text positioning** — `text.x = shape.x + 5`, `text.y = shape.y + (shape.height - text.height) / 2`, `text.width = shape.width - 10`, `textAlign: "center"`, `verticalAlign: "middle"`.
6. **Elbow arrows have all three flags** — `roughness: 0`, `roundness: null`, `elbowed: true`. Missing any one causes rendering artifacts.
7. **Arrow geometry** — `width` and `height` equal the bounding box of `points[]`. Start/end coordinates land on shape edges (top/bottom/left/right formulas in Step 3).
8. **Unique IDs across the file** — duplicate `id` silently overwrites the earlier element.
9. **Hex colours only** — no named colours.
10. **Palette / text-colour coupling** — pastel fills (`#a5d8ff`, `#b2f2bb`, `#ffec99`, `#ffc9c9`, …) pair with default dark text (`#1e1e1e`); AA-compliant darker fills (`#2E5A88`, `#1F6E68`, …) pair with `#ffffff` text. Never mix pastel + white text (fails AA).
11. **No hardcoded background override** — `appState.viewBackgroundColor` should be `#ffffff` (or omitted). Let diagramkit's dark-mode pipeline (`exportWithDarkMode`) handle theming.
12. **Readability budget** — file has ≤ 50 shapes (dense) / ≤ 100 (sparse), ≤ 100 arrows, ≤ 8 outgoing arrows from any single shape.
13. **Bounding box aspect ratio in band** — `(maxX − minX) / (maxY − minY)` across all `elements[]` sits inside `[0.53, 3.33]`. If not, reflow shapes per the layout grids in Step 3.
14. **Shape semantics consistent** — rectangle = process, ellipse = boundary/actor, no diamonds (use rectangle + "Decision:" label prefix because excalidraw's diamond has poor arrow attachment).
15. **Colour is not the only differentiator** — every colour-coded role also has a shape, label, or position cue.

### Validation issue → fix mapping

| Code                   | Fix                                                                                                                                                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LOW_CONTRAST_TEXT`    | Inspect each shape's fill + the matching text element's `strokeColor`. If shape uses pastel palette, set text `strokeColor: "#1e1e1e"`. If shape uses AA-compliant darker palette, set text `strokeColor: "#ffffff"`. Re-render with `--force`. |
| `ASPECT_RATIO_EXTREME` | Run the [aspect-ratio escalation ladder](#when-aspect_ratio_extreme-fires): reflow shape positions → reduce shape count → split into multiple `.excalidraw` files → swap to `.mermaid`/`.dot`. Cap at 8 iterations per file.                    |
| `NO_VISUAL_ELEMENTS`   | Check for empty `elements[]`, malformed JSON, or every element marked `isDeleted: true`. Restore at least one visible shape.                                                                                                                    |
| `MISSING_SVG_CLOSE`    | Almost always invalid JSON or a missing required property. Validate the file and add the missing properties listed in `references/element-reference.md`.                                                                                        |
| `EXTERNAL_RESOURCE`    | Rare in Excalidraw; usually a manually-inserted `image` element with an external URL. Replace with an inlined element or remove.                                                                                                                |

### Single-file repair loop

```bash
npx diagramkit render <file>.excalidraw --force --json
npx diagramkit validate <file's .diagramkit dir> --json
```

Stop on first clean run, or mark as residual after 8 iterations.

## References

- `references/element-reference.md` — Full element properties, arrow routing, bindings, label linking, layout grids, validation checklist
- `references/color-and-theming.md` — Excalidraw color palette, universal palettes, dark mode, WCAG contrast, grouping patterns
