# Draw.io Shape Library Reference

Complete reference for mxGraph shapes, containers, cloud provider stencils, and layout patterns. Use this when generating `.drawio` XML files for rendering with `diagramkit`.

---

## Basic Shapes

### Geometric Primitives

| Shape             | Style String                                                                                | Typical Size |
| ----------------- | ------------------------------------------------------------------------------------------- | ------------ |
| Rectangle         | `rounded=0;whiteSpace=wrap;`                                                                | 120 x 60     |
| Rounded Rectangle | `rounded=1;whiteSpace=wrap;`                                                                | 120 x 60     |
| Ellipse           | `ellipse;whiteSpace=wrap;`                                                                  | 120 x 80     |
| Circle            | `ellipse;whiteSpace=wrap;aspect=fixed;`                                                     | 80 x 80      |
| Diamond (Rhombus) | `rhombus;whiteSpace=wrap;`                                                                  | 100 x 100    |
| Triangle          | `triangle;whiteSpace=wrap;`                                                                 | 100 x 80     |
| Hexagon           | `shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;size=25;fixedSize=1;`            | 120 x 80     |
| Parallelogram     | `shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;fixedSize=1;size=20;` | 120 x 60     |
| Trapezoid         | `shape=trapezoid;perimeter=trapezoidPerimeter;whiteSpace=wrap;fixedSize=1;size=20;`         | 120 x 60     |
| Cylinder          | `shape=cylinder3;whiteSpace=wrap;boundedLbl=1;backgroundOutline=1;size=15;`                 | 100 x 80     |
| Cloud             | `ellipse;shape=cloud;whiteSpace=wrap;`                                                      | 120 x 80     |
| Document          | `shape=document;whiteSpace=wrap;boundedLbl=1;backgroundOutline=1;size=0.27;`                | 120 x 80     |
| Note              | `shape=note;whiteSpace=wrap;backgroundOutline=1;size=15;`                                   | 100 x 80     |
| Callout           | `shape=callout;whiteSpace=wrap;perimeter=calloutPerimeter;size=30;position=0.5;`            | 120 x 80     |
| Process           | `shape=process;whiteSpace=wrap;backgroundOutline=1;size=0.1;`                               | 120 x 60     |
| Tape (Paper)      | `shape=tape;whiteSpace=wrap;size=0.2;`                                                      | 120 x 80     |

### XML Example

```xml
<!-- Rounded rectangle -->
<mxCell id="service-a" value="Service A"
        style="rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
</mxCell>

<!-- Cylinder (database) -->
<mxCell id="db" value="PostgreSQL"
        style="shape=cylinder3;whiteSpace=wrap;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#d5e8d4;strokeColor=#82b366;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="200" width="100" height="80" as="geometry"/>
</mxCell>

<!-- Diamond (decision) -->
<mxCell id="decision" value="Valid?"
        style="rhombus;whiteSpace=wrap;fillColor=#fff2cc;strokeColor=#d6b656;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="300" width="100" height="100" as="geometry"/>
</mxCell>
```

---

## Container and Group Shapes

Containers hold child elements. Children set `parent` to the container's ID, and their coordinates are relative to the container.

### Swimlane (Most Common Container)

```xml
<mxCell id="vpc" value="VPC 10.0.0.0/16"
        style="swimlane;startSize=30;fillColor=#f5f5f5;strokeColor=#666666;fontStyle=1;"
        vertex="1" parent="1">
  <mxGeometry x="40" y="40" width="400" height="300" as="geometry"/>
</mxCell>

<!-- Child element -- coordinates relative to container -->
<mxCell id="subnet" value="Public Subnet"
        style="rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;"
        vertex="1" parent="vpc">
  <mxGeometry x="20" y="50" width="160" height="60" as="geometry"/>
</mxCell>
```

### Swimlane Properties

| Property      | Values | Description                           |
| ------------- | ------ | ------------------------------------- |
| `startSize`   | 20-40  | Height of the title bar               |
| `swimlane`    | (key)  | Makes the cell a container            |
| `collapsible` | 0, 1   | Allow collapse in interactive editors |
| `horizontal`  | 0, 1   | 0 = vertical swimlane, 1 = horizontal |

### Horizontal Swimlane (Row-Style)

```xml
<mxCell id="phase-1" value="Phase 1: Build"
        style="swimlane;horizontal=0;startSize=30;fillColor=#e1d5e7;strokeColor=#9673a6;"
        vertex="1" parent="1">
  <mxGeometry x="40" y="40" width="600" height="150" as="geometry"/>
</mxCell>
```

