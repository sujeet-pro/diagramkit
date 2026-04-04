---
title: Graphviz
description: Render Graphviz DOT files to SVG with automatic dark mode adaptation via bundled Viz.js/WASM.
---

# Graphviz

[Graphviz](https://graphviz.org/) is a graph layout system built around the DOT language. diagramkit renders `.dot`, `.gv`, and `.graphviz` files to SVG using bundled Viz.js/WASM -- no browser needed.

## File Extensions

`.dot`, `.gv`, `.graphviz`

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
.diagrams/
  dependency-light.svg
  dependency-dark.svg
```

## Dark Mode

Graphviz SVG defaults to black strokes and text. diagramkit adapts the output for dark mode:

1. Renders with a transparent graph background
2. Rewrites default black text and strokes to dark-surface-friendly colors
3. Applies the fill contrast optimizer when `contrastOptimize` is enabled

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

## Tips

1. **Use `rankdir=LR`** for dependency graphs and pipelines that read left-to-right
2. **Use `subgraph cluster_*`** blocks to group related nodes
3. **Leave colors mostly unstyled** -- the dark adaptation works best with Graphviz defaults
4. **Keep labels short** -- wrap long names with `\n` so auto-layout stays readable
