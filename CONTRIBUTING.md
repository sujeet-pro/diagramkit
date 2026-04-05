# Contributing to diagramkit

Thanks for your interest in contributing. This guide covers the basics for getting started.

By participating, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). To report security vulnerabilities, see our [Security Policy](SECURITY.md).

## Dev setup

### Prerequisites

Node >= 24 is required (see `.node-version`).

```bash
# Install Node via nvm (recommended)
nvm install    # reads .node-version
nvm use
```

Or download from [nodejs.org](https://nodejs.org/).

### Clone and install

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

Run only end-to-end tests (requires Playwright Chromium, build first):

```bash
npm run test:e2e
```

E2E tests require a built dist. Run `npm run build` before `npm run test:e2e`.

Unit tests are colocated with source files (`src/*.test.ts`). E2E tests are vitest-integrated tests that run with `npm run test:e2e`. See `e2e/README.md` for the full test case list.

## Full validation

Before submitting a PR, run the full validation:

```bash
npm run validate
```

This runs lint/format checks, typecheck, library build, unit tests, and e2e in sequence.

If you need to validate documentation build too, run:

```bash
npm run docs:build
```

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
4. Run `npm run validate` to verify everything passes
5. Open a pull request against `main` with a clear description of the change -- GitHub will auto-apply the PR template
