---
name: diagramkit-review
description: Audit and repair every diagram in a repository — lint each source file against its engine's authoring rules, force-regenerate every SVG, validate all rendered SVGs (structure, embed-safety, WCAG contrast), and iteratively fix issues by delegating engine-specific repairs to diagramkit-mermaid, diagramkit-excalidraw, diagramkit-draw-io, and diagramkit-graphviz. Use when the user asks to review/audit existing diagrams, fix contrast warnings, regenerate stale SVGs, or run a pre-merge diagram health check.
---

# diagramkit Review

Cross-engine review and repair workflow for an existing diagramkit-managed repo. This skill OWNS the orchestration; per-engine fixes are delegated back to the engine skill (`diagramkit-mermaid`, `diagramkit-excalidraw`, `diagramkit-draw-io`, `diagramkit-graphviz`) using each one's **Review Mode** section.

## When to use this skill

Trigger on requests like:

- "Review/audit the diagrams in this repo."
- "Re-render and validate every diagram."
- "Fix the low-contrast warnings."
- "Make sure every diagram passes `diagramkit validate`."
- "Pre-release diagram check" / "diagram CI gate".

For **creating a new diagram**, do NOT use this skill — use `diagramkit-auto` (which routes to the engine-specific authoring skill). This skill assumes diagram sources already exist.

## Read first

1. `node_modules/diagramkit/REFERENCE.md` — version-pinned CLI/API contract. **Read before running any `diagramkit` command** so the flag set you use matches the installed version.
2. [`references/audit-checklist.md`](references/audit-checklist.md) — per-engine source-file audit checklist (what to look for in `.mermaid` / `.excalidraw` / `.drawio` / `.dot` before re-rendering).
3. [`references/issue-fix-matrix.md`](references/issue-fix-matrix.md) — every `diagramkit validate` issue code mapped to severity, root cause, and the engine-specific fix tactic.

## Resolve diagramkit (always prefer the local install)

Anchor on the locally installed CLI so this review reflects what the repo actually ships with. **Never** fall back to a globally installed `diagramkit`.

```bash
if [ ! -x ./node_modules/.bin/diagramkit ]; then
  npm add diagramkit
fi

DK="npx diagramkit"
$DK --version              # confirms the LOCAL bin
$DK warmup                 # required if any source is .mermaid / .excalidraw / .drawio
```

Skip `warmup` only when the repo is Graphviz-only (`.dot` / `.gv` / `.graphviz`).

## Workflow overview

The review runs in five phases. Phases 1 and 4 are interactive (apply edits to source files); the rest are scripted commands whose JSON output drives the loop.

| Phase | Goal                                | Tool                                                   |
| ----- | ----------------------------------- | ------------------------------------------------------ |
| 1     | Source-file audit (pre-render lint) | Per-engine `--review` mode (delegated)                 |
| 2     | Force re-render every diagram       | `diagramkit render . --force --json`                   |
| 3     | Validate generated SVGs             | `diagramkit validate . --recursive --json`             |
| 4     | Iteratively fix render + validate   | Per-engine `--review` mode (delegated)                 |
| 5     | Summary report                      | Markdown summary written to `.temp/diagram-review/...` |

**Stop-loss**: cap any per-file fix loop at 8 iterations (matches the convention in `diagramkit-auto`). If a file still fails after 8 iterations, mark it as a residual finding in the summary instead of looping forever.

## Phase 1 — Source-file audit

Before re-rendering, lint each source so cosmetic / authoring issues are caught while it's cheap to fix. Run for every source extension present in the repo.

### 1.1 Discover sources

Use the same extension set diagramkit recognises:

```bash
fd -t f -e mermaid -e mmd -e mmdc \
            -e excalidraw \
            -e drawio -e drawio.xml -e dio \
            -e dot -e gv -e graphviz
```

If `fd` is unavailable, fall back to `git ls-files | rg '\\.(mermaid|mmd|mmdc|excalidraw|drawio(\\.xml)?|dio|dot|gv|graphviz)$'`.

Group the results by engine (mermaid / excalidraw / drawio / graphviz). Skip anything inside `.diagramkit/`, `node_modules/`, or `.temp/`.

### 1.2 Per-engine audit (delegated)

For each engine that has at least one source file, **read that engine's SKILL.md and follow its `## Review Mode` section** against every source for that engine:

