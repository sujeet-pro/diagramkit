# diagramkit Engine Integration (skill-local extract)

Self-contained reference for the `prj-add-diagram-type` skill. Extracts the engine-integration bits of `project-context.md` and `coding-standards.md` so this skill needs nothing else. Keep in sync with the canonical files under `.agents/skills/prj-review-repo/references/`.

## Engine model

- **Unified Playwright** — mermaid, excalidraw, and draw.io share a single headless Chromium instance via `BrowserPool` in [`src/pool.ts`](../../../../src/pool.ts).
- **Graphviz** — rendered via `@viz-js/viz` (WASM), no browser.
- **Pages** — mermaid has separate light and dark pages because `mermaid.initialize()` is global. Excalidraw and draw.io handle darkMode per-call.
- **Ref counting** — pool uses lazy init, reference counting, idle timeout (5s), auto-cleanup.
- **Browser entries** — excalidraw and draw.io each have a TypeScript entry at `src/renderers/<engine>-entry.ts` bundled to IIFE at runtime via rolldown, exposing a `__render<Engine>()` global.

## Files touched when adding an engine

| File                                                           | Change                                                            |
| -------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------- |
| [`src/extensions.ts`](../../../../src/extensions.ts)           | Add entries to `DEFAULT_EXTENSION_MAP`                            |
| [`src/types.ts`](../../../../src/types.ts)                     | Add `'<engine>'` to `DiagramType` union                           |
| [`src/engine-profiles.ts`](../../../../src/engine-profiles.ts) | Add metadata to `ENGINE_PROFILES` (`browserPool: true             | false`, lane order) |
| [`src/pool.ts`](../../../../src/pool.ts)                       | Add `get<Engine>Page()` (only if browser-based)                   |
| `src/renderers/<engine>-entry.ts`                              | Browser IIFE (only if needed), expose `__render<Engine>()` global |
| [`vite.config.ts`](../../../../vite.config.ts)                 | Add entry to `pack.entry` so it ships with `dist/`                |
| [`src/render-engines.ts`](../../../../src/render-engines.ts)   | Register renderer                                                 |
| [`src/renderer.ts`](../../../../src/renderer.ts)               | Dispatch; exhaustive `never` check will flag remaining sites      |

## Engine rules

- New browser-based engines MUST use the same `BrowserPool` — never launch a separate browser.
- SVG-first: every engine produces SVG; raster conversion is a post-step via [`src/convert.ts`](../../../../src/convert.ts).
- Atomic writes everywhere (`.tmp` + rename). See [`src/output.ts`](../../../../src/output.ts).
- Light + dark by default. Never emit a themeless output.
- Individual file failures must not abort a batch render — log, increment fail counter, continue.
- Dynamic imports for optional peer dependencies (`sharp`).
- Acquire/release must always pair in `try/finally` for the pool.

## Types

```typescript
type DiagramType = 'mermaid' | 'excalidraw' | 'drawio' | 'graphviz' // add new id here
type OutputFormat = 'svg' | 'png' | 'jpeg' | 'webp' | 'avif'
type Theme = 'light' | 'dark' | 'both'
```

## Tests to add

- Extension resolution tests in [`src/extensions.test.ts`](../../../../src/extensions.test.ts).
- A fixture file under [`e2e/fixtures/mixed-diagrams/`](../../../../e2e/fixtures/mixed-diagrams/).
- E2E coverage in [`e2e/api-render.e2e.test.ts`](../../../../e2e/api-render.e2e.test.ts) and [`e2e/cli-render.e2e.test.ts`](../../../../e2e/cli-render.e2e.test.ts).
- Per-engine unit test if non-trivial logic lives in the renderer.

## Docs and sync

- `docs/guide/diagrams/<engine>/README.md` with the AI-first template (prompt + manual).
- Add `<engine>` to `docs/guide/diagrams/meta.json5`.
- Consumer skill: `skills/diagramkit-<engine>/SKILL.md` plus `references/` if needed.
- Update extension table in [README.md](../../../../README.md), [REFERENCE.md](../../../../REFERENCE.md), and canonical [`project-context.md`](../../prj-review-repo/references/project-context.md).
- Add a row to `docs/reference/diagramkit/types/README.md` for the updated `DiagramType`.
- Entry under `## Unreleased` in [`CHANGELOG.md`](../../../../CHANGELOG.md).

## Validation

```bash
npm run cicd
```

Pay attention to:

- `npm run typecheck` — surfaces missing cases from exhaustive `never` checks.
- `npm run test:e2e` — runs the new fixture end-to-end.
- `node --experimental-strip-types ./scripts/validate-build.ts` — confirms package payload and skill frontmatter.
