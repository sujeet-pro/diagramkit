---
name: review-repo
description: Full repository review using parallel agent teams — covers code quality, tests, architecture, performance, security, docs, CLAUDE.md alignment, and skills — with actionable fix plan
user_invocable: true
arguments:
  - name: scope
    description: 'Review scope: full, code, tests, docs, skills, claude-md, security, performance (default: full)'
    required: false
  - name: fix
    description: 'Auto-fix after review: true, false (default: false — asks for confirmation)'
    required: false
---

# Repository Review

Perform an exhaustive review of the diagramkit repository to ensure production readiness, open-source best practices, and alignment across code, tests, docs, skills, and CLAUDE.md instructions.

This review uses an **agentic team architecture** — multiple specialized agents run in parallel to maximize review throughput and depth.

## Review Scope

When `scope=full` (default), run ALL sections below using the full agent team. When a specific scope is given, run only the relevant agent(s) plus the synthesis/plan/fix steps.

## Review Workflow

### Step 1: Gather Context (Orchestrator)

Before launching the review team, the orchestrator gathers the current project state by running validation commands:

```bash
# Build and validate — run these sequentially, record pass/fail for each
npm run check
npm run typecheck
npm run build
npm run build:docs
npm run test:unit
npm run test:e2e
```

Record which commands pass and which fail. Failures become critical findings passed to all agents as context.

Also run:

```bash
npm audit --audit-level=moderate
npm pack --dry-run
```

Capture this output as shared context for the agent team.

### Step 2: Launch Agent Team (Parallel)

Launch **5 specialized review agents in parallel** using the Agent tool. Each agent receives the shared context from Step 1 and focuses on its assigned review sections. All agents run concurrently for maximum speed.

**IMPORTANT**: Use a single message with multiple Agent tool calls to launch all 5 agents simultaneously. Each agent should use `subagent_type: "code-reviewer"` for code-focused reviews or `subagent_type: "general-purpose"` for broader reviews. Name each agent for addressability.

#### Agent 1: `code-quality-agent` (Sections 1 + 3 + 4)

**Scope**: Code quality, architecture, and performance.

**Prompt template**:

```
You are reviewing the diagramkit repository for code quality, architecture, and performance.

Shared context (validation results):
{paste Step 1 output}

Review the following and report ALL findings in structured format.

SECTION 1 — CODE QUALITY: Review all files in src/ and cli/. Check ESM/TS conventions, error handling patterns, code patterns (acquire/release, atomic writes, dynamic imports), Node 24 compatibility, and CLI implementation.

SECTION 3 — ARCHITECTURE: Review module boundaries (src/index.ts exports), browser pool design (pool.ts — reference counting, idle timeout, page management), data flow through the rendering pipeline, configuration layering (config.ts), and extension map design (extensions.ts).

SECTION 4 — PERFORMANCE: Review browser pool efficiency (page reuse, bundle caching), incremental build manifest system, rendering pipeline (SVG-first, sharp conversion), bundle size, and memory management in watch mode.

For EVERY issue found, output in this exact format:
- **[SEVERITY]** (critical/major/minor/info) **[CATEGORY]** (Code Quality/Architecture/Performance)
- **File**: path:line_number
- **Issue**: description
- **Fix**: how to fix it

Read the actual source files. Do not guess — verify claims against code.
```

#### Agent 2: `security-testing-agent` (Sections 2 + 5)

**Scope**: Testing coverage and security.

**Prompt template**:

```
You are reviewing the diagramkit repository for test coverage and security.

Shared context (validation results):
{paste Step 1 output}

SECTION 2 — TESTING: Review all test files in src/**/*.test.ts and e2e/. For each source module, check if its test file exists and covers: happy paths, error paths, edge cases. Verify E2E tests cover all diagram types (mermaid, excalidraw, drawio), all formats (svg, png, jpeg, webp), incremental builds, CLI flags, watch mode, orphan cleanup, config overrides. Check test quality: deterministic, isolated, specific assertions, no test-only exports.

SECTION 5 — SECURITY: Review input validation (diagram source, file paths, CLI args, XML/JSON parsing), browser sandbox (Playwright isolation, no FS/network access from browser), file system safety (atomic writes, no symlink following, no path traversal), dependency vulnerabilities (npm audit results from shared context), and supply chain (published files, no secrets, no postinstall scripts).

For EVERY issue found, output in this exact format:
- **[SEVERITY]** (critical/major/minor/info) **[CATEGORY]** (Testing/Security)
- **File**: path:line_number
- **Issue**: description
- **Fix**: how to fix it

Read the actual test files and source code. Check what IS tested, and flag what is NOT tested.
```