- Mermaid → `skills/diagramkit-mermaid/SKILL.md` § Review Mode
- Excalidraw → `skills/diagramkit-excalidraw/SKILL.md` § Review Mode
- Draw.io → `skills/diagramkit-draw-io/SKILL.md` § Review Mode
- Graphviz → `skills/diagramkit-graphviz/SKILL.md` § Review Mode

The compact cross-engine checklist lives in [`references/audit-checklist.md`](references/audit-checklist.md) — use that as a quick lookup, but defer to the engine SKILL.md for any disagreement (engine skills are version-pinned to the renderer behaviour).

Apply the minimum textual fix that satisfies the rule. Never reformat surrounding lines that are already correct.

### 1.3 Record audit edits

For every source you modified, log `path → rule violated → fix applied`. This list feeds the Phase 5 report.

## Phase 2 — Force re-render every diagram

Force re-render so the manifest cache (which keys on source hash) cannot mask a stale fix from Phase 1.

```bash
$DK render . --force --json
```

If the repo confines diagrams to a subdirectory, scope the render to it (e.g. `$DK render docs --force --json`).

Parse the JSON envelope:

- `result.rendered[]` — sources that produced output successfully.
- `result.failed[]` — sources that did not produce output.
- `result.failedDetails[]` — failure reason per source (engine error, missing dependency, etc.).

Treat any non-empty `failed[]` as a **must-fix before Phase 3**: feed each failure straight into the per-engine Review Mode in Phase 4 and re-run Phase 2 for those files only:

```bash
$DK render <single-source> --force --json
```

Do not advance to validation until `failed[]` is empty.

## Phase 3 — Validate generated SVGs

Validate every rendered SVG (both light and dark variants are emitted by default):

```bash
$DK validate . --recursive --json
```

Each entry in the JSON output has `path`, `valid`, and `issues[]`. Each issue has `code`, `severity` (`error` | `warning`), and a human-readable `message`. The full mapping of codes to fixes lives in [`references/issue-fix-matrix.md`](references/issue-fix-matrix.md). The most common ones:

| Code                      | Sev     | What it means                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NO_VISUAL_ELEMENTS`      | error   | SVG is empty — render produced nothing usable. Source has a syntax error.                                                                                                                                                                                                                                                                                                                                              |
| `MISSING_SVG_CLOSE`       | error   | Render crashed mid-output. Source error or engine crash.                                                                                                                                                                                                                                                                                                                                                               |
| `EMPTY_FILE`              | error   | Output file is zero bytes. Re-render; check Chromium (`diagramkit warmup`).                                                                                                                                                                                                                                                                                                                                            |
| `CONTAINS_SCRIPT`         | error   | SVG has `<script>` — won't work in `<img>` embeds.                                                                                                                                                                                                                                                                                                                                                                     |
| `CONTAINS_FOREIGN_OBJECT` | warning | Mermaid emitted HTML labels — silently degrade in `<img>` / Markdown embeds.                                                                                                                                                                                                                                                                                                                                           |
| `EXTERNAL_RESOURCE`       | warning | SVG references external URLs — blocked in `<img>` embeds.                                                                                                                                                                                                                                                                                                                                                              |
| `LOW_CONTRAST_TEXT`       | warning | Text/background pair fails WCAG 2.2 AA (< 4.5:1 normal, < 3:1 large). **Accessibility regression — always fix.**                                                                                                                                                                                                                                                                                                       |
| `ASPECT_RATIO_EXTREME`    | warning | Rendered SVG width/height ratio is outside the readable band (default `[1:1.9, 3.3:1]` against 4:3). Diagrams overflowing typical doc widths (~650–800 px) lose ~39% text legibility. **Readability regression — always fix** (with split / engine-swap escalation if needed).                                                                                                                                         |
| `SVG_VIEWBOX_TOO_WIDE`    | warning | Rendered SVG's _absolute_ viewBox width exceeds the readable threshold (default 1600 px). The aspect-ratio check passes when ratio is fine, but a 2000+ px-wide SVG still scales by ~3× into a 700-800 px doc column, dropping text to ~33% of native size. **Readability regression — always fix** with the same escalation ladder as `ASPECT_RATIO_EXTREME` (engine-local rebalance → reduce → split → engine swap). |

**Severity policy**

- `severity: "error"` — must fix; review fails until clean.
- `severity: "warning"` — must fix when SVGs are embedded via Markdown `![]()`, GitHub `<picture>`, or any `<img>` tag (the dominant case). Only deliberately allow warnings when the user explicitly confirms outputs are consumed only by SVG-aware viewers.
- `LOW_CONTRAST_TEXT`, `ASPECT_RATIO_EXTREME`, and `SVG_VIEWBOX_TOO_WIDE` are **always** fixes in this review; accessibility and readability regressions are not optional. Combined treatment: a "beautiful diagram" must pass the contrast scan, the aspect-ratio check, AND the absolute-width check before it is shipped. The two readability codes are independent — a near-square 2400×2200 SVG passes ratio but fails width; a 1300×400 SVG passes width but fails ratio. Treat both as the same escalation ladder.

## Phase 4 — Iterative repair (delegated, with escalation ladder)

For every issue surfaced by Phase 2 or Phase 3, find the **source file** that produced the affected SVG (output filename → source via diagramkit's `<source-stem>-<theme>.<ext>` convention), then jump into the matching engine's `## Review Mode` to apply the fix:

