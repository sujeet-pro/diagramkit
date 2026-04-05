# diagramkit — Full Production Review Prompt

You are performing a deep, production-readiness review of **diagramkit** — a standalone CLI-first diagram rendering tool and library. It converts `.mermaid`, `.excalidraw`, `.drawio`, and Graphviz `.dot`/`.gv` files to SVG/PNG/JPEG/WebP/AVIF with automatic light/dark mode support and incremental builds.

The review must be thorough, opinionated, and actionable. Organize findings by severity (critical > high > medium > low) within each section. For every issue, provide a concrete fix or recommendation — never just flag a problem without a path forward.

---

## Repo Context

- **Package**: `diagramkit` (npm, v0.0.2, MIT)
- **Runtime**: Node.js >= 24, ESM-only
- **Build tool**: vite-plus (Rolldown + Vitest + Oxlint + Oxfmt via single `vite.config.ts`)
- **Browser**: Playwright Chromium for Mermaid/Excalidraw/Draw.io; Graphviz is WASM-only (`@viz-js/viz`)
- **Docs site**: `@pagesmith/docs` convention-based static site, content in `docs/`, built to `gh-pages/`
- **LLM context files**: `llms-quick.txt`, `llms.txt`, `llms-full.txt` shipped with every npm install
- **Config**: Zero-config by default, optional `diagramkit.config.json5` or `diagramkit.config.ts`

### Key Files to Review

| Area                 | Files                                                                  |
| -------------------- | ---------------------------------------------------------------------- |
| CLI entry            | `cli/bin.ts` (1138 lines, manual arg parsing, no framework)            |
| Public API           | `src/index.ts` (barrel), `src/types.ts` (all interfaces)               |
| Core rendering       | `src/renderer.ts`, `src/render-engines.ts`, `src/render-all.ts`        |
| Browser pool         | `src/pool.ts` (Playwright lifecycle, ref counting, idle timeout)       |
| Config system        | `src/config.ts` (layered: defaults → global → env → local → overrides) |
| Manifest/incremental | `src/manifest.ts` (SHA-256 hashing, staleness, orphan cleanup)         |
| File discovery       | `src/discovery.ts`, `src/extensions.ts`                                |
| Output pipeline      | `src/output.ts`, `src/convert.ts` (SVG → raster via sharp)             |
| Watch mode           | `src/watch.ts` (chokidar, debounce, safe re-render)                    |
| Runtime isolation    | `src/runtime.ts` (isolated browser pool per runtime)                   |
| Engine metadata      | `src/engine-profiles.ts` (per-type capability declarations)            |
| Logging              | `src/logging.ts` (leveled logger)                                      |
| Color/contrast       | `src/color/` (WCAG contrast optimization for dark SVGs)                |
| Doctor command       | `src/doctor.ts` (environment diagnostics)                              |
| Unit tests           | `src/*.test.ts` (colocated)                                            |
| E2E tests            | `e2e/` (Vitest, real Playwright rendering)                             |
| Docs content         | `docs/` (Pagesmith convention, folder/README.md)                       |
| README               | `README.md`                                                            |
| Contributing         | `CONTRIBUTING.md`                                                      |
| Agent context        | `CLAUDE.md`, `AGENTS.md`, `llms*.txt`                                  |
| Package config       | `package.json`, `vite.config.ts`, `tsconfig.json`                      |
| CI                   | `.github/workflows/ci.yml`, `.github/workflows/docs.yml`               |
| JSON schema          | `schemas/diagramkit-cli-render.v1.json`                                |

---

## Section 1: Documentation Quality

### Philosophy

The docs should be **AI-first for humans** — meaning they are structured and worded so that both AI agents and human developers find them immediately useful. AI-first does NOT mean "written for robots." It means: clear information hierarchy, predictable structure, copy-pasteable examples, no ambiguity, and progressive disclosure (quick start → guides → reference).

### Review Checklist

#### 1.1 Information Architecture

- Is there a clear learning path? (install → first render → customize → advanced → reference)
- Does the docs site have logical top-level sections? (`guide/` for learning, `reference/` for lookup)
- Is the sidebar ordering intuitive? Check `meta.json5` files for `order` values
- Are there orphan pages with no inbound links? Check cross-references between pages
- Is there unnecessary duplication between README.md, llms.txt, and docs pages?

#### 1.2 Getting Started Experience

