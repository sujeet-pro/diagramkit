# Mermaid Class Diagram Reference

## Directive

```
classDiagram
```

## Complete Example

```mermaid
classDiagram
    class User {
        <<abstract>>
        +String id
        +String email
        +String name
        -String passwordHash
        +authenticate(password) bool
        +updateProfile(data) void
    }

    class Admin {
        +List~Permission~ permissions
        +grantRole(user, role) void
    }

    class Order {
        +String id
        +Date createdAt
        +OrderStatus status
        +calculateTotal() Money
        +cancel() void
    }

    class Product {
        +String id
        +String name
        +Money price
        +int stock
    }

    class Serializable {
        <<interface>>
        +serialize() String
        +deserialize(data) void
    }

    class OrderStatus {
        <<enumeration>>
        PENDING
        CONFIRMED
        SHIPPED
        DELIVERED
        CANCELLED
    }

    User <|-- Admin : extends
    User "1" --> "*" Order : places
    Order "*" --> "*" Product : contains
    User ..|> Serializable : implements
    Order *-- OrderStatus : has
```

## Relationships

| Syntax  | Meaning       | Description                                        |
| ------- | ------------- | -------------------------------------------------- |
| `<\|--` | Inheritance   | Child extends parent (solid line, hollow triangle) |
| `*--`   | Composition   | Part cannot exist without whole (solid diamond)    |
| `o--`   | Aggregation   | Part can exist independently (hollow diamond)      |
| `-->`   | Association   | Directed relationship (solid arrow)                |
| `--`    | Link (solid)  | Undirected relationship                            |
| `..>`   | Dependency    | Uses temporarily (dashed arrow)                    |
| `..\|>` | Realization   | Implements interface (dashed, hollow triangle)     |
| `..`    | Link (dashed) | Undirected dashed relationship                     |

### Reading direction

Relationships are read left-to-right by default. The symbol on the left side is the source, the symbol on the right is the target:

```mermaid
classDiagram
    Parent <|-- Child : extends
    Whole *-- Part : contains
    Collection o-- Item : has
    ClassA --> ClassB : uses
    ClassC ..> ClassD : depends on
    ClassE ..|> Interface : implements
```

## Cardinality (Multiplicity)

Place cardinality labels in quotes on either side of the relationship:

```mermaid
classDiagram
    Customer "1" --> "*" Order : places
    Order "1" --> "1..*" LineItem : contains
    User "0..1" --> "0..*" Address : lives at
```

| Notation | Meaning          |
| -------- | ---------------- |
| `"1"`    | Exactly one      |
| `"*"`    | Zero or more     |
| `"0..1"` | Zero or one      |
| `"1..*"` | One or more      |
| `"0..*"` | Zero or more     |
| `"n"`    | Fixed count of n |

## Annotations

Annotations mark special class types:

```mermaid
classDiagram
    class Comparable {
        <<interface>>
        +compareTo(other) int
    }
    class Shape {
        <<abstract>>
        +area() double
        +perimeter() double
    }
    class Color {
        <<enumeration>>
        RED
        GREEN
        BLUE
    }
    class AppConfig {
        <<service>>
        +getConfig() Config
    }
```

Supported annotations: `<<interface>>`, `<<abstract>>`, `<<enumeration>>`, `<<service>>`, or any custom text inside `<< >>`.

## Visibility Modifiers

| Symbol | Visibility       |
| ------ | ---------------- |
| `+`    | Public           |
| `-`    | Private          |
| `#`    | Protected        |
| `~`    | Package/Internal |

```mermaid
classDiagram
    class Account {
        +String id
        -double balance
        #String accountType
        ~Logger logger
        +deposit(amount) void
        -validateAmount(amount) bool
        #notify() void
    }
```

## Methods and Attributes

### Attributes

```
+Type attributeName
-String privateField
#int protectedCount
```

### Methods

```
+methodName(param1, param2) ReturnType
-privateMethod() void
+staticMethod()$ String
+abstractMethod()* void
```

- `$` suffix marks a static member.
- `*` suffix marks an abstract member.

## Generic Types

Use `~` to denote generic type parameters:

```mermaid
classDiagram
    class List~T~ {
        +add(item T) void
        +get(index int) T
        +size() int
    }
    class Map~K, V~ {
        +put(key K, value V) void
        +get(key K) V
    }

    List~T~ --> Map~String, T~ : uses
```

## Namespaces

Group related classes with `namespace`:

```mermaid
classDiagram
    namespace Domain {
        class User {
            +String name
        }
        class Order {
            +String id
        }
    }
    namespace Infrastructure {
        class UserRepository {
            +findById(id) User
        }
        class OrderRepository {
            +findById(id) Order
        }
    }

    UserRepository --> User
    OrderRepository --> Order
```

## Styling

Apply styles to individual classes:

```mermaid
classDiagram
    class ServiceA
    class ServiceB
    class Database

    style ServiceA fill:#4a90d9,stroke:#2c5f8a,color:#fff
    style Database fill:#e8f5e9,stroke:#2e7d32
```

## Best Practices

1. **Use annotations** to clearly distinguish interfaces, abstract classes, and enumerations.
2. **Always include visibility modifiers** (`+`, `-`, `#`, `~`) on attributes and methods.
3. **Show cardinality** on associations to communicate multiplicity constraints.
4. **Choose the right relationship type** -- composition vs aggregation vs association conveys different ownership semantics.
5. **Keep class contents focused** -- show only the attributes and methods relevant to the diagram's purpose, not the entire class API.
6. **Use namespaces** to group classes by module, layer, or domain.
7. **Use semantic relationship labels** -- `places`, `contains`, `implements` are clearer than unlabeled arrows.
