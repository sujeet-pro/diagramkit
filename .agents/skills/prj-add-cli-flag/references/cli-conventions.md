# diagramkit CLI Conventions (skill-local extract)

Self-contained reference for the `prj-add-cli-flag` skill. Extracts the CLI-relevant bits of `coding-standards.md`, `project-context.md`, and `contributor-workflow.md` so this skill needs nothing else. Keep in sync with the canonical files under `.agents/skills/prj-review-repo/references/`.

## CLI architecture

- No CLI framework — argument parsing is manual in [`cli/bin.ts`](../../../../cli/bin.ts).
- `@clack/prompts` powers all interactive flows: the top-level picker (`diagramkit` bare on a TTY), `diagramkit init`, `diagramkit render --interactive`, and `diagramkit validate --interactive`.
- Interactivity precedence (see `resolveInteractiveMode()` / `shouldPromptInteractive()`):
  1. `--no-interactive` or `--yes`/`-y` → never prompt.
  2. `--interactive`/`-i` → prompt when a TTY is attached (otherwise warn and fall back to non-interactive).
  3. Auto mode → prompt only when no positional/flag args were supplied AND a TTY is attached.
- Interactive wizards MUST seed their defaults from the effective `DiagramkitConfig` (loaded with `loadConfig({}, process.cwd())`) and from any flags already on `argv`, then synthesize a plain argv and delegate to the existing non-interactive handler so validation and JSON envelopes stay identical.
- `getFlag()` for boolean flags; `getFlagValue()` for string flags; `SHORT_FLAGS` maps short to long.
- `FLAGS_REQUIRING_VALUE` lists flags that must consume the next argv token.
- Error messages go to `console.error`; normal output to `console.log`.
- Exit codes: `0` success, `1` any failure (including partial).

## Config and layering

Config merges in strict order, **never change it**:

```
defaults (getDefaultConfig)
 → global      (~/.config/diagramkit/config.json5 or config.json)
 → env vars    (DIAGRAMKIT_*)
 → local       (diagramkit.config.ts | .json5, walks up from cwd)
 → per-call    (CLI overrides or programmatic options)
```

- Config types live in [`src/types.ts`](../../../../src/types.ts) as `DiagramkitConfig`.
- Defaults live in `getDefaultConfig()` in [`src/config.ts`](../../../../src/config.ts).
- Env var plumbing is `loadEnvConfig()` in `src/config.ts`.
- JSON Schema for `diagramkit.config.{json5,json}` lives in [`schemas/diagramkit-config.v1.json`](../../../../schemas/diagramkit-config.v1.json) and is shipped in the npm package via `package.json#exports`. Update it whenever the `DiagramkitConfig` shape changes — editor autocomplete and validation depend on it.
- Prefer JSON5 for configs; use TypeScript configs only when a value needs code (function overrides, programmatic values).
- Values that live in config should NOT require a flag override on every run — a flag is just an override.

## Flag decision tree

| Question                                       | If yes                                                                                                                                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does this belong in `diagramkit.config.json5`? | Add the config field first, then surface it as a flag override.                                                                                                                             |
| Should it be interactive-only?                 | Add a prompt in the matching wizard (`commandInit`, `runInteractiveRender`, `runInteractiveValidate`). Still expose a flag for non-interactive use unless it truly has no headless meaning. |
| Is it a boolean?                               | Use `getFlag()`. Add a `--no-<name>` form if default is true.                                                                                                                               |
| Is it a value flag?                            | Use `getFlagValue()`. Validate; error with actionable message.                                                                                                                              |
| Does it need an env var?                       | Add `DIAGRAMKIT_<UPPER>` handling in `src/config.ts`.                                                                                                                                       |

## JSON output envelope

For `--json` output, use the v1 schema at [`schemas/diagramkit-cli-render.v1.json`](../../../../schemas/diagramkit-cli-render.v1.json). Include `schemaVersion: 1`, `command`, `target`, `phase`, `options`.

## Agent help

`--agent-help` reads the repo-root `llms-full.txt`. Keep flag additions reflected there when they affect the public CLI surface.

## Testing

- Unit tests in [`src/cli-bin.test.ts`](../../../../src/cli-bin.test.ts) for flag parsing and validation.
- Config tests in [`src/config.test.ts`](../../../../src/config.test.ts) for new config fields and env vars.
- E2E test in [`e2e/cli-render.e2e.test.ts`](../../../../e2e/cli-render.e2e.test.ts) asserting behavior end-to-end.

## Anti-patterns

- Adding a flag without a config-field backing when it's reasonable to persist the preference. Users should not have to pass the same flag every run.
- Using `process.exit(0)` from inside a command handler. Let the handler return; the top-level catches errors and sets the exit code.
- Silently ignoring invalid flag values. Always `console.error` a clear message and exit non-zero.

## Sync rule

When a new flag lands, update in the same PR:

- [`src/types.ts`](../../../../src/types.ts) — `DiagramkitConfig` if it backs a config field.
- [`src/config.ts`](../../../../src/config.ts) — defaults + env var plumbing.
- [`schemas/diagramkit-config.v1.json`](../../../../schemas/diagramkit-config.v1.json) — JSON Schema property + enum if it backs a config field.
- [`cli/bin.ts`](../../../../cli/bin.ts) — parsing + help text.
- [`llms.txt`](../../../../llms.txt) / [`llms-full.txt`](../../../../llms-full.txt) — if part of the common CLI surface.
- `docs/guide/cli/README.md` and `docs/reference/diagramkit/cli/README.md` — flag row.
- `docs/reference/diagramkit/config/README.md` — config field row.
- Canonical reference [`project-context.md`](../../prj-review-repo/references/project-context.md) "Key APIs" — only if the public API shape changed.
