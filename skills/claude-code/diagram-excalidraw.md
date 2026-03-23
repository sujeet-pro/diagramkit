---
name: diagram-excalidraw
description: Generate Excalidraw diagrams as .excalidraw JSON files from descriptions or codebase analysis. Renders via diagramkit. Use for architecture overviews, system diagrams, freeform layouts.
user_invocable: true
arguments:
  - name: description
    description: "Description of what to diagram, or 'analyze' to auto-analyze the codebase"
    required: true
  - name: format
    description: 'Output format: svg, png, jpeg, webp (default: svg)'
    required: false
  - name: output-dir
    description: 'Output directory (default: .diagrams sibling)'
    required: false
  - name: palette
    description: 'Color palette: default, aws, azure, gcp, kubernetes (default: default)'
    required: false
  - name: style
    description: 'Drawing style: hand-drawn (roughness=1), clean (roughness=0) (default: hand-drawn)'
    required: false
---

# Excalidraw Diagram Generation

Generate architecture diagrams, system overviews, and freeform diagrams as `.excalidraw` JSON files. Render to SVG/PNG/JPEG/WebP via `diagramkit`.

## Rendering

Use `diagramkit` for rendering -- NOT `excalidraw-to-svg` or other tools:

```bash
# Render a single excalidraw file
diagramkit render diagram.excalidraw

# Render with format options
diagramkit render diagram.excalidraw --format png --scale 2

# Render all excalidraw files in a directory
diagramkit render . --type excalidraw
```

diagramkit uses a headless Chromium instance with the Excalidraw library loaded, producing both light and dark variants automatically.

See `references/excalidraw-json-format.md` for full JSON format details.
See `references/excalidraw-arrows.md` for arrow routing patterns.
See `references/excalidraw-colors.md` for color palettes.
See `references/excalidraw-validation.md` for validation checklists.
See `references/excalidraw-examples.md` for complete JSON examples.

## Workflow

### Phase 1: Analyze & Plan

#### If `description=analyze` (Codebase Analysis Mode)

Discover components by scanning the codebase:

| Codebase Type | What to Look For                             |
| ------------- | -------------------------------------------- |
| Monorepo      | `packages/*/package.json`, workspace configs |
| Microservices | `docker-compose.yml`, k8s manifests          |
| IaC           | Terraform/Pulumi resource definitions        |
| Backend API   | Route definitions, controllers, DB models    |
| Frontend      | Component hierarchy, API calls               |

**Use tools:**

- `Glob` to find `**/package.json`, `**/Dockerfile`, `**/*.tf`, `**/docker-compose*.yml`
- `Grep` to find `app.get`, `@Controller`, `CREATE TABLE`, `resource "`, `export default`
- `Read` for README, config files, entry points

#### If description is provided

Parse the description to identify:

- Components/services to show
- Relationships/data flows between them
- Logical groupings (layers, domains, deployment units)
- The best layout pattern (vertical flow, horizontal pipeline, hub-and-spoke)

#### Plan Layout

Choose a layout pattern:

**Vertical Flow (most common -- hierarchies, architectures):**

```
Row positions (y):
  Row 0: 20   (title)
  Row 1: 100  (users/entry points)
  Row 2: 230  (frontend/gateway)
  Row 3: 380  (orchestration)
  Row 4: 530  (services)
  Row 5: 680  (data layer)
  Row 6: 830  (external services)

Column positions (x):
  Col 0: 100, Col 1: 300, Col 2: 500, Col 3: 700, Col 4: 900

Element size: 160-200px wide x 80-90px tall
Spacing: 40-50px between elements
```

**Horizontal Flow (pipelines, data processing):**

```
Stage positions (x): 100, 350, 600, 850, 1100
All stages at same y: 200
Arrows: right-to-left connections
```

**Hub-and-Spoke (event-driven, orchestrators):**

```
Center hub: x=500, y=350
Spoke positions at 45 degree increments:
  N: (500, 150), NE: (640, 210), E: (700, 350)
  SE: (640, 490), S: (500, 550), SW: (360, 490)
  W: (300, 350), NW: (360, 210)
```