### Dashed Container (No Title Bar)

```xml
<mxCell id="group-backend" value=""
        style="rounded=1;whiteSpace=wrap;dashed=1;dashPattern=5 5;fillColor=none;strokeColor=#666666;"
        vertex="1" parent="1">
  <mxGeometry x="40" y="40" width="400" height="300" as="geometry"/>
</mxCell>

<!-- Group label as separate text cell -->
<mxCell id="group-backend-label" value="Backend Services"
        style="text;fontSize=14;fontStyle=1;fontColor=#666666;align=left;verticalAlign=top;"
        vertex="1" parent="1">
  <mxGeometry x="50" y="45" width="150" height="20" as="geometry"/>
</mxCell>
```

### Nested Containers

Containers can be nested. Each level adds another parent reference:

```xml
<!-- Outer container -->
<mxCell id="cloud" value="AWS" style="swimlane;startSize=30;" vertex="1" parent="1">
  <mxGeometry x="20" y="20" width="600" height="400" as="geometry"/>
</mxCell>

<!-- Inner container (parent = outer) -->
<mxCell id="vpc" value="VPC" style="swimlane;startSize=25;" vertex="1" parent="cloud">
  <mxGeometry x="20" y="50" width="260" height="300" as="geometry"/>
</mxCell>

<!-- Innermost element (parent = inner container) -->
<mxCell id="ec2" value="EC2" style="rounded=1;whiteSpace=wrap;" vertex="1" parent="vpc">
  <mxGeometry x="20" y="40" width="100" height="50" as="geometry"/>
</mxCell>
```

---

## Infrastructure Shapes

### Networking

| Shape         | Style String                                     | Typical Size |
| ------------- | ------------------------------------------------ | ------------ |
| Server        | `shape=mxgraph.cisco.servers.standard_server;`   | 50 x 65      |
| Firewall      | `shape=mxgraph.cisco.firewalls.firewall;`        | 50 x 50      |
| Router        | `shape=mxgraph.cisco.routers.router;`            | 50 x 40      |
| Switch        | `shape=mxgraph.cisco.switches.workgroup_switch;` | 50 x 35      |
| Wireless AP   | `shape=mxgraph.cisco.wireless.wireless_router;`  | 50 x 50      |
| Cloud/Network | `ellipse;shape=cloud;whiteSpace=wrap;`           | 120 x 80     |
| Rack          | `shape=mxgraph.rack.cisco.cisco_router;`         | 100 x 30     |
| VPN           | `shape=mxgraph.cisco.vpn.vpn_gateway;`           | 50 x 50      |

### General Infrastructure

| Shape         | Style String                                            | Typical Size |
| ------------- | ------------------------------------------------------- | ------------ |
| Database      | `shape=cylinder3;whiteSpace=wrap;boundedLbl=1;size=15;` | 100 x 80     |
| Queue         | `shape=mxgraph.aws4.sqs;`                               | 60 x 60      |
| Container/Pod | `rounded=1;dashed=1;dashPattern=5 5;`                   | 120 x 60     |
| Load Balancer | `shape=mxgraph.aws4.application_load_balancer;`         | 60 x 60      |
| CDN           | `shape=mxgraph.aws4.cloudfront;`                        | 60 x 60      |
| API Gateway   | `shape=mxgraph.aws4.api_gateway;`                       | 60 x 60      |

---

## Cloud Provider Shapes

### AWS (mxgraph.aws4.\*)

