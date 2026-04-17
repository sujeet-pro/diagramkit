# Draw.io XML Reference

Complete reference for Draw.io `.drawio` / `.drawio.xml` / `.dio` diagram source files.

## Full Minimal XML Structure

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
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

**Required elements:**

- `<mxfile>` — document root
- `<diagram>` — a page (can have multiple for multi-page)
- `<mxGraphModel>` — graph container with canvas settings
- `<root>` — element container
- `<mxCell id="0"/>` — invisible root cell (always required)
- `<mxCell id="1" parent="0"/>` — default layer (parent for all top-level elements)

## Vertex (Shape) Structure

```xml
<mxCell id="unique-id" value="Display Label"
        style="style-string-here;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
</mxCell>
```

- `id` — unique semantic identifier
- `value` — display text (HTML entities for special chars: `&`, `<`, `>`)
- `style` — semicolon-delimited key=value pairs
- `vertex="1"` — **required** for shapes
- `parent` — parent element ID (`"1"` for top-level, container ID for children)
- `<mxGeometry>` — position and size; must include `as="geometry"`

## Edge (Connector) Structure

```xml
<mxCell id="unique-id" value="Label"
        style="edgeStyle=orthogonalEdgeStyle;rounded=1;"
        edge="1" source="source-id" target="target-id" parent="1">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>
```

- `edge="1"` — **required** for connectors
- `source` / `target` — IDs of connected vertices
- `relative="1"` — required on edge geometry

## Common Shapes

### Rectangle

```xml
<mxCell id="rect1" value="Service"
        style="rounded=0;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
</mxCell>
```

### Rounded Rectangle

```xml
<mxCell id="rrect1" value="API"
        style="rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
</mxCell>
```

### Ellipse

```xml
<mxCell id="ellipse1" value="Start"
        style="ellipse;whiteSpace=wrap;fillColor=#d5e8d4;strokeColor=#82b366;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="80" height="80" as="geometry"/>
</mxCell>
```

### Diamond (Decision)

```xml
<mxCell id="diamond1" value="OK?"
        style="rhombus;whiteSpace=wrap;fillColor=#fff2cc;strokeColor=#d6b656;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="80" height="80" as="geometry"/>
</mxCell>
```

### Cylinder (Database)

```xml
<mxCell id="db1" value="PostgreSQL"
        style="shape=cylinder3;whiteSpace=wrap;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#dae8fc;strokeColor=#6c8ebf;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="100" height="80" as="geometry"/>
</mxCell>
```

### Cloud

```xml
<mxCell id="cloud1" value="Internet"
        style="ellipse;shape=cloud;whiteSpace=wrap;fillColor=#f5f5f5;strokeColor=#666666;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="120" height="80" as="geometry"/>
</mxCell>
```

### Swimlane / Container

```xml
<mxCell id="lane1" value="VPC"
        style="swimlane;startSize=30;fillColor=#f5f5f5;strokeColor=#666666;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="40" y="40" width="400" height="300" as="geometry"/>
</mxCell>
```

### Hexagon

```xml
<mxCell id="hex1" value="Worker"
        style="shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;size=0.25;fillColor=#e1d5e7;strokeColor=#9673a6;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
</mxCell>
```

### Parallelogram

```xml
<mxCell id="para1" value="I/O"
        style="shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;fillColor=#ffe6cc;strokeColor=#d6b656;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
</mxCell>
```

### Document

```xml
<mxCell id="doc1" value="Report"
        style="shape=document;whiteSpace=wrap;boundedLbl=1;backgroundOutline=1;size=0.27;fillColor=#fff2cc;strokeColor=#d6b656;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="120" height="80" as="geometry"/>
</mxCell>
```

### Process (double-bordered rectangle)

```xml
<mxCell id="proc1" value="Subprocess"
        style="shape=process;whiteSpace=wrap;backgroundOutline=1;size=0.1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
</mxCell>
```

## Cloud Provider Shapes

### AWS