### Phase 2: Generate Excalidraw JSON

Generate a valid `.excalidraw` JSON file following the critical rules below.

### Phase 3: Render with diagramkit

```bash
diagramkit render <name>.excalidraw --format <format>
```

diagramkit automatically:

- Renders both light and dark variants
- Handles `darkMode` per-call (no separate page needed)
- Outputs to `.diagrams/` sibling folder

### Phase 4: Output

Save and report:

```
Excalidraw diagram generated:
  Source: ./diagrams/system-architecture.excalidraw
  Output: .diagrams/system-architecture-light.svg
          .diagrams/system-architecture-dark.svg

Open in Excalidraw: https://excalidraw.com (load the .excalidraw file)
VS Code: Install the Excalidraw extension and open the file directly.
```

---

## Critical Rules

### Rule 1: NEVER Use Diamond Shapes

Diamond arrow connections are broken in raw Excalidraw JSON. Excalidraw applies `roundness` to diamond vertices during rendering, so visual edges appear offset from mathematical edge points. Arrows will appear disconnected.

**Use styled rectangles instead:**

| Semantic Meaning | Rectangle Style                              |
| ---------------- | -------------------------------------------- |
| Orchestrator/Hub | Coral (`#ffa8a8`/`#c92a2a`) + strokeWidth: 3 |
| Decision Point   | Orange (`#ffd8a8`/`#e8590c`) + dashed stroke |
| Central Router   | Larger size + bold color                     |

### Rule 2: Labels Require TWO Elements

The `label` property does NOT work in raw JSON. Every labeled shape needs:

1. **Shape** with `boundElements` referencing the text element:

```json
{
  "id": "my-box",
  "type": "rectangle",
  "boundElements": [{ "type": "text", "id": "my-box-text" }]
}
```

2. **Separate text element** with `containerId`:

```json
{
  "id": "my-box-text",
  "type": "text",
  "containerId": "my-box",
  "text": "My Label",
  "originalText": "My Label"
}
```

**NEVER use the `label` property** -- it is for the JavaScript API, not raw JSON files.

### Rule 3: Text Positioning

- Text `x` = shape `x` + 5
- Text `y` = shape `y` + (shape.height - text.height) / 2
- Text `width` = shape `width` - 10
- Use `\n` for multi-line labels
- Always use `textAlign: "center"` and `verticalAlign: "middle"`
- ID convention: `{shape-id}-text`

### Rule 4: Elbow Arrows Need Three Properties

For 90-degree corners (not curved):

```json
{
  "type": "arrow",
  "roughness": 0,
  "roundness": null,
  "elbowed": true
}
```

**Without all three, arrows will be curved.**

### Rule 5: Arrow Edge Calculations

Arrows must start/end at shape edges, not centers:

| Edge   | Formula                     |
| ------ | --------------------------- |
| Top    | `(x + width/2, y)`          |
| Bottom | `(x + width/2, y + height)` |
| Left   | `(x, y + height/2)`         |
| Right  | `(x + width, y + height/2)` |

### Rule 6: Arrow Width/Height = Bounding Box

```
points = [[0, 0], [-440, 0], [-440, 70]]
width = abs(-440) = 440
height = abs(70) = 70
```

---

## Element Types

| Type        | Use For                                                         |
| ----------- | --------------------------------------------------------------- |
| `rectangle` | Services, databases, containers, orchestrators, decision points |
| `ellipse`   | Users, external systems, start/end points                       |
| `text`      | Labels inside shapes, titles, annotations                       |
| `arrow`     | Data flow, connections, dependencies                            |
| `line`      | Grouping boundaries, separators                                 |

---

## Required Element Properties

Every element MUST have ALL of these properties:

```json
{
  "id": "unique-id-string",
  "type": "rectangle",
  "x": 100,
  "y": 100,
  "width": 200,
  "height": 80,
  "angle": 0,
  "strokeColor": "#1971c2",
  "backgroundColor": "#a5d8ff",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "groupIds": [],
  "frameId": null,
  "roundness": { "type": 3 },
  "seed": 1,
  "version": 1,
  "versionNonce": 1,
  "isDeleted": false,
  "boundElements": null,
  "updated": 1,
  "link": null,
  "locked": false
}
```

