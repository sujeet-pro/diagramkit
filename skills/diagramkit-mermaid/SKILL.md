---
name: diagramkit-mermaid
description: Generate Mermaid diagrams (.mermaid/.mmd/.mmdc) and render to SVG/PNG/JPEG/WebP/AVIF with diagramkit. Supports 21+ diagram types including flowchart, sequence, class, state, ER, gantt, gitgraph, mindmap, timeline, C4, pie, quadrant, sankey, XY, block, architecture, kanban, journey, packet, radar, and requirement. Use when creating or updating Mermaid diagram source files, rendering them to images, or choosing which Mermaid diagram type fits a task.
---

# Mermaid Diagrams with diagramkit

## Diagram Type Routing

Pick the smallest diagram type that fits the job.

| Type           | Directive            | Best for                                  |
| -------------- | -------------------- | ----------------------------------------- |
| `flowchart`    | `flowchart TD`       | Process flows, pipelines, decision trees  |
| `sequence`     | `sequenceDiagram`    | Message passing, API exchanges, protocols |
| `class`        | `classDiagram`       | OOP structure, inheritance, interfaces    |
| `state`        | `stateDiagram-v2`    | State machines and lifecycle transitions  |
| `er`           | `erDiagram`          | Database entities and relationships       |
| `gantt`        | `gantt`              | Timelines, schedules, rollout plans       |
| `gitgraph`     | `gitGraph`           | Branching and release histories           |
| `mindmap`      | `mindmap`            | Concept maps and brainstorming            |
| `timeline`     | `timeline`           | Milestones, roadmaps, history             |
| `c4`           | `C4Context`          | C4 architecture views                     |
| `pie`          | `pie`                | Simple categorical distribution           |
| `quadrant`     | `quadrantChart`      | Priority or evaluation matrices           |
| `sankey`       | `sankey-beta`        | Flow volumes between stages               |
| `xy`           | `xychart-beta`       | Small chart-like comparisons              |
| `block`        | `block-beta`         | Structured block layouts                  |
| `architecture` | `architecture-beta`  | Icon-driven architecture diagrams         |
| `kanban`       | `kanban`             | Board-style work status views             |
| `journey`      | `journey`            | User journey or service experience maps   |
| `packet`       | `packet-beta`        | Bit- or field-level packet layouts        |
| `radar`        | `radar-beta`         | Multi-axis comparison                     |
| `requirement`  | `requirementDiagram` | Requirements tracing                      |

## Resolve diagramkit (always prefer the local install)

Anchor on the locally installed CLI/API so this skill matches the version pinned in this repo. Do NOT fall back to a globally installed `diagramkit`.

1. **Required: read** `node_modules/diagramkit/REFERENCE.md` first. It is version-pinned to the installed package.
2. **Local install** — check `./node_modules/.bin/diagramkit`. If present, use `npx diagramkit ...` (auto-resolves to the local bin).
3. **Not present** — install locally with `npm add diagramkit` and re-read `node_modules/diagramkit/REFERENCE.md`.
4. **First use** — run `npx diagramkit warmup` to install the Playwright Chromium browser (skip if Graphviz-only, but Mermaid always needs it).

```bash
if [ ! -x ./node_modules/.bin/diagramkit ]; then
  npm add diagramkit
fi

# Always invoke through npx so the LOCAL bin is used.
DK="npx diagramkit"
$DK warmup
```

## Read Project Config

Check the project root for `diagramkit.config.json5` or `diagramkit.config.ts`. Key fields that affect output:

| Field            | Default       | Effect                                       |
| ---------------- | ------------- | -------------------------------------------- |
| `outputDir`      | `.diagramkit` | Folder name for rendered outputs             |
| `defaultFormats` | `["svg"]`     | Output formats when none specified           |
| `defaultTheme`   | `"both"`      | `"light"`, `"dark"`, or `"both"`             |
| `sameFolder`     | `false`       | Write outputs next to sources (no subfolder) |
| `outputPrefix`   | `""`          | Prefix added to output filenames             |
| `outputSuffix`   | `""`          | Suffix added before extension                |

If no config file exists, defaults apply. You can run `npx diagramkit init` to create one.

## Create the Diagram Source File

### Build rules

1. Start with a comment header:
   ```
   %% Diagram: <title>
   %% Type: <diagram-type>
   ```
