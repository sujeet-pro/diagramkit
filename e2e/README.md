# E2E Tests

Vitest-integrated end-to-end tests for diagramkit. Each test creates an isolated
temp workspace from fixture files, runs rendering via the API or CLI, asserts
outputs, and cleans up all created files.

## Running

```bash
npm run test:e2e
```

Requires `npm run build` first — CLI tests run against the built `dist/cli/bin.mjs`.

## Test Cases

### API Tests (api-render.e2e.test.ts)

| #   | Name                                                    | What it verifies                                            |
| --- | ------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | Render all types to SVG (both themes)                   | `renderAll` produces 6 SVGs, manifest has 3 entries         |
| 2   | Raster PNG with custom output dir and manifest filename | Custom `outputDir` + `manifestFile` config, PNG magic bytes |
| 3   | Same-folder output without manifest                     | `sameFolder` + `useManifest: false`, sources intact         |
| 4   | Manifest skip + incremental rebuild + orphan cleanup    | mtime unchanged on skip, updated on change, orphan cleanup  |
| 5   | Type filtering (mermaid only)                           | Only mermaid outputs produced                               |

### CLI Tests (cli-render.e2e.test.ts)

| #   | Name                                               | What it verifies                              |
| --- | -------------------------------------------------- | --------------------------------------------- |
| 6   | Single file to custom output dir                   | `--output` flag, dark theme only              |
| 7   | Directory with custom output-dir and manifest-file | `--output-dir` + `--manifest-file`, PNG light |
| 8   | Same-folder + no-manifest + type filter            | `--same-folder --no-manifest --type mermaid`  |

## Structure

```
e2e/
  api-render.e2e.test.ts   API rendering tests (vitest)
  cli-render.e2e.test.ts   CLI rendering tests (vitest)
  test-utils.ts            Shared helpers (workspace, assertions, CLI runner)
  fixtures/                Diagram source files (mermaid, excalidraw, drawio)
```