#### Agent 3: `claude-md-skills-agent` (Sections 6 + 7)

**Scope**: CLAUDE.md alignment and skills review.

**Prompt template**:

```
You are reviewing the diagramkit repository's CLAUDE.md and skills for accuracy and alignment with the actual codebase.

Shared context (validation results):
{paste Step 1 output}

SECTION 6 — CLAUDE.md ALIGNMENT: Read CLAUDE.md and verify EVERY claim against the actual code:
- Architecture claims (pool.ts, renderer.ts) — verify browser pool, page count, manifest system
- Design philosophy — verify each principle is followed in code
- Directory structure — for EVERY listed file, verify it EXISTS. For every file that EXISTS but is NOT listed, flag it. Remove orphan entries.
- Commands and APIs — verify every CLI command works, every API function is exported from src/index.ts, every type matches types.ts
- Dependencies — verify against package.json
- Coding conventions — spot-check source files
- Testing strategy — verify test file locations and patterns

SECTION 7 — SKILLS REVIEW: Read every skill in agent_skills/. For each:
- Verify CLI commands shown actually work
- Verify API examples use correct function signatures
- Verify config examples match current schema
- Check consistency across skills (terminology, output dir naming, code style)
- Verify skill cross-references (/diagrams -> /diagram-mermaid, etc.)
- Review reference files in agent_skills/refs/ for accuracy

For EVERY issue found, output in this exact format:
- **[SEVERITY]** (critical/major/minor/info) **[CATEGORY]** (CLAUDE.md/Skills)
- **File**: path:line_number
- **Issue**: description
- **Fix**: how to fix it

This agent must read CLAUDE.md, all skill files, and cross-reference against actual source code. Do NOT guess — verify.
```

#### Agent 4: `docs-agent` (Section 8)

**Scope**: Documentation completeness and accuracy.

**Prompt template**:

```
You are reviewing the diagramkit documentation site (docs/) for completeness, accuracy, and quality.

Shared context (validation results):
{paste Step 1 output}

SECTION 8 — DOCUMENTATION: Review every file in docs/ against the actual codebase:

Guide pages (docs/guide/):
- getting-started.md — installation steps, prerequisites, first render, output convention, dark mode embedding
- cli.md — all commands, all flags with defaults, examples, exit codes, discovery rules
- js-api.md — all public functions with examples, parameters, return types, browser lifecycle
- configuration.md — all config options, merge order, config file locations, extensionMap
- watch-mode.md — CLI and API usage, watched patterns, ignored dirs, dev server integration
- image-formats.md — all four formats, scale/quality options, conversion pipeline, format selection guide

Diagram pages (docs/diagrams/):
- mermaid.md, excalidraw.md, drawio.md — extensions, examples, dark mode, architecture, tips

Reference pages (docs/reference/):
- api.md — every exported function with full signature
- types.md — all public types matching actual TypeScript definitions
- config.md — schema matching DiagramkitConfig, manifest format
- cli.md — command table, all render options, output naming, discovery rules

VitePress config (docs/.vitepress/config.ts) — nav links, sidebar, no broken links

MISSING DOCUMENTATION — flag if any of these are missing or incomplete:
- INSTALL_SKILLS.md — skills installation guide (CLAUDE.md method, CLI method, available skills, verification)
- Optional deps installation guidance (sharp)
- Warmup script guidance (CI, Docker, dev environments)
- Common use case guides (docs sites, GitHub README dark mode, CI/CD, build scripts, watch+dev server, monorepos, email/Confluence)
- llms.txt and llms-full.txt alignment with current API

For EVERY issue found, output in this exact format:
- **[SEVERITY]** (critical/major/minor/info) **[CATEGORY]** (Documentation)
- **File**: path:line_number (or "MISSING: filename" for missing docs)
- **Issue**: description
- **Fix**: how to fix it

Read the actual doc files and cross-reference against source code. Check that all code examples are correct.
```

#### Agent 5: `opensource-agent` (Section 9)

**Scope**: Open source best practices and packaging.

**Prompt template**:

