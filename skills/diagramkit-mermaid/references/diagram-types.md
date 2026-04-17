# Mermaid Diagram Types — Full Syntax Reference

Complete reference for all 21 Mermaid diagram types supported by diagramkit. Load this file when you need the exact syntax for a specific diagram type.

---

## 1. Flowchart

**Directive:** `flowchart TD` (top-down) or `flowchart LR` (left-right)

**Best for:** Process flows, pipelines, decision trees, workflow diagrams.

### Directions

| Code | Direction                    |
| ---- | ---------------------------- |
| `TB` | Top to bottom (same as `TD`) |
| `TD` | Top-down                     |
| `BT` | Bottom to top                |
| `RL` | Right to left                |
| `LR` | Left to right                |

### Node Shapes

```
id[Rectangle]
id2(Rounded rectangle)
id3([Stadium / pill])
id4[[Subroutine]]
id5[(Database / cylinder)]
id6((Circle))
id7{Diamond / decision}
id8{{Hexagon}}
id9[/Parallelogram/]
id10[\Reverse parallelogram\]
id11[/Trapezoid\]
id12[\Reverse trapezoid/]
id13>Asymmetric / flag]
id14(((Double circle)))
```

### Edge Types

```
A --> B              %% solid arrow
A --- B              %% solid line (no arrow)
A -.-> B             %% dashed arrow
A -.- B              %% dashed line
A ==> B              %% thick arrow
A === B              %% thick line
A --o B              %% circle end
A --x B              %% cross end
A <--> B             %% bidirectional arrow
A -- text --> B      %% labeled solid arrow
A -. text .-> B      %% labeled dashed arrow
A == text ==> B      %% labeled thick arrow
A ---|text| B        %% labeled solid line
```

### Subgraphs

```
subgraph id["Display Title"]
    direction LR
    node1 --> node2
end
```

Subgraphs can be nested. Edges can cross subgraph boundaries. Use `direction` inside a subgraph to override the parent flow direction.

### Styling

```
classDef className fill:#4C78A8,stroke:#2E5A88,color:#fff
class node1,node2 className
node3:::className
linkStyle 0 stroke:#E45756,stroke-width:2px
```

### Click Events

```
click nodeId href "https://example.com" _blank
click nodeId callback "Tooltip text"
```

### Complete Example

```
%% Diagram: Request Processing Pipeline
%% Type: flowchart
flowchart LR
    subgraph ingress["Ingress"]
        lb[Load Balancer] --> gw[API Gateway]
    end

    subgraph services["Services"]
        direction TB
        auth[Auth Service] --> users[(Users DB)]
        orders[Order Service] --> odb[(Orders DB)]
    end

    subgraph output["Response"]
        cache[(Redis Cache)]
        resp[Response Builder]
    end

    gw --> auth
    gw --> orders
    auth --> cache
    orders --> resp
    cache --> resp

    classDef primary fill:#4C78A8,stroke:#2E5A88,color:#fff
    classDef storage fill:#E4A847,stroke:#C08C35,color:#fff
    class lb,gw,auth,orders,resp primary
    class users,odb,cache storage
```

### Best Practices

- Use `LR` for pipelines and `TD` for hierarchies.
- Keep under 15 nodes per diagram; use subgraphs for grouping.
- Quote labels containing special characters: `id["Label with (parens)"]`.
- Avoid deeply nested subgraphs (max 2–3 levels).
- Place `classDef` at the end of the diagram for readability.

---

## 2. Sequence

**Directive:** `sequenceDiagram`

**Best for:** Message passing, API exchanges, protocols, request/response flows.

### Participants and Actors

```
sequenceDiagram
    participant A as Alice
    participant B as Bob
    actor U as User
```

`participant` renders as a box, `actor` as a stick figure. Declaration order sets left-to-right position.

### Message Types

```
A->>B: Solid arrow (synchronous)
A-->>B: Dashed arrow (response)
A-)B: Async message (open arrow)
A--)B: Async dashed
A-xB: Lost message (cross)
A--xB: Lost dashed
```

### Activations

```
activate B
B->>A: Response
deactivate B

%% shorthand
A->>+B: Request
B-->>-A: Response
```

### Notes

```
Note over A: Single participant
Note over A,B: Spanning note
Note left of A: Left-side note
Note right of B: Right-side note
```

### Combined Fragments

```
alt Condition A
    A->>B: Path A
else Condition B
    A->>B: Path B
end

opt Optional
    A->>B: Conditional message
end

loop Every 5 seconds
    A->>B: Heartbeat
end

par Parallel
    A->>B: Task 1
and
    A->>C: Task 2
end

critical Atomic Section
    A->>B: Step 1
    B->>C: Step 2
option Failure
    A->>B: Rollback
end

break When error
    A->>B: Error handling
end
```

### Autonumber

```
autonumber
```

Adds sequential numbers to all messages when placed at the top.

### Rect Background

```
rect rgb(200, 220, 255)
    A->>B: Inside colored region
end
```

### Complete Example

