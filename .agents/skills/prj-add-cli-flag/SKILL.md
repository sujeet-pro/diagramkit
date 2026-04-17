---
name: prj-add-cli-flag
description: Add or modify a CLI flag in diagramkit. Covers the manual arg parser, interactive prompts, config plumbing, docs update, and ai-guidelines sync. Use when extending diagramkit's CLI surface.
user_invocable: true
---

# Add a CLI Flag

diagramkit uses manual argument parsing in [cli/bin.ts](cli/bin.ts) (no CLI framework). Interactive prompts for `init` use `@clack/prompts`.

## Read first

1. [`references/cli-conventions.md`](references/cli-conventions.md) — skill-local extract of CLI conventions, config layering, decision tree, test + sync rules.
2. [cli/bin.ts](../../../cli/bin.ts) — existing flags and the help text.
3. [src/config.ts](../../../src/config.ts) — how config options are resolved and layered.
4. [src/types.ts](../../../src/types.ts) — `DiagramkitConfig` interface.

Canonical long-form references (only when you need the full picture): [`../prj-review-repo/references/project-context.md`](../prj-review-repo/references/project-context.md), [`../prj-review-repo/references/coding-standards.md`](../prj-review-repo/references/coding-standards.md).

## Decision tree

Before adding a flag, decide:

| Question                                       | If yes                                                          |
| ---------------------------------------------- | --------------------------------------------------------------- |
| Does this belong in `diagramkit.config.json5`? | Add the config field first, then surface it as a flag override. |
| Should it be interactive-only?                 | Add it to `diagramkit init` prompts, not to `render`.           |
| Is it a boolean?                               | Use `getFlag()`. Add a `--no-<name>` form if default is true.   |
| Is it a value flag?                            | Use `getFlagValue()`. Validate; error with actionable message.  |
| Does it need an env var?                       | Add `DIAGRAMKIT_<UPPER>` handling in `src/config.ts`.           |

## Steps

1. **Config field** (if applicable) — add to the `DiagramkitConfig` interface in [src/types.ts](src/types.ts) with a default in `getDefaultConfig()`. Update the merge logic in `src/config.ts` if the field requires special handling (arrays, deep objects). Also update the JSON Schema in [`schemas/diagramkit-config.v1.json`](../../../schemas/diagramkit-config.v1.json) so editor autocomplete and validation stay in sync (this schema ships in the npm package).
2. **Env var** (if applicable) — add to `loadEnvConfig()` in [src/config.ts](src/config.ts).
3. **Arg parser** — in [cli/bin.ts](cli/bin.ts), read the flag using `getFlag()` or `getFlagValue()` inside the correct command handler (`render`, `validate`, `init`, etc.). Validate the value; call `console.error` and exit `1` on invalid input.
4. **Overrides** — pass the resolved value into `loadConfig` overrides or the per-call options object. Never mutate the config layer ordering.
5. **Help text** — add a line under the matching group in `printHelp()` with the default value noted.
6. **Agent help** — ensure `printAgentHelp()` still works. If the flag appears in `llms.txt` / `llms-full.txt`, regenerate via `tsx scripts/copy-llms.ts`.
7. **Interactive init** (if flag maps to a config field) — add a `@clack/prompts` question in the `init` flow of `cli/bin.ts`. Respect `--yes` (skip and use default).
8. **Unknown-flag suggestions** — add the new flag name to the `KNOWN_FLAGS` list in `warnUnknownFlags()` (if used) so typo suggestions stay accurate.
9. **Tests**:
   - Unit tests in [src/cli-bin.test.ts](src/cli-bin.test.ts) for flag parsing and validation.
   - Config tests in [src/config.test.ts](src/config.test.ts) for new config field and env var.
   - E2E test in [e2e/cli-render.e2e.test.ts](e2e/cli-render.e2e.test.ts) asserting behavior end-to-end.
10. **Docs**:
    - `docs/guide/cli/README.md` and `docs/reference/diagramkit/cli/README.md` — add the flag with default and example.
    - `docs/reference/diagramkit/config/README.md` — if the flag backs a config field, document the field.
11. **Sync** — see the "Sync rule" section of [`references/cli-conventions.md`](references/cli-conventions.md). Update [`../prj-review-repo/references/project-context.md`](../prj-review-repo/references/project-context.md) "Key APIs" only if the public API shape changed. Always update the CLI examples in the README if the new flag is a common one.

## Validation

```bash
npm run cicd
```

## Anti-patterns

- Adding a flag without a config-field backing when it's reasonable to persist the preference. Users should not have to pass the same flag every run.
- Using `process.exit(0)` from inside a command handler. Let the handler return; the top-level catches errors and sets the exit code.
- Silently ignoring invalid flag values. Always `console.error` a clear message and exit non-zero.