- Can a new user go from zero to a rendered diagram in under 60 seconds by following the docs?
- Is the "AI Agent" path clearly first/prominent, given the AI-first philosophy?
- Does the getting-started page explain the output convention (`.diagramkit/` folder) early enough?
- Is the `warmup` requirement clearly called out? (Users WILL forget this and be confused)
- Is the `sharp` optional dependency clearly positioned as optional, not required?

#### 1.3 AI Context Files (llms\*.txt)

- **llms-quick.txt**: Is it truly < 2 minutes of reading? Does it cover the 80% use case (render a directory)?
- **llms.txt**: Does it have enough detail for an agent to handle common workflows without hitting llms-full.txt?
- **llms-full.txt**: Is the API reference section accurate and complete? Do all function signatures match the actual code?
- Are there inconsistencies between llms files and the actual CLI/API behavior?
- Does `--agent-help` output match `llms-full.txt` content exactly?
- Are the Pagesmith sections at the bottom of llms.txt / llms-full.txt confusing for diagramkit users? Should they be separated?

#### 1.4 README.md

- Does it serve its purpose as the npm landing page? (First impression matters)
- Is the feature list scannable? (Bullets, not paragraphs)
- Are the code examples copy-pasteable and correct?
- Is the AI Agent section appropriately prominent without being alienating to non-AI users?
- Does the README avoid duplicating content that belongs in the docs site?

#### 1.5 Per-Engine Diagram Guides

- Review each: `docs/guide/diagrams/{mermaid,excalidraw,drawio,graphviz}/README.md`
- Does each guide show the minimum viable example for that engine?
- Are engine-specific quirks documented? (e.g., mermaid's global initialize, excalidraw's JSON format, draw.io XML structure)
- Are there real-world examples beyond "hello world"?

#### 1.6 Reference Pages

- Review: `docs/reference/{cli,api,config,types}/README.md`
- Is every CLI flag documented with its default value?
- Is every public API function documented with parameters and return type?
- Is every config option documented with its type, default, and an example?
- Is every exported TypeScript type documented?
- Do the reference pages match the actual code? (Cross-check `src/types.ts`, `src/index.ts`, `cli/bin.ts`)

#### 1.7 Advanced Guides

- `docs/guide/architecture/README.md` — Does it explain the render pipeline clearly? Are the mermaid diagrams rendered and embedded?
- `docs/guide/ci-cd/README.md` — Are the GitHub Actions / GitLab CI / Docker examples tested and correct?
- `docs/guide/troubleshooting/README.md` — Does it cover the most common failure modes? (missing chromium, sharp not installed, permission errors, stale manifest)
- `docs/guide/api-patterns/README.md` — Does it show patterns that go beyond the basic `renderAll` example?
- `docs/guide/configuration/README.md` — Is the config layering order clearly explained?
- `docs/guide/ai-agents/README.md` — Does it provide actionable agent setup for Claude Code, Cursor, Windsurf, Copilot?
- `docs/guide/design-principles/README.md` — Is this useful for contributors? Does it match CLAUDE.md?

#### 1.8 Writing Quality

- Is the tone consistent? (Should be direct, technical, not marketing-speak)
- Are there grammar or spelling errors?
- Do all code examples use consistent style? (no semicolons, trailing commas per project convention)
- Are `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]` callouts used appropriately?
- Is jargon explained on first use? ("manifest", "incremental", "theme variant", "WCAG contrast")

---

## Section 2: Code Architecture & Data Flow

### 2.1 Render Pipeline

Trace the full data flow for a directory render. Evaluate each step:

```
CLI args → config loading → file discovery → staleness check →
group by engine type → concurrent lane scheduling →
per-file render (SVG-first) → optional raster conversion →
atomic writes → manifest update → orphan cleanup
```

- Is the pipeline composable? Can you replace/extend individual steps?
- Are there hidden coupling points between steps?
- Is error propagation clean through the entire pipeline?
- Does the pipeline handle partial failures correctly? (Some files fail, others succeed)

### 2.2 Browser Pool (`src/pool.ts`)

- Review the ref counting and idle timeout logic. Are there race conditions?
- What happens when two concurrent renders try to initialize the pool simultaneously?
- Is the 5-second idle timeout appropriate? Is it configurable?
- How does cleanup work on process exit? Are there zombie process risks?
- Are the four page types (mermaid-light, mermaid-dark, excalidraw, drawio) managed correctly?