```
%% Diagram: OAuth2 Authorization Code Flow
%% Type: sequence
sequenceDiagram
    autonumber
    actor user as User
    participant app as Client App
    participant auth as Auth Server
    participant api as Resource API

    user->>app: Click "Login"
    app->>auth: Authorization request
    auth->>user: Show login form
    user->>auth: Enter credentials
    auth->>app: Authorization code

    activate app
    app->>auth: Exchange code for token
    auth-->>app: Access token + refresh token
    deactivate app

    loop Every API call
        app->>api: Request (Bearer token)
        api-->>app: Protected resource
    end

    app->>user: Display data
```

### Best Practices

- Declare all participants at the top to control ordering.
- Use `autonumber` for complex flows to aid discussion.
- Keep activation bars balanced (`+`/`-` shorthand helps).
- Use `alt`/`opt`/`loop`/`par` to show conditional and concurrent logic.
- Avoid more than 6–7 participants; split into multiple diagrams.

---

## 3. Class

**Directive:** `classDiagram`

**Best for:** OOP structure, inheritance hierarchies, interfaces, design patterns.

### Class Definition

```
classDiagram
    class ClassName {
        +String publicField
        -int privateField
        #double protectedField
        ~List~String~ packageField
        +publicMethod() ReturnType
        -privateMethod(param Type) void
        #protectedMethod()* ReturnType
        +abstractMethod()* void
        +staticMethod()$ ReturnType
    }
```

### Visibility Modifiers

| Symbol | Meaning   |
| ------ | --------- |
| `+`    | Public    |
| `-`    | Private   |
| `#`    | Protected |
| `~`    | Package   |

### Method Modifiers

| Suffix | Meaning  |
| ------ | -------- |
| `*`    | Abstract |
| `$`    | Static   |

### Relationships

```
ClassA <|-- ClassB : Inheritance (B extends A)
ClassA *-- ClassC : Composition (A owns C)
ClassA o-- ClassD : Aggregation (A has C)
ClassA --> ClassE : Association
ClassA ..> ClassF : Dependency (A uses F)
ClassA ..|> InterfaceG : Implementation (A implements G)
ClassA -- ClassH : Link (solid)
ClassA .. ClassI : Link (dashed)
```

### Multiplicity

```
ClassA "1" --> "*" ClassB : has many
ClassA "1" --> "1..n" ClassC : has one or more
ClassA "0..1" --> "0..*" ClassD : optional relationship
```

### Annotations

```
class Shape {
    <<interface>>
}
class Color {
    <<enumeration>>
    RED
    GREEN
    BLUE
}
class Service {
    <<abstract>>
}
class Utility {
    <<service>>
}
```

### Namespace

```
namespace Data {
    class User
    class Order
}
```

### Direction

```
classDiagram
    direction RL
```

### Complete Example

```
%% Diagram: Repository Pattern
%% Type: class
classDiagram
    direction TB

    class Repository~T~ {
        <<interface>>
        +findById(id String) T
        +findAll() List~T~
        +save(entity T) void
        +delete(id String) void
    }

    class UserRepository {
        -db DatabaseConnection
        +findById(id String) User
        +findAll() List~User~
        +save(entity User) void
        +delete(id String) void
        +findByEmail(email String) User
    }

    class User {
        +String id
        +String name
        +String email
        -String passwordHash
        +validatePassword(password String) boolean
    }

    class DatabaseConnection {
        <<service>>
        -String connectionString
        +query(sql String) ResultSet
        +close() void
    }

    Repository~T~ <|.. UserRepository
    UserRepository ..> DatabaseConnection : uses
    UserRepository --> User : manages
```

### Best Practices

- Use `<<interface>>` and `<<abstract>>` annotations for clarity.
- Show generics with `~T~` syntax.
- Keep class diagrams focused — show one pattern or subsystem per diagram.
- Prefer `direction TB` for inheritance hierarchies, `direction LR` for associations.

---

## 4. State

**Directive:** `stateDiagram-v2`

**Best for:** State machines, lifecycle transitions, workflow states.

### Basic Syntax

```
stateDiagram-v2
    [*] --> Idle
    Idle --> Processing : start
    Processing --> Done : complete
    Processing --> Error : fail
    Error --> Idle : retry
    Done --> [*]
```

`[*]` represents start and end pseudo-states.

### State Descriptions

```
state "Long State Name" as longState
longState : Entry action here
longState : Another detail
```

### Composite States

```
state ActiveState {
    [*] --> SubState1
    SubState1 --> SubState2 : next
    SubState2 --> [*]
}
```

### Fork and Join

```
state fork_state <<fork>>
state join_state <<join>>

[*] --> fork_state
fork_state --> TaskA
fork_state --> TaskB
TaskA --> join_state
TaskB --> join_state
join_state --> Done
```

### Choice

```
state is_valid <<choice>>

Processing --> is_valid
is_valid --> Approved : valid
is_valid --> Rejected : invalid
```

### Notes

```
note right of Active : This is a note
note left of Idle
    Multi-line
    note content
end note
```

### Direction

```
stateDiagram-v2
    direction LR
```

### Concurrency

```
state Parallel {
    [*] --> A
    --
    [*] --> B
}
```

The `--` separator creates concurrent regions.

### Complete Example

