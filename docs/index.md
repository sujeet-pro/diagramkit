---
layout: home

hero:
  name: diagramkit
  text: Diagram files to images, with dark mode
  tagline: Render .mermaid, .excalidraw, and .drawio files to SVG/PNG/JPEG/WebP with automatic light and dark theme variants.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /reference/api

features:
  - title: Three Diagram Engines
    details: Supports Mermaid, Excalidraw, and Draw.io files out of the box. Extension aliases like .mmd, .mmdc, .dio, and .drawio.xml are recognized automatically.
  - title: Light & Dark Mode
    details: Renders both theme variants in a single pass. Dark SVGs are post-processed with WCAG-based contrast optimization to ensure readability.
  - title: Four Output Formats
    details: SVG (default), PNG, JPEG, and WebP. Raster formats support configurable scale and quality settings.
  - title: Incremental Builds
    details: SHA-256 content hashing tracks what has changed. Only stale diagrams are re-rendered, with automatic orphan cleanup.
  - title: Watch Mode
    details: File watcher re-renders diagrams on save. Integrates with any dev server workflow.
  - title: CLI & JS API
    details: Use the diagramkit CLI for quick rendering, or import the JavaScript API for programmatic control in build scripts and tooling.
---

## Quick Start

```bash
# Install
npm add diagramkit mermaid playwright

# Install the browser engine
npx diagramkit warmup

# Render all diagrams in the current directory
npx diagramkit render .
```

Output goes to a `.diagrams/` folder next to each source file:

```
docs/
  architecture.mermaid
  .diagrams/
    architecture-light.svg
    architecture-dark.svg
    diagrams.manifest.json
```

Use a `<picture>` element for automatic light/dark switching in HTML:

```html
<picture>
  <source srcset=".diagrams/architecture-dark.svg" media="(prefers-color-scheme: dark)">
  <img src=".diagrams/architecture-light.svg" alt="Architecture diagram">
</picture>
```