### 2.3 Engine Registry (`src/engine-profiles.ts`, `src/render-engines.ts`)

- Is the pattern extensible? How easy is it to add a fifth engine (e.g., PlantUML)?
- Does `engine-profiles.ts` contain the right metadata? (runtime type, browser requirement, lane ordering)
- Are the render engine functions in `render-engines.ts` well-isolated? Can one engine's failure affect others?

### 2.4 Config System (`src/config.ts`)

- Review the layering: defaults → global → env → local → overrides
- Is the merge strategy correct? (Shallow spread? Deep merge? Per-key?)
- Does the `DIAGRAMKIT_*` env var mapping cover all config keys?
- Is the config file walk-up behavior correct and tested?
- How does `--strict-config` interact with invalid values at each layer?
- Is `defineConfig()` just an identity function? If so, does it add enough value? (Answer: yes, for TS autocomplete)
- Is the legacy `.diagramkitrc.json` migration path clean?

### 2.5 Manifest System (`src/manifest.ts`)

- Review the SHA-256 hashing — is it hashing the right thing (file content, not metadata)?
- Does format accumulation work correctly? (Adding PNG to a file that was previously SVG-only)
- Is the orphan cleanup safe? (What if a user manually created files in `.diagramkit/`?)
- Are manifest reads/writes atomic?
- What happens when the manifest file is corrupted?
- Does the `--force` flag correctly reset format tracking?

### 2.6 Output Pipeline (`src/output.ts`, `src/convert.ts`)

- Are atomic writes implemented correctly? (.tmp → rename)
- Is the file naming convention consistent? (`{prefix}{name}{suffix}-{theme}.{format}`)
- Does `convertSvg` handle edge cases? (empty SVG, SVG with no dimensions, very large SVGs)
- Is `sharp` correctly dynamically imported? What error message does the user get if sharp is missing?

### 2.7 Watch Mode (`src/watch.ts`)

- Is the debounce logic correct? What happens with rapid saves?
- Does it re-discover files on new file creation?
- How does it handle file deletion?
- Does it respect the manifest for incremental rebuilds?
- What happens if a render is in-flight when a new change arrives?

### 2.8 Module Boundaries

- Review `src/index.ts` (public API barrel) and `src/utils.ts` (utility barrel)
- Are the export boundaries clean? Is anything exported that should be internal?
- Is the `diagramkit/utils`, `diagramkit/color`, `diagramkit/convert` subpath export design right?
- Are there circular dependencies?

### 2.9 Error Handling

- Review `DiagramkitError` and `DiagramkitErrorCode` in `src/types.ts`
- Are error codes exhaustive? Are there thrown errors that don't use `DiagramkitError`?
- Do errors include enough context for debugging? (file path, expected format, what was tried)
- Is the Levenshtein-based flag suggestion in the CLI helpful or noisy?
- What is the exit code behavior? Does the CLI exit 1 on any failure? On partial failures?

### 2.10 Concurrency

- The `runWithConcurrency` helper in `render-all.ts` — is it correct for the work-stealing pattern?
- Is `maxConcurrentLanes` (1-4) the right granularity? Should it be per-file concurrency within a lane?
- Are there any shared mutable state issues between concurrent lanes?
- How does Graphviz (WASM, non-browser) interact with the lane system?

---

## Section 3: CLI Developer Experience

### Philosophy

The CLI should be **zero-config, zero-surprise, zero-friction**. A developer should be able to run `npx diagramkit render .` and get useful output without reading any docs. The init command should be interactive and guide the user through customization only when they want it.

### 3.1 First-Run Experience

Walk through this exact sequence as a new user:

```bash
npm install diagramkit
npx diagramkit render .
# What happens? Is it clear why nothing rendered? (no warmup)
npx diagramkit warmup
npx diagramkit render .
# Now what? Is the output clear?
```

- What error does the user get if they skip `warmup` and try to render a mermaid file?
- Is the error message actionable? Does it tell them to run `warmup`?
- If there are no diagram files, is the "No diagram files found" message helpful?
- Does the CLI suggest checking file extensions if no files are found?

### 3.2 Help & Usage

- Run `diagramkit --help` — is the output scannable? Is it too long?
- Are the examples in `--help` the right ones for new users?
- Is `diagramkit --version` working correctly?
- Does `diagramkit --agent-help` output clean content (no ANSI codes, no interactive prompts)?