```
%% Diagram: Order Lifecycle
%% Type: state
stateDiagram-v2
    [*] --> Draft

    state "Order Processing" as processing {
        [*] --> Validating
        Validating --> PaymentPending : valid

        state payment_check <<choice>>
        PaymentPending --> payment_check
        payment_check --> Paid : payment success
        payment_check --> PaymentFailed : payment error
        PaymentFailed --> PaymentPending : retry
    }

    Draft --> processing : submit
    processing --> Fulfillment : paid

    state Fulfillment {
        [*] --> Picking
        Picking --> Packing
        Packing --> Shipped
    }

    Shipped --> Delivered
    Delivered --> [*]

    Draft --> Cancelled : cancel
    processing --> Cancelled : cancel
    Cancelled --> [*]
```

### Best Practices

- Use `[*]` for start/end points to clarify the lifecycle.
- Use composite states to group related sub-states.
- Keep transition labels short — use notes for detail.
- Use `<<choice>>` for conditional branching over complex if-else arrows.

---

## 5. ER (Entity-Relationship)

**Directive:** `erDiagram`

**Best for:** Database entities, attribute lists, relationship cardinality.

### Cardinality Notation

| Left | Right | Meaning                      |
| ---- | ----- | ---------------------------- | --- | --------------------------- | --- | ----------- |
| `    | o`    | `o                           | `   | Zero or one                 |
| `    |       | `                            | `   |                             | `   | Exactly one |
| `}o` | `o{`  | Zero or more (many optional) |
| `}   | `     | `                            | {`  | One or more (many required) |

### Relationships

```
CUSTOMER ||--o{ ORDER : "places"
ORDER ||--|{ ORDER_ITEM : "contains"
PRODUCT ||--o{ ORDER_ITEM : "appears in"
CUSTOMER }o--o{ ADDRESS : "lives at"
```

### Attributes

```
CUSTOMER {
    uuid id PK
    string email UK
    string name
    string phone
    timestamp created_at
}

ORDER {
    uuid id PK
    uuid customer_id FK
    decimal total
    string status
    timestamp ordered_at
}
```

Attribute markers: `PK` (primary key), `FK` (foreign key), `UK` (unique key).

### Complete Example

```
%% Diagram: E-commerce Data Model
%% Type: er
erDiagram
    CUSTOMER ||--o{ ORDER : "places"
    CUSTOMER {
        uuid id PK
        string email UK
        string first_name
        string last_name
        timestamp created_at
    }

    ORDER ||--|{ ORDER_ITEM : "contains"
    ORDER {
        uuid id PK
        uuid customer_id FK
        decimal subtotal
        decimal tax
        string status
        timestamp ordered_at
    }

    PRODUCT ||--o{ ORDER_ITEM : "included in"
    PRODUCT {
        uuid id PK
        string sku UK
        string name
        text description
        decimal price
        int stock_count
    }

    ORDER_ITEM {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        int quantity
        decimal unit_price
    }

    CUSTOMER }o--o{ ADDRESS : "has"
    ADDRESS {
        uuid id PK
        string street
        string city
        string state
        string zip
        string country
    }
```

### Best Practices

- Always include `PK`, `FK`, and `UK` markers.
- Use quoted relationship labels for readability.
- Keep to one domain or bounded context per diagram.
- Use descriptive entity names matching the database schema.

---

## 6. Gantt

**Directive:** `gantt`

**Best for:** Timelines, project schedules, rollout plans, sprint planning.

### Syntax

```
gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    axisFormat %b %d
    excludes weekends
    todayMarker stroke-width:3px,stroke:#E45756

    section Section Name
    Task name           :status, id, start, duration
```

### Date Formats

| Token        | Format     |
| ------------ | ---------- |
| `YYYY-MM-DD` | 2025-04-07 |
| `DD-MM-YYYY` | 07-04-2025 |
| `YYYY`       | Year only  |

### Axis Format Tokens

| Token | Meaning             |
| ----- | ------------------- |
| `%Y`  | Full year           |
| `%b`  | Abbreviated month   |
| `%d`  | Day of month        |
| `%a`  | Abbreviated weekday |
| `%H`  | Hour (24h)          |

### Task Status Modifiers

```
done, taskId, 2025-01-01, 2025-01-15         %% completed
active, taskId, 2025-01-16, 2025-02-01       %% in progress
crit, taskId, 2025-02-01, 2025-02-15         %% critical path
crit, active, taskId, 2025-02-01, 2025-02-15 %% critical + active
milestone, taskId, 2025-03-01, 0d            %% milestone (zero duration)
```

### Dependencies

```
section Backend
API redesign       :api, 2025-04-07, 5d
Database migration :db, after api, 3d
Testing            :test, after db, 2d
```

`after taskId` creates a dependency.

### Duration Units

`d` (days), `w` (weeks), `h` (hours). Example: `5d`, `2w`, `8h`.

### Complete Example

