# Per-engine source audit checklist

Quick lookup table for Phase 1 of `diagramkit-review`. For any disagreement, defer to the engine SKILL.md (it is version-pinned to the renderer behaviour).

---

## Universal rules (every engine)

Apply to every source regardless of extension:

- [ ] **Hex colours only.** No named colours (`red`, `blue`, `lightblue`, …); behaviour varies by renderer.
- [ ] **No near-white fills** (`#fff`, `#fafafa`, …) — disappear on light backgrounds.
- [ ] **No near-black fills** (`#000`, `#0a0a0a`, …) — disappear on dark backgrounds.
- [ ] **No hardcoded theme directives.** Engines must let diagramkit inject light/dark themes (no `%%{init: {theme: 'dark'}}%%` in Mermaid, no `viewBackgroundColor: "#000"` overrides in Excalidraw, no opaque `bgcolor` in DOT, etc.).
- [ ] **Semantic IDs.** `auth_service`, not `a` / `n1` / hashes.
- [ ] **One story per diagram.** If a single source covers two unrelated concerns, split it during review.
- [ ] **No hand-edits to anything inside `.diagramkit/`.** All output is regenerated.

## Mermaid (`.mermaid` / `.mmd` / `.mmdc`)

- [ ] First non-comment line is the diagram keyword (`flowchart`, `sequenceDiagram`, `classDiagram`, `stateDiagram-v2`, `erDiagram`, …).
- [ ] **`%%{init: {'htmlLabels': false}}%%`** is present **before** the diagram keyword for every flowchart / class / state / ER diagram. Use the **flat** form — the nested `{'flowchart': {'htmlLabels': false}}` form is silently ignored on Mermaid 11 and produces `<foreignObject>` in the output.
- [ ] Multi-line labels use `\n`, **not** `<br/>`, **and the label is quoted** so the escape survives parsing: `PHYSICAL["Physical Clocks\nNTP, PTP, TrueTime"]`.
- [ ] No inline HTML (`<b>`, `<i>`, `<code>`) in labels — renders as literal text when `htmlLabels` is off.
- [ ] No `classDef` named `root`, `default`, `node`, `cluster` (collides with Mermaid internal class names).
- [ ] WCAG 2.2 AA palette in use (white text only on the AA-compliant darker palette below — never on the legacy pastels).

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

## Draw.io (`.drawio` / `.drawio.xml` / `.dio`)

- [ ] Well-formed XML with the `<mxfile>` → `<diagram>` → `<mxGraphModel>` → `<root>` skeleton; `<mxCell id="0"/>` and `<mxCell id="1" parent="0"/>` are present.
- [ ] Every `mxCell` that carries content has `vertex="1"` (shape) or `edge="1"` (edge), and a non-empty `parent` (usually `"1"`).
- [ ] Every edge has both `source=` and `target=` referencing live cell IDs (no dangling edges).
- [ ] No `<a xlink:href="…">` wrappers around shapes — they survive into the SVG and trigger `EXTERNAL_RESOURCE` warnings; strip them.
- [ ] Cloud vendor icons reference shape libraries actually available in the renderer (mxgraph builtins). Custom stencils not bundled with the renderer fail silently.
- [ ] WCAG palette used for `fillColor` / `fontColor` / `strokeColor`. White text only on the AA-compliant darker palette.

## Graphviz (`.dot` / `.gv` / `.graphviz`)

- [ ] Correct graph type: `digraph` for directed (uses `->`), `graph` for undirected (uses `--`). Mismatched edges cause parse errors.
- [ ] Default attributes set at the top: `graph [...]`, `node [...]`, `edge [...]` so per-node attrs stay minimal.
- [ ] `bgcolor="transparent"` (let diagramkit inject the theme background).
- [ ] Cluster subgraphs use the `cluster_` prefix — `subgraph backend { ... }` silently renders without a bounding box.
- [ ] No reserved keywords as IDs (`node`, `edge`, `graph`, `digraph`, `subgraph`, `strict`); quote them or rename.
- [ ] Statements end with `;` for unambiguous parsing.
- [ ] Strings with spaces / special chars are quoted.
- [ ] Pastel palette paired with `fontcolor="#1a1a1a"` (or `#333333`); AA-compliant palette paired with `fontcolor="#ffffff"`. Never mix.

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