| Service Category | Shape Name                     | Style String                                    |
| ---------------- | ------------------------------ | ----------------------------------------------- |
| **Compute**      |                                |                                                 |
| EC2              | EC2 Instance                   | `shape=mxgraph.aws4.ec2;`                       |
| Lambda           | Lambda Function                | `shape=mxgraph.aws4.lambda_function;`           |
| ECS              | Elastic Container Service      | `shape=mxgraph.aws4.ecs;`                       |
| EKS              | Elastic Kubernetes Service     | `shape=mxgraph.aws4.eks;`                       |
| Fargate          | Fargate                        | `shape=mxgraph.aws4.fargate;`                   |
| Batch            | Batch                          | `shape=mxgraph.aws4.batch;`                     |
| **Storage**      |                                |                                                 |
| S3               | Simple Storage Service         | `shape=mxgraph.aws4.s3;`                        |
| EBS              | Elastic Block Store            | `shape=mxgraph.aws4.elastic_block_store;`       |
| EFS              | Elastic File System            | `shape=mxgraph.aws4.elastic_file_system;`       |
| **Database**     |                                |                                                 |
| RDS              | Relational Database Service    | `shape=mxgraph.aws4.rds;`                       |
| DynamoDB         | DynamoDB                       | `shape=mxgraph.aws4.dynamodb;`                  |
| ElastiCache      | ElastiCache                    | `shape=mxgraph.aws4.elasticache;`               |
| Aurora           | Aurora                         | `shape=mxgraph.aws4.aurora;`                    |
| Redshift         | Redshift                       | `shape=mxgraph.aws4.redshift;`                  |
| **Networking**   |                                |                                                 |
| VPC              | Virtual Private Cloud          | `shape=mxgraph.aws4.virtual_private_cloud;`     |
| CloudFront       | CloudFront                     | `shape=mxgraph.aws4.cloudfront;`                |
| Route 53         | Route 53                       | `shape=mxgraph.aws4.route_53;`                  |
| ALB              | Application Load Balancer      | `shape=mxgraph.aws4.application_load_balancer;` |
| NLB              | Network Load Balancer          | `shape=mxgraph.aws4.network_load_balancer;`     |
| API Gateway      | API Gateway                    | `shape=mxgraph.aws4.api_gateway;`               |
| **Messaging**    |                                |                                                 |
| SQS              | Simple Queue Service           | `shape=mxgraph.aws4.sqs;`                       |
| SNS              | Simple Notification Service    | `shape=mxgraph.aws4.sns;`                       |
| EventBridge      | EventBridge                    | `shape=mxgraph.aws4.eventbridge;`               |
| Kinesis          | Kinesis                        | `shape=mxgraph.aws4.kinesis;`                   |
| **Security**     |                                |                                                 |
| IAM              | Identity and Access Management | `shape=mxgraph.aws4.iam;`                       |
| KMS              | Key Management Service         | `shape=mxgraph.aws4.kms;`                       |
| WAF              | Web Application Firewall       | `shape=mxgraph.aws4.waf;`                       |
| Cognito          | Cognito                        | `shape=mxgraph.aws4.cognito;`                   |
| **AI/ML**        |                                |                                                 |
| SageMaker        | SageMaker                      | `shape=mxgraph.aws4.sagemaker;`                 |
| Bedrock          | Bedrock                        | `shape=mxgraph.aws4.bedrock;`                   |
| **Monitoring**   |                                |                                                 |
| CloudWatch       | CloudWatch                     | `shape=mxgraph.aws4.cloudwatch;`                |
| X-Ray            | X-Ray                          | `shape=mxgraph.aws4.xray;`                      |

### AWS Container Groups

AWS diagrams typically use swimlanes with AWS-themed colors for grouping:

```xml
<!-- AWS Cloud boundary -->
<mxCell id="aws" value="AWS Cloud"
        style="points=[[0,0],[0.25,0],[0.5,0],[0.75,0],[1,0],[1,0.25],[1,0.5],[1,0.75],[1,1],[0.75,1],[0.5,1],[0.25,1],[0,1],[0,0.75],[0,0.5],[0,0.25]];outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=1;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_aws_cloud;strokeColor=#232F3E;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#232F3E;dashed=0;"
        vertex="1" parent="1">
  <mxGeometry x="20" y="20" width="800" height="500" as="geometry"/>
</mxCell>

<!-- VPC boundary -->
<mxCell id="vpc" value="VPC"
        style="points=[[0,0],[0.25,0],[0.5,0],[0.75,0],[1,0],[1,0.25],[1,0.5],[1,0.75],[1,1],[0.75,1],[0.5,1],[0.25,1],[0,1],[0,0.75],[0,0.5],[0,0.25]];outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=1;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_vpc;strokeColor=#248814;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#AAB7B8;dashed=0;"
        vertex="1" parent="aws">
  <mxGeometry x="20" y="50" width="400" height="400" as="geometry"/>
</mxCell>
```

### Azure (mxgraph.azure.\*)

