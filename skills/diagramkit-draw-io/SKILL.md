---
name: diagramkit-draw-io
description: Generate Draw.io diagrams (.drawio/.drawio.xml/.dio) and render to SVG/PNG/JPEG/WebP/AVIF with diagramkit. Rich shape libraries, cloud vendor icons (AWS/Azure/GCP), BPMN, org charts, network topology, swimlanes, and multi-page layouts. Use when creating infrastructure-heavy diagrams, cloud architecture, or diagrams needing precise manual positioning and vendor icon libraries.
---

# diagramkit — Draw.io Engine

## When To Use

Choose Draw.io when the diagram needs:

- Network topology or cloud deployment architecture
- Cloud vendor icons (AWS, Azure, GCP) with official shape libraries
- BPMN process flows or org charts
- Enterprise system maps with many component types
- Multi-page layouts (overview + detail pages)
- Icon-heavy infrastructure diagrams
- Precise manual positioning of elements
- Containers and swimlanes for logical grouping
- Complex edge routing with orthogonal connectors

If the diagram is a dependency graph or call graph where algorithmic layout matters more than hand-tuned positioning, use `diagramkit-graphviz` instead. If it's a text-first diagram (flowchart, sequence, ER, state), use `diagramkit-mermaid` instead.

## 1 — Resolve diagramkit (always prefer the local install)

Anchor on the locally installed CLI/API so this skill targets the version pinned in this repo. Do NOT fall back to a globally installed `diagramkit`.

1. **Read** `node_modules/diagramkit/REFERENCE.md` first — it is version-pinned to the installed package.
2. Check for the local install:

   ```bash
   if [ ! -x ./node_modules/.bin/diagramkit ]; then
     npm add diagramkit
   fi
   ```

3. Always invoke through `npx` so the local bin is used:

   ```bash
   npx diagramkit --version    # confirms the LOCAL install
   npx diagramkit warmup       # Draw.io needs Playwright Chromium
   ```

Draw.io rendering requires Playwright Chromium. Always run `warmup` before first render.

## 2 — Read Project Config

Check for existing project configuration before creating diagrams:

```bash
# Look for project config
ls diagramkit.config.* 2>/dev/null || ls .diagramkitrc.json 2>/dev/null

# Check package.json for render scripts
grep -q "diagramkit" package.json 2>/dev/null && echo "diagramkit configured"
```

If a config exists, respect its `outputDir`, `sameFolder`, `theme`, and `extensionMap` settings.

## 3 — Create The Diagram

### Minimal XML Structure

Every `.drawio` file needs this skeleton:

```xml
<mxfile host="diagramkit" modified="2024-01-01T00:00:00.000Z" type="device">
  <diagram id="page-1" name="Page-1">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1"
                  tooltips="1" connect="1" arrows="1" fold="1" page="1"
                  pageScale="1" pageWidth="1200" pageHeight="900"
                  math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <!-- All diagram elements go here -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

### Build Rules

1. **Root cells are required** — always include `<mxCell id="0"/>` and `<mxCell id="1" parent="0"/>`. These are the invisible root and default parent layer. Every visible element must have `parent="1"` (or a container ID).
2. **Semantic IDs** — use descriptive IDs like `api_gateway`, `auth_service`, `vpc_subnet`, not `a` or `n1`.
3. **Vertex vs Edge** — shapes must have `vertex="1"`, connectors must have `edge="1"`. Missing these attributes causes silent rendering failures.
4. **Parent hierarchy** — elements inside a container use `parent="container-id"` with coordinates relative to the container.
5. **Style strings** — semicolon-delimited key=value pairs. Keep a consistent base style and vary only the differentiating properties.
6. **One story per diagram** — keep each diagram focused. Use multi-page for overview + detail split.

### Basic Vertex

```xml
<mxCell id="api_gateway" value="API Gateway"
        style="rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
</mxCell>
```

### Basic Edge

```xml
<mxCell id="edge_gw_auth" value="REST"
        style="edgeStyle=orthogonalEdgeStyle;rounded=1;fontColor=#333333;"
        edge="1" source="api_gateway" target="auth_service" parent="1">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>
```

### Full Reference

Read `references/xml-reference.md` for the complete shape catalog, cloud provider icons, edge styles, container patterns, multi-page structure, and grid/layout guidance.

## 4 — Color Palette

### Pastel Palette (use with `fontColor=#1a1a1a`)

These pastels work in light mode with dark text. The dark-mode contrast
post-processor darkens them to maintain visibility on dark backgrounds.

| Purpose | Fill      | Stroke    |
| ------- | --------- | --------- |
| Blue    | `#dae8fc` | `#6c8ebf` |
| Green   | `#d5e8d4` | `#82b366` |
| Orange  | `#ffe6cc` | `#d6b656` |
| Red     | `#f8cecc` | `#b85450` |
| Purple  | `#e1d5e7` | `#9673a6` |
| Yellow  | `#fff2cc` | `#d6b656` |
| Gray    | `#f5f5f5` | `#666666` |

### AA-Compliant Mid-Tone Palette (use with `fontColor=#ffffff`)