2. Pick the smallest diagram type from the routing table above.
3. Use semantic IDs (`auth_service`, not `a`).
4. Use hex colors only — never named colors like `red` or `blue`.
5. Use the mid-tone palette below for fills.
6. Do **NOT** hardcode `%%{init: {theme: ...}}%%` — diagramkit controls theme injection.
7. **Always add `%%{init: {'htmlLabels': false}}%%` on every flowchart / class / state / ER diagram.** Markdown image embeds (`![...](foo.svg)`), GitHub `<picture>` elements, Safari image previews, and several static-site pipelines all use `<img>` embeds, which silently drop Mermaid's default `<foreignObject>` labels. The directive must come **before** the diagram keyword (`flowchart LR`, `sequenceDiagram`, …), though it may follow the `%% Diagram:` / `%% Type:` header comments.
   - **Use the flat top-level form**: `%%{init: {'htmlLabels': false}}%%`. The nested form `%%{init: {'flowchart': {'htmlLabels': false}}}%%` is silently ignored by Mermaid 11 and leaves `<foreignObject>` in the output. A safe combined fallback that works across versions and types is `%%{init: {'htmlLabels': false, 'flowchart': {'htmlLabels': false}}}%%`.
8. **Prefer `\n` over `<br/>` for multi-line labels** when `htmlLabels` is off. Mermaid's SVG (non-HTML) labels render `\n` as `<tspan>` line breaks. Existing labels that use `<br/>` usually keep working, but a literal `<br/>` may appear as text in some versions. Always **quote the label** so the newline escape is preserved:
   - Good: `PHYSICAL["Physical Clocks\nNTP, PTP, TrueTime"]`
   - Avoid (when htmlLabels is off): `PHYSICAL[Physical Clocks<br/>NTP...]`
   - Inline HTML (`<b>`, `<i>`, `<code>`) renders as literal text when htmlLabels is off — strip or replace with Markdown/text.
9. Read `references/diagram-types.md` for the full syntax reference of the chosen type.

### Example

```
%% Diagram: CI/CD Pipeline
%% Type: flowchart
%%{init: {'htmlLabels': false}}%%
flowchart LR
    subgraph build["Build Stage"]
        checkout[Checkout Code] --> lint[Run Linter]
        lint --> test[Run Tests]
        test --> compile[Compile]
    end

    subgraph deploy["Deploy Stage"]
        staging[Deploy Staging] --> smoke[Smoke Tests]
        smoke --> prod[Deploy Production]
    end

    compile --> staging
    prod --> monitor[Monitor Health]

    classDef stage fill:#2E5A88,stroke:#1F4870,color:#fff
    class checkout,lint,test,compile stage
```

## Color Palette (WCAG 2.2 AA-compliant)

Use these darker mid-tone fills with white text. Every (fill, `#ffffff`) pair
is verified to meet WCAG 2.2 AA contrast (>= 4.5:1 for normal text, >= 3:1
for large text). They survive both light and dark rendering because their
luminance is below the dark-mode contrast post-processor's 0.4 threshold.

| Purpose             | Fill      | Stroke    | Text      | White-text contrast |
| ------------------- | --------- | --------- | --------- | ------------------- |
| Primary / API       | `#2E5A88` | `#1F4870` | `#ffffff` | 7.1:1               |
| Secondary / Service | `#1F6E68` | `#155752` | `#ffffff` | 5.9:1               |
| Accent / Alert      | `#B43A3A` | `#8E2828` | `#ffffff` | 5.5:1               |
| Storage / Data      | `#8B5E15` | `#6E4810` | `#ffffff` | 5.4:1               |
| Success             | `#2D7A2D` | `#1E5A1E` | `#ffffff` | 5.4:1               |
| Neutral             | `#5A5A5A` | `#3D3D3D` | `#ffffff` | 7.0:1               |

> [!IMPORTANT]
> The earlier "mid-tone palette" (`#4C78A8`, `#72B7B2`, `#54A24B`, …) does
> NOT pass WCAG 2.2 AA with white text — `#54A24B`/`#fff` measures only
> 3.16:1, and `#72B7B2`/`#fff` measures 2.29:1. Use the darker variants
> above when you need readable labels at body-text sizes. The lighter
> tones are only safe for large text (>= 18px or 14px bold) which has the
> looser 3:1 threshold.

**Avoid:**

- `#ffffff` or near-white fills (disappear on light backgrounds)
- `#000000` or near-black fills (disappear on dark backgrounds)
- Named colors (`red`, `blue`) — behavior varies by renderer
- Very saturated neon colors
- White text on the lighter "pastel" palette below (fails AA)

**Reserved Mermaid class names** — do NOT name a `classDef` `root`,
`default`, `node`, `cluster`, or any other class Mermaid uses internally.
Mermaid emits `<g class="root">` / `<g class="default">` wrappers around
groups in the output, so a same-named `classDef` will leak its `color` /
`fill` rules to every label in the diagram.

After authoring, ALWAYS verify with the validator (it runs the WCAG check
automatically and emits `LOW_CONTRAST_TEXT` warnings for failing
foreground/background combinations):

```bash
npx diagramkit validate path/to/.diagramkit/ --recursive --json
```

See `references/color-and-theming.md` for the legacy pastel palette, dark
mode details, and the full styling reference.

## Render

Always invoke through `npx` so the LOCAL `./node_modules/.bin/diagramkit` is used:

