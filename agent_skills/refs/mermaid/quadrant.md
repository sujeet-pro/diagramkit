# Mermaid Quadrant Chart Reference

Quadrant charts plot items on a two-dimensional grid divided into four labeled quadrants. Useful for priority matrices, effort/impact analysis, risk assessment, and technology radar visualizations.

---

## Directive

```mermaid
quadrantChart
```

---

## Complete Example

```mermaid
quadrantChart
    title Effort vs Impact Analysis
    x-axis Low Effort --> High Effort
    y-axis Low Impact --> High Impact
    quadrant-1 Do First
    quadrant-2 Schedule
    quadrant-3 Eliminate
    quadrant-4 Delegate

    Add caching: [0.2, 0.9]
    Rewrite auth service: [0.8, 0.85]
    Fix typos in docs: [0.1, 0.15]
    Migrate to new ORM: [0.7, 0.4]
    Add dark mode: [0.5, 0.6]
    Upgrade Node version: [0.3, 0.5]
    Refactor legacy module: [0.9, 0.7]
    Add health checks: [0.15, 0.7]
```

---

## Quadrant Numbering

Quadrants are numbered starting from the top-right and moving counter-clockwise:

```
              y-axis
              ^
              |
  quadrant-2  |  quadrant-1
  (top-left)  |  (top-right)
              |
 -------------+------------->  x-axis
              |
  quadrant-3  |  quadrant-4
  (bot-left)  |  (bot-right)
              |
```

| Quadrant     | Position     |
| ------------ | ------------ |
| `quadrant-1` | Top-right    |
| `quadrant-2` | Top-left     |
| `quadrant-3` | Bottom-left  |
| `quadrant-4` | Bottom-right |

---

## Axis Labels

Define axis labels with directional arrows showing what low and high values mean:

```
x-axis Low Label --> High Label
y-axis Low Label --> High Label
```

The text before `-->` labels the low end (left/bottom), the text after labels the high end (right/top).

### Examples

```
x-axis Low Effort --> High Effort
y-axis Low Impact --> High Impact

x-axis Easy --> Hard
y-axis Low Value --> High Value

x-axis Low Risk --> High Risk
y-axis Low Reward --> High Reward
```

---

## Quadrant Names

Name each quadrant to describe what items in that region represent:

```
quadrant-1 Do First
quadrant-2 Schedule
quadrant-3 Eliminate
quadrant-4 Delegate
```

Common naming patterns:

| Use Case          | Q1 (top-right)   | Q2 (top-left)      | Q3 (bottom-left) | Q4 (bottom-right)  |
| ----------------- | ---------------- | ------------------ | ---------------- | ------------------ |
| Effort/Impact     | Do First         | Schedule           | Eliminate        | Delegate           |
| Eisenhower Matrix | Urgent+Important | Not Urgent+Import. | Neither          | Urgent+Not Import. |
| Risk Assessment   | Mitigate         | Accept             | Ignore           | Transfer           |
| Tech Radar        | Adopt            | Trial              | Hold             | Assess             |

---

## Point Coordinates

Points are plotted using `[x, y]` coordinates where both values are in the 0 to 1 range:

```
Item Label: [x, y]
```

| Value | Meaning                           |
| ----- | --------------------------------- |
| `0.0` | Minimum (left edge / bottom edge) |
| `0.5` | Center of the axis                |
| `1.0` | Maximum (right edge / top edge)   |

The quadrant boundaries are at 0.5 on both axes:

- `[0.8, 0.9]` -- top-right (quadrant-1)
- `[0.2, 0.8]` -- top-left (quadrant-2)
- `[0.1, 0.2]` -- bottom-left (quadrant-3)
- `[0.7, 0.3]` -- bottom-right (quadrant-4)

### Point Syntax

```
Label text: [x, y]
```

The label can contain spaces and most characters. The colon separates the label from coordinates.

---

## Title

```
title Chart Title Text
```

The title is optional but recommended for context.

---

## Priority Matrix Example

```mermaid
quadrantChart
    title Task Prioritization
    x-axis Low Urgency --> High Urgency
    y-axis Low Importance --> High Importance
    quadrant-1 Do Now
    quadrant-2 Plan
    quadrant-3 Drop
    quadrant-4 Delegate

    Security patch: [0.9, 0.95]
    Performance tuning: [0.3, 0.8]
    Update README: [0.1, 0.1]
    Respond to customer: [0.85, 0.4]
    Code review: [0.6, 0.7]
    Refactor tests: [0.2, 0.55]
    Fix flaky CI: [0.7, 0.6]
```

---

## Technology Radar Example

```mermaid
quadrantChart
    title Technology Radar Q1 2025
    x-axis Experimental --> Proven
    y-axis Low Adoption --> High Adoption
    quadrant-1 Adopt
    quadrant-2 Trial
    quadrant-3 Assess
    quadrant-4 Hold

    React: [0.9, 0.95]
    Vue: [0.7, 0.6]
    Svelte: [0.4, 0.35]
    HTMX: [0.3, 0.4]
    Solid: [0.2, 0.15]
    Next.js: [0.8, 0.85]
    Astro: [0.5, 0.5]
    Qwik: [0.15, 0.1]
```

---

## Tips and Limitations

- Coordinates must be between 0 and 1 (inclusive). Values outside this range produce errors.
- Points at exactly 0.5 on an axis sit on the quadrant boundary line.
- There is no way to style individual points with different colors or sizes.
- Labels that are too long may overlap with nearby points -- keep them concise.
- The chart does not support point grouping or categories.
- All four quadrant names are optional, but defining all four makes the chart self-explanatory.
- The `title`, axis labels, and quadrant names all support spaces and standard characters.
