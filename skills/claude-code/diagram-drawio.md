---
name: diagram-drawio
description: Generate draw.io diagrams as .drawio XML files from descriptions. Renders via diagramkit. Use for network diagrams, enterprise architecture, BPMN, and precise layouts.
user_invocable: true
arguments:
  - name: description
    description: 'Description of what to diagram'
    required: true
  - name: format
    description: 'Output format: svg, png, jpeg, webp (default: svg)'
    required: false
  - name: output-dir
    description: 'Output directory (default: .diagrams sibling)'
    required: false
  - name: style
    description: 'Visual style: default, sketch, minimal (default: default)'
    required: false
---

# Draw.io Diagram Generation

Generate precise, professionally-styled diagrams as `.drawio` XML files. Render to SVG/PNG/JPEG/WebP via `diagramkit`.

## Rendering

Use `diagramkit` for rendering -- NOT `draw.io` desktop or other tools:

```bash
# Render a single drawio file
diagramkit render diagram.drawio

# Render raster output for email or Confluence
diagramkit render diagram.drawio --format png --theme light --scale 2

# Render all drawio files in a directory
diagramkit render . --type drawio
```

Accepted file extensions: `.drawio`, `.drawio.xml`, `.dio`

diagramkit uses a headless Chromium instance with the draw.io renderer, producing both light and dark variants automatically.

## Workflow

### Phase 1: Analyze & Plan

Parse the description to identify:

- Components, services, and infrastructure to show
- Relationships and data flows
- Logical groupings (layers, zones, regions)
- The best layout approach (hierarchical, left-to-right, grid)

### Phase 2: Generate Draw.io XML

Write a `.drawio` file following the XML format reference below.

### Phase 3: Render with diagramkit

```bash
diagramkit render <name>.drawio --format <format>
```

diagramkit automatically produces both light and dark variants. Default to SVG unless the destination explicitly needs raster output, such as email or Confluence.

### Phase 4: Output

Save and report:

```
Draw.io diagram generated:
  Source: ./diagrams/network-topology.drawio
  Output: .diagrams/network-topology-light.svg
          .diagrams/network-topology-dark.svg

Edit in browser: https://app.diagrams.net (load the .drawio file)
VS Code: Install the draw.io extension and open the file directly.
```

---

## XML Format Basics

### File Structure

```xml
<mxfile host="diagramkit" modified="2024-01-01T00:00:00.000Z" type="device">
  <diagram id="page-1" name="Page-1">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1"
                  tooltips="1" connect="1" arrows="1" fold="1" page="1"
                  pageScale="1" pageWidth="1200" pageHeight="900"
                  math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <!-- Diagram elements go here -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

Key structural rules:

- `id="0"` is the root cell (always required)
- `id="1"` is the default layer (always required, parent="0")
- All diagram elements have `parent="1"` (or a custom layer/container ID)
- Vertices have `vertex="1"`, edges have `edge="1"`

### Basic Vertex (Shape)

```xml
<mxCell id="node-1" value="Service A" style="rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
</mxCell>
```

### Basic Edge (Connection)

```xml
<mxCell id="edge-1" style="edgeStyle=orthogonalEdgeStyle;rounded=1;"
        edge="1" source="node-1" target="node-2" parent="1">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>
```

### Edge with Label

```xml
<mxCell id="edge-2" value="REST API" style="edgeStyle=orthogonalEdgeStyle;rounded=1;"
        edge="1" source="node-1" target="node-2" parent="1">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>
