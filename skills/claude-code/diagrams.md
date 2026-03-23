---
name: diagrams
description: Generate diagrams using the best engine (mermaid, excalidraw, or draw.io) and render with diagramkit
user_invocable: true
arguments:
  - name: description
    description: 'Description of what to diagram'
    required: true
  - name: type
    description: 'Diagram type: flowchart, sequence, class, state, er, architecture, freeform, mindmap, timeline, gantt, c4, gitgraph, kanban, quadrant, sankey, xy, packet, radar, journey, network, deployment (default: auto-detect)'
    required: false
  - name: engine
    description: 'Rendering engine: mermaid, excalidraw, drawio, auto (default: auto)'
    required: false
  - name: format
    description: 'Output format: svg, png, jpeg, webp (default: svg)'
    required: false
  - name: output-dir
    description: 'Output directory (default: .diagrams sibling)'
    required: false
---

# Diagram Orchestrator

Select the best diagramming engine and delegate generation to the appropriate skill. This skill is the entry point for all diagram creation -- it analyzes the request, picks the right engine, and composes the output.

## Engine Selection Rules

### When to use Excalidraw

Prefer Excalidraw for diagrams that benefit from a **visual, spatial, hand-drawn aesthetic** or **freeform layout**:

| Use Case                                   | Why Excalidraw                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| **Architecture overview diagrams**         | Spatial layout, color-coded components, hand-drawn feel makes them approachable |
| **System context diagrams** (top of a doc) | Overview diagrams look best with visual richness                                |
| **Infrastructure / cloud diagrams**        | AWS/Azure/GCP layouts with grouped services, VPCs, subnets                      |
| **Freeform / whiteboard-style**            | No rigid structure -- boxes, arrows, annotations placed freely                  |
| **Hub-and-spoke diagrams**                 | Central orchestrator with radiating connections                                 |
| **Deployment diagrams**                    | Servers, containers, networking topology                                        |
| **User flow / journey maps** (visual)      | When spatial layout matters more than strict sequence                           |
| **PR description overview**                | A quick visual summary of what changed architecturally                          |
| **Project summary / codebase overview**    | Analyzing a codebase and producing a visual architecture map                    |

### When to use Mermaid

Prefer Mermaid for diagrams that need **structured, precise, text-based** representations:

| Use Case                         | Why Mermaid                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------- |
| **Sequence diagrams**            | Mermaid's sequence syntax is excellent -- lifelines, activation, alt/par blocks |
| **Flowcharts / decision trees**  | Structured flow with clear branching and subgraphs                              |
| **Class diagrams / data models** | UML-style with inheritance, composition, interfaces                             |
| **State machines**               | State transitions with guards and composite states                              |
| **ER diagrams**                  | Database schema with cardinality notation                                       |
| **Gantt charts**                 | Project timelines with dependencies                                             |
| **Git branching strategies**     | gitGraph for branch/merge visualization                                         |
| **C4 model diagrams**            | Context, Container, Component, Deployment views                                 |
| **Mindmaps**                     | Hierarchical topic exploration                                                  |
| **Timelines**                    | Historical / sequential events                                                  |
| **Kanban boards**                | Task status tracking                                                            |
| **Packet / protocol diagrams**   | Network packet structure with bit fields                                        |
| **Sankey / flow diagrams**       | Energy/data flow with proportional widths                                       |
| **XY charts**                    | Bar and line charts                                                             |
| **Quadrant charts**              | 2x2 comparison matrices                                                         |
| **Inline in markdown**           | Mermaid renders natively in GitHub, GitLab, Confluence                          |

### When to use Draw.io

Prefer Draw.io for diagrams that need **precision layout, rich shape libraries, or corporate/enterprise styling**:

| Use Case                                | Why Draw.io                                                       |
| --------------------------------------- | ----------------------------------------------------------------- |
| **Network topology diagrams**           | Extensive networking shape library, rack diagrams, firewall icons |
| **Detailed AWS/Azure/GCP architecture** | Official cloud provider shape stencils                            |
| **BPMN / business process diagrams**    | Full BPMN 2.0 shape support                                       |
| **UML diagrams with precise layout**    | When you need exact pixel control over positioning                |
| **Org charts**                          | Tree layout with containers and swimlanes                         |
| **Floor plans / physical layouts**      | Grid-precise positioning with measurement support                 |
| **Diagrams with embedded images**       | Draw.io supports inline image references                          |
| **Multi-page diagrams**                 | Multiple diagram tabs in a single file                            |
| **Enterprise documentation**            | When the organization already uses draw.io/diagrams.net           |

### Auto-Detection Logic

When `engine=auto` (default), apply these rules in order:

1. If `engine` is explicitly set to `mermaid`, `excalidraw`, or `drawio` -- use that.
2. If `type=freeform` -- **Excalidraw**.
3. If `type=network` and description mentions "topology", "rack", "physical" -- **Draw.io**.
4. If `type=architecture` and description mentions "overview", "high-level", "system context", "infrastructure" -- **Excalidraw**.
5. If `type=architecture` and description mentions "AWS", "Azure", "GCP" with "detailed", "precise" -- **Draw.io**.
6. If `type` is one of: `sequence`, `class`, `state`, `er`, `gantt`, `gitgraph`, `mindmap`, `timeline`, `kanban`, `quadrant`, `sankey`, `xy`, `packet`, `radar`, `journey`, `c4` -- **Mermaid** (these types have dedicated Mermaid syntax).
7. If description mentions "BPMN", "business process", "org chart", "multi-page" -- **Draw.io**.
8. If description mentions "codebase", "project structure", "repo overview", "architecture diagram" -- **Excalidraw**.
9. If description mentions "PR overview", "what changed", "system overview" -- **Excalidraw**.
10. If description mentions "network topology", "rack diagram", "physical layout" -- **Draw.io**.
11. If description mentions "detailed", "low-level", "LLD", "API contract", "data flow steps" -- **Mermaid**.
12. If description mentions "flowchart", "process", "workflow", "pipeline", "decision tree" -- **Mermaid**.
13. Default -- **Mermaid** (most universally renderable).

