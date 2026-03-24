# Mermaid Gantt Chart Reference

Complete reference for Gantt charts in Mermaid. Gantt charts visualize project schedules showing tasks, durations, dependencies, milestones, and progress.

---

## Directive

```
gantt
```

---

## Complete Example

```mermaid
gantt
    title Project Alpha Release Plan
    dateFormat YYYY-MM-DD
    axisFormat %b %d
    excludes weekends

    section Planning
        Requirements gathering   :done, req, 2024-01-08, 10d
        Technical design         :done, design, after req, 7d
        Design review            :milestone, m1, after design, 0d

    section Development
        Backend API              :active, api, 2024-01-29, 15d
        Frontend UI              :active, ui, after design, 12d
        Database schema          :done, db, 2024-01-29, 5d
        Integration              :crit, integ, after api ui, 5d

    section Testing
        Unit tests               :test1, after api, 5d
        Integration tests        :crit, test2, after integ, 5d
        UAT                      :uat, after test2, 5d
        Release                  :milestone, m2, after uat, 0d
```

---

## Header Configuration

### dateFormat

Defines the format for parsing date strings in task definitions. Uses [Day.js format tokens](https://day.js.org/docs/en/parse/string-format).

```
dateFormat YYYY-MM-DD
```

| Token  | Meaning       | Example |
| ------ | ------------- | ------- |
| `YYYY` | 4-digit year  | 2024    |
| `YY`   | 2-digit year  | 24      |
| `MM`   | 2-digit month | 01-12   |
| `DD`   | 2-digit day   | 01-31   |
| `HH`   | 24-hour hour  | 00-23   |
| `mm`   | Minute        | 00-59   |

Default is `YYYY-MM-DD`.

### axisFormat

Controls how dates appear on the horizontal axis. Uses [D3 time format specifiers](https://github.com/d3/d3-time-format).

```
axisFormat %Y-%m-%d
```

| Specifier | Meaning      | Example  |
| --------- | ------------ | -------- |
| `%Y`      | 4-digit year | 2024     |
| `%y`      | 2-digit year | 24       |
| `%m`      | Month number | 01-12    |
| `%b`      | Month abbrev | Jan, Feb |
| `%B`      | Month full   | January  |
| `%d`      | Day of month | 01-31    |
| `%a`      | Day abbrev   | Mon, Tue |
| `%A`      | Day full     | Monday   |
| `%H`      | Hour (24h)   | 00-23    |
| `%M`      | Minute       | 00-59    |

### tickInterval

Controls the spacing of axis tick marks:

```
tickInterval 1week
```

Valid intervals: `1day`, `1week`, `1month`.

### excludes

Exclude certain days from task scheduling:

```
excludes weekends
excludes 2024-01-15, 2024-02-19
excludes weekends, 2024-12-25, 2024-12-26
```

### title

```
title My Project Schedule
```

---

## Task Syntax

```
Task name :tags, id, start, duration_or_end
```

All parts after the colon are optional and positional. The parser identifies fields by their format:

| Field    | Format                    | Description                    |
| -------- | ------------------------- | ------------------------------ |
| tags     | `done`, `active`, `crit`  | Status/style tags (combinable) |
| id       | alphanumeric identifier   | Used for `after` dependencies  |
| start    | date or `after taskId`    | When the task begins           |
| duration | `Nd` (days), `Nh` (hours) | How long the task runs         |
| end      | date                      | Absolute end date              |

### Duration Syntax

| Format | Meaning | Example |
| ------ | ------- | ------- |
| `Nd`   | N days  | `5d`    |
| `Nh`   | N hours | `12h`   |
| `Nw`   | N weeks | `2w`    |

### Task Examples

```mermaid
gantt
    dateFormat YYYY-MM-DD

    section Examples
        %% Explicit start and duration
        Task A            :a, 2024-03-01, 10d

        %% Tags with start and duration
        Task B            :done, b, 2024-03-01, 5d

        %% Dependency on another task
        Task C            :c, after a, 7d

        %% Multiple dependencies (starts after both finish)
        Task D            :d, after a b, 3d

        %% Critical and active combined
        Task E            :crit, active, e, after c, 5d

        %% Start and end date (no duration)
        Task F            :f, 2024-03-15, 2024-03-22

        %% No id, just name and duration after dependency
        Cleanup           :after d, 2d
```

---

## Tags

Tags modify task appearance and are placed immediately after the colon, before the task id.

| Tag         | Effect                                        |
| ----------- | --------------------------------------------- |
| `done`      | Grayed out, indicates completed task          |
| `active`    | Highlighted, indicates in-progress task       |
| `crit`      | Red/critical styling, indicates critical path |
| `milestone` | Rendered as a diamond marker (zero-duration)  |

Tags can be combined:

```
Critical done task   :crit, done, t1, 2024-01-01, 5d
Critical active task :crit, active, t2, after t1, 3d
```

---

## Milestones

Milestones are zero-duration markers. Use the `milestone` tag or set duration to `0d`:

```mermaid
gantt
    dateFormat YYYY-MM-DD

    section Milestones
        Design complete    :milestone, m1, 2024-02-01, 0d
        Beta release       :milestone, m2, 2024-03-15, 0d
        GA release         :milestone, crit, m3, 2024-04-01, 0d
```

---

## Dependencies

Use `after taskId` to start a task when another finishes. Multiple dependencies are space-separated:

```mermaid
gantt
    dateFormat YYYY-MM-DD

    section Pipeline
        Build       :build, 2024-01-01, 3d
        Test        :test, after build, 2d
        Deploy      :deploy, after test, 1d

    section Parallel Work
        Docs        :docs, 2024-01-01, 5d
        Review      :review, after build docs, 2d
```

When multiple `after` targets are listed, the task starts after the **latest** of them finishes.

---

## Sections

Sections group tasks visually with a label row:

```mermaid
gantt
    dateFormat YYYY-MM-DD

    section Backend
        API design       :a1, 2024-01-01, 5d
        Implementation   :a2, after a1, 10d

    section Frontend
        Wireframes       :f1, 2024-01-01, 3d
        Components       :f2, after f1, 8d

    section QA
        Test planning    :q1, 2024-01-01, 3d
        Execution        :q2, after a2 f2, 5d
```

---

## Comments

Use `%%` for single-line comments:

```mermaid
gantt
    dateFormat YYYY-MM-DD
    %% Sprint 1 tasks
    section Sprint 1
        Story A :a, 2024-01-01, 5d
        %% Story B blocked on external dependency
        Story B :b, after a, 3d
```

---

## Best Practices

1. **Always set `dateFormat`** -- makes date parsing explicit and avoids ambiguity.

2. **Use `axisFormat` for readability** -- `%b %d` (e.g., "Jan 15") is usually clearer than `%Y-%m-%d` on the axis.

3. **Assign IDs to tasks that are dependencies** -- unnamed tasks cannot be referenced by `after`.

4. **Use `excludes weekends` for realistic schedules** -- otherwise weekends count as working days.

5. **Mark critical path with `crit`** -- highlights the chain of tasks that determines the minimum project duration.

6. **Use milestones for key checkpoints** -- design reviews, releases, sign-offs.

7. **Group related tasks in sections** -- improves visual organization, typically by team, phase, or component.

8. **Keep task names concise** -- long names compress the chart. Aim for 2-4 words per task.

9. **Use `done` and `active` to show progress** -- makes the chart useful as a status report, not just a plan.

10. **Limit to 15-25 tasks per chart** -- for larger projects, split into multiple charts by phase or workstream.
