---
name: update-docs
description: Read the project implementation and update Pagesmith-managed documentation to reflect the current state
allowed-tools: Read Grep Glob Bash Edit Write
---

# Update Documentation

Read the project implementation (source code, README, CHANGELOG, package.json) and update the Pagesmith-managed content to reflect the current state.

## Steps

1. Read package guidance first: `node_modules/@pagesmith/docs/ai-guidelines/setup-docs.md`, `node_modules/@pagesmith/docs/ai-guidelines/docs-guidelines.md`, `node_modules/@pagesmith/docs/ai-guidelines/markdown-guidelines.md`, `node_modules/@pagesmith/docs/ai-guidelines/usage.md`, plus `node_modules/@pagesmith/core/ai-guidelines/core-guidelines.md`, `node_modules/@pagesmith/core/ai-guidelines/markdown-guidelines.md`, and `node_modules/@pagesmith/core/ai-guidelines/usage.md`
2. Read `pagesmith.config.json5` to understand the docs configuration
3. Read all `meta.json5` files to understand the current content structure and page ordering
4. Read the project source code to identify public APIs, types, exports, config options, and CLI commands
5. For each existing content page in `content/`:
   - Read the current content
   - Compare with the implementation
   - Update any outdated information
   - Add documentation for new features
   - Remove documentation for removed features
6. If new pages are needed:
   - Create the page folder and `README.md` with proper frontmatter (title, description)
   - Add the slug to the appropriate `meta.json5` `items` array
7. Follow the markdown guidelines in `.pagesmith/markdown-guidelines.md`
8. Review project skills under `.claude/skills/` and ensure docs-writing skills align with Pagesmith docs structure
9. Ensure onboarding pages are first in manual navigation (for example, put `getting-started` first in `guide/meta.json5` when present)
10. Verify all internal links point to existing pages
11. Ensure heading hierarchy is sequential (no skipping levels)

## Rules

- Preserve the existing content structure and organization
- Do not remove pages without confirming first
- Keep frontmatter fields (title, description) accurate and descriptive
- Use relative links for internal cross-references
- One h1 per page, sequential heading depth
- Use fenced code blocks with language identifiers
- Use GitHub alerts (`> [!NOTE]`, `> [!TIP]`, etc.) for important callouts
- Code block features: `title="file.js"`, `showLineNumbers`, `mark={1-3}`, `ins={4}`, `del={5}`, `collapse={1-5}`
