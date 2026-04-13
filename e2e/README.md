# E2E Tests

Vitest-integrated end-to-end tests for diagramkit. Each test creates an isolated
temp workspace from fixture files, runs rendering via the API or CLI, asserts
outputs, and cleans up all created files.

## Running

```bash
npm run build
npm run test:e2e
```

CLI tests run against the built `dist/cli/bin.mjs`.

## Coverage Highlights

### API (`api-render.e2e.test.ts`)

- default SVG rendering for all engines and both themes
- custom output directories and manifest filenames
- same-folder output with manifest disabled
- incremental skip, re-render, and orphan cleanup behavior
- multi-format rendering (`formats: ['svg', 'png']`)
- type filtering and custom extension maps
- JPEG, WebP, and AVIF raster output
- string/file APIs for Mermaid, Graphviz, Excalidraw, and Draw.io

### CLI (`cli-render.e2e.test.ts`)

- single-file and directory rendering flows
- `--output`, `--output-dir`, `--manifest-file`, and same-folder behavior
- multi-format `--format svg,png`
- raster formats through the CLI (`png`, `jpeg`, `webp`, `avif`)
- `--output-prefix` / `--output-suffix` naming controls
- `--force`, `--dry-run`, `--plan --json`, `--json`, `--quiet`
- `--no-contrast`, `--scale`, `--quality`, `--strict-config`, `--max-type-lanes`
- `init`, `doctor`, `--install-skill`, `--agent-help`, `warmup`
- watch mode re-rendering on file changes

## Structure

```text
e2e/
  api-render.e2e.test.ts        API rendering tests
  cli-render.e2e.test.ts        CLI rendering tests
  test-utils.ts                 Shared helpers (workspace, assertions, CLI runner)
  fixtures/
    mixed-diagrams/             Mermaid, Excalidraw, Draw.io, and Graphviz fixtures
```