1. Map issue code + engine → fix tactic via [`references/issue-fix-matrix.md`](references/issue-fix-matrix.md).
2. Apply the minimum textual change in the source file.
3. Re-render only that single file with `--force --json`.
4. Re-validate only that file's outputs (`$DK validate <file's .diagramkit dir> --json`).
5. Stop on first clean run; otherwise repeat (max 8 iterations per source).

For `LOW_CONTRAST_TEXT`, always replace fills with the engine's WCAG 2.2 AA palette documented in its SKILL.md, NOT the legacy "pastel" palette. The exact swap tables for each engine are in `references/audit-checklist.md`.

### `ASPECT_RATIO_EXTREME` — escalation ladder

The aspect-ratio fix is the only validation issue with a multi-step escalation policy because a single textual fix often isn't enough. Apply the steps in order; advance to the next step only when the current one didn't bring the rendered SVG inside the readable band. Re-render with `--force` and re-validate after **each** step.

| #   | Step                             | Engines                                                                                                                                                                                                                                                                                      | When to use                                                                                                                 |
| :-- | :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Engine-local rebalance**       | Mermaid: flip directive (`LR` ↔ `TB`) and/or set `mermaidLayout: { mode: 'auto' }` in the project config. Drawio: reflow `<mxGeometry>` rows/columns. Graphviz: add `ratio="0.75"` to `graph [...]` and/or flip `rankdir`. Excalidraw: reflow shape positions per the layout grids.          | First attempt — usually clears the warning when the diagram has natural slack.                                              |
| 2   | **Collapse replica nodes**       | Mermaid only (high-leverage). When `N×M` cross-subgraph fan exists (`GW1 & GW2 & GW3 --> RLS1 & RLS2 & RLS3`), replace the replicas with a single representative node per tier (`GW` → `RLS`). The diagram shows the _data path_, not the _replica count_. Validated 60-80% width reduction. | Applies to "fan-out" architecture diagrams with redundancy/scale-out shown as separate nodes.                               |
| 3   | **Reduce / restructure**         | Merge low-information nodes; pull subgraphs into separate files; cap branching width at 8 children per parent.                                                                                                                                                                               | When the diagram is genuinely too dense, not just badly-oriented.                                                           |
| 4   | **Split into multiple diagrams** | Save as `<name>-<concern-a>.<ext>` + `<name>-<concern-b>.<ext>` (e.g. `-ingress` / `-delivery`, `-data-path` / `-quota-and-observability`). Update embedding markdown to reference all parts. Keep the engine the same.                                                                      | When the source covers two unrelated concerns or has an irreducibly long axis — splitting beats cramming.                   |
| 5   | **Swap engine** (last resort)    | Mermaid → Drawio (icon-heavy / precision) or Graphviz (pure DAG). Drawio → Graphviz (algorithmic) or Mermaid (text-first structured types). Graphviz → Mermaid (structured types) or Drawio (icons). Excalidraw → Mermaid or Graphviz. Delete the original source after the rewrite.         | When the engine itself is fighting the layout — the cost is rewriting the source in the new engine's syntax.                |
| 6   | **Record residual**              | If steps 1–5 still leave the SVG outside the band, log the diagram in the Phase 5 report under **Residual issues** with the chain of attempts. Do not infinite-loop.                                                                                                                         | The 8-iteration cap was reached, OR the user explicitly confirmed the diagram should ship as-is (e.g. a deliberate banner). |

### Combined contrast + aspect loop

In practice the loop interleaves both checks because a palette swap can cascade across diagrams:

```text
for each source file with issues:
  for iter in 1..8:
    apply minimum textual fix for the highest-priority issue
    render --force --json
    validate --json
    if no errors AND no LOW_CONTRAST_TEXT AND no ASPECT_RATIO_EXTREME:
      done
    if iter == 8:
      record as residual; advance to next file