```
%% Diagram: Q2 Release Plan
%% Type: gantt
gantt
    title Q2 2025 Release Plan
    dateFormat YYYY-MM-DD
    axisFormat %b %d
    excludes weekends

    section Design
    Requirements       :done, req, 2025-04-01, 5d
    UI Mockups         :done, ui, after req, 3d
    Architecture       :active, arch, after req, 4d

    section Development
    Auth Module        :crit, auth, after arch, 10d
    API Layer          :api, after arch, 8d
    Frontend           :fe, after ui, 12d

    section Testing
    Integration Tests  :test, after auth, 5d
    Load Testing       :crit, load, after test, 3d

    section Release
    Staging Deploy     :stage, after load, 2d
    Production Release :milestone, release, after stage, 0d
```

### Best Practices

- Use `excludes weekends` for work-day-only scheduling.
- Mark critical path items with `crit` to highlight dependencies.
- Keep sections logical (Design, Dev, QA, Release).
- Use milestones for key dates.
- Use `after taskId` for real dependency chains, not hardcoded dates.

---

## 7. GitGraph

**Directive:** `gitGraph`

**Best for:** Branching strategies, release histories, merge workflows.

### Syntax

```
gitGraph
    commit id: "message"
    branch branchName
    checkout branchName
    commit id: "message"
    checkout main
    merge branchName id: "merge-message"
    commit id: "message" tag: "v1.0.0"
```

### Operations

| Operation   | Syntax                             |
| ----------- | ---------------------------------- |
| Commit      | `commit id: "msg"`                 |
| Branch      | `branch name`                      |
| Checkout    | `checkout name`                    |
| Merge       | `merge name id: "msg"`             |
| Cherry-pick | `cherry-pick id: "commit-id"`      |
| Tag         | `commit id: "msg" tag: "v1.0"`     |
| Commit type | `commit id: "msg" type: HIGHLIGHT` |

### Commit Types

| Type        | Rendering      |
| ----------- | -------------- |
| `NORMAL`    | Default circle |
| `HIGHLIGHT` | Highlighted    |
| `REVERSE`   | Reversed style |

### Ordering

```
%%{init: { 'gitGraph': {'mainBranchOrder': 1} } }%%
gitGraph
    commit
    branch develop order: 2
    branch feature order: 3
```

### Complete Example

```
%% Diagram: Git Flow Release
%% Type: gitgraph
gitGraph
    commit id: "init"
    branch develop
    checkout develop
    commit id: "project-setup"

    branch feature/auth
    checkout feature/auth
    commit id: "auth-models"
    commit id: "auth-routes"
    checkout develop
    merge feature/auth id: "merge-auth"

    branch feature/api
    checkout feature/api
    commit id: "api-endpoints"
    checkout develop
    merge feature/api id: "merge-api"

    branch release/1.0
    checkout release/1.0
    commit id: "bump-version"
    commit id: "fix-docs"

    checkout main
    merge release/1.0 id: "release-1.0" tag: "v1.0.0"

    checkout develop
    merge release/1.0 id: "back-merge"
    commit id: "continue-dev"
```

### Best Practices

- Use descriptive commit IDs that tell a story.
- Tag releases on the main branch.
- Keep to the branching model being documented.
- Use `cherry-pick` sparingly — only to show real cherry-pick workflows.

---

## 8. Mindmap

**Directive:** `mindmap`

**Best for:** Concept maps, brainstorming, topic hierarchies, decision trees.

### Syntax

Indentation defines hierarchy. The root must be first.

```
mindmap
    root((Central Topic))
        Branch 1
            Leaf 1a
            Leaf 1b
        Branch 2
            Leaf 2a
```

### Node Shapes

```
root((Circle root))
    id[Square]
    id2(Rounded)
    id3))Bang((
    id4)Cloud(
    id5{{Hexagon}}
    Default shape
```

| Syntax     | Shape   |
| ---------- | ------- |
| `((text))` | Circle  |
| `[text]`   | Square  |
| `(text)`   | Rounded |
| `))text((` | Bang    |
| `)text(`   | Cloud   |
| `{{text}}` | Hexagon |
| `text`     | Default |

### Icons and Classes

```
mindmap
    root((Project))
        ::icon(fa fa-book)
        Planning
```

### Complete Example

```
%% Diagram: API Design Considerations
%% Type: mindmap
mindmap
    root((API Design))
        Authentication
            OAuth2
            API Keys
            JWT Tokens
        Rate Limiting
            Per User
            Per Endpoint
            Sliding Window
        Versioning
            URL Path
            Header Based
            Query Parameter
        Documentation
            OpenAPI Spec
            Examples
            SDK Generation
        Caching
            ETag
            Cache-Control
            CDN Integration
```

### Best Practices

- Use the circle shape `((...))` for the root node.
- Keep to 3–4 levels of depth maximum.
- Each branch should represent one category.
- Use for ideation and overview — switch to flowchart for process detail.

---

## 9. Timeline

**Directive:** `timeline`

**Best for:** Milestones, roadmaps, historical sequences, project history.

### Syntax

```
timeline
    title Timeline Title
    section Section Name
        Event Label : Detail 1
                    : Detail 2
                    : Detail 3
```

### Complete Example

