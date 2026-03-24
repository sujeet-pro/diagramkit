# Mermaid Mindmap Reference

Complete reference for mindmaps in Mermaid. Mindmaps visualize hierarchical information radiating from a central concept, useful for brainstorming, knowledge organization, and feature breakdowns.

---

## Directive

```
mindmap
```

---

## Complete Example

```mermaid
mindmap
    root((Web Application))
        Frontend
            React
                Components
                Hooks
                State Management
            Styling
                CSS Modules
                Tailwind
            Build Tools
                Vite
                TypeScript
        Backend
            Node.js
                Express
                Middleware
            Database
                PostgreSQL
                Redis Cache
            API
                REST
                GraphQL
        DevOps
            CI/CD
                GitHub Actions
                Docker
            Monitoring
                Logging
                Alerts
            Infrastructure
                AWS
                Terraform
```

---

## Hierarchy via Indentation

Mindmap structure is defined entirely by indentation. Each level of indentation creates a child node of the parent above it.

```mermaid
mindmap
    root(Project)
        Level 1 Child A
            Level 2 Child A1
            Level 2 Child A2
                Level 3 Child A2a
        Level 1 Child B
            Level 2 Child B1
```

Rules:

- The first node is always the root (center of the mindmap)
- Use consistent indentation (spaces, not tabs)
- Each additional indent level creates a deeper child
- Siblings share the same indentation level
- No explicit connection syntax needed -- hierarchy is purely structural

---

## Node Shapes

Node shapes are controlled by wrapping the label text in different bracket pairs:

| Syntax     | Shape        | Example            |
| ---------- | ------------ | ------------------ |
| `text`     | Default      | `Planning`         |
| `(text)`   | Rounded rect | `(Planning)`       |
| `((text))` | Circle       | `((Central Idea))` |
| `[text]`   | Square       | `[Module A]`       |
| `[(text)]` | Cylinder     | `[(Database)]`     |
| `))text((` | Bang         | `))Alert((`        |
| `{{text}}` | Hexagon      | `{{Decision}}`     |
| `)text(`   | Cloud        | `)Brainstorm(`     |

### Shape Examples

```mermaid
mindmap
    root((Central Topic))
        (Rounded Rectangle)
        [Square Box]
        ))Bang Shape((
        {{Hexagon}}
        )Cloud Shape(
        Default Shape
```

---

## Root Node

The root node is the first entry in the mindmap and becomes the central element. It is typically styled with `(( ))` for a circle shape:

```mermaid
mindmap
    root((My Project))
        Feature A
        Feature B
```

The `root` keyword is the node identifier. The display text comes from the shape syntax. You can use any identifier:

```mermaid
mindmap
    central((Architecture))
        Frontend
        Backend
```

---

## Icons

Add icons to nodes using the `::icon()` syntax. Mermaid supports Font Awesome icons:

```mermaid
mindmap
    root((Application))
        Frontend
            ::icon(fa fa-desktop)
            React
            CSS
        Backend
            ::icon(fa fa-server)
            API
            Database
        Mobile
            ::icon(fa fa-mobile)
            iOS
            Android
```

The `::icon()` directive goes on the line immediately after the node it applies to, at the same indentation level as the node's children.

---

## Classes

Apply CSS classes to nodes using the `:::` syntax:

```mermaid
mindmap
    root((System))
        Critical:::urgent
            Security
            Reliability
        Normal
            Features
            Polish
```

Classes are defined in Mermaid theme configuration or custom CSS. The `:::className` is appended directly to the node text or shape.

---

## Multi-word Node Labels

Node labels can contain spaces. The shape delimiters define the boundary:

```mermaid
mindmap
    root((Project Planning))
        (Requirements Gathering)
            User Interviews
            Market Research
        (Technical Design)
            System Architecture
            Data Model Design
```

---

## Practical Examples

### Feature Breakdown

```mermaid
mindmap
    root((E-Commerce Platform))
        User Management
            Registration
            Authentication
            Profile Settings
            Password Reset
        Product Catalog
            Search
            Categories
            Filters
            Product Detail
        Shopping Cart
            Add to Cart
            Update Quantity
            Remove Items
            Save for Later
        Checkout
            Shipping Address
            Payment Processing
            Order Confirmation
            Email Receipt
```

### Sprint Retrospective

```mermaid
mindmap
    root((Sprint 12 Retro))
        )What Went Well(
            Fast deployments
            Good test coverage
            Team collaboration
        ))What Went Wrong((
            Scope creep
            Flaky CI pipeline
            Late requirements
        (Action Items)
            [Fix CI reliability]
            [Freeze scope by day 3]
            [Earlier stakeholder reviews]
```

### Technology Stack Decision

```mermaid
mindmap
    root{{Tech Stack Decision}}
        Frontend
            React
                Large ecosystem
                Team experience
            Vue
                Simpler API
                Smaller bundle
            Svelte
                Best performance
                Less mature
        Backend
            Node.js
                Same language as FE
                Async I/O
            Go
                Better performance
                Strong typing
            Python
                ML integration
                Rapid prototyping
```

---

## Best Practices

1. **Use a circle `(( ))` for the root node** -- visually distinguishes the central concept from branches.

2. **Limit depth to 3-4 levels** -- deeper hierarchies become hard to read in a radial layout.

3. **Keep node labels to 1-3 words** -- brevity is essential for radial layouts. Use a separate document for details.

4. **Use shapes to encode meaning** -- for example, `(( ))` for topics, `[( )]` for data stores, `{{ }}` for decisions, `)) ((` for warnings.

5. **Balance branch sizes** -- avoid one branch with 15 children and another with 1. Reorganize or split if needed.

6. **Use consistent indentation** -- 4 spaces per level is a good default. Never mix tabs and spaces.

7. **Group related concepts as siblings** -- the spatial proximity in a mindmap implies relatedness.

8. **Start broad, then detail** -- first-level children should be major categories; details go deeper.

9. **Limit to 3-7 first-level branches** -- follows cognitive load principles. More than 7 top-level branches overwhelms.

10. **Use for ideation and overview, not precision** -- mindmaps communicate structure and relationships. For exact sequences, use flowcharts or Gantt charts instead.