For text elements, add:

```json
{
  "text": "Label Text",
  "fontSize": 16,
  "fontFamily": 1,
  "textAlign": "center",
  "verticalAlign": "middle",
  "baseline": 14,
  "containerId": "parent-shape-id",
  "originalText": "Label Text",
  "lineHeight": 1.25
}
```

For arrow elements, add:

```json
{
  "points": [
    [0, 0],
    [0, 110]
  ],
  "lastCommittedPoint": null,
  "startBinding": null,
  "endBinding": null,
  "startArrowhead": null,
  "endArrowhead": "arrow",
  "elbowed": true
}
```

---

## File Structure

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "diagramkit",
  "elements": [],
  "appState": {
    "gridSize": 20,
    "viewBackgroundColor": "#ffffff"
  },
  "files": {}
}
```

---

## Arrow Routing

### Patterns

| Pattern      | Points                            | Use Case                  |
| ------------ | --------------------------------- | ------------------------- |
| Down         | `[[0,0], [0,h]]`                  | Vertical connection       |
| Right        | `[[0,0], [w,0]]`                  | Horizontal connection     |
| L-left-down  | `[[0,0], [-w,0], [-w,h]]`         | Go left, then down        |
| L-right-down | `[[0,0], [w,0], [w,h]]`           | Go right, then down       |
| L-down-left  | `[[0,0], [0,h], [-w,h]]`          | Go down, then left        |
| L-down-right | `[[0,0], [0,h], [w,h]]`           | Go down, then right       |
| S-shape      | `[[0,0], [0,h1], [w,h1], [w,h2]]` | Navigate around obstacles |
| U-turn       | `[[0,0], [w,0], [w,-h], [0,-h]]`  | Callback/return arrows    |

### Routing Algorithm

```
FUNCTION createArrow(source, target, sourceEdge, targetEdge):
  sourcePoint = getEdgePoint(source, sourceEdge)
  targetPoint = getEdgePoint(target, targetEdge)
  dx = targetPoint.x - sourcePoint.x
  dy = targetPoint.y - sourcePoint.y

  IF sourceEdge == "bottom" AND targetEdge == "top":
    IF abs(dx) < 10:  points = [[0, 0], [0, dy]]
    ELSE:             points = [[0, 0], [dx, 0], [dx, dy]]

  ELSE IF sourceEdge == "right" AND targetEdge == "left":
    IF abs(dy) < 10:  points = [[0, 0], [dx, 0]]
    ELSE:             points = [[0, 0], [0, dy], [dx, dy]]

  ELSE IF sourceEdge == targetEdge:  // U-turn
    clearance = 50
    IF sourceEdge == "right":
      points = [[0, 0], [clearance, 0], [clearance, dy], [dx, dy]]
    ELSE IF sourceEdge == "bottom":
      points = [[0, 0], [0, clearance], [dx, clearance], [dx, dy]]

  width = max(abs(p[0]) for p in points)
  height = max(abs(p[1]) for p in points)
  RETURN {x: sourcePoint.x, y: sourcePoint.y, points, width, height}
```

### Staggering Multiple Arrows

When N arrows leave from same edge, spread evenly across 20%-80% of the edge:

```
For N arrows from bottom edge:
  arrow_i.x = shape.x + shape.width * (0.2 + 0.6 * i / (N - 1))
  arrow_i.y = shape.y + shape.height

Examples:
  2 arrows: 20%, 80%
  3 arrows: 20%, 50%, 80%
  5 arrows: 20%, 35%, 50%, 65%, 80%