| Service Category | Shape Name          | Style String                               |
| ---------------- | ------------------- | ------------------------------------------ |
| **Compute**      |                     |                                            |
| VM               | Virtual Machine     | `shape=mxgraph.azure.virtual_machine;`     |
| App Service      | App Service         | `shape=mxgraph.azure.app_service;`         |
| AKS              | Kubernetes Service  | `shape=mxgraph.azure.kubernetes_services;` |
| Functions        | Azure Functions     | `shape=mxgraph.azure.azure_functions;`     |
| **Storage**      |                     |                                            |
| Blob Storage     | Blob Storage        | `shape=mxgraph.azure.blob_storage;`        |
| Queue Storage    | Queue Storage       | `shape=mxgraph.azure.queue_storage;`       |
| **Database**     |                     |                                            |
| SQL Database     | SQL Database        | `shape=mxgraph.azure.sql_database;`        |
| Cosmos DB        | Cosmos DB           | `shape=mxgraph.azure.cosmos_db;`           |
| Cache for Redis  | Azure Cache         | `shape=mxgraph.azure.cache_for_redis;`     |
| **Networking**   |                     |                                            |
| VNet             | Virtual Network     | `shape=mxgraph.azure.virtual_network;`     |
| Load Balancer    | Load Balancer       | `shape=mxgraph.azure.azure_load_balancer;` |
| App Gateway      | Application Gateway | `shape=mxgraph.azure.application_gateway;` |
| Front Door       | Front Door          | `shape=mxgraph.azure.front_door;`          |
| **Messaging**    |                     |                                            |
| Service Bus      | Service Bus         | `shape=mxgraph.azure.service_bus;`         |
| Event Hub        | Event Hub           | `shape=mxgraph.azure.event_hub;`           |
| **AI/ML**        |                     |                                            |
| Cognitive Svcs   | Cognitive Services  | `shape=mxgraph.azure.cognitive_services;`  |
| ML Workspace     | Machine Learning    | `shape=mxgraph.azure.machine_learning;`    |

### GCP (mxgraph.gcp2.\*)

| Service Category | Shape Name        | Style String                                   |
| ---------------- | ----------------- | ---------------------------------------------- |
| **Compute**      |                   |                                                |
| Compute Engine   | GCE Instance      | `shape=mxgraph.gcp2.compute_engine;`           |
| Cloud Run        | Cloud Run         | `shape=mxgraph.gcp2.cloud_run;`                |
| GKE              | Kubernetes Engine | `shape=mxgraph.gcp2.google_kubernetes_engine;` |
| Cloud Functions  | Cloud Functions   | `shape=mxgraph.gcp2.cloud_functions;`          |
| **Storage**      |                   |                                                |
| GCS              | Cloud Storage     | `shape=mxgraph.gcp2.cloud_storage;`            |
| **Database**     |                   |                                                |
| Cloud SQL        | Cloud SQL         | `shape=mxgraph.gcp2.cloud_sql;`                |
| Firestore        | Firestore         | `shape=mxgraph.gcp2.cloud_firestore;`          |
| Bigtable         | Cloud Bigtable    | `shape=mxgraph.gcp2.cloud_bigtable;`           |
| Spanner          | Cloud Spanner     | `shape=mxgraph.gcp2.cloud_spanner;`            |
| **Networking**   |                   |                                                |
| VPC              | VPC Network       | `shape=mxgraph.gcp2.virtual_private_cloud;`    |
| Cloud CDN        | Cloud CDN         | `shape=mxgraph.gcp2.cloud_cdn;`                |
| Cloud DNS        | Cloud DNS         | `shape=mxgraph.gcp2.cloud_dns;`                |
| Cloud Load Bal.  | Load Balancing    | `shape=mxgraph.gcp2.cloud_load_balancing;`     |
| **Messaging**    |                   |                                                |
| Pub/Sub          | Pub/Sub           | `shape=mxgraph.gcp2.cloud_pubsub;`             |
| **AI/ML**        |                   |                                                |
| Vertex AI        | Vertex AI         | `shape=mxgraph.gcp2.vertex_ai;`                |
| **Monitoring**   |                   |                                                |
| Cloud Monitoring | Cloud Monitoring  | `shape=mxgraph.gcp2.cloud_monitoring;`         |

---

## BPMN Shapes

