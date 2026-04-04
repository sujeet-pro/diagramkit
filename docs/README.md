---
layout: DocHome
title: diagramkit
tagline: Diagram files to images, with dark mode
description: Render .mermaid, .excalidraw, .drawio, and Graphviz .dot/.gv files to SVG/PNG/JPEG/WebP with automatic light and dark theme variants.
install: 'npm add diagramkit'
actions:
  - text: Get Started
    link: /guide/getting-started
    theme: brand
  - text: CLI Reference
    link: /guide/cli
    theme: alt
  - text: API Reference
    link: /reference/api
    theme: alt
features:
  - title: Four Diagram Engines
    details: Mermaid, Excalidraw, Draw.io, and Graphviz out of the box. Extension aliases like .mmd, .mmdc, .dio, .drawio.xml, .gv, and .graphviz are recognized automatically.
  - title: Light & Dark Mode
    details: Renders both theme variants in a single pass. Dark SVGs are post-processed with WCAG-based contrast optimization to ensure readability.
  - title: SVG, PNG, JPEG, WebP
    details: SVG by default. Raster formats support configurable scale and quality settings via the optional sharp peer dependency.
  - title: Incremental Builds
    details: SHA-256 content hashing tracks what changed. Only stale diagrams re-render, with automatic orphan cleanup.
  - title: Watch Mode
    details: File watcher re-renders diagrams on save. Integrates with any dev server workflow.
  - title: CLI & JavaScript API
    details: Use the diagramkit CLI for quick rendering, or import the JavaScript API for programmatic control in build scripts.
---

## Quick Start

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