```
%% Diagram: 2025 Product Roadmap
%% Type: timeline
timeline
    title 2025 Product Roadmap

    section Q1 — Foundation
        Auth System : OAuth2 integration
                    : SSO support
                    : MFA rollout
        API v2      : GraphQL migration
                    : Rate limiting

    section Q2 — Growth
        Mobile App  : iOS launch
                    : Android launch
        Analytics   : Event tracking
                    : Dashboard v1

    section Q3 — Scale
        Performance : CDN integration
                    : Database sharding
        Enterprise  : SAML support
                    : Audit logging

    section Q4 — Polish
        Developer Portal : API docs
                         : SDK release
        Integrations     : Slack app
                         : Webhook system
```

### Best Practices

- Use sections for time periods (quarters, months, sprints).
- Keep event names short; use sub-items for details.
- Good for high-level planning; use Gantt for precise scheduling.

---

## 10. C4 Diagrams

**Directives:** `C4Context`, `C4Container`, `C4Component`, `C4Dynamic`

**Best for:** C4 architecture views (context, container, component, dynamic).

### C4Context

```
C4Context
    title System Context Diagram

    Person(user, "User", "A user of the system")
    Person_Ext(admin, "Admin", "System administrator")

    System(system, "Our System", "Main application")
    System_Ext(email, "Email Service", "Sends notifications")

    SystemDb(db, "Database", "Stores data")
    SystemQueue(queue, "Message Queue", "Async processing")

    System_Boundary(boundary, "Internal Systems") {
        System(svc1, "Service A", "Handles requests")
        System(svc2, "Service B", "Processes data")
    }

    Rel(user, system, "Uses", "HTTPS")
    Rel(system, email, "Sends emails", "SMTP")
    Rel(system, db, "Reads/writes", "SQL")
    BiRel(svc1, svc2, "Communicates", "gRPC")

    UpdateRelStyle(user, system, $offsetY="-40")
```

### C4Container

```
C4Container
    title Container Diagram

    Person(user, "User", "End user")

    Container_Boundary(app, "Application") {
        Container(web, "Web App", "React", "User interface")
        Container(api, "API", "Node.js", "Business logic")
        ContainerDb(db, "Database", "PostgreSQL", "Data storage")
        ContainerQueue(queue, "Queue", "Redis", "Task queue")
    }

    Rel(user, web, "Uses", "HTTPS")
    Rel(web, api, "Calls", "REST")
    Rel(api, db, "Reads/writes", "SQL")
    Rel(api, queue, "Publishes", "Redis protocol")
```

### C4Component

```
C4Component
    title Component Diagram

    Container_Boundary(api, "API Service") {
        Component(auth, "Auth Controller", "Express", "Handles authentication")
        Component(users, "User Controller", "Express", "User management")
        Component(repo, "User Repository", "TypeORM", "Data access")
    }

    Rel(auth, repo, "Uses")
    Rel(users, repo, "Uses")
```

### C4Dynamic

```
C4Dynamic
    title Dynamic Diagram - Login Flow

    ContainerDb(db, "Database", "PostgreSQL")
    Container(api, "API", "Node.js")
    Container(web, "Web App", "React")

    Rel(web, api, "1. POST /login", "HTTPS")
    Rel(api, db, "2. Validate credentials", "SQL")
    Rel(api, web, "3. Return JWT", "HTTPS")
```

### Element Types

| Function         | Description        |
| ---------------- | ------------------ |
| `Person`         | Internal user      |
| `Person_Ext`     | External user      |
| `System`         | Internal system    |
| `System_Ext`     | External system    |
| `SystemDb`       | Database system    |
| `SystemQueue`    | Queue system       |
| `Container`      | Container          |
| `ContainerDb`    | Database container |
| `ContainerQueue` | Queue container    |
| `Component`      | Component          |
| `ComponentDb`    | Database component |

### Relationship Functions

| Function         | Description           |
| ---------------- | --------------------- |
| `Rel`            | Relationship          |
| `BiRel`          | Bidirectional         |
| `Rel_Back`       | Reverse relationship  |
| `Rel_Neighbor`   | Neighbor relationship |
| `UpdateRelStyle` | Adjust label position |

### Complete Example

```
%% Diagram: E-commerce System Context
%% Type: c4
C4Context
    title E-commerce System Context

    Person(customer, "Customer", "Browses and buys products")
    Person(admin, "Admin", "Manages catalog and orders")

    System(ecommerce, "E-commerce Platform", "Product catalog, cart, checkout")

    System_Boundary(external, "External Services") {
        System_Ext(payment, "Payment Gateway", "Stripe")
        System_Ext(shipping, "Shipping API", "FedEx/UPS")
        System_Ext(email, "Email Service", "SendGrid")
    }

    Rel(customer, ecommerce, "Shops", "HTTPS")
    Rel(admin, ecommerce, "Manages", "HTTPS")
    Rel(ecommerce, payment, "Processes payments", "HTTPS")
    Rel(ecommerce, shipping, "Creates shipments", "REST")
    Rel(ecommerce, email, "Sends notifications", "SMTP")
```

### Best Practices

- Follow C4 model conventions: Context → Container → Component → Code.
- Use `_Ext` variants for external systems.
- Keep each level at 5–10 elements.
- Use boundaries to group related elements.

---