| Shape             | Style String                                                                        |
| ----------------- | ----------------------------------------------------------------------------------- |
| Start Event       | `shape=mxgraph.bpmn.event;perimeter=ellipsePerimeter;symbol=general;`               |
| End Event         | `shape=mxgraph.bpmn.event;perimeter=ellipsePerimeter;symbol=terminate;outline=end;` |
| Task              | `shape=mxgraph.bpmn.task;isLoopStandard=0;`                                         |
| Exclusive Gateway | `shape=mxgraph.bpmn.shape;perimeter=rhombusPerimeter;symbol=exclusiveGw;`           |
| Parallel Gateway  | `shape=mxgraph.bpmn.shape;perimeter=rhombusPerimeter;symbol=parallelGw;`            |
| Inclusive Gateway | `shape=mxgraph.bpmn.shape;perimeter=rhombusPerimeter;symbol=inclusiveGw;`           |
| Message Event     | `shape=mxgraph.bpmn.event;perimeter=ellipsePerimeter;symbol=message;`               |
| Timer Event       | `shape=mxgraph.bpmn.event;perimeter=ellipsePerimeter;symbol=timer;`                 |
| Pool (Horizontal) | `shape=mxgraph.bpmn.pool;isHorizontal=1;startSize=30;`                              |
| Lane              | `swimlane;startSize=30;`                                                            |

---

## UML Shapes

| Shape             | Style String                                                     |
| ----------------- | ---------------------------------------------------------------- |
| Class             | `swimlane;fontStyle=1;align=center;startSize=26;`                |
| Interface         | `swimlane;fontStyle=3;align=center;startSize=26;`                |
| Package           | `shape=folder;tabWidth=80;tabHeight=20;tabPosition=left;`        |
| Actor (Stick Man) | `shape=mxgraph.basic.person;`                                    |
| Component         | `shape=component;align=left;spacingLeft=36;`                     |
| Use Case          | `ellipse;whiteSpace=wrap;`                                       |
| Lifeline          | `shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;` |

---

## Layout Patterns

### Hierarchical (Top-Down)

Best for architecture diagrams, call hierarchies, and org charts.

```
Grid:
  Column width: 160-200px
  Row height: 120-160px
  Element size: 120x60 (standard), 100x80 (cylinder)
  Spacing: 40px between elements

Row layout (y positions):
  Title:    y = 10
  Row 1:    y = 60    (entry points: load balancers, API gateways)
  Row 2:    y = 180   (services: API, web, workers)
  Row 3:    y = 300   (data stores: databases, caches, queues)
  Row 4:    y = 420   (external: third-party APIs, monitoring)
```

```xml
<!-- Row 1: Entry point -->
<mxCell id="lb" value="Load Balancer" style="rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;"
        vertex="1" parent="1">
  <mxGeometry x="340" y="60" width="120" height="60" as="geometry"/>
</mxCell>

<!-- Row 2: Services (spread horizontally) -->
<mxCell id="api" value="API Server" style="rounded=1;whiteSpace=wrap;fillColor=#e1d5e7;strokeColor=#9673a6;"
        vertex="1" parent="1">
  <mxGeometry x="200" y="180" width="120" height="60" as="geometry"/>
</mxCell>
<mxCell id="web" value="Web Server" style="rounded=1;whiteSpace=wrap;fillColor=#e1d5e7;strokeColor=#9673a6;"
        vertex="1" parent="1">
  <mxGeometry x="480" y="180" width="120" height="60" as="geometry"/>
</mxCell>

<!-- Row 3: Data stores -->
<mxCell id="db" value="PostgreSQL" style="shape=cylinder3;whiteSpace=wrap;boundedLbl=1;size=15;fillColor=#d5e8d4;strokeColor=#82b366;"
        vertex="1" parent="1">
  <mxGeometry x="340" y="300" width="120" height="80" as="geometry"/>
</mxCell>
```

### Left-to-Right (Pipeline)

Best for data pipelines, CI/CD workflows, and request flows.

```
Grid:
  Stage width: 200px
  Stage gap: 80px
  All stages at same y: 160
  Element size: 120x60

Stage layout (x positions):
  Stage 1: x = 40
  Stage 2: x = 240
  Stage 3: x = 440
  Stage 4: x = 640
  Stage 5: x = 840
```