```

---

## Common Shapes and Style Strings

### Basic Shapes

| Shape             | Style String                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------- |
| Rectangle         | `rounded=0;whiteSpace=wrap;`                                                                |
| Rounded Rectangle | `rounded=1;whiteSpace=wrap;`                                                                |
| Ellipse           | `ellipse;whiteSpace=wrap;`                                                                  |
| Circle            | `ellipse;whiteSpace=wrap;aspect=fixed;`                                                     |
| Diamond           | `rhombus;whiteSpace=wrap;`                                                                  |
| Cylinder (DB)     | `shape=cylinder3;whiteSpace=wrap;boundedLbl=1;backgroundOutline=1;size=15;`                 |
| Hexagon           | `shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;size=25;fixedSize=1;`            |
| Parallelogram     | `shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;fixedSize=1;size=20;` |
| Cloud             | `ellipse;shape=cloud;whiteSpace=wrap;`                                                      |
| Document          | `shape=document;whiteSpace=wrap;boundedLbl=1;backgroundOutline=1;size=0.27;`                |
| Trapezoid         | `shape=trapezoid;perimeter=trapezoidPerimeter;whiteSpace=wrap;fixedSize=1;size=20;`         |

### Infrastructure Shapes

| Shape         | Style String                                                                |
| ------------- | --------------------------------------------------------------------------- |
| Server        | `shape=mxgraph.cisco.servers.standard_server;`                              |
| Database      | `shape=cylinder3;whiteSpace=wrap;boundedLbl=1;backgroundOutline=1;size=15;` |
| Firewall      | `shape=mxgraph.cisco.firewalls.firewall;`                                   |
| Router        | `shape=mxgraph.cisco.routers.router;`                                       |
| Switch        | `shape=mxgraph.cisco.switches.workgroup_switch;`                            |
| Load Balancer | `shape=mxgraph.aws4.application_load_balancer;`                             |
| Container     | `rounded=1;whiteSpace=wrap;arcSize=10;dashed=1;dashPattern=5 5;`            |
| Swimlane      | `swimlane;startSize=30;`                                                    |

### AWS Shapes (selected)

| Service     | Style String                                |
| ----------- | ------------------------------------------- |
| EC2         | `shape=mxgraph.aws4.ec2;`                   |
| Lambda      | `shape=mxgraph.aws4.lambda_function;`       |
| S3          | `shape=mxgraph.aws4.s3;`                    |
| RDS         | `shape=mxgraph.aws4.rds;`                   |
| DynamoDB    | `shape=mxgraph.aws4.dynamodb;`              |
| API Gateway | `shape=mxgraph.aws4.api_gateway;`           |
| CloudFront  | `shape=mxgraph.aws4.cloudfront;`            |
| VPC         | `shape=mxgraph.aws4.virtual_private_cloud;` |
| SQS         | `shape=mxgraph.aws4.sqs;`                   |
| SNS         | `shape=mxgraph.aws4.sns;`                   |
| ECS         | `shape=mxgraph.aws4.ecs;`                   |
| EKS         | `shape=mxgraph.aws4.eks;`                   |

### Color Style Properties

```
fillColor=#dae8fc;strokeColor=#6c8ebf;fontColor=#333333;
```

Common color combinations:

| Purpose               | Fill      | Stroke    |
| --------------------- | --------- | --------- |
| Blue (default)        | `#dae8fc` | `#6c8ebf` |
| Green (success/data)  | `#d5e8d4` | `#82b366` |
| Orange (warning)      | `#ffe6cc` | `#d6b656` |
| Red (error/external)  | `#f8cecc` | `#b85450` |
| Purple (services)     | `#e1d5e7` | `#9673a6` |
| Yellow (highlight)    | `#fff2cc` | `#d6b656` |
| Gray (infrastructure) | `#f5f5f5` | `#666666` |
| Dark blue (headers)   | `#1ba1e2` | `#006EAF` |

### Text Style Properties

```
fontSize=12;fontStyle=1;fontColor=#333333;align=center;verticalAlign=middle;
```

Font styles: `0` = normal, `1` = bold, `2` = italic, `3` = bold+italic, `4` = underline.

---

## Edge Styles and Routing

### Edge Style Options

| Style                                | Description                           |
| ------------------------------------ | ------------------------------------- |
| `edgeStyle=orthogonalEdgeStyle;`     | 90-degree elbow routing (most common) |
| `edgeStyle=elbowEdgeStyle;`          | Single elbow point                    |
| `edgeStyle=entityRelationEdgeStyle;` | ER diagram style                      |
| `edgeStyle=isometricEdgeStyle;`      | Isometric perspective                 |
| `curved=1;`                          | Curved line (with no edgeStyle)       |
| (no edgeStyle)                       | Straight line                         |