```
You are reviewing the diagramkit repository for open-source best practices and npm packaging quality.

Shared context (validation results, npm pack --dry-run output):
{paste Step 1 output}

SECTION 9 — OPEN SOURCE BEST PRACTICES:

Repository files — verify existence and quality of: README.md, LICENSE, CONTRIBUTING.md, CHANGELOG.md, CLAUDE.md, GUIDELINES.md, .github/ (issue templates, PR templates, CI workflows), .gitignore, .editorconfig, .node-version

Package.json completeness — check for: name, version, description, keywords, repository, bugs, homepage, license, author, engines.node matching .node-version, files array, exports map, bin

GitHub templates — check .github/ for: issue templates (bug, feature), PR template, CI workflows (lint, test, build, e2e), Dependabot/Renovate config

npm publishing — from npm pack --dry-run output: verify only intended files are published, no test files/fixtures/configs, types included (*.d.mts), skills directory included

README quality — clear introduction, badges, feature list, install instructions, quick start, API overview, dark mode embedding, configuration overview, supported extensions, docs link, requirements, development setup, license

CONTRIBUTING.md — dev setup, test running, full validation, code style, architecture pointer, PR process

For EVERY issue found, output in this exact format:
- **[SEVERITY]** (critical/major/minor/info) **[CATEGORY]** (Open Source)
- **File**: path or "MISSING: filename"
- **Issue**: description
- **Fix**: how to fix it

Read the actual files. Verify links. Check that instructions actually work.
```

### Step 3: Collect and Synthesize Agent Results (Orchestrator)

After all 5 agents complete, the orchestrator:

1. **Collects** all findings from every agent
2. **Deduplicates** findings that overlap between agents (e.g., both code-quality and architecture agents may flag the same issue)
3. **Prioritizes** by severity: critical > major > minor > info
4. **Groups** by fix phase (what can be fixed together)

### Step 4: Generate Report and Plan

Write two files using the synthesized findings from all agents:

---

## Review Section Details

The following sections define what each agent reviews. They are the checklists agents use during their analysis.

---

## Section 1: Code Quality

Review all source files in `src/` and `cli/` for:

### 1.1 ESM and TypeScript Conventions

- ESM-only (`import`/`export`, never `require`/`module.exports`)
- TypeScript strict mode compliance
- No `any` types unless absolutely necessary (and commented why)
- Trailing commas, no semicolons (per GUIDELINES.md)
- Section headers use `/* -- Name -- */` pattern
- Comments explain reasoning, not what code does

### 1.2 Error Handling

- Renderer batch: per-file catch, log warning, increment fail counter, continue
- Browser pool: `dispose()` on process exit signals (SIGINT, SIGTERM, exit)
- Missing optional dependencies (sharp): warn once, skip gracefully
- No swallowed errors (empty catch blocks)
- No unhandled promise rejections
- Proper error messages (actionable, include context)

### 1.3 Code Patterns

- `acquire()` always paired with `release()` in `try/finally` for browser pool
- Atomic writes: `.tmp` + `renameSync` pattern used consistently
- Dynamic imports for optional deps (`sharp`)
- No dead code, unused imports, or unused variables
- No circular dependencies between modules
- Functions exported only if needed by other modules or public API (never export solely for testing)

### 1.4 Node 24 Compatibility

- Uses modern Node APIs where appropriate (e.g., `node:fs`, `node:path`, `node:crypto` prefixes)
- No deprecated Node APIs
- Compatible with npm 11.x
- `engines.node` in package.json matches `.node-version`

### 1.5 CLI Implementation

- Manual arg parsing (no framework) is consistent and correct
- `getFlag()` for booleans, `getFlagValue()` for strings
- Error messages go to `console.error`, normal output to `console.log`
- Unknown commands produce helpful error messages
- `--help` and `--version` flags work correctly
- Exit codes: `0` for success, `1` for error

---

## Section 2: Testing Coverage

Review all test files in `src/**/*.test.ts` and `e2e/` for:

### 2.1 Unit Test Coverage

For each module in `src/`, verify corresponding test file exists and covers:

| Module               | Expected Test Coverage                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `extensions.ts`      | All built-in extensions, custom extension map, longest-match resolution, unknown extensions                                                      |
| `config.ts`          | Default config, global config loading, local config loading, merge order, missing files, walk-up behavior                                        |
| `manifest.ts`        | Hash computation, staleness detection, manifest read/write, orphan cleanup, migration from old manifest name, missing manifest, corrupt manifest |
| `output.ts`          | Output naming with all themes, atomic write (success + failure), extension stripping for all diagram types                                       |
| `discovery.ts`       | File discovery in nested dirs, filtering by type, skipping hidden dirs, skipping node_modules, empty directories                                 |
| `color/convert.ts`   | hex-to-rgb, rgb-to-hsl, hsl-to-hex, edge cases (black, white, grays, invalid input)                                                              |
| `color/luminance.ts` | WCAG relative luminance for known colors, boundary values                                                                                        |
| `color/contrast.ts`  | `postProcessDarkSvg` with inline styles, fill attributes, high and low luminance fills, SVGs with no fills, hue preservation                     |
| `convert.ts`         | SVG-to-PNG, SVG-to-JPEG, SVG-to-WebP, missing sharp handling, density/quality options                                                            |

