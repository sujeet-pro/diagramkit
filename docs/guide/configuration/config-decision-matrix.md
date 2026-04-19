---
title: Config Decision Matrix
description: Pick the smallest config surface (CLI flags, env vars, config file, or overrides) that fits your use case.
sidebarLabel: Decision matrix
order: 2
---

# Config Decision Matrix

Choose the smallest config surface that solves your use case.

| Situation | Best fit |
| --- | --- |
| One-off CI override (format/theme/output folder) | CLI flags or env vars |
| Team-wide stable defaults in a repo | `diagramkit.config.json5` |
| Type-safe/computed config logic | `diagramkit.config.ts` |
| Machine-wide personal defaults | `~/.config/diagramkit/config.json5` |
| Per-file behavior differences | `overrides` in config file |

## Decision Tree

1. Is this only for a single command run?
   - Yes: use CLI flags.
2. Is it shared by your team/repository?
   - Yes: use `diagramkit.config.json5` or `.ts`.
3. Do you need expressions, imports, or computed values?
   - Yes: use `diagramkit.config.ts`.
4. Is it only for your machine?
   - Yes: use global config under `~/.config/diagramkit/`.

## Merge Order Reminder

`defaults -> global config -> env vars -> local config -> per-call overrides`