When you want a darker fill that pairs cleanly with white text in both
modes, pick from this WCAG 2.2 AA-verified palette:

| Purpose             | Fill      | Stroke    | FontColor | White contrast |
| ------------------- | --------- | --------- | --------- | -------------- |
| Primary / API       | `#2E5A88` | `#1F4870` | `#ffffff` | 7.1:1          |
| Secondary / Service | `#1F6E68` | `#155752` | `#ffffff` | 5.9:1          |
| Accent / Alert      | `#B43A3A` | `#8E2828` | `#ffffff` | 5.5:1          |
| Storage / Data      | `#8B5E15` | `#6E4810` | `#ffffff` | 5.4:1          |
| Success             | `#2D7A2D` | `#1E5A1E` | `#ffffff` | 5.4:1          |
| Neutral             | `#5A5A5A` | `#3D3D3D` | `#ffffff` | 7.0:1          |

```xml
<mxCell id="api" value="API Gateway"
        style="rounded=1;whiteSpace=wrap;fillColor=#2E5A88;strokeColor=#1F4870;fontColor=#ffffff;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
</mxCell>
```

### Colors To Avoid

- `#ffffff` or near-white fills — disappear on light backgrounds, get forcibly darkened in dark mode
- `#000000` or near-black fills — disappear on dark backgrounds
- Named colors (`red`, `blue`) — behavior varies across renderers
- Very saturated neon colors — poor contrast in both modes
- White text on the lighter pastel palette — fails WCAG 2.2 AA

### Text Color

- Use `fontColor=#1a1a1a` (or `#333333`) on the pastel palette for light
  mode. The Mermaid/Graphviz dark adapters auto-promote dark text fills,
  but **drawio rendering does not yet auto-promote `fontColor`** — verify
  with the validator after rendering and switch to white text on a
  darker fill if you see `LOW_CONTRAST_TEXT` warnings.
- Use `fontColor=#ffffff` on the AA-compliant darker palette above.

After rendering, validate the SVGs:

```bash
npx diagramkit validate ./.diagramkit --recursive --json
```

`LOW_CONTRAST_TEXT` warnings list each (text color, background color)
pair with the measured ratio so you know exactly what to fix.

Read `references/color-and-theming.md` for the full color reference including dark mode behavior.

## 5 — Render

```bash
# Render a single file (SVG, both themes)
npx diagramkit render architecture.drawio

# Render with raster output
npx diagramkit render architecture.drawio --format svg,png

# Render all diagrams in directory
npx diagramkit render .

# Force re-render (ignore cache)
npx diagramkit render architecture.drawio --force
```

### Validate

After rendering, verify the output:

```bash
# Validate generated SVGs
npx diagramkit validate .diagramkit/
```

### Iterative Error Correction

If rendering fails, check for these common issues:

1. **Malformed XML** — unclosed tags, missing quotes on attribute values, `&` not escaped as `&amp;`. Fix the XML structure.
2. **Missing root cells** — every file needs `<mxCell id="0"/>` and `<mxCell id="1" parent="0"/>`. Add them inside `<root>`.
3. **Invalid parent references** — a child element references a parent ID that doesn't exist. Verify all `parent` attributes point to existing elements.
4. **Missing vertex/edge attributes** — shapes without `vertex="1"` or connectors without `edge="1"` are silently skipped. Add the missing attribute.
5. **Bad geometry** — `<mxGeometry>` without `as="geometry"` is ignored. Edges need `relative="1"`.
6. **Encoding issues** — special characters in `value` must be XML-escaped (`&amp;`, `&lt;`, `&gt;`, `&quot;`).

Fix the issue, re-render, and validate again. Repeat until validation passes.

### Hand-exported SVGs: strip `<a xlink:href>` wrappers

If you receive an `.svg` exported directly from draw.io desktop or diagrams.net (not rendered through diagramkit), `diagramkit validate` may emit:

```
code: EXTERNAL_RESOURCE
severity: warning
message: SVG references 1 external resource(s): https://www.drawio.com/doc/faq/svg-export-text-problems
```

Cause: drawio's exporter wraps the SVG body in an `<a xlink:href="https://www.drawio.com/…">` link about font export quirks. This external reference is blocked inside `<img>` embeds and trips the validator.

Fix (one of):

1. **Preferred — render from source.** Keep the `.drawio` source in the repo and render through diagramkit so the output is script-free and link-free by construction.
2. **If only the SVG is available**, remove the outer `<a xlink:href>` wrapper:

   ```bash
   # Strip the drawio FAQ link wrapper (preserves child content)
   perl -i -pe 's|<a xlink:href="https://www\.drawio\.com[^"]*"[^>]*>||g; s|</a>||g' path/to/diagram.svg
   ```

   Then re-run `diagramkit validate` to confirm the warning is gone.

3. **Re-export from drawio.com** with "Include a copy of my diagram" and any "Link to website" / "Help link" options disabled.

## 6 — Raster / Embed / Dark Mode

### Raster Output (PNG / JPEG / WebP / AVIF)

The locally installed `diagramkit` CLI handles SVG → raster in a single command — no separate image tool needed:

