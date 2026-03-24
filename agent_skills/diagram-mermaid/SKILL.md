---
name: diagram-mermaid
description: Generate Mermaid diagram source files (.mermaid). Produces the source file only; use /diagramkit to render.
user_invocable: true
arguments:
  - name: description
    description: 'Description of what to diagram'
    required: true
  - name: type
    description: 'Diagram type: flowchart, sequence, class, state, er, gantt, gitgraph, mindmap, timeline, c4, kanban, quadrant, sankey, xy, block, packet, radar, journey, requirement, pie (default: auto-detect)'
    required: false
  - name: theme
    description: 'Mermaid theme: default, forest, dark, neutral, base (default: default)'
    required: false
---

# Mermaid Diagram Generation

Generate diagrams using Mermaid syntax. Supports all 20+ Mermaid v11 diagram types. This skill writes a `.mermaid` source file only -- use `/diagramkit` or `diagramkit render` to produce images.

Accepted file extensions: `.mermaid`, `.mmd`, `.mmdc`

Render the output with `/diagramkit` or:

```bash
diagramkit render diagram.mermaid
```

## Workflow

### Phase 1: Determine Diagram Type

If `type` is not specified, auto-detect from the description (see `/diagrams` orchestrator skill for detection rules). If `type` is specified, use it directly.

### Phase 2: Generate Mermaid Source

Write a `.mermaid` file following the syntax in the reference files below. Apply these quality standards:

1. **Clear labels**: Use descriptive text, not single letters (e.g., `API Gateway` not `A`).
2. **Meaningful IDs**: Use readable IDs like `api_gateway` not `A`.
3. **Proper spacing**: Use subgraphs to group related components.
4. **Visual hierarchy**: Important nodes should be visually prominent.
5. **Readable flow**: Prefer `TD` for hierarchies, `LR` for sequences/timelines.
6. **Theme compatibility**: Avoid hardcoded colors unless necessary. Use `classDef` for styling.
7. **Comments**: Add a header comment with the diagram title.

File header:

```
%% Diagram: <title>
%% Type: <diagram-type>
```

### Phase 3: Report Output

```
Mermaid source file written:
  Source: ./diagrams/auth-flow.mermaid

Render with: diagramkit render ./diagrams/auth-flow.mermaid
```

For inline rendering in markdown (light mode only, no dark variant), use a mermaid code fence.

---

## Diagram Type Reference

Each type has a dedicated reference file with full syntax, examples, and best practices. Read the appropriate reference before generating a diagram of that type.

| Type         | Directive                          | Reference                      |
| ------------ | ---------------------------------- | ------------------------------ |
| Flowchart    | `flowchart TD`                     | `refs/mermaid/flowchart.md`    |
| Sequence     | `sequenceDiagram`                  | `refs/mermaid/sequence.md`     |
| Class        | `classDiagram`                     | `refs/mermaid/class.md`        |
| State        | `stateDiagram-v2`                  | `refs/mermaid/state.md`        |
| ER           | `erDiagram`                        | `refs/mermaid/er.md`           |
| Gantt        | `gantt`                            | `refs/mermaid/gantt.md`        |
| GitGraph     | `gitGraph`                         | `refs/mermaid/gitgraph.md`     |
| Mindmap      | `mindmap`                          | `refs/mermaid/mindmap.md`      |
| Timeline     | `timeline`                         | `refs/mermaid/timeline.md`     |
| C4           | `C4Context` / `C4Container` / etc. | `refs/mermaid/c4.md`           |
| Architecture | `architecture-beta`                | `refs/mermaid/architecture.md` |
| Kanban       | `kanban`                           | `refs/mermaid/kanban.md`       |
| Quadrant     | `quadrantChart`                    | `refs/mermaid/quadrant.md`     |
| Sankey       | `sankey-beta`                      | `refs/mermaid/sankey.md`       |
| XY Chart     | `xychart-beta`                     | `refs/mermaid/xy.md`           |
| Packet       | `packet-beta`                      | `refs/mermaid/packet.md`       |
| Radar        | `radar-beta`                       | `refs/mermaid/radar.md`        |
| User Journey | `journey`                          | `refs/mermaid/journey.md`      |
| Pie          | `pie`                              | `refs/mermaid/pie.md`          |
| Requirement  | `requirementDiagram`               | `refs/mermaid/requirement.md`  |
| Block        | `block-beta`                       | `refs/mermaid/block.md`        |

See `refs/mermaid/theming.md` for theme configuration and dark mode behavior with diagramkit.

---

## Quality Standards

1. **Max ~15 nodes per diagram** -- split complex systems into focused diagrams.
2. **Semantic IDs everywhere** -- `api_gateway` not `A`, `auth_service` not `B`.
3. **Use subgraphs** to group related components (3+ related nodes).
4. **Consistent edge styling** -- solid for synchronous, dotted for async, thick for critical path.
5. **Avoid custom colors** unless necessary -- diagramkit's dark mode contrast fix handles default theme colors well. Custom colors may not survive the transformation.
6. **Use `classDef`** for consistent styling when multiple nodes need the same appearance.

## Known Limitations

1. **Character/size limits**: Some platforms cap at ~5000 bytes.
2. **"Too many edges" error**: Very large flowcharts crash the renderer.
3. **Reserved words**: `end`, `default` cannot be bare node IDs -- capitalize or quote.
4. **Self-loops**: Render poorly compared to Graphviz.
5. **Beta types** (`sankey-beta`, `architecture-beta`, etc.): May have breaking changes.
6. **Theme engine**: Only accepts hex colors, not color names.

## Composability

This skill is called by:

- **`/diagrams`** orchestrator -- when Mermaid is the selected engine.
- Other skills that need structured diagrams.
- **Standalone**: User invokes directly with `/diagram-mermaid`.

```

```
