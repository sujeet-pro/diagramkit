# Mermaid State Diagram Reference

## Directive

```
stateDiagram-v2
```

Always use `stateDiagram-v2` (not `stateDiagram`). The v2 syntax supports composite states, forks, joins, choices, notes, and improved styling.

## Complete Example

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Pending : submit
    Pending --> Approved : approve
    Pending --> Rejected : reject
    Rejected --> Draft : revise
    Approved --> Published : publish
    Published --> Archived : archive
    Archived --> [*]

    state Pending {
        [*] --> ReviewQueue
        ReviewQueue --> InReview : assign
        InReview --> ReviewComplete : complete
        ReviewComplete --> [*]
    }
```

## Start and End States

Use `[*]` to represent both start and end pseudo-states:

```mermaid
stateDiagram-v2
    [*] --> Active
    Active --> [*]
```

- A transition **from** `[*]` denotes the initial state.
- A transition **to** `[*]` denotes a final/terminal state.
- A diagram can have multiple final states but should have exactly one initial transition.

## Transitions

### Basic transitions

```mermaid
stateDiagram-v2
    StateA --> StateB
    StateB --> StateC : event_name
```

A transition can have an optional label (after `:`) describing the event or trigger.

### Transitions with guards and descriptions

Use the label to include guard conditions and action descriptions:

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Processing : request received
    Processing --> Success : [valid data] / save to DB
    Processing --> Failure : [invalid data] / log error
    Success --> Idle : reset
    Failure --> Idle : retry
```

Convention: `[guard condition] / action` in the transition label communicates both the condition and the side effect.

## Composite (Nested) States

Group related states inside a parent state:

```mermaid
stateDiagram-v2
    [*] --> Active

    state Active {
        [*] --> Idle
        Idle --> Processing : start
        Processing --> Complete : finish
        Complete --> Idle : reset
        Complete --> [*]
    }

    Active --> Suspended : suspend
    Suspended --> Active : resume
    Active --> [*]
```

Composite states can be nested to any depth. Each composite state can have its own `[*]` start and end.

## Fork and Join

Model parallel state execution with `<<fork>>` and `<<join>>`:

```mermaid
stateDiagram-v2
    [*] --> Received

    state fork_state <<fork>>
    state join_state <<join>>

    Received --> fork_state
    fork_state --> ValidatePayment
    fork_state --> CheckInventory
    fork_state --> NotifyWarehouse

    ValidatePayment --> join_state
    CheckInventory --> join_state
    NotifyWarehouse --> join_state

    join_state --> Confirmed
    Confirmed --> [*]
```

- `<<fork>>` splits into parallel paths.
- `<<join>>` waits for all parallel paths to complete before continuing.

## Choice (Decision)

Model conditional branching with `<<choice>>`:

```mermaid
stateDiagram-v2
    [*] --> Evaluating

    state check_amount <<choice>>

    Evaluating --> check_amount
    check_amount --> AutoApproved : amount < $1000
    check_amount --> ManualReview : amount >= $1000
    check_amount --> Rejected : flagged

    AutoApproved --> [*]
    ManualReview --> Approved : reviewed
    ManualReview --> Rejected : denied
    Approved --> [*]
    Rejected --> [*]
```

## Notes

Add notes to states for additional context:

```mermaid
stateDiagram-v2
    [*] --> Active
    Active --> Inactive : timeout

    note right of Active
        User session is valid.
        Token refreshes every 15 min.
    end note

    note left of Inactive
        Session expired.
        Requires re-authentication.
    end note
```

Notes support `right of`, `left of` positioning.

## Concurrency

Use `--` to indicate concurrent (orthogonal) regions within a composite state:

```mermaid
stateDiagram-v2
    [*] --> Active

    state Active {
        [*] --> Operational
        Operational --> Degraded : partial failure
        Degraded --> Operational : recovered
        --
        [*] --> Monitoring
        Monitoring --> Alerting : threshold exceeded
        Alerting --> Monitoring : resolved
    }

    Active --> [*]
```

The `--` separator creates parallel regions that execute independently within the same parent state.

## State Descriptions

Add descriptions to states using `:` syntax:

```mermaid
stateDiagram-v2
    s1 : Waiting for input
    s2 : Processing request
    s3 : Sending response

    [*] --> s1
    s1 --> s2 : input received
    s2 --> s3 : processing complete
    s3 --> [*]
```

## Styling

Apply styles to specific states:

```mermaid
stateDiagram-v2
    [*] --> Active
    Active --> Error : failure
    Error --> [*]

    classDef errorState fill:#ffcdd2,stroke:#b71c1c,color:#b71c1c
    class Error errorState
```

## Best Practices

1. **Use `stateDiagram-v2`** -- never use the original `stateDiagram` syntax. The v2 version supports composite states, forks, joins, choices, and notes.
2. **Use composite states for nesting** -- any time a state has its own internal lifecycle, model it as a composite state rather than flattening everything.
3. **Always include `[*]` transitions** -- every diagram should have a clear start and at least one end state.
4. **Label transitions with events** -- bare arrows without labels are harder to understand. Always describe what triggers the transition.
5. **Use `<<choice>>` for decisions** -- rather than having multiple transitions from the same state, use an explicit choice pseudo-state to make the branching clear.
6. **Use `<<fork>>`/`<<join>>` for parallelism** -- when multiple things happen simultaneously, model them explicitly rather than sequential approximations.
7. **Keep state names descriptive** -- `ProcessingPayment` is better than `S3`. State names appear in the rendered output.
8. **Use notes for business rules** -- if a state has conditions, timeouts, or constraints, document them with `note` blocks.
9. **Use concurrency (`--`) sparingly** -- only when the parent state genuinely has independent parallel concerns (e.g., operational status and monitoring).
