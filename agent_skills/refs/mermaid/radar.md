# Mermaid Radar Chart Reference

## Directive

```
radar-beta
```

Radar charts (also called spider or star charts) plot multivariate data on axes radiating from a center point, making it easy to compare profiles across multiple dimensions.

## Complete Example

```mermaid
radar-beta
    title "Team Skill Assessment"
    axis Frontend, Backend, DevOps, Testing, Design, Communication
    "Alice" : [4, 5, 2, 3, 4, 5]
    "Bob" : [3, 4, 5, 4, 2, 3]
    "Carol" : [5, 3, 3, 5, 4, 4]
```

## Axis Definition

Define axes with a comma-separated list of dimension names:

```
axis Frontend, Backend, DevOps, Testing, Design, Communication
```

Each axis radiates from the center of the chart. The number of axes matches the number of values in each data series.

## Data Series

Each data series is a named array of numeric values:

```
"Series Name" : [value1, value2, value3, ...]
```

- The number of values must match the number of axes.
- Each series renders as a colored polygon on the chart.
- Multiple series overlay on the same chart for comparison.

Example with two series:

```
"Team A" : [4, 3, 5, 2, 4]
"Team B" : [3, 5, 2, 4, 3]
```

## Value Range

By default, values range from 0 to the maximum value found across all series. All values must be non-negative numbers.

## Title

Optional title displayed above the chart:

```
title "Product Feature Comparison"
```

The title string must be quoted.

## Product Comparison Example

```mermaid
radar-beta
    title "Product Comparison"
    axis Price, Performance, Reliability, Ease of Use, Support
    "Product A" : [3, 5, 4, 3, 4]
    "Product B" : [5, 3, 4, 5, 3]
    "Product C" : [4, 4, 5, 4, 2]
```

## Sprint Retrospective Example

```mermaid
radar-beta
    title "Sprint Health"
    axis Velocity, Quality, Collaboration, Planning, Innovation
    "Sprint 1" : [3, 4, 3, 2, 2]
    "Sprint 2" : [4, 3, 4, 4, 3]
    "Sprint 3" : [5, 4, 5, 4, 4]
```

## Best Practices

1. **Use 4-8 axes** -- fewer than 4 makes a radar chart pointless (use a bar chart), more than 8 becomes cluttered and hard to read.
2. **Keep scales consistent** -- all axes share the same value range. Normalize values if underlying units differ (e.g., convert everything to a 1-5 scale).
3. **Limit to 3-4 series** -- overlapping polygons become unreadable with too many series. For more comparisons, use multiple charts.
4. **Order axes meaningfully** -- place related dimensions adjacent to each other so the polygon shape reveals meaningful patterns.
5. **Use for profiles, not precision** -- radar charts excel at showing overall shape and balance. For precise numeric comparison, use bar charts.
6. **Quote series names and titles** -- string values require double quotes.