```xml
<!-- EC2 Instance -->
<mxCell id="ec2" value="EC2"
        style="shape=mxgraph.aws4.ec2;fillColor=#ED7100;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="60" height="60" as="geometry"/>
</mxCell>

<!-- Lambda -->
<mxCell id="lambda" value="Lambda"
        style="shape=mxgraph.aws4.lambda_function;fillColor=#ED7100;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="200" y="100" width="60" height="60" as="geometry"/>
</mxCell>

<!-- S3 -->
<mxCell id="s3" value="S3"
        style="shape=mxgraph.aws4.s3;fillColor=#3F8624;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="300" y="100" width="60" height="60" as="geometry"/>
</mxCell>

<!-- RDS -->
<mxCell id="rds" value="RDS"
        style="shape=mxgraph.aws4.rds;fillColor=#2E73B8;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="400" y="100" width="60" height="60" as="geometry"/>
</mxCell>

<!-- CloudFront -->
<mxCell id="cloudfront" value="CloudFront"
        style="shape=mxgraph.aws4.cloudfront;fillColor=#8C4FFF;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="500" y="100" width="60" height="60" as="geometry"/>
</mxCell>

<!-- API Gateway -->
<mxCell id="apigw" value="API GW"
        style="shape=mxgraph.aws4.api_gateway;fillColor=#E7157B;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="200" width="60" height="60" as="geometry"/>
</mxCell>

<!-- SQS -->
<mxCell id="sqs" value="SQS"
        style="shape=mxgraph.aws4.sqs;fillColor=#E7157B;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="200" y="200" width="60" height="60" as="geometry"/>
</mxCell>

<!-- SNS -->
<mxCell id="sns" value="SNS"
        style="shape=mxgraph.aws4.sns;fillColor=#E7157B;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="300" y="200" width="60" height="60" as="geometry"/>
</mxCell>

<!-- DynamoDB -->
<mxCell id="dynamodb" value="DynamoDB"
        style="shape=mxgraph.aws4.dynamodb;fillColor=#2E73B8;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="400" y="200" width="60" height="60" as="geometry"/>
</mxCell>

<!-- ECS -->
<mxCell id="ecs" value="ECS"
        style="shape=mxgraph.aws4.ecs;fillColor=#ED7100;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="500" y="200" width="60" height="60" as="geometry"/>
</mxCell>

<!-- ELB / ALB -->
<mxCell id="alb" value="ALB"
        style="shape=mxgraph.aws4.application_load_balancer;fillColor=#8C4FFF;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="300" width="60" height="60" as="geometry"/>
</mxCell>

<!-- VPC -->
<mxCell id="vpc" value="VPC"
        style="shape=mxgraph.aws4.vpc;fillColor=#8C4FFF;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="200" y="300" width="60" height="60" as="geometry"/>
</mxCell>

<!-- ElastiCache -->
<mxCell id="elasticache" value="ElastiCache"
        style="shape=mxgraph.aws4.elasticache;fillColor=#2E73B8;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="300" y="300" width="60" height="60" as="geometry"/>
</mxCell>

<!-- Route53 -->
<mxCell id="route53" value="Route 53"
        style="shape=mxgraph.aws4.route_53;fillColor=#8C4FFF;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="400" y="300" width="60" height="60" as="geometry"/>
</mxCell>

<!-- CloudWatch -->
<mxCell id="cloudwatch" value="CloudWatch"
        style="shape=mxgraph.aws4.cloudwatch;fillColor=#E7157B;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="500" y="300" width="60" height="60" as="geometry"/>
</mxCell>
```

**AWS shape name pattern:** `shape=mxgraph.aws4.<service_name>;`

Common AWS shape names:

| Service        | Shape                                    |
| -------------- | ---------------------------------------- |
| EC2            | `mxgraph.aws4.ec2`                       |
| Lambda         | `mxgraph.aws4.lambda_function`           |
| S3             | `mxgraph.aws4.s3`                        |
| RDS            | `mxgraph.aws4.rds`                       |
| DynamoDB       | `mxgraph.aws4.dynamodb`                  |
| CloudFront     | `mxgraph.aws4.cloudfront`                |
| API Gateway    | `mxgraph.aws4.api_gateway`               |
| SQS            | `mxgraph.aws4.sqs`                       |
| SNS            | `mxgraph.aws4.sns`                       |
| ECS            | `mxgraph.aws4.ecs`                       |
| EKS            | `mxgraph.aws4.eks`                       |
| Fargate        | `mxgraph.aws4.fargate`                   |
| ALB            | `mxgraph.aws4.application_load_balancer` |
| NLB            | `mxgraph.aws4.network_load_balancer`     |
| VPC            | `mxgraph.aws4.vpc`                       |
| ElastiCache    | `mxgraph.aws4.elasticache`               |
| Route 53       | `mxgraph.aws4.route_53`                  |
| CloudWatch     | `mxgraph.aws4.cloudwatch`                |
| IAM            | `mxgraph.aws4.iam`                       |
| Cognito        | `mxgraph.aws4.cognito`                   |
| Step Functions | `mxgraph.aws4.step_functions`            |
| EventBridge    | `mxgraph.aws4.eventbridge`               |
| Kinesis        | `mxgraph.aws4.kinesis`                   |
| Redshift       | `mxgraph.aws4.redshift`                  |
| Aurora         | `mxgraph.aws4.aurora`                    |
| Secrets Mgr    | `mxgraph.aws4.secrets_manager`           |
| WAF            | `mxgraph.aws4.waf`                       |
| CodePipeline   | `mxgraph.aws4.codepipeline`              |
| CodeBuild      | `mxgraph.aws4.codebuild`                 |
| ECR            | `mxgraph.aws4.ecr`                       |

