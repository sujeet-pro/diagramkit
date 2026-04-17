---
title: Manifest system
description: How diagramkit's SHA-256 content manifest drives incremental rebuilds and orphan cleanup.
---

# Manifest system

diagramkit's incremental build is backed by a per-directory `manifest.json` living under each `.diagramkit/` folder. See `src/manifest.ts` for the implementation.

## What gets hashed

For every rendered source file the manifest stores:

- `hash` — SHA-256 over the **file content** (not the path or metadata). Computed by `hashFile()`.
- `formats` — the cumulative set of output formats generated for this source (`['svg', 'png']` etc.).
- `theme` — the theme variants generated (`'both'` | `'light'` | `'dark'`).
- `mtime` — a convenience field for fast "definitely not changed" skips; never authoritative.

## Staleness

`isStale(file, formats, config, theme, manifest)` returns true when any of:

- No entry exists for the file.
- The stored hash differs from the current hash.
- One of the requested formats is not in the stored `formats` array.
- A requested output filename does not exist on disk.
- `--force` is set (resets format tracking and rebuilds everything).

`planStaleFiles` returns the same information with per-file reasons, surfaced by `diagramkit render --plan`.

## Format accumulation

When a user renders SVG first and later adds PNG, the PNG entry is appended to the stored `formats` array. Re-running the same command later regenerates both formats — diagramkit never "forgets" a format you previously asked for, so a future `render .` covers everything the repo has produced historically.

Pass `--force` to reset the `formats` array and re-render only what you ask for.

## Orphan cleanup

`cleanOrphans(files, config, roots)` scans each `.diagramkit/` folder and removes any output whose source file no longer exists. Manifest entries for missing sources are also removed. This keeps the repo clean after diagram source files are deleted or renamed.

## Atomic writes

Manifests are written via `atomicWrite()` — content goes to `manifest.json.tmp`, then `renameSync` swaps it into place. A reader that opens `manifest.json` during a write always sees a fully-formed file.

## Corruption handling

If `manifest.json` fails to parse, diagramkit treats it as an empty manifest (everything becomes stale) and logs a warning. The next successful render replaces the corrupt file.

## Disabling the manifest

Pass `--no-manifest` or set `useManifest: false` in `diagramkit.config.json5`. Every render then rebuilds unconditionally. Useful for CI jobs that should ignore local state.
