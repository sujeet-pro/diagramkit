# Installing Skills

diagramkit ships with agent skills for Claude Code that enable AI-assisted diagram generation, rendering, and troubleshooting. This guide covers how to install and use them.

## What Are Skills?

Skills are markdown instruction files (`SKILL.md`) organized in folders under `.claude/skills/`. Each skill teaches Claude Code how to perform a specific task. Once installed, you can invoke them as slash commands:

- `/diagrams` — Analyze a description and generate the best diagram type
- `/diagramkit` — Render diagram files to images
- `/diagram-mermaid` — Author Mermaid source files
- `/diagram-excalidraw` — Author Excalidraw JSON files
- `/diagram-drawio` — Author Draw.io XML files
- `/image-convert` — Convert SVG to raster formats
- `/troubleshoot` — Diagnose and fix rendering issues
- `/ci-cd` — Set up CI/CD pipelines for diagram rendering

## Installed Structure

Skills follow the `.claude/skills/<skill-name>/SKILL.md` convention:

```
your-project/
├── .claude/
│   └── skills/
│       └── diagramkit/
│           ├── diagrams/
│           │   └── SKILL.md         # Engine selection orchestrator
│           ├── diagramkit/
│           │   └── SKILL.md         # Render diagrams to images
│           ├── diagram-mermaid/
│           │   └── SKILL.md         # Mermaid source file authoring
│           ├── diagram-excalidraw/
│           │   └── SKILL.md         # Excalidraw JSON authoring
│           ├── diagram-drawio/
│           │   └── SKILL.md         # Draw.io XML authoring
│           ├── image-convert/
│           │   └── SKILL.md         # SVG to raster conversion
│           ├── troubleshoot/
│           │   └── SKILL.md         # Diagnose and fix issues
│           ├── ci-cd/
│           │   └── SKILL.md         # CI/CD integration
│           └── refs/                # Shared references
│               ├── mermaid/         # 20+ diagram type syntax
│               ├── excalidraw/      # JSON format, arrows, colors
│               └── drawio/          # Shape libraries, styles
```

## Installation

### Using the CLI (Recommended)

The simplest way to install skills is with the built-in CLI command:

```bash
# Install to your project (.claude/skills/diagramkit/)
npx diagramkit install-skills

# Install globally (~/.claude/skills/diagramkit/)
npx diagramkit install-skills --global
```

**Project-level** installation makes skills available only in that project. **Global** installation makes them available in all your projects.

### Manual Installation

Copy the `agent_skills/` directory from the diagramkit package:

```bash
# Project-level
mkdir -p .claude/skills/diagramkit
cp -r node_modules/diagramkit/agent_skills/* .claude/skills/diagramkit/

# Global
mkdir -p ~/.claude/skills/diagramkit
cp -r node_modules/diagramkit/agent_skills/* ~/.claude/skills/diagramkit/
```

### Using INSTALL_SKILLS.md

diagramkit includes an `INSTALL_SKILLS.md` file at the package root. This file serves as a self-contained skill manifest that documents all available skills. Reference it from your `CLAUDE.md` for automatic availability:

```markdown
<!-- In your CLAUDE.md -->
Diagram skills are available via diagramkit. See INSTALL_SKILLS.md for the full list.
Run `npx diagramkit install-skills` to install them.
```

## Prerequisites

Before using the skills, set up diagramkit:

```bash
# 1. Install diagramkit
npm add diagramkit

# 2. Install the browser engine (once per environment)
npx diagramkit warmup

# 3. Optional: install sharp for raster output (PNG/JPEG/WebP)
npm add sharp
```

### About `diagramkit warmup`

The `warmup` command installs Playwright's Chromium browser, which diagramkit uses for all rendering. You need to run this:

- Once on your local machine after installing diagramkit
- In CI/CD pipelines (see the `/ci-cd` skill for caching strategies)
- In Docker images during build

```bash
# Standard warmup
npx diagramkit warmup

# In CI/Docker — include OS-level dependencies
npx playwright install --with-deps chromium
```

### About `sharp` (Optional)

`sharp` is only needed for raster output formats. You do **not** need it for SVG output (the default).

| Need sharp? | Use case |
|-------------|----------|
| No | SVG output (default) |
| Yes | `--format png` for documentation, presentations |
| Yes | `--format jpeg` for email, social media |
| Yes | `--format webp` for optimized web assets |

```bash
npm add sharp
```

On Apple Silicon, you may need to rebuild after installation:

```bash
npm rebuild sharp
```

## Verifying Installation

After installing skills, check they're in place:

```bash
ls .claude/skills/diagramkit/
```

Expected output:

```
ci-cd/
diagram-drawio/
diagram-excalidraw/
diagram-mermaid/
diagramkit/
diagrams/
image-convert/
refs/
troubleshoot/
```

Each folder contains a `SKILL.md`:

```bash
ls .claude/skills/diagramkit/diagrams/
# SKILL.md
```

## Skill Reference

### `/diagrams` — Diagram Orchestrator

The main entry point. Analyzes your description, picks the best engine (Mermaid, Excalidraw, or Draw.io), generates the source file, and renders it.

```
/diagrams "Architecture diagram of our microservices"
/diagrams "Sequence diagram of the auth flow" type=sequence
/diagrams "System overview" engine=excalidraw format=png
```

### `/diagramkit` — Renderer

Renders existing diagram source files. Use this when you already have `.mermaid`, `.excalidraw`, or `.drawio` files.

```
/diagramkit render .
/diagramkit render architecture.mermaid
/diagramkit render . --format png --theme light
```

### `/diagram-mermaid` — Mermaid Authoring

Generates Mermaid source files with correct syntax for all 20+ diagram types: flowcharts, sequence diagrams, class diagrams, state machines, ER diagrams, gantt charts, git graphs, mindmaps, timelines, C4, kanban, and more.

### `/diagram-excalidraw` — Excalidraw Authoring

Generates Excalidraw JSON files with proper element structure, bound text, elbow arrows, and color palettes. Ideal for architecture overviews, system diagrams, and freeform layouts.

### `/diagram-drawio` — Draw.io Authoring

Generates Draw.io XML files with shapes, styles, containers, and edge routing. Best for network topology, BPMN, and enterprise diagrams.

### `/image-convert` — SVG to Raster

Converts existing SVG files to PNG, JPEG, or WebP using sharp.

### `/troubleshoot` — Troubleshooting

Diagnoses common issues: Playwright setup failures, rendering errors, manifest corruption, CI/CD problems, mermaid syntax errors, excalidraw JSON validation, and draw.io XML parsing.

### `/ci-cd` — CI/CD Integration

Generates CI/CD configuration for GitHub Actions, GitLab CI, Docker, and pre-commit hooks. Includes caching strategies for Playwright browsers and rendered output.

## Reference Files

The `refs/` subdirectory contains detailed syntax references:

| Directory | Content |
|-----------|---------|
| `refs/mermaid/` | Syntax for 20+ Mermaid diagram types |
| `refs/excalidraw/` | JSON format, arrows, colors, validation, examples |
| `refs/drawio/` | Shape libraries, style properties |

These are loaded automatically by the authoring skills when needed. You don't need to reference them directly.

## Updating Skills

When you update diagramkit, re-run the install command to get the latest skills:

```bash
npm update diagramkit
npx diagramkit install-skills
```

## Uninstalling Skills

Remove the skills directory:

```bash
# Project-level
rm -rf .claude/skills/diagramkit

# Global
rm -rf ~/.claude/skills/diagramkit
```