### 2.2 E2E Test Coverage

Verify `e2e/` tests cover:

| Scenario             | Expected Coverage                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Mermaid rendering    | Light SVG, dark SVG, PNG, JPEG, WebP, all themes                                                                       |
| Excalidraw rendering | Light SVG, dark SVG, raster formats                                                                                    |
| Draw.io rendering    | Light SVG, dark SVG, raster formats                                                                                    |
| Incremental builds   | First render, no-change skip, content change re-render, manifest correctness                                           |
| Force re-render      | `--force` flag bypasses manifest                                                                                       |
| CLI flags            | `--format`, `--theme`, `--type`, `--output`, `--dry-run`, `--quiet`, `--json`, `--no-contrast`, `--scale`, `--quality` |
| Output directory     | Default `.diagrams/`, custom `--output`, `--same-folder`, `--output-dir`                                               |
| Type filtering       | `--type mermaid`, `--type excalidraw`, `--type drawio`                                                                 |
| Error handling       | Invalid file, missing Playwright, corrupt source, permission errors                                                    |
| Watch mode           | File change triggers re-render, new file detection                                                                     |
| Orphan cleanup       | Deleted source file removes output and manifest entry                                                                  |
| Config               | `.diagramkitrc.json` options affect rendering                                                                          |
| Multi-format batch   | Directory with mixed diagram types renders all correctly                                                               |

### 2.3 Test Quality

- Tests are deterministic (no flaky tests, no timing dependencies)
- Tests use isolated temp directories (cleaned up after)
- No tests export functions solely for testing (test through public interface)
- Assertions are specific (not just "truthy")
- Error paths are tested, not just happy paths
- Edge cases: empty files, very large files, unicode filenames, special characters

---

## Section 3: Architecture Review

### 3.1 Module Boundaries

- Public API barrel (`src/index.ts`) exports exactly what's needed — no more, no less
- Each module has a single responsibility
- No circular dependencies
- Types defined in `types.ts`, not scattered across modules
- Renderer implementations follow `DiagramRenderer` interface

### 3.2 Browser Pool Design

- Single Chromium instance for all diagram types
- Reference counting with `acquire()`/`release()` pattern
- Idle timeout (5s default) auto-disposes browser
- Concurrent `acquire()` calls coalesce (only one browser launch)
- SIGINT/SIGTERM/exit handlers clean up browser
- 4 pages: mermaid-light, mermaid-dark, excalidraw, drawio
- No resource leaks (pages, browser contexts)

### 3.3 Data Flow

Verify the rendering pipeline:

```
Source file → readFileSync → detect type via extension
  → acquire browser pool
  → get/create appropriate page
  → evaluate diagram in browser context
  → extract SVG string
  → (if dark mermaid) postProcessDarkSvg()
  → (if raster) convertSvg() via sharp
  → atomicWrite() to .tmp + rename
  → release browser pool
  → update manifest
```

Check that each step handles errors correctly and the flow is consistent across all three diagram types.

### 3.4 Configuration Flow

Verify layered config:

```
getDefaultConfig() → loadGlobalConfig() → loadLocalConfig() → overrides
```

- Each layer is a partial spread
- Missing config files are handled gracefully
- Walk-up directory traversal for `.diagramkitrc.json`
- CLI flags properly override config

### 3.5 Extension Map Design

- Longest-match-first resolution
- `.drawio.xml` beats `.xml`
- Custom extensions merge (not replace) with built-in map
- Unknown extensions are ignored gracefully

---

## Section 4: Performance Review

### 4.1 Browser Pool Efficiency

- Browser launches only once, reused across all renders
- Pages persist between render calls (no page creation per render)
- Idle timeout prevents premature browser disposal during batch
- No unnecessary page navigations or reloads
- IIFE bundles (excalidraw, drawio) are cached after first build

### 4.2 Incremental Builds

- Manifest correctly prevents unnecessary re-renders
- Hash computation is efficient (SHA-256 of file content)
- Manifest I/O is not a bottleneck (sync read, atomic write)
- Orphan cleanup is efficient (single pass)

### 4.3 Rendering Pipeline

