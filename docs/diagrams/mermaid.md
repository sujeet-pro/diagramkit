# Mermaid

[Mermaid](https://mermaid.js.org/) is a text-based diagramming language. diagramkit renders Mermaid source files using a headless Chromium instance with the official mermaid library loaded.

## File Extensions

| Extension | Description |
|-----------|-------------|
| `.mermaid` | Standard Mermaid file extension |
| `.mmd` | Short alias |
| `.mmdc` | Mermaid CLI-compatible alias |

All three extensions are treated identically. Use whichever fits your project conventions.

## Supported Diagram Types

diagramkit supports all diagram types that the mermaid library supports, including:

- Flowcharts (`graph TD`, `graph LR`)
- Sequence diagrams
- Class diagrams
- State diagrams
- Entity-relationship diagrams
- Gantt charts
- Pie charts
- Git graphs
- Mindmaps
- Timeline diagrams

Any valid Mermaid syntax will render. diagramkit loads the full mermaid library into the browser page.

## Installation

Mermaid is a required peer dependency:

```bash
npm add diagramkit mermaid playwright
```

## Example

Create `architecture.mermaid`:

```
graph TD
    A[Client] -->|HTTP| B[API Gateway]
    B --> C[Auth Service]
    B --> D[Content Service]
    D --> E[(Database)]
    C --> F[(Redis Cache)]

    subgraph Backend
        C
        D
        E
        F
    end
```

Render it:

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

Mermaid diagrams get two separate renders:

1. **Light page** -- uses mermaid's `default` theme
2. **Dark page** -- uses mermaid's `base` theme with custom dark theme variables

The dark render is then post-processed with WCAG contrast optimization to fix fill colors that are too bright against dark backgrounds.

### Default Dark Theme Variables

The built-in dark palette:

```typescript
{
  background: '#111111',
  primaryColor: '#2d2d2d',
  primaryTextColor: '#e5e5e5',
  primaryBorderColor: '#555555',
  secondaryColor: '#333333',
  secondaryTextColor: '#cccccc',
  secondaryBorderColor: '#555555',
  tertiaryColor: '#252525',
  tertiaryTextColor: '#cccccc',
  tertiaryBorderColor: '#555555',
  lineColor: '#cccccc',
  textColor: '#e5e5e5',
  mainBkg: '#2d2d2d',
  nodeBkg: '#2d2d2d',
  nodeBorder: '#555555',
  clusterBkg: '#1e1e1e',
  clusterBorder: '#555555',
  titleColor: '#e5e5e5',
  edgeLabelBackground: '#1e1e1e',
  // ... additional actor, signal, note, activation variables
}
```

### Custom Dark Theme

Override the dark theme variables via the JavaScript API:

```typescript
import { render } from 'diagramkit'

const result = await render(source, 'mermaid', {
  mermaidDarkTheme: {
    background: '#1a1a2e',
    primaryColor: '#16213e',
    primaryTextColor: '#e5e5e5',
    primaryBorderColor: '#0f3460',
    lineColor: '#e5e5e5',
    textColor: '#e5e5e5',
  },
})
```

### Disabling Contrast Optimization

If you prefer the raw dark theme output without WCAG adjustments:

```bash
diagramkit render . --no-contrast
```

Or in the API:

```typescript
const result = await render(source, 'mermaid', {
  contrastOptimize: false,
})
```

## Architecture

Mermaid rendering uses two persistent browser pages in the pool:

- **Light page** -- initialized with `mermaid.initialize({ theme: 'default', startOnLoad: false })`
- **Dark page** -- initialized with `mermaid.initialize({ theme: 'base', themeVariables: {...}, startOnLoad: false })`

Two pages are necessary because `mermaid.initialize()` is global and cannot be reconfigured per-call. Both pages are reused across multiple render calls for performance.

## Tips for Good Mermaid Diagrams

1. **Use semantic node IDs** -- `A[Web Server]` not `A[Node 1]`
2. **Keep diagrams focused** -- aim for 15 or fewer nodes per diagram, split complex systems into multiple files
3. **Use subgraphs** for logical grouping
4. **Avoid bright or neon custom colors** -- they may not pass dark mode contrast checks
5. **Prefer neutral fill colors** -- the dark mode post-processor adjusts high-luminance fills automatically
