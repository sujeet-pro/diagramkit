---
name: pagesmith-generate-docs
description: Generate a complete multi-page documentation set for a project — product overview, quickstart, guides, and API/reference — inside an existing @pagesmith/docs site. Use when the user asks to "document this codebase", "auto-generate docs for my package", "write docs for me", or wants the agent to seed a Pagesmith docs site with real content derived from the project, not just a skeleton.
---

# Pagesmith Docs — Generate Docs (pointer)

This is a **thin pointer**. The canonical, version-matched skill ships with `@pagesmith/docs` and lives at:

- Upstream skill: [`node_modules/@pagesmith/docs/skills/pagesmith-generate-docs/SKILL.md`](../../../node_modules/@pagesmith/docs/skills/pagesmith-generate-docs/SKILL.md)
- Sibling references: [`node_modules/@pagesmith/docs/skills/pagesmith-generate-docs/references/`](../../../node_modules/@pagesmith/docs/skills/pagesmith-generate-docs/references/)
- Full reference: [`node_modules/@pagesmith/docs/REFERENCE.md`](../../../node_modules/@pagesmith/docs/REFERENCE.md)

Read and follow the upstream `SKILL.md` exactly. Do not duplicate its content here.

## Diagramkit-specific extras

For diagramkit, prefer the project skill [`prj-update-docs`](../prj-update-docs/SKILL.md) when seeding or refreshing pages from current source. It encodes diagramkit-specific conventions:

- Reference series mapping (`docs/reference/diagramkit/{cli,api,config,types,utils,color,convert}/` ↔ `src/index.ts`, `src/utils.ts`, `src/types.ts`).
- The "do it with an agent" before "do it manually" pattern in every guide page.
- The diagram-asset cross-reference rule and `./path/README.md` link style enforced by [`scripts/validate-pagesmith.ts`](../../../scripts/validate-pagesmith.ts).

After any generation pass run `npm run validate:pagesmith` so the upstream `validateDocs` confirms both markdown content and HTML output pass.
