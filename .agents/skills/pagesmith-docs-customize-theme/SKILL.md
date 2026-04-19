---
name: pagesmith-docs-customize-theme
description: Customize layouts, components, footer, CSS variables, and header of a @pagesmith/docs site without forking the package. Use when the user wants to restyle the docs, add a custom header or footer, swap the sidebar, change colors, override typography, add a branded banner, or wire project-specific components into the docs theme.
---

# Pagesmith Docs — Customize Theme (pointer)

This is a **thin pointer**. The canonical, version-matched skill ships with `@pagesmith/docs` and lives at:

- Upstream skill: [`node_modules/@pagesmith/docs/skills/pagesmith-docs-customize-theme/SKILL.md`](../../../node_modules/@pagesmith/docs/skills/pagesmith-docs-customize-theme/SKILL.md)
- Sibling references: [`node_modules/@pagesmith/docs/skills/pagesmith-docs-customize-theme/references/`](../../../node_modules/@pagesmith/docs/skills/pagesmith-docs-customize-theme/references/)
- Component/layout exports: [`node_modules/@pagesmith/docs/dist/components/`](../../../node_modules/@pagesmith/docs/dist/components/), [`node_modules/@pagesmith/docs/dist/layouts/`](../../../node_modules/@pagesmith/docs/dist/layouts/)
- Full reference: [`node_modules/@pagesmith/docs/REFERENCE.md`](../../../node_modules/@pagesmith/docs/REFERENCE.md) (see `theme.layouts`, `@pagesmith/docs/components`, `@pagesmith/docs/layouts`, `@pagesmith/docs/jsx-runtime`)

Read and follow the upstream `SKILL.md` exactly. Do not duplicate its content here.

## Diagramkit-specific extras

- diagramkit currently uses the default Pagesmith theme. If you add `theme.layouts` overrides, place them under `theme/` at the repo root and reference them with paths relative to `pagesmith.config.json5`.
- After any theme change, run `npm run build:docs` and `npm run validate:pagesmith` so the upstream `validateDocs` confirms both markdown content and the rendered HTML still pass.