### Azure

```xml
<!-- Virtual Machine -->
<mxCell id="vm" value="VM"
        style="shape=mxgraph.azure.virtual_machine;fillColor=#0078D4;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="60" height="60" as="geometry"/>
</mxCell>

<!-- App Service -->
<mxCell id="app_service" value="App Service"
        style="shape=mxgraph.azure.app_service;fillColor=#0078D4;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="200" y="100" width="60" height="60" as="geometry"/>
</mxCell>

<!-- SQL Database -->
<mxCell id="sql_db" value="SQL DB"
        style="shape=mxgraph.azure.sql_database;fillColor=#0078D4;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="300" y="100" width="60" height="60" as="geometry"/>
</mxCell>

<!-- Azure Functions -->
<mxCell id="func" value="Functions"
        style="shape=mxgraph.azure.function_apps;fillColor=#0078D4;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="400" y="100" width="60" height="60" as="geometry"/>
</mxCell>

<!-- Storage Account -->
<mxCell id="storage" value="Storage"
        style="shape=mxgraph.azure.storage;fillColor=#0078D4;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="500" y="100" width="60" height="60" as="geometry"/>
</mxCell>
```

Common Azure shape names:

| Service            | Shape                                   |
| ------------------ | --------------------------------------- |
| Virtual Machine    | `mxgraph.azure.virtual_machine`         |
| App Service        | `mxgraph.azure.app_service`             |
| SQL Database       | `mxgraph.azure.sql_database`            |
| Functions          | `mxgraph.azure.function_apps`           |
| Storage            | `mxgraph.azure.storage`                 |
| Cosmos DB          | `mxgraph.azure.cosmos_db`               |
| AKS                | `mxgraph.azure.kubernetes_services`     |
| Container Instance | `mxgraph.azure.container_instances`     |
| Service Bus        | `mxgraph.azure.service_bus`             |
| Event Hub          | `mxgraph.azure.event_hubs`              |
| Key Vault          | `mxgraph.azure.key_vaults`              |
| Load Balancer      | `mxgraph.azure.load_balancer_generic`   |
| Application GW     | `mxgraph.azure.application_gateway`     |
| CDN                | `mxgraph.azure.cdn_profiles`            |
| VNet               | `mxgraph.azure.virtual_network`         |
| API Management     | `mxgraph.azure.api_management_services` |

### GCP

```xml
<!-- Compute Engine -->
<mxCell id="gce" value="Compute Engine"
        style="shape=mxgraph.gcp2.compute_engine;fillColor=#4285F4;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="60" height="60" as="geometry"/>
</mxCell>

<!-- Cloud Run -->
<mxCell id="cloud_run" value="Cloud Run"
        style="shape=mxgraph.gcp2.cloud_run;fillColor=#4285F4;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="200" y="100" width="60" height="60" as="geometry"/>
</mxCell>

<!-- Cloud Functions -->
<mxCell id="gcf" value="Cloud Functions"
        style="shape=mxgraph.gcp2.cloud_functions;fillColor=#4285F4;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="300" y="100" width="60" height="60" as="geometry"/>
</mxCell>

<!-- Cloud SQL -->
<mxCell id="cloud_sql" value="Cloud SQL"
        style="shape=mxgraph.gcp2.cloud_sql;fillColor=#4285F4;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="400" y="100" width="60" height="60" as="geometry"/>
</mxCell>

<!-- Cloud Storage -->
<mxCell id="gcs" value="Cloud Storage"
        style="shape=mxgraph.gcp2.cloud_storage;fillColor=#4285F4;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="500" y="100" width="60" height="60" as="geometry"/>
</mxCell>
```

Common GCP shape names:

