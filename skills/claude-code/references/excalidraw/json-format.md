# Excalidraw JSON Format Reference

Complete reference for Excalidraw JSON structure and element types. Use this when generating `.excalidraw` files for rendering with `diagramkit`.

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

Always set `viewBackgroundColor` to `#ffffff`. diagramkit handles dark mode rendering automatically -- you never need to set a dark background in the source file.

---

## Element Types

| Type        | Use For                                                                     | Arrow Reliability |
| ----------- | --------------------------------------------------------------------------- | ----------------- |
| `rectangle` | Services, components, databases, containers, orchestrators, decision points | Excellent         |
| `ellipse`   | Users, external systems, start/end points                                   | Good              |
| `text`      | Labels inside shapes, titles, annotations                                   | N/A               |
| `arrow`     | Data flow, connections, dependencies                                        | N/A               |
| `line`      | Grouping boundaries, separators                                             | N/A               |

### BANNED: Diamond Shapes

**NEVER use `type: "diamond"` in generated diagrams.**

Diamond arrow connections are fundamentally broken in raw Excalidraw JSON:

- Excalidraw applies `roundness` to diamond vertices during rendering
- Visual edges appear offset from mathematical edge points
- No offset formula reliably compensates
- Arrows appear disconnected/floating

**Use styled rectangles instead** for visual distinction:

| Semantic Meaning | Rectangle Style                              |
| ---------------- | -------------------------------------------- |
| Orchestrator/Hub | Coral (`#ffa8a8`/`#c92a2a`) + strokeWidth: 3 |
| Decision Point   | Orange (`#ffd8a8`/`#e8590c`) + dashed stroke |
| Central Router   | Larger size + bold color                     |

---

## Required Element Properties

Every element MUST have these properties:

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

Notes on specific properties:

- `roundness`: Use `{ "type": 3 }` for rectangles, `{ "type": 2 }` for ellipses, `null` for sharp corners
- `roughness`: `1` for hand-drawn style, `0` for clean lines
- `seed`: Any positive integer; affects the hand-drawn randomization
- `boundElements`: Set to `null` unless the shape contains text or has arrows attached

---

## Text Inside Shapes (Labels)

**Every labeled shape requires TWO elements:**

### Shape with boundElements

```json
{
  "id": "{component-id}",
  "type": "rectangle",
  "x": 500,
  "y": 200,
  "width": 200,
  "height": 90,
  "strokeColor": "#1971c2",
  "backgroundColor": "#a5d8ff",
  "boundElements": [{ "type": "text", "id": "{component-id}-text" }]
}
```

### Text with containerId

```json
{
  "id": "{component-id}-text",
  "type": "text",
  "x": 505,
  "y": 220,
  "width": 190,
  "height": 50,
  "text": "{Component Name}\n{Subtitle}",
  "fontSize": 16,
  "fontFamily": 1,
  "textAlign": "center",
  "verticalAlign": "middle",
  "containerId": "{component-id}",
  "originalText": "{Component Name}\n{Subtitle}",
  "lineHeight": 1.25,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 1,
  "strokeStyle": "solid",
  "roughness": 0,
  "opacity": 100,
  "groupIds": [],
  "frameId": null,
  "roundness": null,
  "seed": 2,
  "version": 1,
  "versionNonce": 2,
  "isDeleted": false,
  "boundElements": null,
  "updated": 1,
  "link": null,
  "locked": false,
  "angle": 0,
  "baseline": 14
}
```

### DO NOT Use the `label` Property

The `label` property is for the JavaScript API, NOT raw JSON files:

```json
// WRONG - will show empty boxes
{ "type": "rectangle", "label": { "text": "My Label" } }

// CORRECT - requires TWO elements
// 1. Shape with boundElements reference
// 2. Separate text element with containerId
```

### Text Positioning Formulas

- Text `x` = shape `x` + 5
- Text `y` = shape `y` + (shape.height - text.height) / 2
- Text `width` = shape `width` - 10
- Use `\n` for multi-line labels
- Always use `textAlign: "center"` and `verticalAlign: "middle"`

### Text Height Calculation

- Single line: `fontSize * lineHeight` (approximately 20px for fontSize=16)
- Two lines: `fontSize * lineHeight * 2` (approximately 40px)
- Three lines: `fontSize * lineHeight * 3` (approximately 60px)
- General: `numLines * fontSize * lineHeight`

### ID Naming Convention

Always use pattern: `{shape-id}-text` for text element IDs.

---

## Dynamic ID Generation

IDs and labels are generated from codebase analysis or descriptions:

| Discovered Component  | Generated ID       | Generated Label            |
| --------------------- | ------------------ | -------------------------- |
| Express API server    | `express-api`      | `"API Server\nExpress.js"` |
| PostgreSQL database   | `postgres-db`      | `"PostgreSQL\nDatabase"`   |
| Redis cache           | `redis-cache`      | `"Redis\nCache Layer"`     |
| S3 bucket for uploads | `s3-uploads`       | `"S3 Bucket\nuploads/"`    |
| Lambda function       | `lambda-processor` | `"Lambda\nProcessor"`      |
| React frontend        | `react-frontend`   | `"React App\nFrontend"`    |

---

## Grouping with Dashed Rectangles

For logical groupings (namespaces, VPCs, pipelines):

```json
{
  "id": "group-ai-pipeline",
  "type": "rectangle",
  "x": 100,
  "y": 500,
  "width": 1000,
  "height": 280,
  "strokeColor": "#9c36b5",
  "backgroundColor": "transparent",
  "strokeStyle": "dashed",
  "roughness": 0,
  "roundness": null,
  "boundElements": null,
  "fillStyle": "solid",
  "strokeWidth": 2,
  "opacity": 100,
  "angle": 0,
  "groupIds": [],
  "frameId": null,
  "seed": 100,
  "version": 1,
  "versionNonce": 100,
  "isDeleted": false,
  "updated": 1,
  "link": null,
  "locked": false
}
```

Group labels are standalone text (no containerId) at top-left:

```json
{
  "id": "group-ai-pipeline-label",
  "type": "text",
  "x": 120,
  "y": 510,
  "width": 300,
  "height": 20,
  "text": "AI Processing Pipeline (Cloud Run)",
  "fontSize": 14,
  "fontFamily": 1,
  "textAlign": "left",
  "verticalAlign": "top",
  "containerId": null,
  "originalText": "AI Processing Pipeline (Cloud Run)",
  "lineHeight": 1.25,
  "strokeColor": "#9c36b5",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 1,
  "strokeStyle": "solid",
  "roughness": 0,
  "opacity": 100,
  "angle": 0,
  "groupIds": [],
  "frameId": null,
  "roundness": null,
  "seed": 101,
  "version": 1,
  "versionNonce": 101,
  "isDeleted": false,
  "boundElements": null,
  "updated": 1,
  "link": null,
  "locked": false,
  "baseline": 12
}
```

---

## Standalone Text (Titles, Annotations)

For text that is NOT inside a shape:

```json
{
  "id": "diagram-title",
  "type": "text",
  "x": 350,
  "y": 20,
  "width": 500,
  "height": 30,
  "text": "System Architecture Overview",
  "fontSize": 24,
  "fontFamily": 1,
  "textAlign": "center",
  "verticalAlign": "top",
  "containerId": null,
  "originalText": "System Architecture Overview",
  "lineHeight": 1.25,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "transparent"
}
```

Key difference from contained text: `containerId` is `null`.