- SVG generation happens in browser (fast path)
- Raster conversion uses sharp's native pipeline (not screenshot-based)
- No unnecessary Buffer copies or string↔Buffer conversions
- Batch rendering groups files efficiently

### 4.4 Bundle Size

- IIFE bundles for excalidraw/drawio are not regenerated on every render
- Bundle caching works correctly
- No unnecessary dependencies in the bundle

### 4.5 Memory

- No memory leaks in long-running watch mode
- Browser pool properly releases pages and contexts
- Large SVGs don't cause OOM
- Manifest doesn't grow unboundedly

---

## Section 5: Security Review

### 5.1 Input Validation

- Diagram source files: validated before passing to browser eval
- File paths: no path traversal vulnerabilities
- CLI arguments: no command injection
- XML parsing (drawio): no XXE vulnerabilities
- JSON parsing (excalidraw): no prototype pollution

### 5.2 Browser Sandbox

- Playwright runs in sandboxed mode
- No file system access from browser context
- No network access from browser context (diagrams rendered locally)
- Browser context is isolated per render type

### 5.3 File System

- Atomic writes prevent partial file corruption
- Output directory creation uses safe `mkdirSync` with `recursive: true`
- No symlink following that could escape the project directory
- Manifest writes are atomic

### 5.4 Dependencies

- No known vulnerabilities in dependencies (run `npm audit`)
- Optional peer dependency (sharp) is dynamically imported
- Playwright version is current
- No unnecessary runtime dependencies

### 5.5 Supply Chain

- `package.json` `files` field limits what's published
- No secrets or credentials in published files
- No postinstall scripts that execute arbitrary code
- Lock file integrity

---

## Section 6: CLAUDE.md Alignment

Compare every claim in `CLAUDE.md` against the actual codebase:

### 6.1 Architecture Claims

For each architectural statement in CLAUDE.md, verify it matches current code:

- "Unified Playwright — single headless Chromium instance" → verify in `pool.ts`
- "Browser pool — lazy init, reference counting, idle timeout (5s), auto-cleanup" → verify all four properties
- "4 pages — mermaid light, mermaid dark, excalidraw, drawio" → verify page creation
- "Manifest system — SHA-256 content hashing" → verify hash algorithm
- "Output convention — `.diagrams/` hidden folder" → verify default config
- "Extension aliases" → verify all listed aliases exist in `extensions.ts`

### 6.2 Design Philosophy

Verify each principle is actually followed in the code:

- "Single browser, shared pool" — no separate browser launches
- "SVG-first, raster as optional conversion" — raster is post-processing via sharp
- "Light + dark by default" — both themes rendered unless explicitly one
- "Incremental by default" — manifest system active by default
- "Configuration layering" — merge order matches documentation
- "Atomic writes everywhere" — `.tmp` + rename pattern used consistently
- "Extension-based type detection" — solely by file extension
- "Browser entry points as IIFE bundles" — verify rolldown bundling

### 6.3 Directory Structure

For every file/directory listed in the "Directory structure" section:

- Verify it exists at the stated path
- Verify the description matches its actual content
- Flag any files that exist in the tree but are NOT listed
- Flag any listed files that do NOT exist (orphan entries)

### 6.4 Commands and APIs

- Every CLI command listed in CLAUDE.md actually works
- Every API function listed is actually exported from `src/index.ts`
- Every type listed matches the actual type definition in `types.ts`
- Function signatures match between docs and code

### 6.5 Dependencies

- Every dependency listed in CLAUDE.md is in `package.json`
- No unlisted runtime dependencies
- Optional peer dependency status matches

### 6.6 Coding Conventions

- ESM only, trailing commas, no semicolons — verify in source
- Async for rendering, sync for file reading — verify pattern
- Section headers format — verify pattern exists
- Comments explain reasoning — spot check

### 6.7 Testing Strategy

- Unit test colocated pattern matches actual test file locations
- E2E test descriptions match actual test cases
- Export policy matches (no test-only exports)

### 6.8 Orphan Detection

Flag entries in CLAUDE.md that reference:

- Files that don't exist
- Functions that aren't exported
- CLI commands that don't work
- Configuration options that aren't implemented
- Dependencies that aren't in package.json

---

## Section 7: Skills Review

Review all skills in `agent_skills/` for:

### 7.1 Accuracy

For each skill file:

- All CLI commands shown actually work
- All API examples use correct function signatures
- All configuration examples match current schema
- All file extensions listed are supported
- Version requirements match `package.json`

### 7.2 Completeness