| Service           | Shape                                   |
| ----------------- | --------------------------------------- |
| Compute Engine    | `mxgraph.gcp2.compute_engine`           |
| Cloud Run         | `mxgraph.gcp2.cloud_run`                |
| Cloud Functions   | `mxgraph.gcp2.cloud_functions`          |
| GKE               | `mxgraph.gcp2.google_kubernetes_engine` |
| Cloud SQL         | `mxgraph.gcp2.cloud_sql`                |
| Cloud Storage     | `mxgraph.gcp2.cloud_storage`            |
| BigQuery          | `mxgraph.gcp2.bigquery`                 |
| Pub/Sub           | `mxgraph.gcp2.cloud_pub_sub`            |
| Cloud CDN         | `mxgraph.gcp2.cloud_cdn`                |
| Cloud Armor       | `mxgraph.gcp2.cloud_armor`              |
| Firestore         | `mxgraph.gcp2.cloud_firestore`          |
| Cloud Endpoints   | `mxgraph.gcp2.cloud_endpoints`          |
| Load Balancing    | `mxgraph.gcp2.cloud_load_balancing`     |
| VPC               | `mxgraph.gcp2.virtual_private_cloud`    |
| IAM               | `mxgraph.gcp2.cloud_iam`                |
| Cloud Build       | `mxgraph.gcp2.cloud_build`              |
| Artifact Registry | `mxgraph.gcp2.artifact_registry`        |

## Edge Styles

### Orthogonal (right-angle routing)

```
style="edgeStyle=orthogonalEdgeStyle;rounded=1;"
```

### Elbow (single bend)

```
style="edgeStyle=elbowEdgeStyle;"
```

### Entity Relation

```
style="edgeStyle=entityRelationEdgeStyle;"
```

### Curved

```
style="curved=1;"
```

### Straight (default)

No `edgeStyle` attribute — straight line between source and target.

### Arrowhead Types

Set with `startFill`, `endFill`, and shape attributes on the style:

| Arrowhead    | Style Fragment                                    |
| ------------ | ------------------------------------------------- |
| Classic      | (default)                                         |
| Block        | `endArrow=block;endFill=1;`                       |
| Open         | `endArrow=open;endFill=0;`                        |
| Diamond      | `endArrow=diamond;endFill=1;`                     |
| Open Diamond | `endArrow=diamond;endFill=0;`                     |
| Oval         | `endArrow=oval;endFill=1;`                        |
| None         | `endArrow=none;`                                  |
| ER one       | `endArrow=ERmandOne;endFill=0;`                   |
| ER many      | `endArrow=ERmany;endFill=0;`                      |
| ER one/many  | `startArrow=ERmandOne;endArrow=ERmany;endFill=0;` |

Use `startArrow` for the source end and `endArrow` for the target end.

### Edge Labels

```xml
<mxCell id="labeled_edge" value="HTTPS"
        style="edgeStyle=orthogonalEdgeStyle;rounded=1;fontColor=#333333;fontSize=10;"
        edge="1" source="a" target="b" parent="1">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>
```

### Dashed / Dotted Edges

```
style="dashed=1;"          <!-- dashed line -->
style="dashed=1;dashPattern=1 4;"   <!-- dotted line -->
```

## Container / Swimlane Patterns

Containers hold child elements. Children use `parent="container-id"` and their coordinates are **relative to the container**.

### Basic Container

```xml
<!-- Container -->
<mxCell id="vpc" value="VPC (10.0.0.0/16)"
        style="swimlane;startSize=30;fillColor=#f5f5f5;strokeColor=#666666;fontColor=#333333;fontStyle=1;"
        vertex="1" parent="1">
  <mxGeometry x="40" y="40" width="500" height="350" as="geometry"/>
</mxCell>

<!-- Child inside container — coordinates relative to container -->
<mxCell id="public_subnet" value="Public Subnet"
        style="rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;fontColor=#333333;"
        vertex="1" parent="vpc">
  <mxGeometry x="20" y="50" width="200" height="60" as="geometry"/>
</mxCell>

<mxCell id="private_subnet" value="Private Subnet"
        style="rounded=1;whiteSpace=wrap;fillColor=#d5e8d4;strokeColor=#82b366;fontColor=#333333;"
        vertex="1" parent="vpc">
  <mxGeometry x="260" y="50" width="200" height="60" as="geometry"/>
</mxCell>
```

### Nested Containers

```xml
<!-- Outer container -->
<mxCell id="region" value="us-east-1"
        style="swimlane;startSize=30;fillColor=#f5f5f5;strokeColor=#666666;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="20" y="20" width="600" height="500" as="geometry"/>
</mxCell>

<!-- Inner container — parent is outer container -->
<mxCell id="vpc" value="VPC"
        style="swimlane;startSize=30;fillColor=#dae8fc;strokeColor=#6c8ebf;fontColor=#333333;"
        vertex="1" parent="region">
  <mxGeometry x="20" y="50" width="560" height="420" as="geometry"/>
</mxCell>

<!-- Element in inner container — parent is inner container -->
<mxCell id="ec2_instance" value="EC2"
        style="shape=mxgraph.aws4.ec2;"
        vertex="1" parent="vpc">
  <mxGeometry x="20" y="50" width="60" height="60" as="geometry"/>
</mxCell>
```