### Type Auto-Detection

When `type` is not specified, detect from the description:

| Keywords in Description                                              | Detected Type  |
| -------------------------------------------------------------------- | -------------- |
| process, workflow, decision, pipeline, steps, branching, if/then     | `flowchart`    |
| interactions, request/response, API calls, message passing, temporal | `sequence`     |
| object, inheritance, data model, interface, type hierarchy, class    | `class`        |
| state machine, lifecycle, status transition, "when X happens"        | `state`        |
| database schema, tables, relationships, foreign keys, entities       | `er`           |
| architecture, system, infrastructure, services, deployment, overview | `architecture` |
| freeform, whiteboard, hand-drawn, spatial layout                     | `freeform`     |
| timeline, history, chronological, milestones                         | `timeline`     |
| mindmap, brainstorm, concept map, topic exploration                  | `mindmap`      |
| project plan, schedule, dependencies, deadlines                      | `gantt`        |
| branching strategy, merge, git flow, release process                 | `gitgraph`     |
| context, container, component, C4                                    | `c4`           |
| kanban, board, task status, todo/doing/done                          | `kanban`       |
| comparison matrix, quadrant, priority/effort                         | `quadrant`     |
| flow distribution, energy flow, proportional                         | `sankey`       |
| chart, bar, line, data visualization                                 | `xy`           |
| packet, protocol, bit field, header structure                        | `packet`       |
| network topology, switches, routers, firewall, rack                  | `network`      |
| servers, containers, pods, nodes, deploy                             | `deployment`   |

## Workflow

### Step 1: Analyze Request

Parse the description, type, and engine arguments. Apply auto-detection rules above to determine:

- The diagram type
- The rendering engine
- The output format

### Step 2: Delegate to Engine Skill

Based on the selected engine, invoke the appropriate skill:

- **Mermaid**: Use the `/diagram-mermaid` skill with the resolved type and description.
- **Excalidraw**: Use the `/diagram-excalidraw` skill with the description.
- **Draw.io**: Use the `/diagram-drawio` skill with the description.

Pass through all relevant arguments (format, output-dir, etc.).

### Step 3: Render with diagramkit

After generating the source file, render it with diagramkit:

```bash
diagramkit render <source-file> --format <format>
```

diagramkit handles:

- Light and dark theme rendering
- Dark mode contrast optimization (for SVG)
- Manifest-based caching
- Output to `.diagrams/` sibling folder

### Step 4: Handle Output Format

- **`format=svg`** (default): diagramkit produces SVG directly. Best for web/markdown.
- **`format=png`**: diagramkit rasterizes via Playwright screenshot. Good for docs.
- **`format=jpeg`**: diagramkit rasterizes with white background. Good for slides.
- **`format=webp`**: diagramkit rasterizes with best compression. Good for modern web.

### Step 5: Report Output

Print the generated files and embedding instructions:

```
Diagram generated:
  Engine: mermaid
  Source: ./diagrams/auth-flow.mermaid
  Output: .diagrams/auth-flow-light.svg
          .diagrams/auth-flow-dark.svg

Embed in markdown:
  <picture>
    <source srcset=".diagrams/auth-flow-dark.svg" media="(prefers-color-scheme: dark)">
    <img src=".diagrams/auth-flow-light.svg" alt="Auth Flow">
  </picture>
```

## Engine Comparison Summary

| Criterion              | Mermaid                     | Excalidraw               | Draw.io                    |
| ---------------------- | --------------------------- | ------------------------ | -------------------------- |
| **Syntax**             | Text DSL                    | JSON                     | XML                        |
| **Layout**             | Auto (dagre)                | Manual positioning       | Manual positioning         |
| **Aesthetic**          | Clean/formal                | Hand-drawn/approachable  | Professional/precise       |
| **Diagram types**      | 20+ built-in                | Freeform                 | Freeform + stencils        |
| **Dark mode**          | Native theme + contrast fix | diagramkit darkMode flag | diagramkit darkMode flag   |
| **Inline in markdown** | Yes (GitHub/GitLab)         | No (needs rendering)     | No (needs rendering)       |
| **Edit in browser**    | mermaid.live                | excalidraw.com           | app.diagrams.net           |
| **Best for**           | Structured/typed diagrams   | Visual overviews         | Enterprise/precise layouts |

## Composability

This skill is designed to be called from other skills and workflows:

- **Standalone**: Invoked directly by the user with `/diagrams`.
- **From document workflows**: When a document needs inline diagrams.
- **From PR reviews**: To generate visual summaries of architectural changes.
- **From research tasks**: To visualize findings and relationships.

When called from another skill, respect the caller's `format` preferences and output directory.

## Prerequisites

diagramkit must be installed:

```bash
npm install diagramkit
diagramkit warmup  # Install Playwright chromium
```

Optional peer dependencies for excalidraw support:

```bash
npm install @excalidraw/excalidraw react react-dom
```