- All CLI commands are documented in at least one skill
- All API functions are referenced where relevant
- All configuration options are covered
- All diagram types are covered
- All output formats are covered
- Error scenarios and troubleshooting are covered

### 7.3 Consistency

- Terminology is consistent across skills (e.g., "theme" vs "mode")
- Code examples use consistent style
- Output directory naming is consistent (`.diagrams/`)
- Skill frontmatter follows the standard format

### 7.4 Skill Dependencies

- Skills reference other skills correctly (e.g., `/diagrams` → `/diagram-mermaid`)
- Composability section is accurate
- Prerequisites listed are correct

### 7.5 Reference Files

Review `agent_skills/refs/`:

- Mermaid diagram type references cover all supported types
- Excalidraw JSON format reference matches current library version
- Draw.io shape/style references are accurate
- No outdated syntax examples

---

## Section 8: Documentation Review

Review all docs in `docs/` for:

### 8.1 Getting Started Guide (`docs/guide/getting-started.md`)

- Installation steps are complete and correct
- Prerequisites (Node 24, Playwright) are clearly stated
- First render example works end-to-end
- Output convention is explained with directory structure
- Dark mode embedding example is correct HTML
- Links to next steps work

### 8.2 CLI Guide (`docs/guide/cli.md`)

- All commands listed and documented
- All flags/options documented with defaults
- Examples cover common use cases
- Exit codes documented
- Discovery rules explained

### 8.3 JavaScript API Guide (`docs/guide/js-api.md`)

- All public functions documented with examples
- Parameters and return types match actual code
- Browser lifecycle explained
- Common patterns shown (render → dispose, batch render, watch mode)
- `convertSvg` import path (`diagramkit/convert`) is correct

### 8.4 Configuration Guide (`docs/guide/configuration.md`)

- All config options documented
- Merge order explained with example
- Config file locations correct
- Examples for common setups
- `extensionMap` usage explained

### 8.5 Watch Mode Guide (`docs/guide/watch-mode.md`)

- CLI and API usage shown
- Watched patterns listed
- Ignored directories listed
- Dev server integration explained
- Behavior details (safe rendering, manifest updates, browser lifecycle)

### 8.6 Image Formats Guide (`docs/guide/image-formats.md`)

- All four formats compared
- Scale and quality options explained
- Raster conversion pipeline described
- Format selection guide for different use cases
- Sharp dependency requirement noted

### 8.7 Diagram Type Guides (`docs/diagrams/`)

- Each diagram type (mermaid, excalidraw, drawio) has its own page
- File extensions listed
- Installation notes
- Working examples
- Dark mode behavior explained
- Architecture notes (how rendering works internally)
- Tips for good diagrams

### 8.8 API Reference (`docs/reference/api.md`)

- Every exported function has a signature and description
- Parameters documented with types, required/optional, defaults
- Return types documented
- Behavior notes for complex functions
- Subpath exports documented (`diagramkit/color`, `diagramkit/convert`)

### 8.9 Types Reference (`docs/reference/types.md`)

- All public types documented
- Interface fields match actual TypeScript definitions
- Examples show realistic values
- Cross-links between related types

### 8.10 Config Reference (`docs/reference/config.md`)

- Schema matches actual `DiagramkitConfig` interface
- All options have type, default, description
- Config file locations documented
- Manifest format documented
- Example configurations for common scenarios

### 8.11 CLI Reference (`docs/reference/cli.md`)

- Command table complete
- All render options in table format
- Output naming convention explained
- Discovery rules documented
- Exit behavior documented

### 8.12 VitePress Config (`docs/.vitepress/config.ts`)

- Navigation links work
- Sidebar structure matches actual pages
- No broken links
- Social links correct

### 8.13 Missing Documentation

Flag if any of these are missing:

- **INSTALL_SKILLS.md** — Guide for installing Claude Code skills:
  - Using CLAUDE.md file method
  - Using `diagramkit install-skills` CLI (local and global)
  - What skills are available and what each does
  - Verifying installation
- **Installation of optional dependencies** — Clear guidance on when and how to install `sharp`
- **Warmup script installation** — Guidance on setting up `diagramkit warmup` in CI, Docker, and development environments
- **Common use case guides** — Detailed examples for:
  - Rendering diagrams in a documentation site (VitePress, Docusaurus, etc.)
  - Rendering diagrams for GitHub README with dark mode
  - Batch rendering in CI/CD pipelines
  - Programmatic rendering in build scripts
  - Watch mode integration with dev servers
  - Converting existing diagrams from other tools
  - Using with monorepos
  - Generating diagrams for email/Confluence/presentations
