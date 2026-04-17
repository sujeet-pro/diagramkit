# Pagesmith Markdown Reference

Markdown feature support for content authored with `@pagesmith/core` and `@pagesmith/docs`. Use this when writing or editing pages under `docs/`. The canonical version (kept in lock-step with the installed Pagesmith version) ships at:

- `node_modules/@pagesmith/docs/ai-guidelines/markdown-guidelines.md`
- `node_modules/@pagesmith/core/ai-guidelines/markdown-guidelines.md`

Read those for the absolute source of truth. The summary below is the snapshot we hold in this skill so contributor-facing guidance is self-contained.

## Pipeline order

```
remark-parse → remark-gfm → remark-frontmatter
  → remark-github-alerts → remark-smartypants → remark-math (when `markdown.math` is enabled or auto-detected) → [user remark plugins]
  → remark-rehype
  → rehype-mathjax (when math is enabled)
  → applyPagesmithCodeRenderer (dual themes, line numbers, titles, copy, collapse, mark/ins/del)
  → rehype-code-tabs → rehype-scrollable-tables
  → rehype-slug → rehype-autolink-headings
  → rehype-external-links → rehype-accessible-emojis
  → heading extraction → [user rehype plugins] → rehype-stringify
```

## Core rules

- Use fenced code blocks with a language identifier (the validator warns otherwise).
- One `# h1` per page (the validator enforces this).
- Sequential heading depth — never skip from h2 to h4.
- Prefer relative links for internal content.
- `allowDangerousHtml` defaults to `true`; disable it when rendering untrusted markdown.
- `math` defaults to `'auto'`; the math plugins only activate when the page contains math markers.
- Do NOT add manual copy-button JS inside markdown content — the built-in renderer injects its own copy/collapse runtime.
- Include the shipped Pagesmith markdown CSS so code block chrome and tabs render correctly.

## Supported markdown features

| Feature          | Syntax                                                                    | Notes                            |
| ---------------- | ------------------------------------------------------------------------- | -------------------------------- |
| GFM tables       | Standard pipe tables                                                      | Wrapped for horizontal scroll    |
| Strikethrough    | `~~text~~`                                                                |                                  |
| Task lists       | `- [x] done` / `- [ ] todo`                                               |                                  |
| Footnotes        | `[^id]` + `[^id]: text`                                                   |                                  |
| Alerts           | `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]` | GitHub-compatible                |
| Inline math      | `$E = mc^2$`                                                              | No spaces inside delimiters      |
| Block math       | `$$...$$`                                                                 | Rendered via MathJax             |
| Smart quotes     | `"text"` → curly quotes                                                   | Automatic via smartypants        |
| Em/en dash       | `---` / `--`                                                              | Automatic via smartypants        |
| External links   | `[text](https://...)`                                                     | Auto `target="_blank"`           |
| Heading anchors  | Auto `id` + wrapped anchor                                                | All headings                     |
| Accessible emoji | Unicode emoji                                                             | Auto `role="img"` + `aria-label` |

## Code block features (built-in renderer)

| Meta               | Example                    | Description            |
| ------------------ | -------------------------- | ---------------------- |
| `title="..."`      | ` ```js title="app.js" `   | File title             |
| `showLineNumbers`  | ` ```js showLineNumbers `  | Line numbers           |
| `mark={lines}`     | ` ```js mark={3,5-7} `     | Highlight lines        |
| `ins={lines}`      | ` ```js ins={4} `          | Inserted lines (green) |
| `del={lines}`      | ` ```js del={5} `          | Deleted lines (red)    |
| `collapse={lines}` | ` ```js collapse={1-5} `   | Collapsible section    |
| `wrap`             | ` ```js wrap `             | Text wrapping          |
| `frame="..."`      | ` ```js frame="terminal" ` | Frame style            |

Known valid meta properties: `title`, `showLineNumbers`, `startLineNumber`, `wrap`, `frame`, `collapse`, `mark`, `ins`, `del`.

## Built-in content validators

- **linkValidator** — warns on bare URLs, empty link text, suspicious protocols.
- **headingValidator** — enforces single h1, sequential depth, non-empty text.
- **codeBlockValidator** — warns on missing language, unknown meta properties.

## Diagramkit-specific note

When embedding diagramkit-rendered SVGs in docs pages, prefer the `<picture>` element pattern documented in [`docs-workflow.md`](./docs-workflow.md#diagram-embedding-in-docs). The Pagesmith renderer passes raw HTML through unchanged because `allowDangerousHtml` defaults to `true` for trusted local content.
