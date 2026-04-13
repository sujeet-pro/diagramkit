---
title: Troubleshooting
description: Common issues and solutions for diagramkit rendering problems.
---

# Troubleshooting

## Local npm Bin Command Is Silent

**Symptom:** `./node_modules/.bin/diagramkit --version` prints nothing, or `npx diagramkit render ...` exits without output.

**Fix:** upgrade to the latest patch release, then retry one of the supported startup paths:

```bash
npx diagramkit --version
./node_modules/.bin/diagramkit --version
node ./node_modules/diagramkit/dist/cli/bin.mjs --version
```

Current releases normalize symlinked npm bin paths to the real CLI entrypoint, so local npm bin shims, `npx`, and direct `dist/cli/bin.mjs` execution should behave the same.

## Chromium Not Found

**Error:** `Chromium browser not found. Run "diagramkit warmup" to install it.`

**Fix:**

```bash
npx diagramkit warmup
```

This downloads the Playwright Chromium binary. Run it once per machine or CI environment.

If warmup fails, check that Playwright dependencies are installed:

```bash
npx playwright install-deps chromium
npx diagramkit warmup
```

> [!NOTE]
> Graphviz does not need Chromium. If you only render `.dot`/`.gv` files, `warmup` is not required.

## sharp Not Installed

**Error:** `sharp is required for png output. Install: npm add sharp`

**Fix:**

```bash
npm add sharp
```

sharp is an optional peer dependency, only needed for raster formats (PNG, JPEG, WebP, AVIF). SVG output never requires sharp.

## Diagram Renders as Empty or Blank

**Mermaid:** Check for syntax errors in the `.mermaid` file. Validate at [mermaid.live](https://mermaid.live).

**Excalidraw:** Ensure the file is raw `.excalidraw` JSON, not an exported SVG or PNG. The file must contain `elements`, `appState`, and `files` keys.

**Draw.io:** Ensure the file is the raw `.drawio` XML with an `<mxGraphModel>` root. Do not export as SVG from the Draw.io editor.

**Graphviz:** Validate DOT syntax at [Graphviz Online](https://dreampuf.github.io/GraphvizOnline/).

## Manifest Says "Up-to-Date" but Outputs Are Missing

The manifest tracks content hashes. If outputs were deleted but the manifest still exists, diagramkit detects the missing files and re-renders automatically.

If this does not happen, force a full re-render:

```bash
diagramkit render . --force
```

Or delete the manifest to reset tracking:

```bash
find . -name manifest.json -path '*/.diagramkit/*' -delete
diagramkit render .
```

## Dark Mode Colors Look Wrong

diagramkit post-processes dark SVGs to improve contrast for Mermaid and Graphviz. If colors appear too dark or desaturated:

1. **Disable contrast optimization** to see the raw output:

```bash
diagramkit render . --no-contrast
```

2. **Use neutral fills** in Mermaid diagrams -- bright neon colors (high luminance) are darkened to meet WCAG contrast thresholds
3. **Draw.io and Excalidraw** handle dark mode in their own renderers -- `--no-contrast` has no effect on these engines

See [Architecture](/guide/architecture) for details on how each engine handles dark mode.

## Watch Mode Stops Detecting Changes

The file watcher (chokidar) monitors supported extensions. If changes are not detected:

1. Ensure the file extension is supported (`.mermaid`, `.mmd`, `.excalidraw`, `.drawio`, etc.)
2. Check that the file is not inside `node_modules/`, `.git/`, or the configured output directory
3. Symlinked files are skipped -- use real files instead

## CI Pipeline Hangs

The CLI automatically disposes the shared browser pool after normal non-watch renders. If a CI job hangs, the usual causes are:

- a watch-mode process that is meant to stay alive
- a custom script using the JavaScript API without calling `dispose()`
- another long-running task waiting on stdin/stdout rather than render completion

For CLI usage, prefer a normal one-shot render:

```bash
npx diagramkit render . --quiet --json
```

For the JavaScript API:

```ts
import { renderAll, dispose } from 'diagramkit'

try {
  const result = await renderAll({ dir: '.', formats: ['svg', 'png'] })
  if (result.failed.length > 0) process.exit(1)
} finally {
  await dispose()
}
```

`--no-manifest` only disables incremental caching. It does not control browser lifecycle cleanup.

## Agent-Specific Checks

When an AI agent is driving renders, verify these first:

1. **Lifecycle cleanup** -- scripts should call `dispose()` after `renderAll()`/`renderFile()` runs.
2. **sharp detection** -- if raster output fails, ensure `sharp` is installed in the same package where rendering runs.
3. **Config validation fallback** -- invalid config values are reset to defaults with warnings; check logs for warnings about `outputDir`, `manifestFile`, or `defaultFormats`.
4. **Retry behavior in watch mode** -- after a render failure, fix the source diagram and save again to re-trigger rendering.

## Render Fails with Out-of-Memory

Large diagrams at high scale factors consume significant memory. Reduce the scale:

```bash
diagramkit render . --format png --scale 1
```

The default scale is 2 (retina). Scale 3+ is only recommended for print or large-format output. The maximum supported scale is 10.

## Custom Extensions Not Recognized

Add custom extensions to your config file:

```json5
{
  extensionMap: {
    ".custom": "mermaid",
  },
}
```

The extension map is merged with built-in defaults. Use `diagramkit render . --dry-run` to verify which files would be discovered.

## Performance: Many Files Are Slow

diagramkit uses incremental builds by default (manifest-based SHA-256 hashing). Only changed files re-render. If batch rendering is still slow:

1. **Check the manifest is enabled** -- `useManifest: true` (default)
2. **Filter by type** if you only need one engine: `--type mermaid`
3. **Use `inputDirs`** to restrict scanning to specific directories:

```json5
{
  inputDirs: ['docs/diagrams', 'src/architecture'],
}
```

4. **Graphviz is fastest** -- it uses WASM, no browser needed
5. **Mermaid, Excalidraw, Draw.io** share a single Chromium instance and render concurrently across engine types
