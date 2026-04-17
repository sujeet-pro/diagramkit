---
name: prj-add-diagram-type
description: Add support for a new diagram engine (e.g. PlantUML, D2, Structurizr) to diagramkit. Handles the full checklist — extension map, DiagramType union, engine profile, browser pool page, IIFE entry, renderer registration, tests, docs, and ai-guidelines sync.
user_invocable: true
---

# Add a New Diagram Type

Canonical 8-step recipe for adding a new diagram engine. Always update the review-repo project-context reference alongside the code.

## Read first

1. [`references/engine-integration.md`](references/engine-integration.md) — skill-local extract of engine model, file map, pool rules, testing + sync checklist.
2. `src/extensions.ts`, `src/types.ts`, `src/engine-profiles.ts`, `src/render-engines.ts`, `src/pool.ts`, `vite.config.ts` — the files you will touch.

Canonical long-form references (only when you need the full picture): [`../prj-review-repo/references/project-context.md`](../prj-review-repo/references/project-context.md), [`../prj-review-repo/references/coding-standards.md`](../prj-review-repo/references/coding-standards.md).

## Steps

Replace `<engine>` with the new engine id (lowercase, no hyphens, e.g. `plantuml`).

1. **Extension map** — add entries to `DEFAULT_EXTENSION_MAP` in [src/extensions.ts](src/extensions.ts) (e.g. `.puml: 'plantuml'`).
2. **DiagramType union** — add `'<engine>'` to the `DiagramType` type in [src/types.ts](src/types.ts). The exhaustive `never` check in the renderer will flag all sites that must handle the new type.
3. **Engine profile** — add metadata to `ENGINE_PROFILES` in [src/engine-profiles.ts](src/engine-profiles.ts). Declare whether the engine is browser-backed (`browserPool: true`) or WASM/native (`browserPool: false`), and its lane order.
4. **Pool page** (only if browser-based) — add a `get<Engine>Page()` method to `BrowserPool` in [src/pool.ts](src/pool.ts). Follow the excalidraw/drawio pattern if the renderer needs a bundled IIFE, or the mermaid pattern if it loads a script directly.
5. **Browser entry** (only if needed) — create `src/renderers/<engine>-entry.ts` exposing `__render<Engine>()` as a global. Add the entry to `vite.config.ts` pack entries so it ships with `dist/`.
6. **Renderer logic** — register a renderer in [src/render-engines.ts](src/render-engines.ts) and ensure [src/renderer.ts](src/renderer.ts) dispatches to it. TypeScript will enforce exhaustiveness.
7. **Tests**:
   - Extension resolution tests in [src/extensions.test.ts](src/extensions.test.ts).
   - A fixture file under `e2e/fixtures/mixed-diagrams/`.
   - E2E coverage in `e2e/api-render.e2e.test.ts` and `e2e/cli-render.e2e.test.ts` (render, light/dark, formats, incremental).
   - Per-engine unit test if non-trivial logic lives in the renderer.
8. **Docs**:
   - `docs/guide/diagrams/<engine>/README.md` with the AI-first template (prompt + manual steps).
   - Add `<engine>` to `docs/guide/diagrams/meta.json5`.
   - If the engine has its own authoring reference, place it at `skills/diagramkit-<engine>/SKILL.md` and shipped `references/` files.
   - Add a row to the extension table in [../prj-review-repo/references/project-context.md](../prj-review-repo/references/project-context.md) and [README.md](README.md).

Manifest, discovery, output naming, and watch all work automatically via the extension map — no changes needed there.

## Sync rule

Update these files **in the same PR**:

- [`../prj-review-repo/references/project-context.md`](../prj-review-repo/references/project-context.md) — Types section, Directory structure, Adding-a-new-diagram-type checklist if it changes, Extension aliases table.
- `docs/guide/diagrams/<engine>/README.md` — new page.
- `docs/reference/diagramkit/types/README.md` — updated `DiagramType`.
- `README.md` — Supported extensions table.
- `CHANGELOG.md` — entry under `## Unreleased`.

## Validation

```bash
npm run cicd
```

Pay special attention to:

- `npm run typecheck` — surfaces every missing case from the exhaustive `never` check.
- `npm run test:e2e` — runs the new fixture end-to-end.
- `tsx scripts/validate-build.ts` — confirms the new `ai-guidelines` reflects reality.