```bash
# PNG for email/Confluence
npx diagramkit render . --format png --scale 2

# WebP for web
npx diagramkit render . --format webp --quality 85

# JPEG with quality
npx diagramkit render . --format jpeg --quality 85

# Multiple formats in one pass
npx diagramkit render . --format svg,png,webp,avif
```

Raster requires `sharp` as a peer dependency: `npm add -D sharp`

### Embedding In Markdown

**GitHub README / generic markdown:**

```html
<picture>
  <source
    media="(prefers-color-scheme: dark)"
    srcset="./diagrams/.diagramkit/architecture-dark.svg"
  />
  <source
    media="(prefers-color-scheme: light)"
    srcset="./diagrams/.diagramkit/architecture-light.svg"
  />
  <img alt="System architecture" src="./diagrams/.diagramkit/architecture-light.svg" />
</picture>
```

**Pagesmith docs:**

```html
<figure>
  <img
    src="./diagrams/.diagramkit/architecture-light.svg"
    class="only-light"
    alt="System architecture"
  />
  <img
    src="./diagrams/.diagramkit/architecture-dark.svg"
    class="only-dark"
    alt="System architecture"
  />
  <figcaption>System architecture</figcaption>
</figure>
```

### Dark Mode

diagramkit renders both light and dark variants by default. The Draw.io dark mode uses browser-side WCAG luminance adjustment:

- White (`#ffffff`) fills → `#2d2d2d`
- Black (`#000000`) fills → `#e5e5e5`
- High-luminance fills (luminance > 0.4) are darkened by factor 0.3 while preserving hue
- Then `postProcessDarkSvg()` runs WCAG contrast optimization

This means mid-tone pastel fills work best — they're adjusted automatically without losing identity.

## 7 — Review Mode

Use this section when invoked from [`diagramkit-review`](../diagramkit-review/SKILL.md) (or whenever the user asks to audit/fix existing `.drawio` / `.drawio.xml` / `.dio` sources rather than create new ones).

### Source-file audit (per `.drawio`)

For each source, verify in order — apply the minimum textual fix for each rule that fails:

1. **Well-formed XML** — `<mxfile>` → `<diagram>` → `<mxGraphModel>` → `<root>` skeleton intact; root contains `<mxCell id="0"/>` and `<mxCell id="1" parent="0"/>`.
2. **Cell role attributes** — every content cell has `vertex="1"` (shape) or `edge="1"` (connector). Cells missing both are silently skipped by the renderer.
3. **Parent references resolve** — every `parent=` attribute points to an existing cell ID (usually `"1"` for top-level elements, or a container cell ID for grouped elements).
4. **Edges have endpoints** — every `edge="1"` cell has both `source=` and `target=` referencing live cell IDs.
5. **Geometry attributes** — every `<mxGeometry>` carries `as="geometry"`. Edge geometries also need `relative="1"`.
6. **XML-escaped special chars** — `&`, `<`, `>`, `"` inside `value=` are escaped (`&amp;`, `&lt;`, …).
7. **No `<a xlink:href="…">` wrappers** — strip them from the source XML; they survive into the SVG and trigger `EXTERNAL_RESOURCE`.
8. **Stencils available in the bundled library** — custom stencils not in mxgraph builtins fail silently. Replace with built-in shapes if missing.
9. **WCAG palette** — `fillColor=` paired with appropriate `fontColor=`. White text only on AA-compliant darker fills (`#2E5A88`, `#1F6E68`, `#B43A3A`, `#8B5E15`, `#2D7A2D`, `#5A5A5A`); dark text (`#1a1a1a`) on pastel fills.
10. **No hardcoded background overrides on the page** — let diagramkit handle theme.

### Validation issue → fix mapping

| Code                 | Fix                                                                                                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EXTERNAL_RESOURCE`  | Strip outer `<a xlink:href="https://www.drawio.com/…">` link wrappers from the source XML. If only an exported SVG is available, also see "Hand-exported SVGs" above. Re-render with `--force`. |
| `LOW_CONTRAST_TEXT`  | Update the offending cell's `style=` string: replace `fillColor=` with the AA-compliant hex and pair with `fontColor=#ffffff`. Re-render with `--force`, then re-validate.                      |
| `NO_VISUAL_ELEMENTS` | Verify the `<root>` contains `id="0"` / `id="1"` cells; check that content cells have `vertex="1"` or `edge="1"`.                                                                               |
| `MISSING_SVG_CLOSE`  | Almost always malformed XML — confirm all tags are closed and attribute values are quoted.                                                                                                      |
| `CONTAINS_SCRIPT`    | Custom JavaScript stencil emitted a `<script>`; remove the stencil and replace with a built-in shape.                                                                                           |

### Single-file repair loop

```bash
npx diagramkit render <file>.drawio --force --json
npx diagramkit validate <file's .diagramkit dir> --json
```

Stop on first clean run, or mark as residual after 8 iterations.

## 8 — References

- `references/xml-reference.md` — full XML structure, all shapes, cloud icons, edge styles, containers, multi-page, layout guidance
- `references/color-and-theming.md` — complete color palettes, dark mode behavior, WCAG contrast rules
