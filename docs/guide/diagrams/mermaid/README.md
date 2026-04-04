---
title: Mermaid
description: Render Mermaid text-based diagrams with automatic light/dark theme variants and contrast optimization.
---

# Mermaid

[Mermaid](https://mermaid.js.org/) is a text-based diagramming language. diagramkit renders Mermaid files using headless Chromium with the official mermaid library.

## File Extensions

`.mermaid`, `.mmd`, `.mmdc` -- all treated identically.

## Supported Diagram Types

All mermaid diagram types are supported, including flowcharts, sequence diagrams, class diagrams, state diagrams, ER diagrams, gantt charts, pie charts, git graphs, mindmaps, and timelines.

## Quick Start

Create `architecture.mermaid`:

```mermaid
graph TD
    A[Client] -->|HTTP| B[API Gateway]
    B --> C[Auth Service]
    B --> D[Content Service]
    D --> E[(Database)]

    subgraph Backend
        C
        D
        E
    end
```

Render:

```bash
diagramkit render architecture.mermaid
```

Output:

```
.diagrams/
  architecture-light.svg
  architecture-dark.svg
```

## Dark Mode

Mermaid gets two separate renders:

1. **Light** -- mermaid `default` theme
2. **Dark** -- mermaid `base` theme with custom dark variables

The dark render is then post-processed with WCAG contrast optimization to fix fill colors that are too bright against dark backgrounds.

### Default Dark Theme

The built-in dark palette uses neutral grays with good contrast:

```ts
{
  background: '#111111',
  primaryColor: '#2d2d2d',
  primaryTextColor: '#e5e5e5',
  primaryBorderColor: '#555555',
  lineColor: '#cccccc',
  textColor: '#e5e5e5',
  mainBkg: '#2d2d2d',
  nodeBkg: '#2d2d2d',
  nodeBorder: '#555555',
  clusterBkg: '#1e1e1e',
  // ... additional variables
}
```

### Custom Dark Theme (API)

Override dark theme variables programmatically:

```ts
import { render } from 'diagramkit'

const result = await render(source, 'mermaid', {
  mermaidDarkTheme: {
    background: '#1a1a2e',
    primaryColor: '#16213e',
    primaryTextColor: '#e5e5e5',
    lineColor: '#e5e5e5',
  },
})
```

### Disable Contrast Optimization

```bash
diagramkit render . --no-contrast
```

```ts
const result = await render(source, 'mermaid', { contrastOptimize: false })
```

## How It Works

Mermaid rendering uses two persistent browser pages in the pool:

- **Light page** -- `mermaid.initialize({ theme: 'default' })`
- **Dark page** -- `mermaid.initialize({ theme: 'base', themeVariables: {...} })`

Two pages are needed because `mermaid.initialize()` is global and cannot be reconfigured per-call. Both pages are reused across renders.

## Tips

1. **Use semantic node IDs** -- `A[Web Server]` not `A[Node 1]`
2. **Keep diagrams focused** -- aim for 15 or fewer nodes; split complex systems into multiple files
3. **Use subgraphs** for logical grouping
4. **Prefer neutral fill colors** -- the dark mode post-processor adjusts high-luminance fills automatically
5. **Avoid bright neon colors** -- they may not pass dark mode contrast checks
