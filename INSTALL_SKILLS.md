---
name: install-diagramkit-skills
description: Install all diagramkit agent skills for diagram generation, rendering, and troubleshooting
user_invocable: false
---

# Install diagramkit Skills

This file auto-installs all diagramkit agent skills when placed in your project's `.claude/` directory or referenced from your `CLAUDE.md`.

## Available Skills

| Skill                | Command               | Description                                                                           |
| -------------------- | --------------------- | ------------------------------------------------------------------------------------- |
| Diagram Orchestrator | `/diagrams`           | Select the best engine (mermaid, excalidraw, draw.io) and generate + render a diagram |
| diagramkit Renderer  | `/diagramkit`         | Render `.mermaid`, `.excalidraw`, `.drawio` files to SVG/PNG/JPEG/WebP                |
| Mermaid Authoring    | `/diagram-mermaid`    | Generate Mermaid source files with syntax for all 20+ diagram types                   |
| Excalidraw Authoring | `/diagram-excalidraw` | Generate Excalidraw JSON source files with layout patterns and color palettes         |
| Draw.io Authoring    | `/diagram-drawio`     | Generate Draw.io XML source files with shape libraries and style reference            |
| Image Convert        | `/image-convert`      | Convert SVG to PNG/JPEG/WebP using diagramkit                                         |
| Troubleshoot         | `/troubleshoot`       | Diagnose and fix common diagramkit issues                                             |
| CI/CD                | `/ci-cd`              | Set up diagramkit in CI/CD pipelines (GitHub Actions, GitLab CI, Docker)              |

## Installed Structure

After installation, skills follow the `.claude/skills/<skill-name>/SKILL.md` convention:

```
your-project/
├── .claude/
│   └── skills/
│       └── diagramkit/
│           ├── diagrams/
│           │   └── SKILL.md
│           ├── diagramkit/
│           │   └── SKILL.md
│           ├── diagram-mermaid/
│           │   └── SKILL.md
│           ├── diagram-excalidraw/
│           │   └── SKILL.md
│           ├── diagram-drawio/
│           │   └── SKILL.md
│           ├── image-convert/
│           │   └── SKILL.md
│           ├── troubleshoot/
│           │   └── SKILL.md
│           ├── ci-cd/
│           │   └── SKILL.md
│           └── refs/
│               ├── mermaid/        # Syntax for all 20+ diagram types
│               ├── excalidraw/     # JSON format, arrows, colors, validation
│               └── drawio/         # Shape libraries, style properties
```

## Installation Methods

### Method 1: CLI (Recommended)

Install skills into your project:

```bash
npx diagramkit install-skills
```

This copies all agent skills to `.claude/skills/diagramkit/` in your project.

For global installation (available in all projects):

```bash
npx diagramkit install-skills --global
```

This copies skills to `~/.claude/skills/diagramkit/`.

### Method 2: CLAUDE.md Reference

Add this line to your project's `CLAUDE.md` file to make skills available without copying:

```markdown
Skills are available from the diagramkit package. Run `npx diagramkit install-skills` to install them, or reference them directly from `node_modules/diagramkit/agent_skills/`.
```

### Method 3: Manual Copy

Copy the `agent_skills/` directory from the diagramkit package to your `.claude/skills/diagramkit/`:

```bash
cp -r node_modules/diagramkit/agent_skills/* .claude/skills/diagramkit/
```

## Prerequisites

Before using the skills, ensure diagramkit is set up:

```bash
# Install diagramkit
npm add diagramkit

# Install the Playwright Chromium browser (required for rendering)
npx diagramkit warmup

# Optional: install sharp for PNG/JPEG/WebP raster output
npm add sharp
```

## Verify Installation

After installing skills, verify they are available:

```bash
# Check that skill folders exist
ls .claude/skills/diagramkit/

# Expected output:
# ci-cd/
# diagram-drawio/
# diagram-excalidraw/
# diagram-mermaid/
# diagramkit/
# diagrams/
# image-convert/
# refs/
# troubleshoot/

# Each skill folder contains a SKILL.md:
ls .claude/skills/diagramkit/diagrams/
# SKILL.md
```

## Skill Dependencies

All skills require:

- **diagramkit** installed as a dependency (`npm add diagramkit`)
- **Playwright Chromium** installed (`npx diagramkit warmup`)

Optional:

- **sharp** — only needed for raster output formats (PNG, JPEG, WebP). Install with `npm add sharp`.

## Reference Files

The `refs/` directory contains detailed syntax references used by the authoring skills:

- `refs/mermaid/` — Syntax for all 20+ Mermaid diagram types (flowchart, sequence, class, state, ER, gantt, etc.)
- `refs/excalidraw/` — Excalidraw JSON format, arrows, colors, validation, examples
- `refs/drawio/` — Draw.io shapes and styles reference

These are loaded automatically by the authoring skills when needed.
