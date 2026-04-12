export const DIAGRAMKIT_PROJECT_SKILL_FILES = [
  '.claude/skills/diagramkit/SKILL.md',
  '.cursor/skills/diagramkit/SKILL.md',
] as const

const DIAGRAMKIT_SKILL_CONTENT = `---
name: diagramkit
description: Render Mermaid, Excalidraw, Draw.io, and Graphviz files to SVG or raster images with diagramkit. Use when a repository contains diagram source files or when the user asks to generate, refresh, automate, or configure diagram image outputs.
---

# Diagramkit

## Use this skill when

- the repository contains \`.mermaid\`, \`.mmd\`, \`.mmdc\`, \`.excalidraw\`, \`.drawio\`, \`.drawio.xml\`, \`.dio\`, \`.dot\`, \`.gv\`, or \`.graphviz\` files
- diagram sources changed and derived image outputs need to be regenerated
- the user wants SVG, PNG, JPEG, WebP, or AVIF exports from supported diagram sources
- the repository needs \`diagramkit.config.json5\`, \`package.json\` scripts, or CI automation for diagram rendering

## Workflow

1. Read \`node_modules/diagramkit/llms.txt\` first. Use it as the canonical quick reference for install steps, CLI defaults, config locations, and automation patterns.
2. If \`diagramkit\` is not installed yet, add it with \`npm add diagramkit\`.
3. Run \`npx diagramkit warmup\` when the repository uses Mermaid, Excalidraw, or Draw.io diagrams. Graphviz-only repositories can skip this step.
4. Prefer \`npx diagramkit render <file-or-dir>\` for manual renders. Use defaults unless the user asks otherwise: \`svg\`, \`both\`, and \`.diagramkit/\` outputs next to the source file.
5. Before large repo-wide renders, prefer \`npx diagramkit render . --dry-run\` or \`npx diagramkit render . --plan --json\`.
6. Add a repeatable \`package.json\` script, usually \`"render:diagrams": "diagramkit render ."\`, unless the repository already has a better repo-specific target.
7. Create \`diagramkit.config.json5\` or \`diagramkit.config.ts\` when the repository needs non-default formats, themes, output paths, filename prefixes or suffixes, extension aliases, or per-file overrides.
8. Install \`sharp\` only when raster outputs are required.
9. Do not hand-edit files inside \`.diagramkit/\`. Regenerate them from the source diagram files instead.
10. In Node scripts or CI helpers that import the library, call \`dispose()\` after rendering.

## Common commands

\`\`\`bash
npm add diagramkit
npx diagramkit warmup
npx diagramkit render .
npx diagramkit render docs/architecture.mermaid
npx diagramkit render . --format svg,png
npx diagramkit render . --dry-run
npx diagramkit init
\`\`\`

## References

- \`node_modules/diagramkit/llms.txt\`
- \`node_modules/diagramkit/llms-full.txt\`
`

export function getDiagramkitSkillContent(): string {
  return DIAGRAMKIT_SKILL_CONTENT
}