```

### Arrow Bindings

For better visual attachment:

```json
{
  "startBinding": {
    "elementId": "source-shape-id",
    "focus": 0,
    "gap": 1,
    "fixedPoint": [0.5, 1]
  },
  "endBinding": {
    "elementId": "target-shape-id",
    "focus": 0,
    "gap": 1,
    "fixedPoint": [0.5, 0]
  }
}
```

**fixedPoint values:** Top: `[0.5, 0]`, Bottom: `[0.5, 1]`, Left: `[0, 0.5]`, Right: `[1, 0.5]`.

When using bindings, also add the arrow to the shape's `boundElements`:

```json
{
  "id": "source-shape",
  "boundElements": [
    { "type": "text", "id": "source-shape-text" },
    { "type": "arrow", "id": "arrow-id" }
  ]
}
```

### Bidirectional Arrows

```json
{
  "startArrowhead": "arrow",
  "endArrowhead": "arrow"
}
```

Arrowhead options: `null`, `"arrow"`, `"bar"`, `"dot"`, `"triangle"`.

### Arrow Labels

Position standalone text near arrow midpoint (no `containerId`):

```json
{
  "id": "arrow-label",
  "type": "text",
  "x": 305,
  "y": 245,
  "text": "REST API",
  "fontSize": 12,
  "containerId": null,
  "backgroundColor": "#ffffff"
}
```

---

## Grouping with Dashed Rectangles

For logical groupings (namespaces, VPCs, layers):

```json
{
  "id": "group-data-layer",
  "type": "rectangle",
  "strokeColor": "#2f9e44",
  "backgroundColor": "transparent",
  "strokeStyle": "dashed",
  "roughness": 0,
  "roundness": null,
  "boundElements": null
}
```

Group labels are standalone text (no containerId) at top-left:

```json
{
  "id": "group-data-layer-label",
  "type": "text",
  "x": 120,
  "y": 510,
  "text": "Data Layer",
  "textAlign": "left",
  "verticalAlign": "top",
  "containerId": null
}
```

---

## Color Palettes

### Default Palette

| Component Type   | Background | Stroke    |
| ---------------- | ---------- | --------- |
| Frontend/UI      | `#a5d8ff`  | `#1971c2` |
| Backend/API      | `#d0bfff`  | `#7048e8` |
| Database         | `#b2f2bb`  | `#2f9e44` |
| Storage          | `#ffec99`  | `#f08c00` |
| AI/ML Services   | `#e599f7`  | `#9c36b5` |
| External APIs    | `#ffc9c9`  | `#e03131` |
| Orchestration    | `#ffa8a8`  | `#c92a2a` |
| Validation       | `#ffd8a8`  | `#e8590c` |
| Network/Security | `#dee2e6`  | `#495057` |
| Classification   | `#99e9f2`  | `#0c8599` |
| Users/Actors     | `#e7f5ff`  | `#1971c2` |
| Message Queue    | `#fff3bf`  | `#fab005` |
| Cache            | `#ffe8cc`  | `#fd7e14` |
| Monitoring       | `#d3f9d8`  | `#40c057` |

### AWS Palette

| Service Category           | Background | Stroke    |
| -------------------------- | ---------- | --------- |
| Compute (EC2, Lambda, ECS) | `#ff9900`  | `#cc7a00` |
| Storage (S3, EBS)          | `#3f8624`  | `#2d6119` |
| Database (RDS, DynamoDB)   | `#3b48cc`  | `#2d3899` |
| Networking (VPC, Route53)  | `#8c4fff`  | `#6b3dcc` |
| Security (IAM, KMS)        | `#dd344c`  | `#b12a3d` |
| ML (SageMaker, Bedrock)    | `#01a88d`  | `#017d69` |

### Azure Palette

| Service Category | Background | Stroke    |
| ---------------- | ---------- | --------- |
| Compute          | `#0078d4`  | `#005a9e` |
| Storage          | `#50e6ff`  | `#3cb5cc` |
| Database         | `#0078d4`  | `#005a9e` |
| Networking       | `#773adc`  | `#5a2ca8` |
| Security         | `#ff8c00`  | `#cc7000` |
| AI/ML            | `#50e6ff`  | `#3cb5cc` |

### GCP Palette

