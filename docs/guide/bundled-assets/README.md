---
title: Bundled Assets
description: Every file the diagramkit npm package ships beyond the JS bundles — schemas, llms.txt, ai-guidelines, and skills — with copy-paste prompts agents can use to find them.
---

# Bundled Assets

The diagramkit npm package ships more than just JavaScript. Every release also publishes a JSON Schema for the config and CLI envelope, two LLM context files, agent setup guides, and a directory of installable agent skills. Agents and CI tools can resolve every one of them from `node_modules/diagramkit/` so they always match the installed version.

## Asset map

| Asset                                                       | Path inside `node_modules/diagramkit/`                                | Use when                                                                                                                |
| ----------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Reference landing page                                      | `REFERENCE.md`                                                        | Read first. Single landing page for humans and agents.                                                                  |
| Compact LLM reference                                       | `llms.txt`                                                            | Day-to-day agent context. Same as `diagramkit --help` distilled for an LLM.                                             |
| Full LLM reference                                          | `llms-full.txt`                                                       | Deep work. Same as `diagramkit --agent-help` (CLI + API + types + architecture).                                        |
| Agent setup guide                                           | `ai-guidelines/usage.md`                                              | Primary onboarding for AI agents — install, warmup, config, package scripts, render.                                    |
| Diagram authoring guide                                     | `ai-guidelines/diagram-authoring.md`                                  | Per-engine authoring (palettes, theming, embedding patterns).                                                           |
| Config JSON Schema                                          | `schemas/diagramkit-config.v1.json`                                   | Editor autocomplete and CI validation for `diagramkit.config.{json5,json}`.                                             |
| CLI render JSON Schema                                      | `schemas/diagramkit-cli-render.v1.json`                               | CI parser for `diagramkit render --json` (`schemaVersion: 1` envelope).                                                 |
| Project skills                                              | `skills/diagramkit-{setup,auto,mermaid,excalidraw,draw-io,graphviz}/` | Source for the agent skills installed via `npx skills add sujeet-pro/diagramkit`.                                       |
| Compiled CLI binary                                         | `dist/cli/bin.mjs`                                                    | Direct invocation when shell shims are unavailable: `node ./node_modules/diagramkit/dist/cli/bin.mjs <command>`.        |
| Library entry                                               | `dist/index.mjs` (+ `.d.mts`)                                         | `import { renderAll } from 'diagramkit'`.                                                                               |
| Subpath exports                                             | `dist/{utils,convert,validate}.mjs`, `dist/color/index.mjs`           | `diagramkit/utils`, `diagramkit/convert`, `diagramkit/validate`, `diagramkit/color`.                                    |

`package.json` `exports` resolves the schemas, llms files, and ai-guidelines so consumers can import them with the package-relative paths above (`diagramkit/schemas/...`, `diagramkit/llms`, `diagramkit/llms-full`, `diagramkit/agents/usage`, `diagramkit/agents/diagram-authoring`).

## Why these are bundled

- **Pinned to the installed version.** Reading `node_modules/diagramkit/REFERENCE.md` (instead of a globally installed `diagramkit` or a fetched URL) guarantees the agent sees the exact CLI/API surface for the version your repo uses.
- **No network roundtrip.** Agents and CI runners can ingest the LLM context files and JSON schemas from disk — no GitHub raw URL, no rate limit, no version skew.
- **`npx skills` symlinks `node_modules/diagramkit/skills/` into your agent skill directory.** Skills are always rebuilt against the live npm install, even when `npx skills update` runs without bumping the diagramkit version.

## Wire up the JSON Schemas in your editor

`diagramkit init --yes` already writes the `$schema` reference for you. If you create the config by hand, prepend the schema reference so VSCode / JetBrains pick it up:

```json5
{
  // diagramkit.config.json5
  $schema: './node_modules/diagramkit/schemas/diagramkit-config.v1.json',
  outputDir: '.diagramkit',
  defaultFormats: ['svg'],
  defaultTheme: 'both',
}
```

For the CLI render envelope, parse the JSON output against the second schema in CI:

