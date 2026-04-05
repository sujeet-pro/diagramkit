---
title: Graphviz
description: Render Graphviz DOT files to SVG with automatic dark mode adaptation via bundled Viz.js/WASM.
---

# Graphviz

[Graphviz](https://graphviz.org/) is a graph layout system built around the DOT language. diagramkit renders `.dot`, `.gv`, and `.graphviz` files to SVG using bundled Viz.js/WASM -- no browser needed.

## File Extensions

`.dot`, `.gv`, `.graphviz`

## Capability Matrix

| Capability | Graphviz |
| --- | --- |
| Browser required | No |
| Native dark mode support | Partial (post-process adaptation) |
| WCAG post-process | Yes |
| Supports `--no-contrast` | Yes |
| Multi-format output | SVG/PNG/JPEG/WebP/AVIF |

## Quick Start

Create `dependency.dot`:

```txt
digraph Dependencies {
  rankdir=LR;

  Client -> Api;
  Api -> Auth;
  Api -> Database;
}
```

Render:

```bash
diagramkit render dependency.dot
```

Output:

```
.diagramkit/
  dependency-light.svg
  dependency-dark.svg
```

## Using with AI Agents

Tell your AI coding agent:

> Render all graphviz dot files in this project to SVG

Or for more control:

> Render docs/dependency.dot to PNG at 3x scale with light mode only

## Dark Mode

Graphviz SVG defaults to black strokes and text. diagramkit adapts the output for dark mode:

1. Renders with a transparent graph background
2. Applies WCAG contrast optimization when `contrastOptimize` is enabled
3. Rewrites default black text and strokes to dark-surface-friendly colors

This keeps unstyled DOT diagrams readable on dark backgrounds while preserving any explicit non-black colors from the source.

```bash
# Skip contrast optimization for raw dark output
diagramkit render . --no-contrast
```

## How It Works

Graphviz rendering does **not** use the browser pool. diagramkit calls the bundled Viz.js/WASM renderer directly in Node.js, then passes the SVG through the standard output pipeline (theme variants, file naming, manifest, optional raster conversion).

> [!TIP]
> Since Graphviz doesn't need a browser, it renders faster than Mermaid, Excalidraw, or Draw.io. You can also skip `diagramkit warmup` if you only render Graphviz files.

## Programmatic Usage

```ts
import { render } from 'diagramkit'

const result = await render(
  `digraph { A -> B -> C }`,
  'graphviz',
  { format: 'svg', theme: 'both' },
)
```

## Gotchas

- **Only `svg` format from Viz.js** -- Graphviz renders to SVG via WASM, then diagramkit converts to raster if needed. The DOT `format` directive is ignored; diagramkit always requests SVG.
- **Layout algorithms** -- Viz.js supports `dot`, `neato`, `fdp`, `sfdp`, `twopi`, and `circo`. The default is `dot`. Large graphs (500+ nodes) may be slow with `neato` or `fdp`.
- **Dark mode adaptation** -- default black strokes become `#94a3b8` and text becomes `#e5e7eb`. Only unstyled (black) elements are affected; explicitly colored elements are preserved.
- **No browser needed** -- Graphviz is the only engine that skips the browser pool. It renders faster and does not require `diagramkit warmup`.

## Tips

1. **Use `rankdir=LR`** for dependency graphs and pipelines that read left-to-right
2. **Use `subgraph cluster_*`** blocks to group related nodes
3. **Leave colors mostly unstyled** -- the dark adaptation works best with Graphviz defaults
4. **Keep labels short** -- wrap long names with `\n` so auto-layout stays readable