| Service Category                | Background | Stroke    |
| ------------------------------- | ---------- | --------- |
| Compute (GCE, Cloud Run)        | `#4285f4`  | `#3367d6` |
| Storage (GCS)                   | `#34a853`  | `#2d8e47` |
| Database (Cloud SQL, Firestore) | `#ea4335`  | `#c53929` |
| Networking                      | `#fbbc04`  | `#d99e04` |
| AI/ML (Vertex AI)               | `#9334e6`  | `#7627b8` |

### Kubernetes Palette

| Component              | Background | Stroke             |
| ---------------------- | ---------- | ------------------ |
| Pod/Service/Deployment | `#326ce5`  | `#2756b8`          |
| ConfigMap/Secret       | `#7f8c8d`  | `#626d6e`          |
| Ingress                | `#00d4aa`  | `#00a888`          |
| Node                   | `#303030`  | `#1a1a1a`          |
| Namespace              | `#f0f0f0`  | `#c0c0c0` (dashed) |

---

## ID Naming Convention

Generate IDs from discovered/described components:

| Component           | Generated ID       | Generated Label            |
| ------------------- | ------------------ | -------------------------- |
| Express API server  | `express-api`      | `"API Server\nExpress.js"` |
| PostgreSQL database | `postgres-db`      | `"PostgreSQL\nDatabase"`   |
| Redis cache         | `redis-cache`      | `"Redis\nCache Layer"`     |
| S3 bucket           | `s3-uploads`       | `"S3 Bucket\nuploads/"`    |
| React frontend      | `react-frontend`   | `"React App\nFrontend"`    |
| Lambda function     | `lambda-processor` | `"Lambda\nProcessor"`      |

Text element ID = `{shape-id}-text`.

---

## Validation Checklist

Run BEFORE writing the file:

- [ ] Every labeled shape has BOTH a shape element AND a text element
- [ ] Shape has `boundElements: [{ "type": "text", "id": "{id}-text" }]`
- [ ] Text has `containerId: "{shape-id}"`
- [ ] Multi-point arrows have `elbowed: true`, `roundness: null`, `roughness: 0`
- [ ] Arrow `x,y` is calculated from source shape edge (not center)
- [ ] Arrow final point offset reaches target shape edge
- [ ] Arrow `width` = `max(abs(point[0]))`, `height` = `max(abs(point[1]))`
- [ ] No diamond shapes used
- [ ] No duplicate IDs
- [ ] File is valid JSON
- [ ] All `boundElements` IDs reference valid text elements
- [ ] All `containerId` values reference valid shapes
- [ ] All arrows start within 15px of a shape edge
- [ ] All arrows end within 15px of a shape edge
- [ ] U-turn arrows have 40-60px clearance

## Common Issues

| Issue                | Fix                                                      |
| -------------------- | -------------------------------------------------------- |
| Labels don't appear  | Use TWO elements (shape + text), not `label` property    |
| Arrows curved        | Add `elbowed: true`, `roundness: null`, `roughness: 0`   |
| Arrows floating      | Calculate x,y from shape edge, not center                |
| Arrows overlapping   | Stagger start positions across edge                      |
| Arrow endpoint wrong | Final point offset = targetEdge - sourceEdge coordinates |

---

## Complexity Guidelines

| Complexity   | Max Elements | Max Arrows | Approach                     |
| ------------ | ------------ | ---------- | ---------------------------- |
| Simple       | 5-10         | 5-10       | Single file, no groups       |
| Medium       | 10-25        | 15-30      | Use grouping rectangles      |
| Complex      | 25-50        | 30-60      | Split into multiple diagrams |
| Very Complex | 50+          | 60+        | Multiple focused diagrams    |

When splitting, create: `overview.excalidraw`, `detail-<name>.excalidraw`.

## Composability

This skill is called by:

- **`/diagrams`** orchestrator -- when Excalidraw is the selected engine.
- Other skills that need visual architecture diagrams.
- **Standalone**: User invokes directly with `/diagram-excalidraw`.

Always render via `diagramkit render` -- never via `excalidraw-to-svg` or other tools.
