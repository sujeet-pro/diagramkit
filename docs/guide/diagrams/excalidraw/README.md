---
title: Excalidraw
description: Render Excalidraw hand-drawn style diagrams from JSON files with automatic dark mode.
---

# Excalidraw

[Excalidraw](https://excalidraw.com/) is a virtual whiteboard that produces hand-drawn style diagrams. diagramkit renders `.excalidraw` JSON files using the official `@excalidraw/excalidraw` library in headless Chromium.

## File Extensions

`.excalidraw`

## Quick Start

Create a diagram in the [Excalidraw editor](https://excalidraw.com/) and save as `.excalidraw` (JSON). Then render:

```bash
diagramkit render system.excalidraw
```

Output:

```
.diagrams/
  system-light.svg
  system-dark.svg
```

Or render only Excalidraw files in a directory:

```bash
diagramkit render . --type excalidraw
```

## JSON Format

Excalidraw files have three top-level keys:

```json
{
  "elements": [
    {
      "type": "rectangle",
      "x": 100, "y": 100,
      "width": 200, "height": 100,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#a5d8ff",
      "fillStyle": "hachure",
      "roughness": 1
    }
  ],
  "appState": {
    "viewBackgroundColor": "#ffffff"
  },
  "files": {}
}
```

| Key | Description |
|:----|:------------|
| `elements` | Shapes, text, arrows, and drawing elements |
| `appState` | Background color and theme settings |
| `files` | Embedded binary files (images) |

> [!TIP]
> The easiest way to create `.excalidraw` files is to draw in the [Excalidraw editor](https://excalidraw.com/) and export as `.excalidraw` (JSON). Do **not** export as SVG or PNG -- diagramkit needs the raw JSON to render both theme variants.

## Dark Mode

Excalidraw handles dark mode natively through its `exportToSvg` API:

- **Light:** `exportWithDarkMode: false`, background `#ffffff`
- **Dark:** `exportWithDarkMode: true`, background `#111111`

Both variants render in the same browser page (unlike Mermaid, which needs separate pages).

> [!NOTE]
> The `--no-contrast` flag has no effect on Excalidraw. Dark mode color adjustments are handled by the Excalidraw library itself.

## Programmatic Usage

```ts
import { render } from 'diagramkit'
import { readFileSync } from 'fs'

const json = readFileSync('diagram.excalidraw', 'utf-8')
const result = await render(json, 'excalidraw', { format: 'svg', theme: 'both' })
```

## How It Works

1. `@excalidraw/excalidraw`, `react`, and `react-dom` are bundled into an IIFE via [rolldown](https://rolldown.rs/)
2. The IIFE exposes `__renderExcalidraw(json, darkMode)` on `globalThis`
3. The bundle loads into a Playwright page once, then is reused for all renders
4. Each render passes JSON + dark mode flag and receives an SVG string

The bundle is cached after the first build.

## Tips

1. **Set `viewBackgroundColor` to `#ffffff`** -- dark mode is handled during rendering
2. **Use the default color palette** -- custom colors may not contrast well in dark mode
3. **Keep elements spaced** -- at least 20px padding between elements
4. **Export as `.excalidraw` (JSON)** -- not SVG or PNG from the editor