### 3.3 Interactive Init (`diagramkit init`)

- Walk through the full interactive init flow. Is every question clear?
- Does the project scan correctly detect diagram types?
- Are the multiselect, select, and text prompts using `@clack/prompts` properly?
- Is the config preview shown before writing? Can the user abort?
- Does `--yes` skip all prompts and write sensible defaults?
- Does `--ts` correctly generate a TypeScript config with `defineConfig()`?
- What happens if a config file already exists? (Should warn, not overwrite)
- Is there a `--force` flag for init to overwrite existing configs?
- Does init detect and warn about legacy `.diagramkitrc.json`?

### 3.4 Render Command UX

- Is the default behavior (SVG, both themes, `.diagramkit/` output) the right zero-config default?
- Is the progress output useful? Does it show file names, counts, timing?
- Is the dry-run output (`--dry-run`) informative enough to verify what would happen?
- Does `--plan` show stale reasons clearly?
- Is `--json` output stable and documented? Does it match the schema in `schemas/`?
- What does `--quiet` actually suppress? Is the boundary clear?
- Does the path alias (`diagramkit docs/arch.mermaid` without `render`) work correctly?
- How does the CLI handle invalid file paths? Non-existent directories? Permission errors?
- What happens with very large directories (1000+ diagram files)?

### 3.5 Flag Handling

- The CLI uses manual arg parsing (no commander/yargs). Is this the right call?
- Does `warnUnknownFlags()` catch typos? How good are the Levenshtein suggestions?
- Are short flags (`-h`, `-v`, `-y`) discoverable?
- Is `--no-contrast` / `--no-manifest` handling correct for boolean negation flags?
- Can flags appear in any order? Before or after the target path?

### 3.6 Error Messages

- For every error path in `cli/bin.ts`, evaluate: Is the error message clear? Does it suggest a fix?
- Does the CLI distinguish between user errors (bad flag value) and runtime errors (browser crash)?
- Are exit codes meaningful? (0 = success, 1 = some failures, 2 = usage error?)

### 3.7 Config-Free Workflow

- Verify the zero-config promise: Does `diagramkit render .` work with NO config file?
- Are the defaults sane? (SVG, both themes, `.diagramkit/` folder, manifest ON)
- Is the config file truly optional, or do some features silently require it?
- When a user runs `diagramkit init`, is it clear that the config is optional?

### 3.8 Doctor Command

- Run `diagramkit doctor` — does it check all critical dependencies?
- Does it report Playwright browser status?
- Does it report sharp availability?
- Does it report Node.js version compatibility?
- Is the output actionable for each failed check?
- Does `--json` work for doctor output?

---

## Section 4: Readability & Maintainability

### 4.1 Code Organization

- Is the file structure in `src/` intuitive? Can a new contributor find things quickly?
- Is the `src/renderers/` subdirectory pattern (browser IIFE entry points) well-documented?
- Is there dead code? Unused exports? Unused imports?
- Are file names descriptive? (`render-engines.ts` vs `engine-profiles.ts` — is the distinction clear?)

### 4.2 Code Style

- Is the section header convention (`/* ── Name ── */`) used consistently?
- Are functions sized appropriately? Is `cli/bin.ts` at 1138 lines too long?
- Are types used effectively? Any `any` or `unknown` that should be typed?
- Is the async/await usage clean? Any unnecessary async functions?
- Are early returns used to reduce nesting?
- Is the dynamic import pattern (`await import(...)`) used consistently for optional deps?

### 4.3 Testing

- Is test coverage adequate for a production tool?
- Are edge cases tested? (empty inputs, malformed files, corrupted manifest, concurrent writes)
- Do unit tests avoid testing implementation details?
- Are e2e tests comprehensive for all four diagram types?
- Is the test fixture structure in `e2e/fixtures/` well-organized?
- Are there flaky tests? (Timing-dependent, order-dependent, environment-dependent)
- Is the `npm run validate` script a reliable pre-commit/pre-merge check?

### 4.4 TypeScript Quality

- Are the types in `src/types.ts` well-designed? Any missing types?
- Is the `LogLevel` union type with aliases (`errors`/`warning`/`warnings`/`log`) a good idea?
- Are `RenderableFile._hash` and `._effectiveFormats` prefixed with `_` to indicate internal use — is there a better pattern?
- Is the `import('./pool').BrowserPool` inline import type pattern clean?

### 4.5 Dependencies