### Arrow End Styles

```
endArrow=classic;startArrow=none;
```

| Value          | Description                |
| -------------- | -------------------------- |
| `classic`      | Standard arrow             |
| `block`        | Filled block arrow         |
| `open`         | Open arrow                 |
| `diamond`      | Diamond (composition)      |
| `diamondThin`  | Thin diamond (aggregation) |
| `oval`         | Circle endpoint            |
| `none`         | No arrowhead               |
| `ERmandOne`    | ER: exactly one            |
| `ERmany`       | ER: many                   |
| `ERoneToMany`  | ER: one-to-many            |
| `ERzeroToMany` | ER: zero-to-many           |
| `ERzeroToOne`  | ER: zero-to-one            |

### Stroke Styles

```
strokeWidth=2;dashed=1;dashPattern=5 5;strokeColor=#666666;
```

| Property      | Values                                                     |
| ------------- | ---------------------------------------------------------- |
| `strokeWidth` | 1, 2, 3, etc.                                              |
| `dashed`      | 0 (solid), 1 (dashed)                                      |
| `dashPattern` | `5 5` (default dashed), `10 5` (long dash), `2 2` (dotted) |

---

## Layout Patterns

### Hierarchical (Top-Down)

Best for: Architecture diagrams, org charts, call hierarchies.

```xml
<!-- Row 1: Entry points -->
<mxCell id="lb" value="Load Balancer" style="rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;"
        vertex="1" parent="1">
  <mxGeometry x="340" y="40" width="120" height="60" as="geometry"/>
</mxCell>

<!-- Row 2: Services -->
<mxCell id="api" value="API Server" style="rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;"
        vertex="1" parent="1">
  <mxGeometry x="200" y="160" width="120" height="60" as="geometry"/>
</mxCell>
<mxCell id="web" value="Web Server" style="rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;"
        vertex="1" parent="1">
  <mxGeometry x="480" y="160" width="120" height="60" as="geometry"/>
</mxCell>

<!-- Row 3: Data stores -->
<mxCell id="db" value="Database" style="shape=cylinder3;whiteSpace=wrap;boundedLbl=1;size=15;fillColor=#d5e8d4;strokeColor=#82b366;"
        vertex="1" parent="1">
  <mxGeometry x="340" y="280" width="120" height="80" as="geometry"/>
</mxCell>
```

Grid guidelines:

- Column width: 160-200px
- Row height: 120-160px
- Element size: 120x60 (standard), 120x80 (cylinder)
- Spacing: 40px between elements

### Left-to-Right (Pipeline)

Best for: Data pipelines, CI/CD, request flows.

```xml
<mxCell id="input" value="Input" style="rounded=1;whiteSpace=wrap;" vertex="1" parent="1">
  <mxGeometry x="40" y="160" width="120" height="60" as="geometry"/>
</mxCell>
<mxCell id="process" value="Process" style="rounded=1;whiteSpace=wrap;" vertex="1" parent="1">
  <mxGeometry x="240" y="160" width="120" height="60" as="geometry"/>
</mxCell>
<mxCell id="output" value="Output" style="rounded=1;whiteSpace=wrap;" vertex="1" parent="1">
  <mxGeometry x="440" y="160" width="120" height="60" as="geometry"/>
</mxCell>
```

### Containers / Groups

Use swimlanes or dashed containers for grouping:

```xml
<!-- Container -->
<mxCell id="vpc" value="VPC 10.0.0.0/16" style="swimlane;startSize=30;fillColor=#f5f5f5;strokeColor=#666666;fontStyle=1;"
        vertex="1" parent="1">
  <mxGeometry x="40" y="40" width="400" height="300" as="geometry"/>
</mxCell>

<!-- Elements inside container (parent = container ID) -->
<mxCell id="subnet-public" value="Public Subnet" style="rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;"
        vertex="1" parent="vpc">
  <mxGeometry x="20" y="50" width="160" height="60" as="geometry"/>
</mxCell>
```

Note: When elements are inside a container, their x/y coordinates are relative to the container.