### Horizontal Swimlanes

```xml
<mxCell id="swimlane_container" value=""
        style="swimlane;startSize=0;fillColor=none;strokeColor=none;"
        vertex="1" parent="1">
  <mxGeometry x="20" y="20" width="800" height="400" as="geometry"/>
</mxCell>

<mxCell id="lane_frontend" value="Frontend"
        style="swimlane;horizontal=0;startSize=40;fillColor=#dae8fc;strokeColor=#6c8ebf;fontColor=#333333;"
        vertex="1" parent="swimlane_container">
  <mxGeometry y="0" width="800" height="130" as="geometry"/>
</mxCell>

<mxCell id="lane_backend" value="Backend"
        style="swimlane;horizontal=0;startSize=40;fillColor=#d5e8d4;strokeColor=#82b366;fontColor=#333333;"
        vertex="1" parent="swimlane_container">
  <mxGeometry y="130" width="800" height="130" as="geometry"/>
</mxCell>

<mxCell id="lane_data" value="Data"
        style="swimlane;horizontal=0;startSize=40;fillColor=#fff2cc;strokeColor=#d6b656;fontColor=#333333;"
        vertex="1" parent="swimlane_container">
  <mxGeometry y="260" width="800" height="130" as="geometry"/>
</mxCell>
```

## Multi-Page Structure

Use multiple `<diagram>` elements inside `<mxfile>`:

```xml
<mxfile host="diagramkit" modified="2024-01-01T00:00:00.000Z" type="device">
  <diagram id="overview" name="Overview">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1"
                  tooltips="1" connect="1" arrows="1" fold="1" page="1"
                  pageScale="1" pageWidth="1200" pageHeight="900"
                  math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <!-- Overview elements -->
      </root>
    </mxGraphModel>
  </diagram>
  <diagram id="detail-auth" name="Auth Detail">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1"
                  tooltips="1" connect="1" arrows="1" fold="1" page="1"
                  pageScale="1" pageWidth="1200" pageHeight="900"
                  math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <!-- Auth detail elements -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

Each page is rendered as a separate SVG. Use distinct `id` and `name` attributes for each page. Every page needs its own root cells (`id="0"` and `id="1"`).

## Grid and Layout Guidance

### Standard Sizes

| Element           | Width     | Height    |
| ----------------- | --------- | --------- |
| Standard node     | 120px     | 60px      |
| Cloud icon        | 60px      | 60px      |
| Container/lane    | 400–800px | 200–500px |
| Small label node  | 80px      | 40px      |
| Large service box | 160px     | 80px      |

### Spacing

| Between           | Distance            |
| ----------------- | ------------------- |
| Adjacent nodes    | 40px                |
| Rows              | 80–120px            |
| Columns           | 160–200px           |
| Container padding | 20–40px             |
| Container header  | 30–40px (startSize) |

### Layout Patterns

**Top-down layers** (typical for cloud architecture):

```
Row 0 (y=40):   Users / Internet
Row 1 (y=160):  CDN / Load Balancer
Row 2 (y=280):  Application Tier
Row 3 (y=400):  Data Tier
```

**Left-to-right pipeline:**

```
Col 0 (x=40):   Source
Col 1 (x=240):  Process
Col 2 (x=440):  Transform
Col 3 (x=640):  Output
```

**Grid arrangement** (for many similar services):

```
Position each node at: x = col * 180 + 40, y = row * 120 + 40
```

### Style Fragments Reference

| Property            | Purpose                    |
| ------------------- | -------------------------- |
| `rounded=1`         | Rounded corners            |
| `whiteSpace=wrap`   | Text wrapping inside shape |
| `fillColor=`        | Background color           |
| `strokeColor=`      | Border color               |
| `fontColor=`        | Text color                 |
| `fontSize=`         | Text size (default 12)     |
| `fontStyle=1`       | Bold text                  |
| `fontStyle=2`       | Italic text                |
| `fontStyle=3`       | Bold + italic              |
| `opacity=`          | 0–100 opacity              |
| `dashed=1`          | Dashed border              |
| `shadow=1`          | Drop shadow                |
| `html=1`            | Enable HTML labels         |
| `align=left`        | Horizontal text alignment  |
| `verticalAlign=top` | Vertical text alignment    |
| `spacingTop=`       | Padding from top edge      |
| `spacingLeft=`      | Padding from left edge     |