- **Contributing guide** — CONTRIBUTING.md should be complete and accurate
- **Changelog** — CHANGELOG.md should be up to date
- **llms.txt and llms-full.txt** — Should match current API and behavior

---

## Section 9: Open Source Best Practices

### 9.1 Repository Files

Verify existence and quality of:

| File              | Status      | Notes                                                                                |
| ----------------- | ----------- | ------------------------------------------------------------------------------------ |
| `README.md`       | Required    | Clear intro, install, quick start, API overview                                      |
| `LICENSE`         | Required    | MIT license present and correct                                                      |
| `CONTRIBUTING.md` | Required    | Dev setup, test running, PR process                                                  |
| `CHANGELOG.md`    | Required    | Version history with dates                                                           |
| `CLAUDE.md`       | Project     | Architecture guide for LLM assistants                                                |
| `GUIDELINES.md`   | Project     | Coding conventions                                                                   |
| `.github/`        | Required    | Issue templates, PR templates, CI workflows                                          |
| `.gitignore`      | Required    | Covers node_modules, dist, .diagrams, etc.                                           |
| `.editorconfig`   | Recommended | Consistent formatting across editors                                                 |
| `.node-version`   | Required    | Specifies Node 24                                                                    |
| `package.json`    | Required    | Complete metadata (name, version, description, keywords, repository, bugs, homepage) |

### 9.2 Package.json Completeness

Verify these fields are present and correct:

- `name`, `version`, `description`
- `keywords` (for npm search)
- `repository` (GitHub URL)
- `bugs` (issue tracker URL)
- `homepage` (docs URL)
- `license`
- `author`
- `engines.node` matches `.node-version`
- `files` includes exactly what should be published
- `exports` map is correct and complete
- `bin` points to built CLI

### 9.3 GitHub Templates

Check `.github/` for:

- Issue templates (bug report, feature request)
- PR template
- CI workflows (lint, test, build, e2e)
- Dependabot or Renovate config

### 9.4 npm Publishing

- `npm pack --dry-run` shows only intended files
- No test files, fixtures, or config files in the package
- Types are included (`*.d.mts`)
- Skills directory is included

---

## Step 4 (continued): Generate Report and Plan

After synthesizing findings from all agents, write two files:

### Report File

Write the full report to `.temp/review-repo-report.md`:

```markdown
# Repository Review Report

Generated: {date}
Scope: {scope}
Agents: 5 parallel review agents

## Agent Status

| Agent                  | Sections | Status    | Findings |
| ---------------------- | -------- | --------- | -------- |
| code-quality-agent     | 1, 3, 4  | completed | X issues |
| security-testing-agent | 2, 5     | completed | X issues |
| claude-md-skills-agent | 6, 7     | completed | X issues |
| docs-agent             | 8        | completed | X issues |
| opensource-agent       | 9        | completed | X issues |

## Summary

| Category      | Critical | Major | Minor | Info  |
| ------------- | -------- | ----- | ----- | ----- |
| Code Quality  | X        | X     | X     | X     |
| Testing       | X        | X     | X     | X     |
| Architecture  | X        | X     | X     | X     |
| Performance   | X        | X     | X     | X     |
| Security      | X        | X     | X     | X     |
| CLAUDE.md     | X        | X     | X     | X     |
| Skills        | X        | X     | X     | X     |
| Documentation | X        | X     | X     | X     |
| Open Source   | X        | X     | X     | X     |
| **Total**     | **X**    | **X** | **X** | **X** |

## Findings

### Critical Issues

{list of critical issues with file:line, description, fix, and source agent}

### Major Issues

{list of major issues with source agent}

### Minor Issues

{list of minor issues with source agent}

### Info/Observations

{list of observations with source agent}

## Fix Plan

### Phase 1: Critical Fixes

{ordered list of changes}

### Phase 2: Major Fixes

{ordered list of changes}

### Phase 3: Minor Improvements

{ordered list of changes}
```

### Plan File

Write the actionable fix plan to `.temp/review-repo-plan.md`:

```markdown
# Fix Plan

## Phase 1: Critical Fixes (must fix before release)

1. {description} — {file(s)} — {what to change}
2. ...

## Phase 2: Major Fixes (should fix)

1. {description} — {file(s)} — {what to change}
2. ...

## Phase 3: Minor Improvements (nice to have)

1. {description} — {file(s)} — {what to change}
2. ...

## Validation

After applying fixes, run:
\`\`\`bash
npm run validate
\`\`\`
```

