# Coding Guidelines

## Language and Module System

- ESM only, no CommonJS (`import`/`export`, never `require`/`module.exports`)
- TypeScript strict mode
- Node >= 24.0.0 required

## Formatting

- Trailing commas in function parameters, arrays, objects
- No semicolons (except where required in `for` loops)
- Section headers use the pattern: `/* -- Name -- */`
- Double quotes for strings in configuration; single quotes are fine in code

## Async and I/O

- All rendering functions are async (Playwright-based)
- Sync FS for file reading: `readFileSync` (diagram sources are small, sync is simpler)
- Async FS or Playwright for heavy output operations

## CLI

- No CLI framework — manual argument parsing in `cli/bin.ts`
- `getFlag()` for boolean flags, `getFlagValue()` for string flags
- Error messages go to `console.error`, normal output to `console.log`

## Comments

- Comments explain _reasoning_, not what the code does
- Avoid comments that restate the obvious (e.g. `// increment counter`)
- Use JSDoc on exported functions with `@param` and `@returns` when non-obvious

## Browser Pool

- Reference counting: always pair `acquire()` with `release()` in `try/finally`
- Separate pages for mermaid light and dark because `mermaid.initialize()` sets global theme
- Excalidraw and drawio pages handle dark mode per-call (no global state)
- Coalesce concurrent `acquire()` calls — only one browser launch at a time

## Renderers

- Dynamic imports for optional peer dependencies (`sharp`). Runtime bundling for browser entry points via `rolldown`.
- Fail gracefully: if an optional dep is missing, warn and skip (do not throw from batch)
- Individual file failures do not abort a batch render — log and continue
- Atomic writes where practical: write to `.tmp` file, then `renameSync` to final path
- All renderers implement the `DiagramRenderer` interface from `src/types.ts`

## Extension Handling

- Extension-to-type mapping lives in `src/extensions.ts`
- Longest-match-first resolution (`.drawio.xml` matches before `.xml`)
- Custom overrides via `config.extensionMap` (merged with built-in map)

## Configuration

- Merge order: defaults -> global (`~/.config/diagramkit/config.json`) -> local (`.diagramkitrc.json`) -> overrides
- Config walks up the directory tree to find `.diagramkitrc.json`
- All config fields have sensible defaults in `getDefaultConfig()`

## Error Handling

- Renderer batch: catch per-file, log warning, increment fail counter, continue
- Browser pool: `dispose()` on process exit signals (SIGINT, SIGTERM, exit)
- Missing optional dependencies: warn once, skip gracefully

## Testing

- Framework: vitest
- Unit tests for pure logic: color conversions, manifest operations, extension resolution
- Integration tests that need Playwright should be separate (slower, require chromium)
- Unit tests colocated with source (`src/*.test.ts`), e2e tests in `e2e/`
- Run with `npm test` (vitest run) or `npm run test:watch` (vitest watch)
- Type checking: `npm run typecheck` (tsc --noEmit)

## Build

- vite-plus for library build (`vp pack`)
- `vite-plugin-dts` for type declaration generation
- Output to `dist/` — ESM only (`.mjs` + `.d.mts`)
- Published files: `dist/`, `agent_skills/`, and `INSTALL_SKILLS.md`