### Multi-Page Diagrams

```xml
<mxfile>
  <diagram id="overview" name="Overview">
    <mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <!-- Overview diagram -->
      </root>
    </mxGraphModel>
  </diagram>
  <diagram id="detail-api" name="API Detail">
    <mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <!-- API detail diagram -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

---

## Dark Mode Considerations

diagramkit handles dark mode rendering automatically, but follow these guidelines for best results:

1. **Use standard fill colors** from the color combinations table above -- they are designed to work with diagramkit's contrast optimization.
2. **Avoid very light fills** (close to white) -- they will be darkened but may lose distinction.
3. **Avoid very dark fills** (close to black) -- they may become invisible on dark backgrounds.
4. **Use mid-tone stroke colors** -- dark strokes adapt better than very light ones.
5. **Text should use `fontColor=#333333`** -- diagramkit will adjust for dark mode.

---

## Complete Example: 3-Tier Architecture

```xml
<mxfile host="diagramkit">
  <diagram id="arch" name="Architecture">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1"
                  tooltips="1" connect="1" arrows="1" fold="1" page="1"
                  pageScale="1" pageWidth="1200" pageHeight="900">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>

        <!-- Title -->
        <mxCell id="title" value="System Architecture" style="text;fontSize=20;fontStyle=1;align=center;"
                vertex="1" parent="1">
          <mxGeometry x="300" y="10" width="200" height="30" as="geometry"/>
        </mxCell>

        <!-- Load Balancer -->
        <mxCell id="lb" value="Load Balancer" style="rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;fontStyle=1;"
                vertex="1" parent="1">
          <mxGeometry x="340" y="60" width="120" height="60" as="geometry"/>
        </mxCell>

        <!-- API Servers -->
        <mxCell id="api-1" value="API Server 1" style="rounded=1;whiteSpace=wrap;fillColor=#e1d5e7;strokeColor=#9673a6;"
                vertex="1" parent="1">
          <mxGeometry x="200" y="180" width="120" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="api-2" value="API Server 2" style="rounded=1;whiteSpace=wrap;fillColor=#e1d5e7;strokeColor=#9673a6;"
                vertex="1" parent="1">
          <mxGeometry x="480" y="180" width="120" height="60" as="geometry"/>
        </mxCell>

        <!-- Database -->
        <mxCell id="db" value="PostgreSQL" style="shape=cylinder3;whiteSpace=wrap;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#d5e8d4;strokeColor=#82b366;"
                vertex="1" parent="1">
          <mxGeometry x="260" y="320" width="100" height="80" as="geometry"/>
        </mxCell>

        <!-- Cache -->
        <mxCell id="cache" value="Redis Cache" style="shape=cylinder3;whiteSpace=wrap;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#ffe6cc;strokeColor=#d6b656;"
                vertex="1" parent="1">
          <mxGeometry x="440" y="320" width="100" height="80" as="geometry"/>
        </mxCell>

        <!-- Edges -->
        <mxCell id="e-lb-api1" style="edgeStyle=orthogonalEdgeStyle;rounded=1;" edge="1" source="lb" target="api-1" parent="1">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
        <mxCell id="e-lb-api2" style="edgeStyle=orthogonalEdgeStyle;rounded=1;" edge="1" source="lb" target="api-2" parent="1">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
        <mxCell id="e-api1-db" value="SQL" style="edgeStyle=orthogonalEdgeStyle;rounded=1;" edge="1" source="api-1" target="db" parent="1">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
        <mxCell id="e-api2-db" value="SQL" style="edgeStyle=orthogonalEdgeStyle;rounded=1;" edge="1" source="api-2" target="db" parent="1">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
        <mxCell id="e-api1-cache" style="edgeStyle=orthogonalEdgeStyle;rounded=1;dashed=1;" edge="1" source="api-1" target="cache" parent="1">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
        <mxCell id="e-api2-cache" style="edgeStyle=orthogonalEdgeStyle;rounded=1;dashed=1;" edge="1" source="api-2" target="cache" parent="1">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

---

## Complete Example: Network Topology

```xml
<mxfile host="diagramkit">
  <diagram id="network" name="Network">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>

        <!-- Internet -->
        <mxCell id="internet" value="Internet" style="ellipse;shape=cloud;whiteSpace=wrap;fillColor=#f5f5f5;strokeColor=#666666;"
                vertex="1" parent="1">
          <mxGeometry x="340" y="20" width="120" height="80" as="geometry"/>
        </mxCell>

        <!-- Firewall -->
        <mxCell id="fw" value="Firewall" style="rounded=1;whiteSpace=wrap;fillColor=#f8cecc;strokeColor=#b85450;fontStyle=1;"
                vertex="1" parent="1">
          <mxGeometry x="350" y="140" width="100" height="50" as="geometry"/>
        </mxCell>

        <!-- DMZ Container -->
        <mxCell id="dmz" value="DMZ" style="swimlane;startSize=25;fillColor=#fff2cc;strokeColor=#d6b656;dashed=1;"
                vertex="1" parent="1">
          <mxGeometry x="160" y="230" width="480" height="120" as="geometry"/>
        </mxCell>

        <mxCell id="web-1" value="Web Server" style="rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;"
                vertex="1" parent="dmz">
          <mxGeometry x="30" y="40" width="120" height="50" as="geometry"/>
        </mxCell>
        <mxCell id="web-2" value="API Gateway" style="rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;"
                vertex="1" parent="dmz">
          <mxGeometry x="330" y="40" width="120" height="50" as="geometry"/>
        </mxCell>

        <!-- Internal Network Container -->
        <mxCell id="internal" value="Internal Network" style="swimlane;startSize=25;fillColor=#d5e8d4;strokeColor=#82b366;dashed=1;"
                vertex="1" parent="1">
          <mxGeometry x="160" y="400" width="480" height="120" as="geometry"/>
        </mxCell>

        <mxCell id="app" value="App Server" style="rounded=1;whiteSpace=wrap;fillColor=#e1d5e7;strokeColor=#9673a6;"
                vertex="1" parent="internal">
          <mxGeometry x="30" y="40" width="120" height="50" as="geometry"/>
        </mxCell>
        <mxCell id="db" value="Database" style="shape=cylinder3;whiteSpace=wrap;boundedLbl=1;size=15;fillColor=#d5e8d4;strokeColor=#82b366;"
                vertex="1" parent="internal">
          <mxGeometry x="330" y="30" width="120" height="70" as="geometry"/>
        </mxCell>

        <!-- Connections -->
        <mxCell id="e1" style="edgeStyle=orthogonalEdgeStyle;" edge="1" source="internet" target="fw" parent="1">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
        <mxCell id="e2" style="edgeStyle=orthogonalEdgeStyle;" edge="1" source="fw" target="web-1" parent="1">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
        <mxCell id="e3" style="edgeStyle=orthogonalEdgeStyle;" edge="1" source="fw" target="web-2" parent="1">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
        <mxCell id="e4" style="edgeStyle=orthogonalEdgeStyle;" edge="1" source="web-1" target="app" parent="1">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
        <mxCell id="e5" style="edgeStyle=orthogonalEdgeStyle;" edge="1" source="app" target="db" parent="1">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

---

## Quality Standards

1. **Use semantic IDs** -- `api-server` not `node-1`.
2. **Use descriptive labels** -- `PostgreSQL Primary` not `DB`.
3. **Group related elements** with swimlanes or dashed containers.
4. **Use consistent styling** -- same color for same type of component.
5. **Use orthogonal edge routing** (`edgeStyle=orthogonalEdgeStyle`) for clean diagrams.
6. **Label important edges** -- especially for protocols, ports, or data types.
7. **Keep it focused** -- max 20-25 elements per page; split into multiple pages for complex systems.

## Composability

This skill is called by:

- **`/diagrams`** orchestrator -- when Draw.io is the selected engine.
- Other skills that need precise/enterprise-style diagrams.
- **Standalone**: User invokes directly with `/diagram-drawio`.

Always render via `diagramkit render` -- never via draw.io desktop export or other tools.