```ts
import schema from 'diagramkit/schemas/diagramkit-cli-render.v1.json' with { type: 'json' }
import { Ajv } from 'ajv'

const validate = new Ajv().compile(schema)
const stdout = JSON.parse(/* `diagramkit render . --json` stdout */)
if (!validate(stdout)) throw new Error('CLI envelope schema violation')
```

## Copy-paste agent prompts that reference the bundled assets

These prompts work in any AI coding agent (Claude Code, Cursor, Codex, Continue, OpenCode, Windsurf, GitHub Copilot, ...). Each one tells the agent to read a specific bundled file before acting, so the answer matches the locally installed version.

### 1. Bootstrap diagramkit using the bundled docs

```text
Read node_modules/diagramkit/REFERENCE.md, then
node_modules/diagramkit/ai-guidelines/usage.md, then set up diagramkit in this
repo:

1. npm add diagramkit
2. npx diagramkit warmup       # skip if Graphviz-only
3. Add "render:diagrams": "diagramkit render ." to package.json
4. If non-default behavior is needed, run npx diagramkit init --yes
   (the generated config wires up
   ./node_modules/diagramkit/schemas/diagramkit-config.v1.json for editor
   autocomplete).
5. Install diagramkit's agent skills with the standalone skills CLI so any
   agent gets diagramkit-* skills:
     npx skills add sujeet-pro/diagramkit
6. Render every diagram once: npx diagramkit render .
```

### 2. Wire CI parsing to the published CLI envelope schema

```text
Read node_modules/diagramkit/schemas/diagramkit-cli-render.v1.json. Update
the CI script that runs `diagramkit render . --json` to validate stdout
against this schema (Ajv or zod). Fail the build if the parsed envelope does
not have schemaVersion 1 or if result.failed is non-empty. Print
result.failedDetails in a readable format on failure.
```

### 3. Author a diagram using the bundled engine guide

```text
Read node_modules/diagramkit/REFERENCE.md to anchor on the locally installed
version, then node_modules/diagramkit/ai-guidelines/diagram-authoring.md
for the engine palettes and embedding rules. Use the diagramkit-auto skill
to pick the engine, then the matching engine skill (mermaid / excalidraw /
draw-io / graphviz). Save the source file under diagrams/ and render with:
  npx diagramkit render diagrams/<file> --format svg,png,webp --scale 2
Embed it using the <picture> pattern.
```

### 4. Refresh the bundled agent skills without bumping diagramkit

```text
Refresh the diagramkit-* skills installed in this repo:
  npx skills update sujeet-pro/diagramkit
This re-syncs node_modules/diagramkit/skills/diagramkit-*/SKILL.md into
.claude/skills/, .cursor/skills/, .codex/skills/, .continue/skills/, or
.agents/skills/ depending on which agent the project uses. Then re-read
.claude/skills/diagramkit-setup/SKILL.md (or the equivalent path under the
other agent directories) and confirm the local CLI is current with
npx diagramkit --version.
```

### 5. Stream the full reference into the agent's context

```text
Run `npx diagramkit --agent-help` and read the entire output. This is the
same content as node_modules/diagramkit/llms-full.txt — full CLI + API +
types + architecture for the installed version. Use it to answer all
diagramkit questions in this session without guessing.
```

## Validation

`scripts/validate-pagesmith.ts` (run by `npm run validate:pagesmith` and `npm run cicd`) enforces two diagramkit-specific docs rules in addition to the usual pagesmith checks:

1. **Diagram source check** — every `<picture>` / `<img>` / `![]()` reference under `docs/**` that points at a `.diagramkit/` asset must have the asset on disk so `diagramkit render docs/` keeps it in sync.
2. **Markdown link rule** — every internal link in `docs/**` must use the explicit `./path/README.md` (or `./file.md` / `./file.mdx`) form. Pagesmith rewrites these to clean URLs (`<basePath>/path` or `<basePath>/path/`) at build time, but the source file always points at a real markdown source on disk.

The same script also delegates to `@pagesmith/docs`'s built-in validators (frontmatter schema, link resolution, image existence, theme-pair completeness) and the build-output checks against `gh-pages/`.
