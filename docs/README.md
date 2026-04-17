---
title: diagramkit
tagline: Diagram files to images, with dark mode
description: Render .mermaid, .excalidraw, .drawio, and Graphviz .dot/.gv files to SVG/PNG/JPEG/WebP/AVIF with automatic light and dark theme variants.
install: 'npm add diagramkit'
actions:
  - text: Get Started
    link: /guide/getting-started
    theme: brand
  - text: CLI Guide
    link: /guide/cli
    theme: alt
  - text: CLI Options Table
    link: /reference/diagramkit/cli
    theme: alt
  - text: API Reference
    link: /reference/diagramkit/api
    theme: alt
  - text: For AI Agents
    link: /guide/ai-agents
    theme: alt
features:
  - title: Four Diagram Engines
    details: Mermaid, Excalidraw, Draw.io, and Graphviz out of the box. Extension aliases like .mmd, .mmdc, .dio, .drawio.xml, .gv, and .graphviz are recognized automatically.
  - title: Light & Dark Mode
    details: Renders both theme variants in a single pass. Dark SVGs are post-processed with WCAG-based contrast optimization to ensure readability.
  - title: SVG, PNG, JPEG, WebP, AVIF
    details: SVG by default. Raster formats support configurable scale and quality settings via the optional sharp peer dependency.
  - title: Incremental Builds
    details: SHA-256 content hashing tracks what changed. Only stale diagrams re-render, with automatic orphan cleanup.
  - title: Watch Mode
    details: File watcher re-renders diagrams on save. Integrates with any dev server workflow.
  - title: CLI & JavaScript API
    details: Use the diagramkit CLI for quick rendering, or import the JavaScript API for programmatic control in build scripts.
---

## Quick Start with an AI Agent

The fastest way to get started is to tell your AI coding agent (Claude Code, Cursor, Codex, Continue, OpenCode, ...):

> Set up diagramkit in this repo:
>
> 1. `npm add diagramkit`.
> 2. Read `node_modules/diagramkit/REFERENCE.md` (anchor on the LOCAL install).
> 3. `npx diagramkit warmup` (skip if Graphviz-only).
> 4. Add `"render:diagrams": "diagramkit render ."` to `package.json`.
> 5. Install diagramkit's agent skills with the standalone `skills` CLI: `npx skills add sujeet-pro/diagramkit`.
> 6. Render all diagrams to SVG: `npx diagramkit render .`.

The agent will install diagramkit (locally, never globally), warm up the browser when needed, install diagramkit's engine + setup + auto-router skills via [`npx skills`](https://github.com/vercel-labs/skills), and render everything. diagramkit ships `REFERENCE.md`, `llms.txt`, `llms-full.txt`, and `ai-guidelines/` inside the npm package, so the agent always reads documentation pinned to the installed version.

Need a setup playbook? See [AI Agents](./guide/ai-agents/README.md) and [Getting Started](./guide/getting-started/README.md).

## Quick Start (Manual)

```bash
# Install
npm add diagramkit

# Install the browser engine (once per environment)
npx diagramkit warmup

# Render all diagrams in the current directory
npx diagramkit render .
```

Output goes to a `.diagramkit/` folder next to each source file:

```
docs/
  architecture.mermaid
  .diagramkit/
    architecture-light.svg
    architecture-dark.svg
    manifest.json
```

Use a `<picture>` element for automatic light/dark switching in HTML:

```html
<picture>
  <source srcset=".diagramkit/architecture-dark.svg" media="(prefers-color-scheme: dark)">
  <img src=".diagramkit/architecture-light.svg" alt="Architecture diagram">
</picture>
```
