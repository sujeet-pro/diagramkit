# Mermaid Requirement Diagram Reference

## Directive

```
requirementDiagram
```

Requirement diagrams model requirements, design elements, and the relationships between them following the SysML standard.

## Complete Example

```mermaid
requirementDiagram

    requirement high_availability {
        id: REQ-001
        text: System shall maintain 99.9% uptime
        risk: high
        verifymethod: demonstration
    }

    functionalRequirement auto_failover {
        id: REQ-002
        text: System shall automatically failover within 30 seconds
        risk: medium
        verifymethod: test
    }

    performanceRequirement response_time {
        id: REQ-003
        text: API response time shall be under 200ms at p99
        risk: medium
        verifymethod: test
    }

    designConstraint cloud_provider {
        id: DC-001
        text: Must deploy on AWS us-east-1
        risk: low
        verifymethod: inspection
    }

    element load_balancer {
        type: Service
        docRef: https://docs.example.com/lb
    }

    element health_checker {
        type: Service
        docRef: https://docs.example.com/health
    }

    high_availability - derives -> auto_failover
    high_availability - derives -> response_time
    high_availability - contains -> cloud_provider
    load_balancer - satisfies -> auto_failover
    health_checker - satisfies -> auto_failover
    load_balancer - satisfies -> response_time
```

## Element Types

### Requirements

Requirements define what the system must do or how it must behave:

| Type                     | Use Case                                     |
| ------------------------ | -------------------------------------------- |
| `requirement`            | Generic requirement                          |
| `functionalRequirement`  | What the system does (behavior, features)    |
| `interfaceRequirement`   | External interface constraints (APIs, ports) |
| `performanceRequirement` | Speed, throughput, latency targets           |
| `physicalRequirement`    | Size, weight, environmental constraints      |
| `designConstraint`       | Technology or design restrictions            |

All requirement types share the same syntax:

```
functionalRequirement name {
    id: REQ-100
    text: Description of the requirement
    risk: medium
    verifymethod: test
}
```

### Elements

Elements represent design components that satisfy or verify requirements:

```
element component_name {
    type: Module
    docRef: https://docs.example.com/component
}
```

- **type** -- free text describing the element category (Service, Module, Component, etc.).
- **docRef** -- optional URL or document reference.

## Requirement Properties

| Property       | Values                                            | Description             |
| -------------- | ------------------------------------------------- | ----------------------- |
| `id`           | Any string                                        | Unique identifier       |
| `text`         | Any string                                        | Requirement description |
| `risk`         | `low`, `medium`, `high`                           | Risk level              |
| `verifymethod` | `analysis`, `demonstration`, `inspection`, `test` | How to verify           |

### Risk Levels

| Level    | Meaning                                             |
| -------- | --------------------------------------------------- |
| `low`    | Well understood, low chance of issues               |
| `medium` | Some uncertainty, moderate mitigation needed        |
| `high`   | Significant uncertainty, requires active management |

### Verify Methods

| Method          | Meaning                                             |
| --------------- | --------------------------------------------------- |
| `analysis`      | Verified by mathematical or analytical methods      |
| `demonstration` | Verified by observing system behavior               |
| `inspection`    | Verified by visual examination or document review   |
| `test`          | Verified by executing test cases against the system |

## Relationship Types

Relationships connect requirements to each other or to elements:

```
source - relationship_type -> target
```

| Relationship | Meaning                                             |
| ------------ | --------------------------------------------------- |
| `contains`   | Source contains target as a sub-requirement         |
| `copies`     | Source is a copy of target                          |
| `derives`    | Source derives from or decomposes into target       |
| `satisfies`  | Source element satisfies the target requirement     |
| `verifies`   | Source element verifies the target requirement      |
| `refines`    | Source refines or adds detail to target             |
| `traces`     | Source traces to target (general traceability link) |

### Relationship syntax

The arrow syntax uses a dash, the relationship keyword, and a right-arrow:

```
parent_req - derives -> child_req
service - satisfies -> req
test_suite - verifies -> req
```

## Best Practices

1. **Use specific requirement types** -- prefer `functionalRequirement`, `performanceRequirement`, etc. over the generic `requirement` for clarity.
2. **Assign unique IDs** -- use a consistent naming scheme (e.g., `REQ-001`, `FR-100`, `DC-010`) for traceability.
3. **Connect elements to requirements** -- the value of these diagrams comes from showing which components satisfy which requirements.
4. **Use `derives` for decomposition** -- break high-level requirements into detailed sub-requirements.
5. **Keep diagrams focused** -- show one subsystem or feature area per diagram. Large requirement trees become unreadable.
6. **Match verifymethod to the requirement** -- use `test` for measurable criteria, `inspection` for constraints, `demonstration` for behavioral requirements, `analysis` for theoretical properties.