## 11. Pie

**Directive:** `pie`

**Best for:** Simple categorical distributions, percentage breakdowns.

### Syntax

```
pie showData
    title Chart Title
    "Category A" : 40
    "Category B" : 30
    "Category C" : 20
    "Category D" : 10
```

`showData` is optional — it displays values on slices.

### Complete Example

```
%% Diagram: Error Distribution
%% Type: pie
pie showData
    title API Error Distribution (Last 30 Days)
    "Timeout (504)" : 35
    "Auth Failure (401)" : 25
    "Validation (400)" : 20
    "Not Found (404)" : 12
    "Server Error (500)" : 8
```

### Best Practices

- Keep to 5–7 categories maximum.
- Use for showing proportions, not exact values.
- Sort slices by size (largest first) for readability.
- Use descriptive labels — not abbreviations.

---

## 12. Quadrant

**Directive:** `quadrantChart`

**Best for:** Priority matrices, evaluation frameworks, 2x2 analyses.

### Syntax

```
quadrantChart
    title Chart Title
    x-axis "Low Label" --> "High Label"
    y-axis "Low Label" --> "High Label"
    quadrant-1 "Top-right label"
    quadrant-2 "Top-left label"
    quadrant-3 "Bottom-left label"
    quadrant-4 "Bottom-right label"
    Item Name: [x, y]
```

Coordinates are 0.0 to 1.0.

### Quadrant Numbering

```
quadrant-2 | quadrant-1
-----------|-----------
quadrant-3 | quadrant-4
```

### Complete Example

```
%% Diagram: Technology Evaluation Matrix
%% Type: quadrant
quadrantChart
    title Technology Evaluation
    x-axis "Low Effort" --> "High Effort"
    y-axis "Low Impact" --> "High Impact"
    quadrant-1 "Strategic Investment"
    quadrant-2 "Quick Wins"
    quadrant-3 "Avoid"
    quadrant-4 "Consider Later"

    Upgrade Node.js: [0.2, 0.85]
    Add Caching: [0.3, 0.9]
    Rewrite Auth: [0.8, 0.7]
    New CI Pipeline: [0.6, 0.5]
    Dark Mode: [0.4, 0.3]
    Migrate DB: [0.9, 0.6]
    Fix Typos: [0.1, 0.1]
```

### Best Practices

- Label axes with clear low→high progression.
- Name quadrants to make the analysis framework clear.
- Keep to 8–12 data points for readability.
- Position items thoughtfully — small differences matter.

---

## 13. Sankey

**Directive:** `sankey-beta`

**Best for:** Flow volumes between stages, budget allocation, traffic routing.

### Syntax

CSV-like format: `source,target,value`. A blank line separates the directive from data.

```
sankey-beta

Source,Target,Value
Source2,Target2,Value2
```

Column headers are not used — just raw data rows.

### Complete Example

```
%% Diagram: Request Traffic Flow
%% Type: sankey
sankey-beta

CDN,API Gateway,5000
CDN,Static Assets,3000
API Gateway,Auth Service,2000
API Gateway,Product Service,2000
API Gateway,Order Service,1000
Auth Service,User DB,2000
Product Service,Product DB,1500
Product Service,Cache,500
Order Service,Order DB,800
Order Service,Payment Gateway,200
```

### Best Practices

- Values should be proportional and meaningful.
- Keep to 10–15 flows for clarity.
- Flows go left to right — order source nodes logically.
- Use consistent node naming across flows.

---

## 14. XY Chart

**Directive:** `xychart-beta`

**Best for:** Small bar/line comparisons, metric visualization, simple charts.

### Syntax

```
xychart-beta
    title "Chart Title"
    x-axis ["Label 1", "Label 2", "Label 3"]
    y-axis "Y Label" min --> max
    bar [value1, value2, value3]
    line [value1, value2, value3]
```

Can have both `bar` and `line` datasets, or just one.

### Numeric X-Axis

```
xychart-beta
    x-axis "Time (s)" 0 --> 100
    y-axis "Value" 0 --> 50
    line [10, 25, 30, 45, 50]
```

### Complete Example

```
%% Diagram: API Latency Comparison
%% Type: xy
xychart-beta
    title "API Latency by Endpoint (ms)"
    x-axis ["/users", "/orders", "/products", "/search", "/health"]
    y-axis "P95 Latency (ms)" 0 --> 500
    bar [45, 120, 65, 280, 5]
    line [35, 90, 50, 200, 3]
```

### Best Practices

- Use for small datasets (5–10 points).
- Include units in axis labels.
- Use bar for categorical comparisons, line for trends.
- Not a replacement for a charting library — keep it simple.

---

## 15. Block

**Directive:** `block-beta`

**Best for:** Structured layouts, architecture blocks, layered system views.

### Syntax

```
block-beta
    columns N

    block:id["Label"]
        columns M
        inner1["Item 1"]
        inner2["Item 2"]
    end

    id1["Block 1"]
    id2["Block 2"]:2

    id1 --> id2
```

The `:N` suffix makes a block span N columns.

### Sizing

```
block-beta
    columns 3
    wide["Full Width Block"]:3
    left["Left"] mid["Middle"] right["Right"]
    space down["Lower"]:2
```

