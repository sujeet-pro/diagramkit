---
title: Watch Mode
description: Automatically re-render diagrams when source files change.
---

# Watch Mode

Watch mode monitors diagram source files and re-renders them on save. It uses [chokidar](https://github.com/paulmillr/chokidar) for file watching.

## CLI Usage

```bash
diagramkit render . --watch
```

This performs an initial full render, then watches for changes:

```
Rendered 5/5 diagrams to svg
Watching for diagram changes...

Changed: docs/architecture.mermaid
  Re-rendered: docs/architecture.mermaid
```

Press `Ctrl+C` to stop.

### Combine with Other Flags

```bash
diagramkit render . --watch --format png
diagramkit render . --watch --type mermaid
diagramkit render . --watch --format png --scale 3
diagramkit render . --watch --no-contrast
```

## JavaScript API

```ts
import { renderAll, watchDiagrams, dispose } from 'diagramkit'

// Initial render
await renderAll({ dir: './content' })

// Start watching
const stop = watchDiagrams({
  dir: './content',
  renderOptions: { format: 'svg', theme: 'both' },
  onChange: (file) => console.log(`Updated: ${file}`),
})

// Stop watching when done
process.on('SIGINT', async () => {
  await stop()
  await dispose()
})
```

## Watched File Types

All supported extensions are monitored:

`**/*.mermaid`, `**/*.mmd`, `**/*.mmdc`, `**/*.excalidraw`, `**/*.drawio`, `**/*.drawio.xml`, `**/*.dio`, `**/*.dot`, `**/*.gv`, `**/*.graphviz`

Ignored: `node_modules/`, output directory (e.g. `.diagramkit/`), `dist/`.

## Behavior

- **Safe rendering** -- only the changed file re-renders. If rendering fails (e.g. syntax error), existing outputs are preserved.
- **Manifest updates** -- the manifest updates after each successful re-render, keeping incremental tracking accurate.
- **Browser stays warm** -- the browser pool remains alive during watch mode for fast subsequent renders.

## Dev Server Integration

Run diagramkit alongside your dev server in a separate terminal:

```bash
# Terminal 1
npm run dev

# Terminal 2
npx diagramkit render . --watch
```

The `onChange` callback in the JS API can trigger hot-reload:

```ts
const stop = watchDiagrams({
  dir: './content',
  onChange: () => notifyDevServer(),
})
```
