# Getting Started

## Prerequisites

- **Node.js** >= 24.0.0
- A package manager (npm, pnpm, or yarn)

## Installation

Install diagramkit:

```bash
npm add diagramkit
```

Mermaid, Excalidraw, and Draw.io support are bundled with the package.

If you need raster output (`png`, `jpeg`, or `webp`), install `sharp` too:

```bash
npm add sharp
```

## Browser Setup

diagramkit uses Playwright to run a headless Chromium instance for rendering. Install the browser binary once:

```bash
npx diagramkit warmup
```

This runs `npx playwright install chromium` under the hood. You only need to do this once per environment (local machine, CI runner, CI worker, etc.).

## First Render

Create a Mermaid diagram file:

```
# architecture.mermaid
graph TD
    A[Client] -->|HTTP| B[API Gateway]
    B --> C[Auth Service]
    B --> D[Content Service]
    D --> E[(Database)]
```

Render it:

```bash
npx diagramkit render architecture.mermaid
```

This produces two files in a `.diagrams/` folder next to the source:

```
.diagrams/
  architecture-light.svg   # Light theme variant
  architecture-dark.svg    # Dark theme variant (contrast-optimized)
  diagrams.manifest.json   # Build cache manifest
```

## Rendering a Directory

To render all diagram files in a directory tree:

```bash
npx diagramkit render .
```

diagramkit recursively scans for supported file types (`.mermaid`, `.mmd`, `.mmdc`, `.excalidraw`, `.drawio`, `.drawio.xml`, `.dio`), skipping `node_modules` and hidden directories.

## Output Convention

Rendered images are placed in a `.diagrams/` hidden folder next to each source file. This keeps generated assets co-located with their sources without cluttering the directory.

```
docs/
  getting-started/
    flow.mermaid
    .diagrams/
      flow-light.svg
      flow-dark.svg
  architecture/
    system.excalidraw
    .diagrams/
      system-light.svg
      system-dark.svg
```

The output folder name, manifest file name, and other options are all [configurable](/guide/configuration).

## Using Rendered Images

### HTML with Dark Mode Support

```html
<picture>
  <source srcset=".diagrams/flow-dark.svg" media="(prefers-color-scheme: dark)">
  <img src=".diagrams/flow-light.svg" alt="Flow diagram">
</picture>
```

### CSS Class Approach

```html
<img src=".diagrams/flow-light.svg" alt="Flow" class="only-light">
<img src=".diagrams/flow-dark.svg" alt="Flow" class="only-dark">
```

## Next Steps

- [CLI reference](/guide/cli) for all commands and flags
- [JavaScript API](/guide/js-api) for programmatic usage
- [Configuration](/guide/configuration) for customizing output behavior
- [Watch Mode](/guide/watch-mode) for live re-rendering during development
