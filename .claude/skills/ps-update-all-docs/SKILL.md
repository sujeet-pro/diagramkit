---
name: ps-update-all-docs
description: Full-repo documentation regeneration for Pagesmith projects including docs structure, skills alignment, and AI context updates
allowed-tools: Read Grep Glob Bash Edit Write
---

# Pagesmith Full Docs Sync

Perform a full-repository docs refresh for Pagesmith-powered projects. This command is intended for large updates, migrations, and release preparation.

## Steps

1. Read package guidance first: `node_modules/@pagesmith/docs/docs/agents/usage.md` and `node_modules/@pagesmith/core/docs/agents/usage.md`
2. Read `pagesmith.config.json5` and all `meta.json5` files before editing anything
3. Discover project skills in `.claude/skills/`, `.codex/skills/`, and `.gemini/commands/` and identify docs-update related skills
4. Scan source code, README, CHANGELOG, package exports, and CLI commands to build a complete docs delta list
5. Update all docs pages under `<contentDir>/` to match implementation and remove stale details (derive `contentDir` from `pagesmith.config.json5`)
6. Ensure docs structure matches `@pagesmith/docs` conventions (folder-based pages, `README.md` entries, relative links)
7. Keep onboarding-first ordering: when a guide section exists, keep `getting-started` as the first item in manual order
8. Update docs-related skills so they generate content in the same structure expected by `@pagesmith/docs`
9. Regenerate or update `llms.txt`, `llms-full.txt`, and project memory pointers when docs behavior changes
10. Follow `.pagesmith/markdown-guidelines.md` for all authored content (GFM, alerts, math, Expressive Code meta)
11. Validate navigation integrity and ensure every linked page exists

## Rules

- Preserve existing information architecture unless the user requests a restructure
- Keep docs easy for humans first, while keeping AI memory/skills aligned
- Keep top-level docs navigation driven by content directories and metadata
- Use `meta.json5` and frontmatter for ordering; avoid hardcoded navigation lists in prose
- Keep `<contentDir>/README.md` as docs home for `@pagesmith/docs` projects
- Keep links relative for internal docs pages
- Use one h1 per page and sequential heading depth
- Use fenced code blocks with language identifiers and Expressive Code metadata when useful
- Do not add separate code-copy JavaScript; Expressive Code already provides this