- Are all runtime dependencies justified? Is the dependency tree lean?
- Is `react` + `react-dom` as a full runtime dependency acceptable? (Used only for excalidraw IIFE bundling)
- Is `rolldown` as a runtime dependency the right call? (Used for IIFE bundling at render time)
- Are peer dependencies correctly configured? (`sharp` as optional peer)
- Are the `overrides` in `package.json` clearly documented?

### 4.6 Build & Distribution

- Does the `files` array in `package.json` include exactly the right files?
- Are source maps excluded from the published package? (`"!dist/**/*.map"`)
- Is the `bin` entry point correct? Does it work when installed globally?
- Do all four subpath exports resolve correctly? (`diagramkit`, `diagramkit/utils`, `diagramkit/color`, `diagramkit/convert`)

---

## Section 5: Production Readiness

### 5.1 Robustness

- What happens when the Chromium browser crashes mid-render?
- What happens when a diagram file has syntax errors?
- What happens on disk full / permission denied during atomic writes?
- What happens when the process receives SIGINT/SIGTERM during a batch render?
- Is the IIFE bundling (rolldown) deterministic and cached?
- Are there memory leak risks with the browser pool?

### 5.2 Performance

- How does rendering scale with 100, 500, 1000 diagram files?
- Is the lane-based concurrency model efficient? Or would file-level concurrency be better?
- Is the SHA-256 hashing fast enough for large files?
- Is the manifest read/write a bottleneck for large repos?
- Does watch mode have excessive file system polling?

### 5.3 Security

- Is the IIFE injection into Playwright pages sandboxed? Can user-crafted diagram content escape?
- Are there path traversal risks in file discovery or output naming?
- Is the `readFileSync(filePath, 'utf-8')` pattern safe for all diagram types?
- Are there risks from untrusted diagram files? (XSS in SVG output, script injection)
- Is `createRequire` used safely?

### 5.4 CI/CD Readiness

- Does the CI workflow test on multiple Node.js versions?
- Is the Playwright browser install cached in CI?
- Is the `--json` output stable enough for CI scripting?
- Does the JSON schema (`schemas/diagramkit-cli-render.v1.json`) cover all possible outputs?
- Is the exit code behavior documented and reliable?

### 5.5 Package Publishing

- Is the package version `0.0.2` appropriate? What's the versioning strategy?
- Is the `CHANGELOG.md` maintained?
- Are the npm scripts for publishing defined?
- Does the `engines` field correctly specify `>= 24`?
- Are the `keywords` in `package.json` good for discoverability?

### 5.6 Backward Compatibility

- Is the `.diagramkitrc.json` → `diagramkit.config.json5` migration handled?
- Is the manifest format versioned? Can old manifests be read by new versions?
- Is the `--json` schema versioned (`schemaVersion: 1`)?
- Are there any breaking changes waiting in the unstaged changes?

---

## Section 6: Ecosystem & DX Fit

### 6.1 Comparison

- How does diagramkit compare to alternatives? (mermaid-cli, excalidraw-cli, kroki)
- What is the unique value proposition? (unified CLI for 4 engines, incremental, light/dark)
- Are there features competitors have that diagramkit should consider?

### 6.2 Integration Points

- Is the JS API designed for integration with build tools? (Vite plugins, webpack loaders, etc.)
- Is the `createRendererRuntime()` API useful for isolated environments? (SSR, testing)
- Can diagramkit be used as a library without the CLI?
- Is the `diagramkit/utils` subpath useful for custom pipeline builders?

### 6.3 Node.js 24 Requirement

- Is `>= 24` too aggressive? What's the user impact?
- Are there Node.js 24-specific features used that prevent supporting older versions?
- Would supporting Node.js 20 (LTS) or 22 expand the user base significantly?

---

## Deliverables

After reviewing all sections, produce:

1. **Executive Summary** (5-10 sentences) — overall assessment and top 3 priorities
2. **Findings Table** — every finding with severity, section, description, and recommendation
3. **Architecture Diagram** — current data flow (confirm or correct the pipeline described above)
4. **Recommended Action Plan** — ordered list of changes, grouped into "before v1.0", "before v2.0", and "nice to have"
5. **CLI UX Scorecard** — rate each CLI command/flag on a 1-5 scale for discoverability, error handling, and output quality
6. **Docs Gap Analysis** — list of missing, incomplete, or inaccurate documentation with specific fix recommendations
