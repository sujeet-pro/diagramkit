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

| Code                      | Severity | Meaning                                           | Fix                                                                                                                                                                                                                                                                        |
| ------------------------- | -------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CONTAINS_FOREIGN_OBJECT` | warning  | Mermaid used HTML labels inside `<foreignObject>` | Add `%%{init: {'htmlLabels': false}}%%` **before** the diagram keyword. Use the flat form (the nested `{'flowchart': {'htmlLabels': false}}` form is silently ignored on Mermaid 11). If labels use `<br/>`, switch to `\n` and quote the label. Re-render with `--force`. |
| `NO_VISUAL_ELEMENTS`      | error    | SVG is an empty shell — syntax error in source    | Check the Mermaid source for typos, missing directives, or invalid syntax. Quote labels that contain punctuation/parens/pipes.                                                                                                                                             |
| `MISSING_SVG_CLOSE`       | error    | Render crashed mid-output, truncated SVG          | Fix source syntax errors and re-render with `--force`                                                                                                                                                                                                                      |
| `EMPTY_FILE`              | error    | Render produced no output                         | Re-render; check that Chromium is installed (`diagramkit warmup`)                                                                                                                                                                                                          |
| `CONTAINS_SCRIPT`         | error    | SVG has `<script>` tags, won't work in `<img>`    | Re-render with diagramkit (it strips scripts); avoid custom Mermaid plugins                                                                                                                                                                                                |
| `EXTERNAL_RESOURCE`       | warning  | SVG references external URLs                      | Blocked in `<img>` embeds; re-render to inline resources. For hand-authored SVGs (especially drawio exports) strip outer `<a xlink:href="…">` wrappers.                                                                                                                    |

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

`diagramkit validate` distinguishes `severity: "error"` (render-breaking) from `severity: "warning"` (embeds may degrade). `CONTAINS_FOREIGN_OBJECT` and `EXTERNAL_RESOURCE` are warnings, not failures — the render phase will not fail on them, but they will silently break `<img>` embeds in Markdown pages. Treat them as fixable defects for pages that embed via Markdown image syntax or `<picture>`.

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

- Keep most diagrams under ~15 nodes.
- Use subgraphs for groups of related nodes.
- Use `TD` for hierarchical flows, `LR` for pipelines.
- Quote labels that contain punctuation or reserved words.
- Split large systems into overview + detail diagrams.
- One story per diagram — keep each diagram focused on a single concept.
- **Start every flowchart / class / state / ER diagram with `%%{init: {'htmlLabels': false}}%%`** and use `\n` (not `<br/>`) for multi-line labels. This keeps SVGs safe for `<img>` embedding across Markdown, GitHub, and most static-site generators.
- **Re-render with `--force` after edits** — the manifest caches on source hash, so an unchanged-file reformat will be skipped without `--force`.

## Review Mode

Use this section when invoked from [`diagramkit-review`](../diagramkit-review/SKILL.md) (or whenever the user asks to audit/fix existing `.mermaid` sources rather than create new ones).

### Source-file audit (per `.mermaid` / `.mmd` / `.mmdc`)

For each source, verify in order — apply the minimum textual fix for each rule that fails:

1. **Header comments present** — `%% Diagram: …` and `%% Type: …` lines at the top.
2. **Init directive (img-embed safety)** — `%%{init: {'htmlLabels': false}}%%` is present **before** the diagram keyword (`flowchart`, `classDiagram`, `stateDiagram-v2`, `erDiagram`). Use the **flat** form. The nested `{'flowchart': {'htmlLabels': false}}` form is silently ignored on Mermaid 11 and produces `<foreignObject>` in the SVG.
3. **No hardcoded theme** — strip any `%%{init: {'theme': '…'}}%%`. diagramkit injects light/dark themes itself.
4. **Multi-line labels** — every `<br/>` in a label becomes `\n`, and the label is **quoted** so the escape survives parsing: `PHYSICAL["Physical Clocks\nNTP, PTP, TrueTime"]`.
5. **No inline HTML in labels** — `<b>`, `<i>`, `<code>` render as literal text when `htmlLabels` is off; strip them or replace with Markdown-style emphasis (lowercase letters only — Mermaid does not interpret).
6. **Reserved `classDef` names** — none of `root`, `default`, `node`, `cluster`. Rename if found; otherwise the rule leaks to every label in the SVG.
7. **Hex colours only** — replace any named colour (`red`, `blue`, …) with the AA-compliant hex from the palette below.
8. **WCAG palette** — for white-text labels, use only the AA-compliant darker palette (`#2E5A88`, `#1F6E68`, `#B43A3A`, `#8B5E15`, `#2D7A2D`, `#5A5A5A`). The legacy mid-tones (`#54A24B`, `#72B7B2`, …) fail AA with white text — swap them when fixing `LOW_CONTRAST_TEXT` warnings.
9. **Quote ambiguous labels** — labels containing `()`, `|`, `:`, `<`, `>` must be quoted to avoid `NO_VISUAL_ELEMENTS`.

### Validation issue → fix mapping

When the orchestrator surfaces a validate issue tied to a `.mermaid` source, apply:

| Code                      | Fix                                                                                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CONTAINS_FOREIGN_OBJECT` | Add the **flat** `%%{init: {'htmlLabels': false}}%%` before the diagram keyword; convert `<br/>` → `\n` and quote those labels; re-render with `--force`.             |
| `LOW_CONTRAST_TEXT`       | Swap legacy palette → AA palette (see "Color Palette" above). Update both `fill` and `stroke` in the matching `classDef`. Re-render with `--force`, then re-validate. |
| `NO_VISUAL_ELEMENTS`      | Quote labels containing punctuation; verify the diagram keyword is present on its own line; re-render with `--force`.                                                 |
| `MISSING_SVG_CLOSE`       | Same as above; check `failedDetails[]` from the render JSON for the underlying parse error.                                                                           |
| `EXTERNAL_RESOURCE`       | Strip any `themeCSS` directive or external icon URLs from the source.                                                                                                 |

### Single-file repair loop

For each source touched:

```bash
npx diagramkit render <file>.mermaid --force --json
npx diagramkit validate <file's .diagramkit dir> --json
```

Stop when both report zero targeted findings, or after 8 iterations (mark as residual).

## References

- **`references/diagram-types.md`** — Full syntax reference for all 21 Mermaid diagram types with examples, gotchas, and best practices.
- **`references/color-and-theming.md`** — Detailed color palettes, dark mode variables, WCAG contrast optimization, classDef/linkStyle reference.