`space` creates an empty cell.

### Complete Example

```
%% Diagram: Cloud Architecture Layers
%% Type: block
block-beta
    columns 3

    block:cdn["CDN Layer"]:3
        columns 1
        cf["CloudFront"]
    end

    block:compute["Compute Layer"]:2
        columns 2
        ecs1["ECS Task 1"]
        ecs2["ECS Task 2"]
    end

    block:data["Data Layer"]
        columns 1
        rds["RDS PostgreSQL"]
    end

    space:2 redis["ElastiCache"]:1

    cf --> ecs1
    cf --> ecs2
    ecs1 --> rds
    ecs2 --> rds
    ecs1 --> redis
    ecs2 --> redis
```

### Best Practices

- Use `columns` to create grid layouts.
- Use `space` for alignment.
- Span blocks with `:N` for visual hierarchy.
- Keep connections simple — blocks are for layout, not complex graphs.

---

## 16. Architecture

**Directive:** `architecture-beta`

**Best for:** Icon-driven architecture diagrams, system topology, infrastructure views.

### Syntax

```
architecture-beta
    group groupId(icon)[Label]

    service svcId(icon)[Label] in groupId
    service svcId2(icon)[Label]

    svcId:R --> L:svcId2
```

### Built-in Icons

| Icon       | Meaning        |
| ---------- | -------------- |
| `cloud`    | Cloud          |
| `server`   | Server         |
| `database` | Database       |
| `disk`     | Disk/storage   |
| `internet` | Internet/globe |
| `firewall` | Firewall       |

### Ports

Ports specify connection attachment points on services:

| Port | Position |
| ---- | -------- |
| `T`  | Top      |
| `B`  | Bottom   |
| `L`  | Left     |
| `R`  | Right    |

```
service1:R --> L:service2
service1:B --> T:service3
```

### Edge Types

```
svc1:R --> L:svc2      %% solid arrow
svc1:R -- L:svc2       %% solid line
svc1:R -.-> L:svc2     %% dashed arrow (not supported in all versions)
```

### Complete Example

```
%% Diagram: Microservices Architecture
%% Type: architecture
architecture-beta
    group api(cloud)[API Layer]
    group data(database)[Data Layer]
    group external(internet)[External]

    service gateway(internet)[API Gateway] in api
    service auth(server)[Auth Service] in api
    service orders(server)[Order Service] in api

    service postgres(database)[PostgreSQL] in data
    service redis(database)[Redis Cache] in data

    service stripe(cloud)[Stripe] in external
    service email(cloud)[SendGrid] in external

    gateway:R --> L:auth
    gateway:R --> L:orders
    auth:B --> T:postgres
    auth:B --> T:redis
    orders:B --> T:postgres
    orders:R --> L:stripe
    orders:R --> L:email
```

### Best Practices

- Use groups to organize by layer or domain.
- Use port directions (`T`, `B`, `L`, `R`) for clean routing.
- Pick icons that match the service role.
- Keep to one architectural view per diagram.

---

## 17. Kanban

**Directive:** `kanban`

**Best for:** Board-style work status views, sprint boards, task tracking.

### Syntax

```
kanban
    columnId[Column Label]
        taskId[Task description]
        taskId2[Another task]
    columnId2[Second Column]
        taskId3[Task in column 2]
```

### Metadata

```
kanban
    todo[To Do]
        t1[Setup CI]
        @{ priority: "high" }
        t2[Write tests]
    progress[In Progress]
        t3[Implement auth]
        @{ assigned: "alice" }
    done[Done]
        t4[Create repo]
```

### Complete Example

```
%% Diagram: Sprint Board
%% Type: kanban
kanban
    backlog[Backlog]
        b1[Research caching strategies]
        b2[Design notification system]
        b3[Write API documentation]
    todo[To Do]
        t1[Setup CI pipeline]
        t2[Add rate limiting]
    progress[In Progress]
        p1[Auth service refactor]
        p2[Database migration script]
    review[In Review]
        r1[Payment integration]
    done[Done]
        d1[Health check endpoint]
        d2[Logging middleware]
```

### Best Practices

- Use 3–5 columns matching your workflow stages.
- Keep task descriptions concise.
- Good for sprint snapshots — update the diagram each sprint.

---

## 18. Journey

**Directive:** `journey`

**Best for:** User journey maps, service experience maps, customer experience.

### Syntax

```
journey
    title Journey Title
    section Section Name
        Task description: score: Actor1, Actor2
```

Scores range from 1 (poor) to 5 (excellent).

### Complete Example

```
%% Diagram: New User Onboarding Journey
%% Type: journey
journey
    title New User Onboarding

    section Discovery
        Visit landing page: 5: User
        Read pricing page: 3: User
        Compare competitors: 2: User

    section Signup
        Create account: 4: User
        Verify email: 3: User
        Set up profile: 4: User

    section First Use
        Complete tutorial: 5: User, System
        Create first project: 4: User
        Invite team member: 3: User

    section Activation
        Use core feature: 5: User
        View analytics: 4: User
        Upgrade plan: 2: User, Sales
```

