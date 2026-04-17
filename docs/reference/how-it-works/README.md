---
title: How it works
description: Internals of diagramkit — the browser pool, manifest system, rendering pipeline, and color processing.
---

# How it works

If you want to understand *why* diagramkit is structured the way it is — or extend it with a new engine — read this series.

| Page                                                       | What it covers                                                                |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [Browser pool](./pool/README.md)                           | Single Chromium, four pages, reference counting, idle timeout.                |
| [Manifest system](./manifest/README.md)                    | SHA-256 hashing, stale detection, orphan cleanup, format accumulation.        |
| [Rendering pipeline](./rendering-pipeline/README.md)       | SVG-first, per-engine lane scheduling, atomic writes, raster conversion.      |
| [Color processing](./color-processing/README.md)           | WCAG luminance adjustment for dark SVGs.                                      |

For consumer-facing guides (not internals), see the [Guide → Architecture](../../guide/architecture/README.md) page.
