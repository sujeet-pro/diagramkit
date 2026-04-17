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
| Project skills                                              | `skills/diagramkit-{setup,auto,mermaid,excalidraw,draw-io,graphviz,review}/` | Bundled agent skills. Installed into your repo as **thin pointer SKILL.md files** at `.agents/skills/diagramkit-*` by `diagramkit-setup` (or via `npx skills add sujeet-pro/diagramkit` as an alternative). The `review` skill covers SVG validation **+ WCAG 2.2 AA contrast**. |
| Compiled CLI binary                                         | `dist/cli/bin.mjs`                                                    | Direct invocation when shell shims are unavailable: `node ./node_modules/diagramkit/dist/cli/bin.mjs <command>`.        |
| Library entry                                               | `dist/index.mjs` (+ `.d.mts`)                                         | `import { renderAll } from 'diagramkit'`.                                                                               |
| Subpath exports                                             | `dist/{utils,convert,validate}.mjs`, `dist/color/index.mjs`           | `diagramkit/utils`, `diagramkit/convert`, `diagramkit/validate`, `diagramkit/color`.                                    |

`package.json` `exports` resolves the schemas, llms files, and ai-guidelines so consumers can import them with the package-relative paths above (`diagramkit/schemas/...`, `diagramkit/llms`, `diagramkit/llms-full`, `diagramkit/agents/usage`, `diagramkit/agents/diagram-authoring`).

## Why these are bundled

- **Pinned to the installed version.** Reading `node_modules/diagramkit/REFERENCE.md` (instead of a globally installed `diagramkit` or a fetched URL) guarantees the agent sees the exact CLI/API surface for the version your repo uses.
- **No network roundtrip.** Agents and CI runners can ingest the LLM context files, JSON schemas, **and skill SKILL.md files** from disk — no GitHub raw URL, no rate limit, no version skew.
- **Local pointer skills track the installed package.** `diagramkit-setup` writes thin SKILL.md pointers at `.agents/skills/diagramkit-<name>/` (and harness mirrors under `.claude/skills/`, `.cursor/skills/`, `.codex/skills/`) that defer to `node_modules/diagramkit/skills/<name>/SKILL.md`. Each `npm install diagramkit` upgrade automatically refreshes the linked content. The standalone [`skills`](https://github.com/vercel-labs/skills) CLI is supported as an alternative when you specifically want skills that update independently of the installed `diagramkit`.

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
Read node_modules/diagramkit/REFERENCE.md, then follow
node_modules/diagramkit/skills/diagramkit-setup/SKILL.md end to end. It
will:
  - install diagramkit (`npm add diagramkit`) if it isn't installed yet,
  - run `npx diagramkit warmup` unless the repo is Graphviz-only,
  - wire `"render:diagrams": "diagramkit render ."` into package.json,
  - optionally create diagramkit.config.json5 (`npx diagramkit init --yes`)
    with the JSON Schema at
    ./node_modules/diagramkit/schemas/diagramkit-config.v1.json wired up,
  - render every diagram once,
  - and write thin pointer SKILL.md files at
      .agents/skills/diagramkit-<name>/SKILL.md   (always)
      .claude/skills/diagramkit-<name>/SKILL.md   (if Claude Code in use)
      .cursor/skills/diagramkit-<name>/SKILL.md   (if Cursor in use)
      .codex/skills/diagramkit-<name>/SKILL.md    (if Codex in use)
    that defer to node_modules/diagramkit/skills/diagramkit-<name>/SKILL.md.
    Skills installed: setup, auto, mermaid, excalidraw, draw-io, graphviz,
    review (validation + WCAG 2.2 AA contrast).
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
for the engine palettes and embedding rules. Follow
.agents/skills/diagramkit-auto/SKILL.md (or its harness mirror) to pick
the engine, then the matching engine skill (mermaid / excalidraw /
draw-io / graphviz). Save the source file under diagrams/ and render with:
  npx diagramkit render diagrams/<file> --format svg,png,webp --scale 2
Embed it using the <picture> pattern.
```

### 4. Validate every diagram (structure, embed-safety, WCAG 2.2 AA contrast)

```text
Read node_modules/diagramkit/REFERENCE.md, then follow
.agents/skills/diagramkit-review/SKILL.md (or
node_modules/diagramkit/skills/diagramkit-review/SKILL.md directly). It
force-renders every diagram, runs `diagramkit validate . --recursive
--json`, classifies issues into errors vs warnings, and delegates
per-engine fixes (palette swaps for LOW_CONTRAST_TEXT, htmlLabels:false
for foreignObject, etc.) back to each engine skill's "Review Mode".
```

### 5. Refresh skills after upgrading diagramkit

```text
After `npm update diagramkit`, re-read node_modules/diagramkit/REFERENCE.md
for any CLI/API changes. The .agents/skills/diagramkit-* thin pointers
don't need rewriting — they always defer to
node_modules/diagramkit/skills/<name>/SKILL.md, which the npm install just
refreshed. If new skills were added, re-run
node_modules/diagramkit/skills/diagramkit-setup/SKILL.md to write the
missing pointers. If the repo uses `npx skills` instead of local pointers,
run `npx skills update sujeet-pro/diagramkit`. Confirm with
`npx diagramkit --version`.
```

### 6. Stream the full reference into the agent's context

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