```xml
<mxCell id="src" value="Source" style="rounded=1;whiteSpace=wrap;" vertex="1" parent="1">
  <mxGeometry x="40" y="160" width="120" height="60" as="geometry"/>
</mxCell>
<mxCell id="build" value="Build" style="rounded=1;whiteSpace=wrap;" vertex="1" parent="1">
  <mxGeometry x="240" y="160" width="120" height="60" as="geometry"/>
</mxCell>
<mxCell id="test" value="Test" style="rounded=1;whiteSpace=wrap;" vertex="1" parent="1">
  <mxGeometry x="440" y="160" width="120" height="60" as="geometry"/>
</mxCell>
<mxCell id="deploy" value="Deploy" style="rounded=1;whiteSpace=wrap;" vertex="1" parent="1">
  <mxGeometry x="640" y="160" width="120" height="60" as="geometry"/>
</mxCell>

<!-- Horizontal arrows -->
<mxCell id="e1" style="edgeStyle=orthogonalEdgeStyle;" edge="1" source="src" target="build" parent="1">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>
```

### Grid Layout

Best for inventory diagrams, service catalogs, and comparison views.

```
Grid:
  Columns: 3-4
  Cell width: 160px
  Cell height: 100px
  Gap: 40px

Position formula:
  x = margin + col * (cellWidth + gap)
  y = margin + row * (cellHeight + gap)
```

### Hub-and-Spoke

Best for event-driven architectures with a central broker.

```
Center hub: x=350, y=250, width=140, height=80

Spoke positions (8 spokes, 120x60 each):
  N:  x=380, y=60
  NE: x=580, y=100
  E:  x=600, y=240
  SE: x=580, y=380
  S:  x=380, y=420
  SW: x=140, y=380
  W:  x=120, y=240
  NW: x=140, y=100
```

---

## Shape Composition Patterns

### Labeled Icon Shape

When using an mxGraph stencil shape (like AWS icons), add a label below:

```xml
<!-- Icon -->
<mxCell id="lambda" value=""
        style="shape=mxgraph.aws4.lambda_function;fillColor=#F58536;strokeColor=none;"
        vertex="1" parent="1">
  <mxGeometry x="140" y="100" width="60" height="60" as="geometry"/>
</mxCell>

<!-- Label below icon -->
<mxCell id="lambda-label" value="Order Processor"
        style="text;whiteSpace=wrap;align=center;fontSize=11;"
        vertex="1" parent="1">
  <mxGeometry x="110" y="165" width="120" height="20" as="geometry"/>
</mxCell>
```

### Badge / Status Indicator

```xml
<!-- Main shape -->
<mxCell id="server" value="API Server"
        style="rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
</mxCell>

<!-- Status badge (small circle overlapping corner) -->
<mxCell id="server-status" value=""
        style="ellipse;aspect=fixed;fillColor=#d5e8d4;strokeColor=#82b366;"
        vertex="1" parent="1">
  <mxGeometry x="205" y="95" width="15" height="15" as="geometry"/>
</mxCell>
```

### Multi-Compartment Shape (UML Class Style)

```xml
<!-- Class header -->
<mxCell id="class-user" value="User"
        style="swimlane;fontStyle=1;align=center;startSize=26;fillColor=#dae8fc;strokeColor=#6c8ebf;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="160" height="120" as="geometry"/>
</mxCell>

<!-- Attributes compartment -->
<mxCell id="class-user-attrs" value="- id: UUID&#xa;- name: string&#xa;- email: string"
        style="text;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;whiteSpace=wrap;"
        vertex="1" parent="class-user">
  <mxGeometry y="26" width="160" height="50" as="geometry"/>
</mxCell>

<!-- Methods compartment -->
<mxCell id="class-user-methods" value="+ validate()&#xa;+ save()"
        style="text;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;whiteSpace=wrap;"
        vertex="1" parent="class-user">
  <mxGeometry y="76" width="160" height="44" as="geometry"/>
</mxCell>
```

Note: Use `&#xa;` for line breaks in XML attribute values.

---

## Sizing Guidelines

| Element Type         | Recommended Size | Notes                                 |
| -------------------- | ---------------- | ------------------------------------- |
| Standard shape       | 120 x 60         | Most rectangles, rounded rectangles   |
| Database cylinder    | 100 x 80         | Cylinder needs extra height for cap   |
| Diamond / decision   | 100 x 100        | Keep square for visual balance        |
| Cloud shape          | 120 x 80         | Oval proportions                      |
| AWS/Azure/GCP icon   | 60 x 60          | Stencil shapes are typically square   |
| Container / swimlane | 400+ x 200+      | Must enclose child elements           |
| Spacing between      | 40px             | Minimum gap between adjacent elements |
| Edge label           | 80 x 20          | Small text for connection labels      |

---

## Complete Example: Cloud Architecture with Containers

