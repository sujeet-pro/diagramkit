---
name: diagramkit-auto
description: Automatically select the best diagramkit engine (Mermaid, Excalidraw, Draw.io, or Graphviz) for a given diagram task, then delegate to the engine-specific skill. Use when the user asks to create a diagram without specifying which engine, or when you need to decide between Mermaid, Excalidraw, Draw.io, or Graphviz.
---

# Diagramkit Auto — Engine Selection

Analyze diagram requirements, select the best engine, then delegate to the engine-specific skill.

> **Reviewing existing diagrams instead of creating new ones?** Use [`diagramkit-review`](../diagramkit-review/SKILL.md). It owns the cross-engine audit / re-render / validate / contrast-fix workflow and delegates per-engine repairs back to each engine SKILL's "Review Mode" section. This skill (`diagramkit-auto`) is for routing **new** diagram requests.

## Engine selection table

| Signal                                                                                                                                                                        | Engine     | Skill                   | Extension     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------- | ------------- |
| Process flow, pipeline, sequence, ER, class, state, timeline, gantt, C4, mindmap, pie, quadrant, sankey, XY, block, architecture, kanban, journey, packet, radar, requirement | Mermaid    | `diagramkit-mermaid`    | `.mermaid`    |
| Architecture overview, system context, codebase map, freeform layout, hand-drawn aesthetic, concept map, whiteboard visual                                                    | Excalidraw | `diagramkit-excalidraw` | `.excalidraw` |
| Network topology, cloud deployment (AWS/Azure/GCP icons), BPMN, org chart, enterprise system map, multi-page, swimlanes, precise positioning                                  | Draw.io    | `diagramkit-draw-io`    | `.drawio`     |
| Dependency graph, call graph, strict algorithmic layout, rank-constrained DAGs, existing .dot/.gv source                                                                      | Graphviz   | `diagramkit-graphviz`   | `.dot`        |

## Tie-breaking rules

When multiple engines could work, apply these rules in order:

1. **Default to Mermaid** — text-first, diffs cleanly in Git, fastest to revise, widest type support (21+ types). Use whenever content maps to a structured diagram type.
2. **Prefer Excalidraw over Draw.io** when the diagram is an explanation or overview that benefits from a hand-drawn feel, not precise positioning.
3. **Prefer Draw.io over Excalidraw** when the diagram needs cloud vendor icons (AWS/Azure/GCP), precise manual positioning, containers/swimlanes, or multi-page support.
4. **Prefer Graphviz over Mermaid** when the graph structure is primary and no Mermaid-specific type (sequence, ER, gantt, etc.) applies — pure node/edge dependency or call graphs.
5. **Prefer Mermaid over Graphviz** when a specific Mermaid type matches (sequence, ER, gantt, gitgraph, C4, pie, etc.) rather than a generic directed graph.

## Workflow

### 1. Analyze the request

Evaluate the user's diagram request against the selection table above. Identify:

- What kind of information is being visualized?
- Does it map to a specific structured type (sequence, ER, class, gantt)?
- Does it need vendor icons or precise positioning?
- Does it need freeform layout or hand-drawn aesthetic?
- Is graph structure (nodes + edges) the primary content?

### 2. Select the engine

Apply the selection table, then tie-breaking rules. Pick one engine.

### 3. Resolve diagramkit (always prefer the local install)

Before delegating, anchor on the locally installed diagramkit so the CLI/API surface matches what is actually in the repo:

```bash
# 1. REQUIRED: prefer the locally installed CLI.
if [ -f ./node_modules/.bin/diagramkit ]; then
  # Use: npx diagramkit <command>      (auto-resolves ./node_modules/.bin/diagramkit)
  # And read node_modules/diagramkit/REFERENCE.md first for the exact CLI/API surface
  # of the installed version.
  :
else
  # 2. Install locally — do NOT fall back to a global install.
  #    The diagramkit-* skills are written against `node_modules/diagramkit/REFERENCE.md`,
  #    so a globally installed CLI may diverge from what the skills assume.
  npm add diagramkit
fi
```

> Read `node_modules/diagramkit/REFERENCE.md` (and `node_modules/diagramkit/llms.txt`) before running render commands. They are version-pinned to the installed package, so they are always in sync with the CLI you will actually invoke.

