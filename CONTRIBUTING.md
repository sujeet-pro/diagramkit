# Contributing to diagramkit

Thanks for your interest in contributing. This guide covers the basics for getting started.

## Dev setup

```bash
git clone https://github.com/sujeet-pro/diagramkit.git
cd diagramkit
npm install
npx playwright install chromium
```

Build the project:

```bash
npm run build
```

## Running tests

Run all tests:

```bash
npm test
```

Run only unit tests (fast, no browser required):

```bash
npm run test:unit
```

Run only end-to-end tests (requires Playwright Chromium):

```bash
npm run test:e2e
```

Unit tests live in `src/__tests__/` and cover pure logic modules. E2E tests live in `src/e2e/` and exercise real rendering through Playwright for all diagram types, output formats, and themes.

## Code style

- ESM only (`"type": "module"`)
- No semicolons
- Trailing commas
- Async for all rendering paths (Playwright-based)
- Sync FS for file reading (`readFileSync`)
- No CLI framework -- manual arg parsing
- Comments explain reasoning, not what code does
- Section headers use the format `/* -- Name -- */`
- Dynamic imports for optional dependencies (e.g., `sharp`)

Run the linter and formatter:

```bash
npm run check      # check for issues
npm run check:fix  # auto-fix
```

Type-check:

```bash
npm run typecheck
```

## Architecture

The codebase is organized around a single headless Chromium instance (managed by `BrowserPool`) that handles all three diagram engines. SVG is always the primary output, with raster conversion as an optional step.

See `CLAUDE.md` for a detailed architecture overview, directory structure, and guidance on adding new diagram types.

## Pull request process

1. Create a feature branch from `main`
2. Make your changes, following the code style above
3. Add or update tests as appropriate -- unit tests for pure logic, e2e tests for rendering behavior
4. Run `npm test` and `npm run check` to verify everything passes
5. Open a pull request against `main` with a clear description of the change