---

## Step 5: Ask for Approval

Present the report summary to the user:

```
Repository review complete.

5 agents reviewed 9 sections in parallel.
Found: X critical, Y major, Z minor issues.

Report: .temp/review-repo-report.md
Plan: .temp/review-repo-plan.md

Would you like me to fix these issues? (y/n)
- Fix all: Apply all phases
- Fix critical only: Apply Phase 1 only
- Fix critical + major: Apply Phases 1 and 2
- Review first: Open the plan for manual review
```

If `fix=true` was passed as an argument, skip the confirmation and proceed directly to fixing.

---

## Step 6: Apply Fixes (Agent Team — Phase-based)

When approved, launch fix agents in parallel per phase. Each fix phase can use multiple agents working on independent files simultaneously.

### Fix Phase Strategy

For each approved phase, group fixes by independence (files that don't overlap can be fixed in parallel):

#### Phase 1 Fix Team (Critical)

Launch agents in parallel for independent critical fixes:

- **Agent A**: Code fixes (src/ changes — one agent per independent module)
- **Agent B**: Doc/config fixes (CLAUDE.md, skills, docs — if independent of code changes)
- **Agent C**: Test fixes (test files — if independent of code changes)

If fixes are interdependent (e.g., API change requires doc update), run them sequentially within a single agent.

#### Phase 2 Fix Team (Major)

Same parallel strategy as Phase 1, but for major fixes. Only launched after Phase 1 passes validation.

#### Phase 3 Fix Team (Minor)

Same parallel strategy, only if user approved "Fix all". Only launched after Phase 2 passes validation.

### Validation Between Phases

After EACH fix phase completes (all agents in that phase finish):

```bash
npm run check:fix    # Auto-fix formatting
npm run typecheck    # Verify type safety
npm run build        # Verify build succeeds
npm run test:unit    # Verify unit tests pass
```

If any validation step fails:

1. Do NOT proceed to the next phase
2. Launch a **fix-validation agent** to diagnose and fix the failure
3. Re-run validation
4. Only proceed when all checks pass

After ALL approved phases complete:

```bash
npm run validate     # Full validation suite
```

Report final status to the user.

---

## Agent Team Summary

| Agent                    | Role                                                                    | Sections | Runs In               |
| ------------------------ | ----------------------------------------------------------------------- | -------- | --------------------- |
| **Orchestrator** (main)  | Gathers context, launches team, synthesizes results, manages fix phases | All      | Foreground            |
| `code-quality-agent`     | Code quality + architecture + performance review                        | 1, 3, 4  | Parallel (background) |
| `security-testing-agent` | Testing coverage + security review                                      | 2, 5     | Parallel (background) |
| `claude-md-skills-agent` | CLAUDE.md alignment + skills accuracy                                   | 6, 7     | Parallel (background) |
| `docs-agent`             | Documentation completeness + accuracy                                   | 8        | Parallel (background) |
| `opensource-agent`       | Open source best practices + packaging                                  | 9        | Parallel (background) |
| Fix agents (Phase 1-3)   | Apply approved fixes in parallel per phase                              | —        | Parallel per phase    |
| `fix-validation-agent`   | Diagnose and fix validation failures between phases                     | —        | On-demand             |

### Scoped Review Agent Mapping

When `scope` is not `full`, only launch the relevant agents:

| Scope         | Agents Launched                                |
| ------------- | ---------------------------------------------- |
| `full`        | All 5 review agents                            |
| `code`        | `code-quality-agent` only (Sections 1, 3, 4)   |
| `tests`       | `security-testing-agent` only (Section 2 only) |
| `security`    | `security-testing-agent` only (Section 5 only) |
| `performance` | `code-quality-agent` only (Section 4 only)     |
| `docs`        | `docs-agent` only (Section 8)                  |
| `skills`      | `claude-md-skills-agent` only (Section 7 only) |
| `claude-md`   | `claude-md-skills-agent` only (Section 6 only) |

---

## Composability

This skill is standalone. Invoke it with `/review-repo` for a full repository audit. It can be scoped to specific areas (e.g., `/review-repo scope=docs`) for targeted reviews.

The review is non-destructive by default — it only reads code and writes to `.temp/`. Fixes are only applied after explicit user approval.

### Integration with Other Skills

- After fixes are applied, consider running `/self-review` for an additional lint/test/build pass
- Documentation fixes can be validated with `/doc-review`
- PR creation after fixes can use `/pr-describe` for a summary
