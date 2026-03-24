# Watch Mode

Watch mode monitors diagram source files and re-renders them automatically when changes are detected. It uses [chokidar](https://github.com/paulmillr/chokidar) for file system watching.

## CLI Usage

```bash
diagramkit render . --watch
```

This performs an initial full render, then watches for changes:

```
Rendering 5 mermaid diagrams...
  5 mermaid rendered in 1200ms
Watching for diagram changes...

Changed: docs/architecture.mermaid
  Rendered: architecture
  Re-rendered: docs/architecture.mermaid
```

Press `Ctrl+C` to stop the watcher and close the browser.

### Combined with Other Flags

Watch mode can be combined with any render flag:

```bash
# Watch with PNG output
diagramkit render . --watch --format png

# Watch mermaid files only
diagramkit render . --watch --type mermaid

# Watch with custom scale
diagramkit render . --watch --format png --scale 3

# Watch without contrast optimization
diagramkit render . --watch --no-contrast
```

## JavaScript API

```typescript
import { renderAll, watchDiagrams, dispose } from 'diagramkit'

// Initial render
await renderAll({ dir: './content' })

// Start watching
const stop = watchDiagrams({
  dir: './content',
  renderOptions: {
    format: 'svg',
    theme: 'both',
    contrastOptimize: true,
  },
  onChange: (file) => {
    console.log(`Updated: ${file}`)
    // Trigger dev server reload, run post-processing, etc.
  },
})

// Stop watching when done
process.on('SIGINT', async () => {
  await stop()
  await dispose()
})
```

## Watched File Types

The watcher monitors all supported diagram file extensions:

- `**/*.mermaid`
- `**/*.mmd`
- `**/*.mmdc`
- `**/*.excalidraw`
- `**/*.drawio`
- `**/*.drawio.xml`
- `**/*.dio`

It ignores:

- `node_modules/`
- `.diagrams/` (or configured output directory)
- `dist/`

## Behavior Details

### Safe Rendering

When a file change is detected, the watcher re-renders only that file. If rendering fails (e.g., syntax error in the diagram), the existing output files are preserved -- they are not deleted on failure.

### Manifest Updates

The manifest is updated after each successful re-render, so incremental build tracking stays accurate even in watch mode.

### Browser Lifecycle

The browser pool stays alive during watch mode. It is not disposed between re-renders, so subsequent renders are fast (no cold-start penalty). The browser is closed when you stop the watcher or the process exits.

## Integration with Dev Servers

Watch mode works alongside any dev server. A typical workflow:

```bash
# Terminal 1: dev server
npm run dev

# Terminal 2: diagram watcher
npx diagramkit render . --watch
```

The `onChange` callback in the JavaScript API can be used to trigger hot-reload or other post-processing:

```typescript
const stop = watchDiagrams({
  dir: './content',
  onChange: (file) => {
    // Signal your dev server to reload
    notifyDevServer()
  },
})
```
