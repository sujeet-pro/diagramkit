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

The fastest way to get started is to paste the prompt below into your AI coding agent (Claude Code, Cursor, Codex, Continue, OpenCode, Windsurf, GitHub Copilot, ...). It installs the latest diagramkit, reads the version-pinned reference, and configures agent skills as thin pointers that defer to the skills bundled inside the installed `diagramkit` package — so every agent reads guidance pinned to the exact CLI it is about to call.

```text
Install the latest diagramkit in this repo and configure its agent skills:

1. npm add diagramkit@latest
   Confirm with: npx diagramkit --version

2. Read node_modules/diagramkit/REFERENCE.md end to end. It is the
   version-pinned CLI/API contract for the release you just installed.
   Do NOT rely on a globally installed diagramkit or on training data.

3. Follow node_modules/diagramkit/skills/diagramkit-setup/SKILL.md end to
   end. It will run warmup if needed, wire a `render:diagrams` script,
   render existing diagrams, and write thin pointer SKILL.md files at:
     .agents/skills/diagramkit-<name>/SKILL.md    (always)
     .claude/skills/diagramkit-<name>/SKILL.md    (if .claude/ exists)
     .cursor/skills/diagramkit-<name>/SKILL.md    (if .cursor/ exists)
     .codex/skills/diagramkit-<name>/SKILL.md     (if .codex/ exists)
   Each pointer defers to
   node_modules/diagramkit/skills/diagramkit-<name>/SKILL.md — so upgrading
   diagramkit refreshes every skill automatically.
   Skills installed: setup, auto, mermaid, excalidraw, draw-io, graphviz,
   review (validation + WCAG 2.2 AA contrast).

4. Commit the pointer SKILL.md files with any package.json / config
   changes. Summarize what was created or skipped.
```

See [AI Agents](./guide/ai-agents/README.md) for more prompt recipes (generate a diagram, validate + WCAG 2.2 AA audit, refresh after an upgrade) and [Getting Started](./guide/getting-started/README.md) for the manual flow.

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