If using Mermaid, Excalidraw, or Draw.io engines, ensure Chromium is installed:

```bash
npx diagramkit warmup
```

Graphviz does NOT need warmup (uses WASM, no browser).

### 4. Read project config

Check for `diagramkit.config.json5` or `diagramkit.config.ts`:

- `outputDir` — where generated SVGs go (default: `.diagramkit/`)
- `defaultFormats` — output formats (default: `['svg']`)
- `defaultTheme` — theme variants (default: `'both'` = light + dark)
- `sameFolder` — output next to source instead of subfolder (default: `false`)

### 5. Delegate to the engine skill

Read the SKILL.md for the selected engine and follow its complete workflow:

- `diagramkit-mermaid` — for Mermaid diagrams
- `diagramkit-excalidraw` — for Excalidraw diagrams
- `diagramkit-draw-io` — for Draw.io diagrams
- `diagramkit-graphviz` — for Graphviz diagrams

### 6. Post-generation checklist

After the engine skill completes its workflow:

- Diagram source file created with semantic filename
- Rendered with `diagramkit render` (both light + dark variants)
- Validated with `diagramkit validate` (all SVGs pass)
- Raster images generated if project config requires them
- Embedded in markdown using `<picture>` pattern (if applicable)
- Source file committed alongside rendered outputs

### 7. Iterative render → validate loop (agent-friendly)

When rendering an entire folder of existing diagrams, drive the loop with JSON output so an agent can parse results:

```bash
# 1. Render with --force so the manifest doesn't short-circuit stale fixes
diagramkit render <dir> --json --force

# 2. Validate recursively and inspect issues[].code / issues[].severity
diagramkit validate <dir> --recursive --json
```

For each source the agent should:

1. Parse `result.failed[]` and `result.failedDetails[]` from render output. Fix the source (syntax, directive, invalid color).
2. Parse each file's `issues[]` from validate output. Treat `severity: "error"` as must-fix. Treat warnings (`CONTAINS_FOREIGN_OBJECT`, `EXTERNAL_RESOURCE`) as fix-unless-we-truly-only-render-for-SVG-viewers, since both silently degrade in `<img>`-based Markdown embeds.
3. Re-render only the changed files with `--force` — the manifest caches on source hash so an unchanged file will be skipped otherwise.
4. Stop when both `render.failed` is empty and every file's `issues[]` has no errors (and, for Markdown-embedded docs, no warnings you care about).

Cap fixes at ~8 iterations per file to avoid infinite loops on engine-level incompatibilities.

### 8. Orphaned output cleanup

When the diagramkit filename convention changes (e.g. `foo.light.svg` → `foo-light.svg`), the renderer writes new files without pruning the old ones. Agents working on a repo should check for stale siblings:

```bash
# Find both-variant duplicates next to any rendered output folder
fd -e svg . <dir> | awk -F'/' '{print $NF}' | sort | uniq -c | awk '$1>2'
```

Delete clearly-stale variants only after confirming with the repo owner.

## Universal rules

These apply regardless of engine:

1. **Source alongside output** — commit the editable source file next to rendered assets
2. **Smallest diagram** — prefer the minimal diagram that explains the point
3. **Semantic IDs** — use descriptive IDs (`auth_service`), not single letters (`a`)
4. **One story per diagram** — keep each diagram focused on a single concept
5. **No hardcoded themes** — let diagramkit control theme selection
6. **Hex colors only** — no named colors (`red`, `blue`)
7. **Mid-tone palette** — avoid near-white or near-black fills
8. **Re-render after edits** — never hand-edit generated SVGs
9. **Image-embed safety** — if the output SVG will be referenced via Markdown `![](foo.svg)`, `<picture>`, or any `<img>` tag: start Mermaid sources with `%%{init: {'htmlLabels': false}}%%` and prefer `\n` over `<br/>` for multi-line labels; strip `<a xlink:href="…">` wrappers from hand-exported drawio SVGs (see `diagramkit-draw-io/SKILL.md`).

## Force rendering

To regenerate all diagrams regardless of cache:

```bash
npx diagramkit render . --force
```
