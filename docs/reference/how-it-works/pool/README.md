---
title: Browser pool
description: How diagramkit manages a single Playwright Chromium instance across Mermaid, Excalidraw, and Draw.io renders.
---

# Browser pool

All browser-backed engines (Mermaid, Excalidraw, Draw.io) render through one Chromium instance managed by `BrowserPool` in `src/pool.ts`. Graphviz is WASM-only (`@viz-js/viz`) and does not touch the pool.

## Why one browser

Launching Chromium takes 300-800 ms on first use. Reusing the same browser across diagram types makes large batches cheap and keeps memory predictable. The pool is lazy: it launches on first `acquire()` and disposes on idle or process exit.

## Four pages

Three browser-backed engines need four pages because Mermaid's `mermaid.initialize()` mutates the page globally:

| Page          | Used by                     |
| ------------- | --------------------------- |
| mermaid-light | Mermaid (light theme)       |
| mermaid-dark  | Mermaid (dark theme)        |
| excalidraw    | Excalidraw (both themes)    |
| drawio        | Draw.io (both themes)       |

Excalidraw and Draw.io accept `darkMode` per-call without global mutation, so one page each is enough.

## Reference counting

Every render calls `pool.acquire()` and pairs it with `pool.release()` in a `try/finally` block. The pool tracks outstanding references and:

- Coalesces concurrent `acquire()` calls so only one browser launch happens under racing renders.
- Sets an idle timer when the last reference is released. If no new `acquire()` arrives within 5 s, the pool disposes the browser. The timer is cancelled when a new render arrives first.

## Cleanup

`dispose()` is wired to `SIGINT`, `SIGTERM`, and `exit`. It closes pages first, then the browser context, then the browser itself. Callers that manage their own runtime should use `createRendererRuntime()` to get an isolated pool and call `runtime.dispose()` explicitly.

## Adding a new browser-backed engine

See the [`add-diagram-type` skill](https://github.com/sujeet-pro/diagramkit/blob/main/.agents/skills/prj-add-diagram-type/SKILL.md) — step 4 covers adding a new page method to `BrowserPool`.
