# Excalidraw

[Excalidraw](https://excalidraw.com/) is a virtual whiteboard tool that produces hand-drawn style diagrams. diagramkit renders `.excalidraw` JSON files using the official `@excalidraw/excalidraw` library in a headless Chromium page.

## File Extensions

| Extension | Description |
|-----------|-------------|
| `.excalidraw` | Standard Excalidraw file extension |

## Installation

Excalidraw support is bundled with diagramkit:

```bash
npm add diagramkit
npx diagramkit warmup
```

::: tip
If you need raster output (`png`, `jpeg`, or `webp`), install `sharp` separately with `npm add sharp`.
:::

## JSON Format

Excalidraw files use a JSON format with three top-level keys:

```json
{
  "elements": [
    {
      "type": "rectangle",
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 100,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#a5d8ff",
      "fillStyle": "hachure",
      "roughness": 1,
      "opacity": 100
    }
  ],
  "appState": {
    "viewBackgroundColor": "#ffffff"
  },
  "files": {}
}
```

| Key | Description |
|-----|-------------|
| `elements` | Array of shapes, text, arrows, and other drawing elements |
| `appState` | Application state including background color and theme |
| `files` | Embedded binary files (images) referenced by elements |

The easiest way to create `.excalidraw` files is to draw in the [Excalidraw editor](https://excalidraw.com/) and export as `.excalidraw` (JSON).

## Example

Create `system.excalidraw` using the Excalidraw editor, then render:

```bash
diagramkit render system.excalidraw
```

Output:

```
.diagrams/
  system-light.svg
  system-dark.svg
```

Or render from a directory:

```bash
diagramkit render . --type excalidraw
```

## Dark Mode

Excalidraw handles dark mode natively through its `exportToSvg` API. When rendering:

- **Light:** `exportWithDarkMode: false`, background `#ffffff`
- **Dark:** `exportWithDarkMode: true`, background `#111111`

Both variants are rendered in the same browser page (unlike Mermaid, which requires separate pages). The Excalidraw library handles color adjustments internally.

::: info
The WCAG contrast post-processing (`--no-contrast` flag) applies to Mermaid diagrams only. Excalidraw's dark mode is handled by the library itself.
:::

## Architecture

Excalidraw rendering uses a single browser page:

1. The `@excalidraw/excalidraw`, `react`, and `react-dom` packages are bundled into an IIFE using [rolldown](https://rolldown.rs/)
2. The IIFE exposes a `__renderExcalidraw(json, darkMode)` function on `globalThis`
3. The bundled code is loaded into a Playwright page once, then reused for all renders
4. Each render call passes the JSON content and dark mode flag, receiving an SVG string back

The bundle is cached after the first build, so subsequent renders do not re-bundle.

## Programmatic Usage

```typescript
import { render } from 'diagramkit'
import { readFileSync } from 'fs'

const json = readFileSync('diagram.excalidraw', 'utf-8')

const result = await render(json, 'excalidraw', {
  format: 'svg',
  theme: 'both',
})

// result.light — Buffer containing light theme SVG
// result.dark  — Buffer containing dark theme SVG
```

## Tips for Excalidraw Diagrams

1. **Set `viewBackgroundColor` to `#ffffff`** -- dark mode is handled automatically during rendering
2. **Use the default color palette** -- custom colors may not contrast well in dark mode
3. **Keep elements spaced** -- leave at least 20px padding between elements for readable output
4. **Export as `.excalidraw` (JSON)** -- do not export as SVG or PNG from the editor; diagramkit needs the raw JSON to render both theme variants