```bash
npx diagramkit render path/to/file.mermaid
```

This renders both light and dark SVG variants by default. Output goes to `.diagramkit/` next to the source file:

```
docs/
  architecture.mermaid
  .diagramkit/
    architecture-light.svg
    architecture-dark.svg
```

Common flags:

```bash
npx diagramkit render path/to/file.mermaid --theme light   # Light only
npx diagramkit render path/to/file.mermaid --force         # Ignore cache
npx diagramkit render . --type mermaid                     # All mermaid files in cwd
```

## Validate

After rendering, validate the generated SVGs:

```bash
npx diagramkit validate path/to/.diagramkit/
```

### Common Validation Errors for Mermaid

| Code                      | Severity | Meaning                                                                           | Fix                                                                                                                                                                                                                                                                        |
| ------------------------- | -------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CONTAINS_FOREIGN_OBJECT` | warning  | Mermaid used HTML labels inside `<foreignObject>`                                 | Add `%%{init: {'htmlLabels': false}}%%` **before** the diagram keyword. Use the flat form (the nested `{'flowchart': {'htmlLabels': false}}` form is silently ignored on Mermaid 11). If labels use `<br/>`, switch to `\n` and quote the label. Re-render with `--force`. |
| `NO_VISUAL_ELEMENTS`      | error    | SVG is an empty shell — syntax error in source                                    | Check the Mermaid source for typos, missing directives, or invalid syntax. Quote labels that contain punctuation/parens/pipes.                                                                                                                                             |
| `MISSING_SVG_CLOSE`       | error    | Render crashed mid-output, truncated SVG                                          | Fix source syntax errors and re-render with `--force`                                                                                                                                                                                                                      |
| `EMPTY_FILE`              | error    | Render produced no output                                                         | Re-render; check that Chromium is installed (`diagramkit warmup`)                                                                                                                                                                                                          |
| `CONTAINS_SCRIPT`         | error    | SVG has `<script>` tags, won't work in `<img>`                                    | Re-render with diagramkit (it strips scripts); avoid custom Mermaid plugins                                                                                                                                                                                                |
| `EXTERNAL_RESOURCE`       | warning  | SVG references external URLs                                                      | Blocked in `<img>` embeds; re-render to inline resources. For hand-authored SVGs (especially drawio exports) strip outer `<a xlink:href="…">` wrappers.                                                                                                                    |
| `ASPECT_RATIO_EXTREME`    | warning  | Rendered SVG is too wide or too tall (outside the readable band `[1:1.9, 3.3:1]`) | Apply the [Readability + iterative escalation loop](#readability--iterative-escalation-loop) below. Step 1 is usually `flip the directive` or `mermaidLayout: { mode: 'auto' }`; if that does not bring the ratio inside the band, escalate to split → engine swap.        |

## Iterative Error Correction

When render fails or validation produces errors, follow this loop:

1. **Read the error** — check the CLI output or validation result for the issue code.
2. **Fix the source** — correct the Mermaid syntax, add missing directives, or adjust config.
3. **Re-render** — `diagramkit render path/to/file.mermaid --force`
4. **Re-validate** — `diagramkit validate path/to/.diagramkit/`
5. **Repeat** until all checks pass.

Always use `--force` when re-rendering after a fix to bypass the manifest cache.

### Drive the loop with `--json`

For scripted / agent-driven fix loops, prefer the JSON modes so you can parse results reliably:

```bash
npx diagramkit render <dir> --json --force         # failed + failedDetails arrays
npx diagramkit validate <dir> --recursive --json   # files / invalid / issues[]
```

A minimal loop an agent can run:

1. `npx diagramkit render <dir> --json --force` → parse `result.failed[]` and `result.failedDetails[]`.
2. `npx diagramkit validate <dir> --recursive --json` → parse each file's `issues[]`, filtering for `severity === "error"` or specific warning codes you want to zero out (commonly `CONTAINS_FOREIGN_OBJECT`).
3. For each failing source, apply the minimal textual fix, then re-render that single file with `--force`.
4. Stop when both phases report zero targeted findings.

### Warning vs error

`diagramkit validate` distinguishes `severity: "error"` (render-breaking) from `severity: "warning"` (embeds may degrade). `CONTAINS_FOREIGN_OBJECT`, `EXTERNAL_RESOURCE`, `LOW_CONTRAST_TEXT`, and `ASPECT_RATIO_EXTREME` are warnings, not failures — the render phase will not fail on them, but they each silently degrade reader experience (broken `<img>` embeds, illegible text, or scaled-down output). Treat them as fixable defects for any page that ships diagrams to humans.

## Readability + iterative escalation loop

A diagram passing structural validation is not enough — it also has to be **readable** at the size readers will actually see it. This section is the canonical fix loop the agent should run for **every** Mermaid diagram, both during initial authoring and during review.

### Readability budget (research-backed thresholds)

These limits come from cognitive-load and viewport research (Mermaid-Sonar, Alibaba diagrams guide). Aim for half of each in practice; never exceed.

| Dimension                                  | Hard ceiling                                     | Why                                                                                                  |
| :----------------------------------------- | :----------------------------------------------- | :--------------------------------------------------------------------------------------------------- |
| Nodes per diagram                          | **≤ 50 dense / ≤ 100 sparse** (target ≤ 15)      | Short-term visual memory holds 3–4 distinct objects; past these caps comprehension drops sharply.    |
| Connections per diagram                    | **≤ 100**                                        | Flowcharts are O(n²) in connections; past 100 the visual graph is denser than the underlying logic.  |
| Branching width                            | **≤ 8 parallel branches** out of any single node | Wider fans force scanners to lose their place.                                                       |
| Comprehension target                       | **≤ 90 s** of reader attention                   | If the reader can't get the main point in 90 s, split the diagram.                                   |
| Aspect ratio (rendered SVG width / height) | **inside `[1:1.9, 3.3:1]` against a 4:3 target** | Diagrams overflowing typical doc widths (~650–800 px) get scaled down and lose ~39% text legibility. |

### Visual encoding

- **Consistent shape semantics.** Mixing meaning slows interpretation ~4×.
  - rectangle `[label]` → process, service, component
  - rounded rectangle `(label)` → external boundary, actor
  - **diamond `{label}` → decision / branch only** (never decoration)
  - cylinder `[(label)]` → persistent storage
  - hexagon `{{label}}` → external system, queue, event
  - parallelogram `[/label/]` → input, output, payload
  - circle `((label))` → start, end, terminator
- **Never rely on colour alone for meaning.** Pair every colour with a shape, label, or position. Roughly 8% of male engineers have red-green colour-vision deficiency; a colour-only legend is invisible to them.
- **Reserve red (`#B43A3A`) for errors / alerts.** Don't use it for "primary" or generic emphasis.