```xml
<mxfile host="diagramkit">
  <diagram id="cloud-arch" name="Cloud Architecture">
    <mxGraphModel dx="1200" dy="900" grid="1" gridSize="10">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>

        <!-- Internet -->
        <mxCell id="internet" value="Internet"
                style="ellipse;shape=cloud;whiteSpace=wrap;fillColor=#f5f5f5;strokeColor=#666666;"
                vertex="1" parent="1">
          <mxGeometry x="440" y="20" width="120" height="80" as="geometry"/>
        </mxCell>

        <!-- CDN -->
        <mxCell id="cdn" value="CloudFront"
                style="rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;fontStyle=1;"
                vertex="1" parent="1">
          <mxGeometry x="450" y="140" width="100" height="50" as="geometry"/>
        </mxCell>

        <!-- VPC Container -->
        <mxCell id="vpc" value="VPC 10.0.0.0/16"
                style="swimlane;startSize=30;fillColor=#f5f5f5;strokeColor=#82b366;fontStyle=1;dashed=1;"
                vertex="1" parent="1">
          <mxGeometry x="100" y="230" width="800" height="350" as="geometry"/>
        </mxCell>

        <!-- Public Subnet -->
        <mxCell id="pub-subnet" value="Public Subnet"
                style="swimlane;startSize=25;fillColor=#dae8fc;strokeColor=#6c8ebf;dashed=1;"
                vertex="1" parent="vpc">
          <mxGeometry x="20" y="40" width="360" height="130" as="geometry"/>
        </mxCell>

        <mxCell id="alb" value="ALB" style="rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;"
                vertex="1" parent="pub-subnet">
          <mxGeometry x="120" y="40" width="120" height="60" as="geometry"/>
        </mxCell>

        <!-- Private Subnet -->
        <mxCell id="priv-subnet" value="Private Subnet"
                style="swimlane;startSize=25;fillColor=#e1d5e7;strokeColor=#9673a6;dashed=1;"
                vertex="1" parent="vpc">
          <mxGeometry x="20" y="190" width="760" height="140" as="geometry"/>
        </mxCell>

        <mxCell id="ecs-1" value="ECS Service A"
                style="rounded=1;whiteSpace=wrap;fillColor=#e1d5e7;strokeColor=#9673a6;"
                vertex="1" parent="priv-subnet">
          <mxGeometry x="30" y="40" width="120" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="ecs-2" value="ECS Service B"
                style="rounded=1;whiteSpace=wrap;fillColor=#e1d5e7;strokeColor=#9673a6;"
                vertex="1" parent="priv-subnet">
          <mxGeometry x="220" y="40" width="120" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="rds" value="RDS PostgreSQL"
                style="shape=cylinder3;whiteSpace=wrap;boundedLbl=1;size=15;fillColor=#d5e8d4;strokeColor=#82b366;"
                vertex="1" parent="priv-subnet">
          <mxGeometry x="430" y="30" width="120" height="80" as="geometry"/>
        </mxCell>
        <mxCell id="redis" value="ElastiCache"
                style="shape=cylinder3;whiteSpace=wrap;boundedLbl=1;size=15;fillColor=#ffe6cc;strokeColor=#d6b656;"
                vertex="1" parent="priv-subnet">
          <mxGeometry x="620" y="30" width="120" height="80" as="geometry"/>
        </mxCell>

        <!-- Edges -->
        <mxCell id="e1" style="edgeStyle=orthogonalEdgeStyle;" edge="1" source="internet" target="cdn" parent="1">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
        <mxCell id="e2" style="edgeStyle=orthogonalEdgeStyle;" edge="1" source="cdn" target="alb" parent="1">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
        <mxCell id="e3" style="edgeStyle=orthogonalEdgeStyle;" edge="1" source="alb" target="ecs-1" parent="1">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
        <mxCell id="e4" style="edgeStyle=orthogonalEdgeStyle;" edge="1" source="alb" target="ecs-2" parent="1">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
        <mxCell id="e5" value="SQL" style="edgeStyle=orthogonalEdgeStyle;" edge="1" source="ecs-1" target="rds" parent="1">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
        <mxCell id="e6" value="SQL" style="edgeStyle=orthogonalEdgeStyle;" edge="1" source="ecs-2" target="rds" parent="1">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
        <mxCell id="e7" style="edgeStyle=orthogonalEdgeStyle;dashed=1;" edge="1" source="ecs-1" target="redis" parent="1">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```
