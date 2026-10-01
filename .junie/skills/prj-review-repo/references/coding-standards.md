# diagramkit Coding Standards

Canonical coding conventions for all code in this repository. Replaces the former `GUIDELINES.md` and the "Coding conventions" section of `CLAUDE.md`.

## Language and module system

- **TypeScript everywhere** — `src/`, `cli/`, `e2e/`, `scripts/`. Config files may be `.json5` or `.ts`. JavaScript (`.js`, `.mjs`, `.cjs`) is only permitted when a downstream tool cannot consume TypeScript.
- **ESM only** — use `import`/`export`, never `require`/`module.exports`. Exception: `createRequire` for sync config loading where `jiti` is not suitable.
- **TypeScript strict mode**, no `any` or `unknown` unless commented with a specific reason.
- **Node >= 24.0.0** required. Use modern Node APIs with `node:` prefixes (`node:fs`, `node:path`, `node:crypto`).

## Formatting

- Trailing commas in function parameters, arrays, objects.
- No semicolons (except where required in `for` loops).
- Section headers in source files use the pattern `/* ── Name ── */`.
- Double quotes for strings in configuration; single quotes are fine in code.
- Lint and format via `vp check` (Oxlint + Oxfmt). Autofix with `vp check --fix`.

## Async and I/O

- All rendering functions are async (Playwright-based).
- Sync FS for file reading (`readFileSync`) because diagram sources are small and sync is simpler.
- Async FS or Playwright for heavy output operations.
- Atomic writes: `.tmp` + `renameSync` in `src/output.ts`; never write the final path directly.

## CLI

- No CLI framework for argument parsing — manual parsing in `cli/bin.ts`.
- `@clack/prompts` for interactive prompts inside `diagramkit init` only.
- Interactive mode prompts when required inputs are missing; non-interactive mode (all flags passed, or `--yes`) skips prompts for CI and agent use.
- `getFlag()` for boolean flags, `getFlagValue()` for string flags.
- Project-level config (`diagramkit.config.json5` or `diagramkit.config.ts`) is read from cwd walking up. Values in config should never require a flag override.
- Error messages go to `console.error`; normal output to `console.log`.
- Exit codes: `0` success, `1` any failure (including partial).

## Comments

- Comments explain _reasoning_, not what the code does.
- Avoid comments that restate the obvious (e.g. `// increment counter`).
- Use JSDoc on exported functions with `@param` and `@returns` only when the signature is non-obvious.

## Browser pool

- Reference counting: always pair `acquire()` with `release()` in `try/finally`.
- Separate pages for mermaid light and dark because `mermaid.initialize()` sets global theme.
- Excalidraw and drawio pages handle dark mode per-call (no global state).
- Coalesce concurrent `acquire()` calls — only one browser launch at a time.
- `dispose()` on process exit signals (SIGINT, SIGTERM, exit).

## Renderers

- Dynamic imports for optional peer dependencies (`sharp`). Runtime bundling for browser entry points via `rolldown`.
- Fail gracefully: if an optional dep is missing, warn and skip (do not throw from batch).
- Individual file failures do not abort a batch render — log and continue, increment fail counter.
- The render function in `src/renderer.ts` handles all diagram types via conditional branches with exhaustive type checking.

## Extension handling

- Extension-to-type mapping lives in `src/extensions.ts`.
- Longest-match-first resolution (`.drawio.xml` matches before `.xml`).
- Custom overrides via `config.extensionMap` (merged with built-in map).

## Configuration

- Merge order: defaults → global (`~/.config/diagramkit/config.json5`) → env vars (`DIAGRAMKIT_`\*) → local (`diagramkit.config.json5` or `.ts`) → per-call overrides. Never change this order.
- Config walks up the directory tree to find `diagramkit.config.json5` or `diagramkit.config.ts`.
- All config fields have sensible defaults in `getDefaultConfig()`.
- Prefer JSON5 for configs; use TypeScript configs only when a value needs code (function overrides, programmatic values).

## Error handling

- Use `DiagramkitError` with a `DiagramkitErrorCode` for any public-API-facing error. Include file path, expected format, and what was tried.
- Renderer batch: catch per-file, log warning, increment fail counter, continue.
- Missing optional dependencies: warn once, skip gracefully.
- No swallowed errors (empty catch blocks). Rethrow or log.

## Testing

- Framework: **Vitest** (`vp test`).
- **Unit tests** (`src/**/*.test.ts`) are colocated with the source they test. They cover pure logic modules (extensions, config, manifest, output, discovery, color, convert, pool, graphviz, watch, render-engines, renderer, render-all, runtime, logging, cli-bin, engine-profiles, doctor) with real temp directories and mocked FS where needed. No browser required.
- **E2E tests** (`e2e/`) are Vitest-integrated and drive the **Playwright library directly**. We do not use `@playwright/test` — tests exercise the real CLI and public API, verify rendered output for all diagram types, themes, formats, CLI flags, manifest behavior, and incremental rebuilds. Each test creates and cleans up an isolated temp workspace.
- **Deterministic**: no timing dependencies, no flaky retries, no order coupling.
- **Assertions are specific** — never just "truthy".
- **Export policy**: only export functions that are used by other modules or the public API. Never export a function solely for testing — test through the public interface or restructure the code instead.

## Build and distribution

- vite-plus (`vp pack`) for library build.
- Output to `dist/` — ESM only (`.mjs` + `.d.mts`).
- Published files: `dist/`, `schemas/`, `ai-guidelines/`, `skills/`, `REFERENCE.md`, `CHANGELOG.md` (see `package.json` `files`).
- `!dist/**/*.map` excludes source maps from the published tarball.

## Security

- Atomic writes prevent partial file corruption.
- Output directory creation uses `mkdirSync` with `recursive: true`.
- No symlink following that could escape the project directory.
- Diagram sources are untrusted — validate before passing to browser eval when practical.
- No postinstall scripts that execute arbitrary code.