### The iterative loop

After every meaningful edit (new diagram, content change, palette tweak), run this loop until both `render.failed` and `validate.issues` are empty (cap at 8 iterations per file).

**Step 0 — Set the project default once.** Add this to `diagramkit.config.json5` so the renderer attempts direction-flip / ELK rebalance automatically:

```json5
{ mermaidLayout: { mode: 'auto', targetAspectRatio: 4 / 3, tolerance: 2.5 } }
```

The renderer will then handle ~70% of aspect-ratio issues silently. The agent loop only runs when the residual still trips the validator.

**Step 1 — Render with `--force` and parse the JSON envelope.**

```bash
npx diagramkit render <file>.mermaid --force --json
npx diagramkit validate <file's .diagramkit dir> --json
```

Inspect: `result.failed[]`, `result.failedDetails[]`, and every entry's `issues[]` filtered by `code` and `severity`.

**Step 2 — For each `code`, apply the matching fix below and jump back to Step 1.**

| Code                                                                      | Engine-local fix                                                                                                                                                                                                     | Escalation if step 1 fix doesn't clear it                                                                      |
| :------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `NO_VISUAL_ELEMENTS` / `MISSING_SVG_CLOSE`                                | Quote labels with `()`, `                                                                                                                                                                                            | `, `:`, `<`, `>`; verify the diagram keyword is on its own line; check `failedDetails[]` for the parser error. | — (it's a syntax bug; keep fixing) |
| `CONTAINS_FOREIGN_OBJECT`                                                 | Add the **flat** `%%{init: {'htmlLabels': false}}%%` before the diagram keyword; convert `<br/>` → `\n` and quote those labels.                                                                                      | —                                                                                                              |
| `EXTERNAL_RESOURCE`                                                       | Strip any `themeCSS`, external icon URLs.                                                                                                                                                                            | —                                                                                                              |
| `LOW_CONTRAST_TEXT`                                                       | Swap legacy palette → AA palette in the `classDef` (`#54A24B` → `#2D7A2D`, `#72B7B2` → `#1F6E68`, etc. — see [Color Palette](#color-palette-wcag-22-aa-compliant)).                                                  | —                                                                                                              |
| `ASPECT_RATIO_EXTREME` (or warning surfaced by the in-renderer rebalance) | **Step 2a — Flip direction.** Open the source. If the first directive line is `flowchart LR` (or `RL`), change it to `flowchart TB` (or `BT`). For `graph` use the same swap. Re-render.                             | If still extreme → step 2b                                                                                     |
|                                                                           | **Step 2b — Reduce / restructure.** Merge low-information nodes; pull subgraphs out as their own diagrams; cap branching width at 8 children per parent. Re-render.                                                  | If still extreme → step 2c                                                                                     |
|                                                                           | **Step 2c — Split the diagram.** Save as two files: `<name>-overview.mermaid` (high-level boxes) + `<name>-detail-<N>.mermaid` (zoomed-in sections). Update embedding markdown to reference both. Re-render both.    | If still extreme → step 2d                                                                                     |
|                                                                           | **Step 2d — Swap engine (last resort).** When a flowchart is genuinely irreducible (e.g. an icon-heavy AWS deployment, a long DAG with structural meaning), convert the source to a different engine. Decision rule: |
|                                                                           | • **`.drawio`** when the diagram needs cloud icons, swimlanes, or precise positioning. Follow `../diagramkit-draw-io/SKILL.md` to write the new source.                                                              |                                                                                                                |
|                                                                           | • **`.dot` (Graphviz)** when only graph structure matters and you want algorithmic layout with `ratio="0.75"` or `ratio="compress"` for direct aspect-ratio control. Follow `../diagramkit-graphviz/SKILL.md`.       |                                                                                                                |
|                                                                           | Delete or move the original `.mermaid` source after the swap; re-render the new source.                                                                                                                              | If still extreme after engine swap → step 3                                                                    |

**Step 3 — Record residual.** If the loop exits without clearing `ASPECT_RATIO_EXTREME` after splitting and swapping, log the diagram in the review report (`.temp/diagram-review/<timestamp>/report.md`) with the chain of attempts and surface to the user. Do not infinite-loop.

### Worked example — wide flowchart, agent perspective

```text
1. Author: write `pipeline.mermaid` with `flowchart LR` and 12 sequential nodes.
2. Render --force --json.
3. Validate --json reports ASPECT_RATIO_EXTREME (rendered ratio 12.5:1).
4. Step 2a: flip directive → `flowchart TB`. Re-render. New ratio: 1:5 → still extreme.
5. Step 2b: pull the "Build Stage" subgraph into its own file `pipeline-build.mermaid`,
   keep `pipeline.mermaid` as the overview. Re-render both.
6. Validate again: pipeline.mermaid is 2.1:1 (in band), pipeline-build.mermaid is 1.4:1 (in band).
   Both pass — done.
```

## Raster Output (PNG / JPEG / WebP / AVIF)

If the project config includes raster formats or the user requests them, the locally installed CLI handles SVG → raster in a single command:

```bash
npx diagramkit render path/to/file.mermaid --format svg,png            # SVG + PNG
npx diagramkit render path/to/file.mermaid --format png --scale 2      # 2x PNG
npx diagramkit render path/to/file.mermaid --format svg,png,webp,avif  # all formats
npx diagramkit render path/to/file.mermaid --format jpeg --quality 85  # JPEG quality
```

Raster output requires `sharp` as a peer dependency (install once):

```bash
npm add -D sharp
```

Available raster formats: `png`, `jpeg`, `webp`, `avif`. SVG is always produced first; raster is a post-conversion step done by the same `diagramkit` CLI — no second tool needed.

## Embed in Markdown

Use the `<picture>` element for GitHub-compatible theme-aware embedding:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./.diagramkit/architecture-dark.svg" />
  <source media="(prefers-color-scheme: light)" srcset="./.diagramkit/architecture-light.svg" />
  <img alt="System architecture" src="./.diagramkit/architecture-light.svg" />
</picture>
```

For plain markdown without theme switching:

```md
![System architecture](./.diagramkit/architecture-light.svg)
```

## Dark Mode

diagramkit uses **separate browser pages** for light and dark Mermaid rendering because `mermaid.initialize()` is global and theme cannot be changed per-call. In dark mode, diagramkit injects theme variables (`background`, `primaryColor`, `nodeBkg`, etc.) and then applies WCAG contrast post-processing that automatically darkens high-luminance fills.

**No action needed from the diagram author.** Use mid-tone fills from the palette above and diagramkit handles both variants. See `references/color-and-theming.md` for the full list of injected dark theme variables.

## Styling

### classDef

Define reusable styles and apply with `:::` or `class`. Use the AA-compliant
palette above so labels stay readable in both light and dark renders.

```
flowchart TD
    A[API Gateway]:::primary --> B[Auth]:::secondary
    B --> C[(Database)]:::storage

    classDef primary fill:#2E5A88,stroke:#1F4870,color:#fff
    classDef secondary fill:#1F6E68,stroke:#155752,color:#fff
    classDef storage fill:#8B5E15,stroke:#6E4810,color:#fff
```

### linkStyle

Style individual edges by zero-based index:

```
flowchart TD
    A --> B
    A -.-> C
    linkStyle 0 stroke:#2E5A88,stroke-width:2px
    linkStyle 1 stroke:#B43A3A,stroke-width:1px,stroke-dasharray:5
```

## Quality Rules

- **Respect the [Readability budget](#readability-budget-research-backed-thresholds).** Hard ceiling: ≤ 50 nodes (dense) / ≤ 100 (sparse), ≤ 100 connections, ≤ 8 parallel branches, ≤ 90 s comprehension target. Aim for ≤ 15 nodes in routine diagrams.
- **Pick the direction by destination width.** `LR` for pipelines with ≤ 4–5 nodes per rank; `TB` (= `TD`) for hierarchies, lists, and anything taller than wide. A 12-node `LR` chain renders at 12:1 and is unreadable when embedded at 650 px.
- **Use shape semantics consistently.** rectangle = process, rounded = boundary/actor, **diamond = decision (only)**, cylinder = storage, hexagon = external/event, parallelogram = I/O, circle = terminator. Mixing meaning slows interpretation ~4×.
- **Never use colour as the only differentiator.** Pair every colour with a shape, label, or position. ~8% of male engineers have red-green colour-vision deficiency. Reserve red (`#B43A3A`) for errors / alerts.
- **One story per diagram.** Split overview + detail when a single diagram tries to cover two unrelated concerns.
- **Set `mermaidLayout: { mode: 'auto' }` in `diagramkit.config.json5`** — this lets the renderer try direction-flip / ELK rebalance during render so the agent loop only handles residual cases.
- Use subgraphs for groups of related nodes.
- Quote labels that contain punctuation or reserved words.
- **Start every flowchart / class / state / ER diagram with `%%{init: {'htmlLabels': false}}%%`** and use `\n` (not `<br/>`) for multi-line labels. This keeps SVGs safe for `<img>` embedding across Markdown, GitHub, and most static-site generators.
- **Re-render with `--force` after edits** — the manifest caches on source hash, so an unchanged-file reformat will be skipped without `--force`.

## Review Mode

Use this section when invoked from [`diagramkit-review`](../diagramkit-review/SKILL.md) (or whenever the user asks to audit/fix existing `.mermaid` sources rather than create new ones).

### Source-file audit (per `.mermaid` / `.mmd` / `.mmdc`)

For each source, verify in order — apply the minimum textual fix for each rule that fails:

1. **No YAML frontmatter block** — Mermaid sources must NOT start with a `---` / `title: …` / `---` block. The Mermaid parser tolerates it on most diagram types but it is invisible in the SVG output (the title is dropped during rendering) and breaks the rule that the first non-comment line is the diagram keyword. Replace any leading frontmatter with `%% Diagram: <name>` and `%% Type: <flowchart|sequence|…>` comments.
2. **Header comments present** — `%% Diagram: …` and `%% Type: …` lines at the top.
3. **Init directive (img-embed safety)** — `%%{init: {'htmlLabels': false}}%%` is present **before** the diagram keyword (`flowchart`, `classDiagram`, `stateDiagram-v2`, `erDiagram`). Use the **flat** form. The nested `{'flowchart': {'htmlLabels': false}}` form is silently ignored on Mermaid 11 and produces `<foreignObject>` in the SVG.
4. **No hardcoded theme** — strip any `%%{init: {'theme': '…'}}%%`. diagramkit injects light/dark themes itself.
5. **Multi-line labels** — every `<br/>` in a label becomes `\n`, and the label is **quoted** so the escape survives parsing: `PHYSICAL["Physical Clocks\nNTP, PTP, TrueTime"]`.
6. **No inline HTML in labels** — `<b>`, `<i>`, `<code>` render as literal text when `htmlLabels` is off; strip them or replace with Markdown-style emphasis (lowercase letters only — Mermaid does not interpret).
7. **Reserved `classDef` names** — none of `root`, `default`, `node`, `cluster`. Rename if found; otherwise the rule leaks to every label in the SVG.
8. **Hex colours only** — replace any named colour (`red`, `blue`, …) with the AA-compliant hex from the palette below.
9. **WCAG palette** — for white-text labels, use only the AA-compliant darker palette (`#2E5A88`, `#1F6E68`, `#B43A3A`, `#8B5E15`, `#2D7A2D`, `#5A5A5A`). The legacy mid-tones (`#54A24B`, `#72B7B2`, …) fail AA with white text — swap them when fixing `LOW_CONTRAST_TEXT` warnings.
10. **Quote ambiguous labels** — labels containing `()`, `|`, `:`, `<`, `>` must be quoted to avoid `NO_VISUAL_ELEMENTS`.
11. **Direction matches shape** — for `flowchart`/`graph`, the directive direction (`LR` vs `TB`) should match the diagram's natural axis. Long horizontal chains use `LR`; deep hierarchies use `TB`. A wrong choice here is the most common cause of `ASPECT_RATIO_EXTREME`.
12. **Project-level `mermaidLayout: { mode: 'auto' }` is set** — verify the repo's `diagramkit.config.json5` (or `.ts`) has `mermaidLayout: { mode: 'auto' }`. Without it, the renderer cannot auto-flip / ELK-rebalance, and the agent loop has to fix every `ASPECT_RATIO_EXTREME` source-by-source. If the config is missing, add it before applying per-source flips.
13. **Readability budget** — verify ≤ 50 nodes (dense) / ≤ 100 (sparse), ≤ 100 connections, ≤ 8 parallel branches per node. If exceeded, plan to split during the fix loop.
14. **Shape semantics** — diamond `{label}` only used for decisions; rectangle for processes; cylinder for storage; hexagon for external systems. Circle `((label))` only for start/end terminators (never as a hub or decoration). Cosmetic shape choices increase comprehension time ~4×.
15. **Colour is not the only differentiator** — every colour-coded role also has a shape or position cue.

### Validation issue → fix mapping

When the orchestrator surfaces a validate issue tied to a `.mermaid` source, apply:

| Code                      | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CONTAINS_FOREIGN_OBJECT` | Add the **flat** `%%{init: {'htmlLabels': false}}%%` before the diagram keyword; convert `<br/>` → `\n` and quote those labels; re-render with `--force`.                                                                                                                                                                                                                                                                                             |
| `LOW_CONTRAST_TEXT`       | Swap legacy palette → AA palette (see "Color Palette" above). Update both `fill` and `stroke` in the matching `classDef`. Re-render with `--force`, then re-validate.                                                                                                                                                                                                                                                                                 |
| `NO_VISUAL_ELEMENTS`      | Quote labels containing punctuation; verify the diagram keyword is present on its own line; re-render with `--force`.                                                                                                                                                                                                                                                                                                                                 |
| `MISSING_SVG_CLOSE`       | Same as above; check `failedDetails[]` from the render JSON for the underlying parse error.                                                                                                                                                                                                                                                                                                                                                           |
| `EXTERNAL_RESOURCE`       | Strip any `themeCSS` directive or external icon URLs from the source.                                                                                                                                                                                                                                                                                                                                                                                 |
| `ASPECT_RATIO_EXTREME`    | Run the [Readability + iterative escalation loop](#readability--iterative-escalation-loop). Step ladder: flip directive → reduce/restructure → split into multiple diagrams → swap engine to `.drawio` (icon/precision) or `.dot` (pure DAG). Cap at 8 iterations; record residual otherwise.                                                                                                                                                         |
| `SVG_VIEWBOX_TOO_WIDE`    | Same escalation ladder as `ASPECT_RATIO_EXTREME` — the two codes catch independent failure modes (extreme ratio vs extreme absolute width). The default threshold is 800 px, calibrated against Pagesmith-style ~500 px content columns; raise with `--max-width <px>` for wider sites or `--no-max-width` to skip. See [Width-reduction patterns](#width-reduction-patterns-for-svg_viewbox_too_wide) below for the empirically-validated fix order. |

### Width-reduction patterns for `SVG_VIEWBOX_TOO_WIDE`

Empirically validated on a 4-repo audit (~700 too-wide SVGs). Apply in order — earlier fixes are cheaper, later fixes give larger reductions but cost more authoring time.

| #   | Pattern                              | When it works                                                                                               | Typical width reduction | Notes                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Outer `LR` → `TB`**                | Single linear pipeline, ≤ 6 nodes per rank, no parallel subgraphs                                           | 30-60%                  | Cheap one-line fix. Worked on the chunked-uploads case (2189 → 1044 px). Useless when the bottleneck is parallel subgraphs at the same rank.                                                                                                                                                                                                                                            |
| 2   | **Inner subgraph `direction TB`**    | Subgraph with N nodes is laid out horizontally and dominates outer width                                    | 0-20%                   | **Often a no-op** — `direction TB` does NOT override the horizontal pull from cross-subgraph edges. Only helps when the subgraph has no outgoing fan and its nodes are independent.                                                                                                                                                                                                     |
| 3   | **`<br/>` → `\n` in labels**         | Always (cosmetic — keeps labels safe with `htmlLabels: false`)                                              | 0%                      | Doesn't change layout; do it anyway because mixed `<br/>` / `\n` is fragile.                                                                                                                                                                                                                                                                                                            |
| 4   | **COLLAPSE REPLICAS**                | N×M cross-subgraph fan (e.g. `GW1 & GW2 & GW3 --> RLS1 & RLS2 & RLS3`)                                      | **60-80%**              | The single most powerful fix for "fan-out" architecture diagrams. Replace `GW1 / GW2 / GW3` with one node `GW["Gateway Nodes\n(horizontally scaled)"]`. The diagram shows the _data path_, not the _replica count_. Validated: 2680 → 544 px on the rate-limiter data-path diagram.                                                                                                     |
| 5   | **REMOVE WRAPPER SUBGRAPHS**         | Outer `flowchart TB`, subgraphs are mostly cosmetic groupings (no edges leave/enter the subgraph as a unit) | **40-70%**              | When subgraphs only carry a label and don't constrain layout, Mermaid still allocates horizontal space for each. Drop the `subgraph X[...] ... end` wrappers entirely and let ELK pack the flat node set. Validated: 5 v5 architecture diagrams went from 1500-1700 px to <800 px with only this change. Useful when subgraphs were added for visual grouping rather than connectivity. |
| 6   | **SPLIT into 2-3 diagrams**          | 6+ subgraphs / 25+ nodes — the diagram covers multiple concerns                                             | 50-70%                  | Group by concern (e.g. ingress vs delivery; data path vs side concerns). Each split diagram should still tell one story comprehensible in ~90 s. Validated: 2810 → 947 px (ingress) + 1112 px (delivery) on the notification-system diagram.                                                                                                                                            |
| 7   | **Combine 4 + 5 + 6**                | Diagram has fan-out AND grouping AND multiple concerns                                                      | 80%+                    | Apply COLLAPSE first (cheapest semantic edit), then REMOVE WRAPPERS, then SPLIT only what's still too wide. The rate-limiter diagram needed COLLAPSE + SPLIT to drop from 2680 to 544 px.                                                                                                                                                                                               |
| 8   | **Engine swap (Mermaid → Graphviz)** | Pure DAG with no Mermaid-specific feature in use                                                            | varies                  | Last resort. Graphviz has direct `ratio="0.75"` width control that Mermaid lacks. Cost: rewriting the source in DOT.                                                                                                                                                                                                                                                                    |

**Anti-patterns that don't help** (don't waste a fix iteration on these):

- Adding `mermaidLayout: { mode: 'auto' }` if it's already enabled — it tries flip + ELK on every render and only catches LR→TB cases. The validate WARN about this only matters when the config is missing entirely.
- Removing `<br/>` for `\n` in labels alone — same node count, same edges, same width.
- Adding `direction TB` to subgraphs whose horizontal layout is driven by cross-edges.
- **Adding `direction TB` to ALL subgraphs in a `flowchart TB` outer layout — this often makes width WORSE.** Validated: stateloom architecture went from 998 px → 1715 px after this change. Inner nodes stack vertically (good — narrower columns) but the outer layout still places 4+ subgraphs side-by-side at the same rank, and now each is taller, so the overall bounding box widens further. The right tactic is the opposite: leave subgraphs at their default direction so each stays a short horizontal strip.

### The "fat-subgraph" residual case (Pattern 1 alone insufficient)

After applying Pattern 1 (outer `LR` → `TB`), some `flowchart TB` diagrams with 4+ outer subgraphs and 5+ nodes inside one of them remain in the 800–1100 px range — borderline. The width is dominated by the widest subgraph row (mermaid arranges outer subgraphs in `2×N` grids when they're independent). For these:

- **Acceptable to ship** if they're navigation-only "you are here" overviews where readers will zoom — the SVG is vector and zoom keeps text crisp.
- **Otherwise apply Pattern 5 (SPLIT)** — break the fat subgraph (e.g. `Adapters` with 5 framework rows) into its own diagram, leaving the architecture overview lighter.
- **Do NOT** try to force `direction TB` on the fat subgraph — see anti-pattern above.

When the iteration loop hits 8 attempts on a single source without clearing the threshold, log it as a residual finding (per the `diagramkit-review` Phase 5 rules) instead of looping forever.

### Sequence diagrams (`sequenceDiagram`) — structural width floor

Sequence diagrams have a per-participant column min-width that is NOT controllable via the standard `init` directives — `actorMargin` / `messageMargin` adjustments do not lower the floor. Empirical finding: sequences with 7+ participants floor around **~1450 px** regardless of label-shortening or message-text edits.

| Participants | Practical width floor            |
| ------------ | -------------------------------- |
| 3-4          | ~700 px (usually fits under 800) |
| 5-6          | ~1100 px                         |
| 7+           | **~1450 px (residual class)**    |

For 7+ participant sequences, the only effective fixes are:

- **Split the sequence into phases** — separate diagrams for the request phase vs the async/delivery phase, etc. Each gets ≤ 5 participants.
- **Collapse non-load-bearing participants** — e.g. merge `Cache + Database` into one `Storage` lane if the cache hit/miss isn't the focus.
- **Engine swap to a state diagram or flowchart** — when the participants are not the point and the message ordering can be expressed as a DAG.

Mark as residual otherwise; vector zoom keeps text legible at 2-3× viewport zoom.

### Single-file repair loop

For each source touched:

```bash
npx diagramkit render <file>.mermaid --force --json
npx diagramkit validate <file's .diagramkit dir> --json
```

Stop when both report zero targeted findings, or after 8 iterations (mark as residual). When `ASPECT_RATIO_EXTREME` is present, follow the escalation ladder in the [iterative loop section](#the-iterative-loop) instead of bailing early — flip → reduce → split → engine swap is the canonical sequence.

## References

- **`references/diagram-types.md`** — Full syntax reference for all 21 Mermaid diagram types with examples, gotchas, and best practices.
- **`references/color-and-theming.md`** — Detailed color palettes, dark mode variables, WCAG contrast optimization, classDef/linkStyle reference.