```

After every fix loop completes, **re-run Phase 3 in full** so cross-file regressions surface (a palette change in one file can reveal another file's previously-masked failure; an aspect-ratio split can change which files the markdown references).

## Phase 5 — Summary report

Write the report to `.temp/diagram-review/<timestamp>/report.md` (the `.temp/` rule is universal in diagramkit — never write outside `.temp/`):

```markdown
# diagramkit review — <ISO-timestamp>

## Source-file audit (Phase 1)

- <path> — <rule> — <fix>

## Render results (Phase 2)

- Rendered: <count>
- Failed (initial): <count>
- Failed (after Phase 4): <count>

## SVG validation (Phase 3 + Phase 4)

- Files validated: <count>
- Errors fixed: <count>
- Warnings fixed: <count>
- LOW_CONTRAST_TEXT fixes: <count>
- ASPECT_RATIO_EXTREME fixes: <count>
  - Cleared at step 1 (engine-local rebalance): <count>
  - Cleared at step 2 (reduce / restructure): <count>
  - Cleared at step 3 (split into multiple diagrams): <list of source → split parts>
  - Cleared at step 4 (engine swap): <list of source → new engine>
- Residual issues (failed >8 iterations): <list with last-attempted step>

## Recommended next steps

- <e.g. add `npm run render:diagrams:check` to CI>
- <e.g. delete orphaned `<old-name>-<theme>.svg` siblings>
- <e.g. add `mermaidLayout: { mode: 'auto' }` to diagramkit.config.json5 if not already set>
```

If the repo has CI, recommend wiring the validate command into a pre-merge job:

```yaml
- name: Validate diagrams
  run: |
    npx diagramkit warmup
    npx diagramkit render . --force
    npx diagramkit validate . --recursive
    git diff --exit-code -- '*/.diagramkit/**'
```

## Operating rules

- **Never hand-edit generated SVGs.** Every SVG fix happens by editing the source and re-rendering.
- **Always force-render after a source edit.** The manifest hashes the source — without `--force` an unchanged-on-disk file will skip render.
- **One fix per iteration.** Apply the smallest change that addresses the issue, then re-validate. Stack fixes across iterations, not within one.
- **Cap loops at 8 iterations per file.** Beyond that, log as a residual finding for the summary; do not infinite-loop on engine-level incompatibilities.
- **Respect the `.temp/` convention.** All reports, plans, scratch JSON go under `.temp/diagram-review/<timestamp>/`. Never write outside `.temp/`.
- **Delegate, don't duplicate.** Engine-specific authoring rules live in the engine SKILL.md. This skill orchestrates; it does not re-author engine guidance.

## Related skills

- [`diagramkit-auto`](../diagramkit-auto/SKILL.md) — engine selection for **new** diagrams (this skill assumes sources exist).
- [`diagramkit-mermaid`](../diagramkit-mermaid/SKILL.md) — Mermaid authoring + Review Mode.
- [`diagramkit-excalidraw`](../diagramkit-excalidraw/SKILL.md) — Excalidraw authoring + Review Mode.
- [`diagramkit-draw-io`](../diagramkit-draw-io/SKILL.md) — Draw.io authoring + Review Mode.
- [`diagramkit-graphviz`](../diagramkit-graphviz/SKILL.md) — Graphviz authoring + Review Mode.
- [`diagramkit-setup`](../diagramkit-setup/SKILL.md) — bootstrap diagramkit if not yet installed.

## References

- [`references/audit-checklist.md`](references/audit-checklist.md) — per-engine source-file audit checklist.
- [`references/issue-fix-matrix.md`](references/issue-fix-matrix.md) — `diagramkit validate` issue codes → engine-specific fix tactics.
