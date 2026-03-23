# diagramkit

Standalone diagram rendering CLI and library for `.mermaid`, `.excalidraw`, and `.drawio`
files. Generates light and dark SVGs by default, with optional PNG, JPEG, and WebP output.

## Install

```bash
npm add diagramkit
```

Install the Playwright browser binary once per environment:

```bash
npx diagramkit warmup
```

If you need raster output (`png`, `jpeg`, or `webp`), install `sharp` too:

```bash
npm add sharp
```

## Usage

```bash
diagramkit render architecture.mermaid
diagramkit render . --watch
diagramkit render . --format png
```

## Docs

- Documentation: [projects.sujeet.pro/diagramkit](https://projects.sujeet.pro/diagramkit/)
- Local dev: `npm run docs:dev`
- Static build: `npm run docs:build`
- Static preview: `npm run docs:preview`