### Best Practices

- Scores reflect user satisfaction or experience quality.
- Use sections for journey phases.
- Include multiple actors when relevant (User, System, Support).
- Highlight pain points (low scores) to guide improvement focus.

---

## 19. Packet

**Directive:** `packet-beta`

**Best for:** Network packet structures, binary protocol layouts, bit field diagrams.

### Syntax

```
packet-beta
    start-end: "Label"
```

Bit ranges define fields. Ranges are 0-indexed.

### Complete Example

```
%% Diagram: TCP Header Structure
%% Type: packet
packet-beta
    0-15: "Source Port"
    16-31: "Destination Port"
    32-63: "Sequence Number"
    64-95: "Acknowledgment Number"
    96-99: "Data Offset"
    100-102: "Reserved"
    103-103: "NS"
    104-104: "CWR"
    105-105: "ECE"
    106-106: "URG"
    107-107: "ACK"
    108-108: "PSH"
    109-109: "RST"
    110-110: "SYN"
    111-111: "FIN"
    112-127: "Window Size"
    128-143: "Checksum"
    144-159: "Urgent Pointer"
```

### Best Practices

- Bit ranges must be contiguous with no gaps.
- Use standard names from protocol specs.
- Good for documenting wire formats and custom binary protocols.
- Single-bit fields are valid: `103-103: "Flag"`.

---

## 20. Radar

**Directive:** `radar-beta`

**Best for:** Multi-axis comparisons, skill assessments, framework evaluations.

### Syntax

```
radar-beta
    title "Chart Title"
    axis1: "Axis Label"
    axis2: "Axis Label"
    axis3: "Axis Label"

    "Dataset Name": [value1, value2, value3]
```

Values typically range from 0 to 10.

### Complete Example

```
%% Diagram: Framework Comparison
%% Type: radar
radar-beta
    title "Web Framework Evaluation"
    axis1: "Performance"
    axis2: "Developer Experience"
    axis3: "Ecosystem"
    axis4: "Learning Curve"
    axis5: "Type Safety"
    axis6: "Community"

    "Next.js": [8, 9, 9, 7, 8, 10]
    "Remix": [9, 8, 6, 6, 8, 7]
    "SvelteKit": [9, 9, 5, 8, 7, 6]
    "Nuxt": [7, 8, 7, 7, 7, 8]
```

### Best Practices

- Use 4–8 axes for readable charts.
- Keep to 2–4 datasets for comparison clarity.
- Use consistent scoring scales.
- Label axes with clear, measurable dimensions.

---

## 21. Requirement

**Directive:** `requirementDiagram`

**Best for:** Requirements traceability, compliance mapping, specification tracking.

### Syntax

```
requirementDiagram

    requirement id {
        id: REQ-001
        text: Description of the requirement
        risk: high
        verifymethod: test
    }

    functionalRequirement id2 {
        id: FREQ-001
        text: Functional requirement description
        risk: medium
        verifymethod: inspection
    }

    element id3 {
        type: module
        docRef: path/to/source
    }

    id3 - satisfies -> id
    id3 - traces -> id2
```

### Requirement Types

| Type                     | Use                     |
| ------------------------ | ----------------------- |
| `requirement`            | Generic requirement     |
| `functionalRequirement`  | Functional behavior     |
| `performanceRequirement` | Performance constraint  |
| `interfaceRequirement`   | Interface specification |
| `designConstraint`       | Design constraint       |
| `physicalRequirement`    | Physical constraint     |

### Risk Levels

`low`, `medium`, `high`

### Verify Methods

| Method          | Meaning                   |
| --------------- | ------------------------- |
| `analysis`      | Verified by analysis      |
| `inspection`    | Verified by inspection    |
| `test`          | Verified by testing       |
| `demonstration` | Verified by demonstration |

### Relationship Types

```
element - satisfies -> requirement
element - traces -> requirement
element - contains -> requirement
element - copies -> requirement
element - derives -> requirement
element - refines -> requirement
element - verifies -> requirement
```

### Complete Example

```
%% Diagram: Authentication Requirements
%% Type: requirement
requirementDiagram

    requirement auth_system {
        id: AUTH-001
        text: System shall authenticate users via OAuth2
        risk: high
        verifymethod: test
    }

    performanceRequirement auth_latency {
        id: AUTH-002
        text: Authentication shall complete within 500ms
        risk: medium
        verifymethod: test
    }

    interfaceRequirement auth_api {
        id: AUTH-003
        text: Auth API shall follow OpenID Connect specification
        risk: low
        verifymethod: inspection
    }

    element auth_module {
        type: module
        docRef: src/auth/index.ts
    }

    element auth_tests {
        type: test suite
        docRef: tests/auth/
    }

    auth_module - satisfies -> auth_system
    auth_module - satisfies -> auth_api
    auth_tests - verifies -> auth_system
    auth_tests - verifies -> auth_latency
    auth_api - derives -> auth_system
```

### Best Practices

- Use specific requirement IDs that match your tracking system.
- Include risk and verify method for traceability.
- Link elements to requirements to show coverage.
- Keep to one subsystem's requirements per diagram.
