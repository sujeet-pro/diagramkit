# Mermaid Sequence Diagram Reference

## Directive

```
sequenceDiagram
```

## Complete Example

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant G as API Gateway
    participant A as Auth Service
    participant D as Database

    C->>+G: POST /api/login
    G->>+A: validateCredentials(user, pass)
    A->>+D: SELECT user WHERE email = ?
    D-->>-A: User record
    A-->>-G: JWT token
    G-->>-C: 200 OK + token

    Note over G,A: Token cached for 15 minutes

    alt Invalid credentials
        A-->>G: 401 Unauthorized
        G-->>C: 401 Unauthorized
    else Account locked
        A-->>G: 423 Locked
        G-->>C: 423 Account locked
    end

    opt Rate limiting
        G-->>C: 429 Too Many Requests
    end
```

## Arrow Types

| Syntax | Description                     |
| ------ | ------------------------------- |
| `->`   | Solid line, no arrowhead        |
| `-->`  | Dotted line, no arrowhead       |
| `->>`  | Solid line, arrowhead           |
| `-->>` | Dotted line, arrowhead          |
| `-x`   | Solid line, cross (lost msg)    |
| `--x`  | Dotted line, cross (lost msg)   |
| `-)`   | Solid line, open arrow (async)  |
| `--)`  | Dotted line, open arrow (async) |

### Arrow conventions

- **Solid with arrowhead** (`->>`) for synchronous request.
- **Dotted with arrowhead** (`-->>`) for synchronous response/return.
- **Open arrow** (`-)`, `--)`) for asynchronous fire-and-forget messages.
- **Cross** (`-x`, `--x`) for lost or rejected messages.

## Participants and Actors

Declare participants explicitly to control their left-to-right ordering:

```mermaid
sequenceDiagram
    participant A as Alice
    participant B as Bob
    actor U as External User
```

- `participant` renders as a box.
- `actor` renders as a stick figure (use for human users interacting with the system).

If you don't declare participants, Mermaid infers them from usage, but the order may not be what you want.

## Activation (Lifelines)

Show when a participant is actively processing:

```mermaid
sequenceDiagram
    Client->>+Server: Request
    Server->>+Database: Query
    Database-->>-Server: Result
    Server-->>-Client: Response
```

- `+` after the arrow target activates the participant.
- `-` after the arrow source deactivates it.
- This is preferred over separate `activate`/`deactivate` lines -- it's more concise and co-located with the message.

## Grouping Blocks

### alt/else -- Conditional paths

```mermaid
sequenceDiagram
    Client->>Server: Request
    alt Success
        Server-->>Client: 200 OK
    else Validation error
        Server-->>Client: 400 Bad Request
    else Server error
        Server-->>Client: 500 Internal Error
    end
```

### opt -- Optional path

```mermaid
sequenceDiagram
    Client->>Server: Request
    opt Cache hit
        Server-->>Client: Cached response
    end
```

### par -- Parallel execution

```mermaid
sequenceDiagram
    Server->>+Worker1: Task A
    par
        Server->>Worker2: Task B
    and
        Server->>Worker3: Task C
    end
    Worker1-->>-Server: Result A
```

### critical -- Critical region

```mermaid
sequenceDiagram
    critical Acquire lock
        Service->>Database: BEGIN TRANSACTION
        Service->>Database: UPDATE accounts SET balance = ?
        Service->>Database: COMMIT
    option Lock timeout
        Service-->>Client: 503 Service Unavailable
    end
```

### loop -- Repeated interaction

```mermaid
sequenceDiagram
    loop Every 30 seconds
        Monitor->>Service: Health check
        Service-->>Monitor: 200 OK
    end
```

### break -- Early exit

```mermaid
sequenceDiagram
    Client->>Server: Request
    break when token is expired
        Server-->>Client: 401 Unauthorized
    end
    Server->>Database: Query
```

## Notes

```mermaid
sequenceDiagram
    participant A as Service A
    participant B as Service B

    Note left of A: Initiates the flow
    Note right of B: Processes request
    Note over A,B: Shared context between services
```

- `Note left of` -- note to the left of a participant.
- `Note right of` -- note to the right.
- `Note over A,B` -- note spanning multiple participants.

## Background Highlighting (rect)

Use `rect` to add colored background sections:

```mermaid
sequenceDiagram
    rect rgb(200, 220, 255)
        Note over Client,Server: Authentication phase
        Client->>Server: Login
        Server-->>Client: Token
    end
    rect rgb(220, 255, 220)
        Note over Client,Server: Data phase
        Client->>Server: GET /data
        Server-->>Client: Response
    end
```

## Autonumber

Add sequential message numbers:

```mermaid
sequenceDiagram
    autonumber
    Client->>Server: First message
    Server->>Database: Second message
    Database-->>Server: Third message
    Server-->>Client: Fourth message
```

Place `autonumber` immediately after the `sequenceDiagram` directive.

## Best Practices

1. **Declare participants explicitly** -- controls ordering and lets you assign short aliases (`participant G as API Gateway`).
2. **Use `autonumber`** for complex flows so readers can follow the sequence by number.
3. **Use `+`/`-` suffixes for activation** rather than separate `activate`/`deactivate` lines -- it's more concise and keeps activation co-located with the message.
4. **Include error paths** with `alt`/`else` blocks -- real systems have failure modes; show them.
5. **Use `actor` for humans, `participant` for systems** -- this visual distinction helps readers quickly identify external users.
6. **Keep diagrams focused** -- a single sequence diagram should cover one flow (e.g., login, checkout). Split multi-flow interactions into separate diagrams.
7. **Use `Note over`** to annotate important context like caching, timeouts, or side effects.
