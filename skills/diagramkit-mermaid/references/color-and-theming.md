# Color and Theming Reference

Comprehensive reference for colors, dark mode, contrast optimization, and styling in Mermaid diagrams rendered by diagramkit.

---

## Primary AA-Compliant Palette

These darker mid-tone fills are verified to meet **WCAG 2.2 AA** (>= 4.5:1)
when paired with `#ffffff` text. Their luminance also stays below the dark-
mode contrast post-processor's 0.4 threshold, so they survive both light
and dark rendering unchanged.

| Purpose             | Fill      | Stroke    | Text      | Contrast vs `#fff` |
| ------------------- | --------- | --------- | --------- | ------------------ |
| Primary / API       | `#2E5A88` | `#1F4870` | `#ffffff` | 7.1:1              |
| Secondary / Service | `#1F6E68` | `#155752` | `#ffffff` | 5.9:1              |
| Accent / Alert      | `#B43A3A` | `#8E2828` | `#ffffff` | 5.5:1              |
| Storage / Data      | `#8B5E15` | `#6E4810` | `#ffffff` | 5.4:1              |
| Success             | `#2D7A2D` | `#1E5A1E` | `#ffffff` | 5.4:1              |
| Neutral             | `#5A5A5A` | `#3D3D3D` | `#ffffff` | 7.0:1              |

Use these with `classDef`:

```
classDef primary fill:#2E5A88,stroke:#1F4870,color:#fff
classDef secondary fill:#1F6E68,stroke:#155752,color:#fff
classDef accent fill:#B43A3A,stroke:#8E2828,color:#fff
classDef storage fill:#8B5E15,stroke:#6E4810,color:#fff
classDef success fill:#2D7A2D,stroke:#1E5A1E,color:#fff
classDef neutral fill:#5A5A5A,stroke:#3D3D3D,color:#fff
```

### Legacy Mid-Tone Palette (LARGE TEXT ONLY)

The earlier palette below has higher luminance and **fails WCAG 2.2 AA for
normal-size text** when paired with white labels. Reserve it for headlines
or labels at >= 18px (>= 14px when bold), where the looser 3:1 threshold
applies.

| Purpose             | Fill      | Stroke    | White text contrast | AA verdict (normal) |
| ------------------- | --------- | --------- | ------------------- | ------------------- |
| Primary / API       | `#4C78A8` | `#2E5A88` | 4.65:1              | passes              |
| Secondary / Service | `#72B7B2` | `#4A9A95` | 2.29:1              | FAILS               |
| Accent / Alert      | `#E45756` | `#C23B3A` | 3.61:1              | FAILS               |
| Storage / Data      | `#E4A847` | `#C08C35` | 2.10:1              | FAILS               |
| Success             | `#54A24B` | `#3D8B3D` | 3.16:1              | FAILS               |
| Neutral             | `#9B9B9B` | `#7B7B7B` | 2.85:1              | FAILS               |

If you must use these for visual continuity, switch to dark text
(`color:#1a1a1a`) instead of white — most pass AA against `#1a1a1a`.

## Pastel Palette

Lighter fills for diagrams where softer tones are appropriate. Note: these may be darkened by the WCAG contrast optimizer in dark mode due to high luminance.

| Purpose | Fill      | Stroke    |
| ------- | --------- | --------- |
| Blue    | `#dae8fc` | `#6c8ebf` |
| Green   | `#d5e8d4` | `#82b366` |
| Orange  | `#ffe6cc` | `#d6b656` |
| Red     | `#f8cecc` | `#b85450` |
| Purple  | `#e1d5e7` | `#9673a6` |
| Yellow  | `#fff2cc` | `#d6b656` |
| Gray    | `#f5f5f5` | `#666666` |

Pastel fills have high luminance (> 0.4), so in dark mode the WCAG optimizer will darken them to lightness 0.25 while preserving hue. The diagram remains visually coherent but the fills will look different between light and dark variants. Prefer the mid-tone palette when you want identical color identity in both modes.

## Colors to Avoid

| Color            | Problem                                                         |
| ---------------- | --------------------------------------------------------------- |
| `#ffffff`        | Disappears on light backgrounds                                 |
| Near-white fills | Washed out on light, darkened unpredictably                     |
| `#000000`        | Disappears on dark backgrounds                                  |
| Near-black fills | Invisible on dark mode                                          |
| Named colors     | `red`, `blue`, etc. — behavior varies by renderer, not portable |
| Neon/saturated   | Poor contrast in both modes, visually jarring                   |

**Rule:** Always use hex color codes. Never use CSS named colors.

---

## Dark Mode

### How diagramkit Handles Mermaid Dark Mode

1. **Separate browser pages.** Mermaid's `mermaid.initialize()` sets theme globally and cannot be changed per-render. diagramkit maintains two separate Playwright pages: one configured for light mode, one for dark mode.

2. **Theme variable injection.** For dark mode renders, diagramkit calls `mermaid.initialize()` with a full set of dark theme variables before rendering the diagram.

3. **WCAG contrast post-processing.** After the dark SVG is produced, `postProcessDarkSvg()` scans all inline fill colors and darkens any with luminance > 0.4.

4. **Output naming.** Light and dark variants are always written as separate files: `name-light.svg` and `name-dark.svg`.

### Injected Dark Theme Variables

These variables are passed to `mermaid.initialize({ theme: 'base', themeVariables: {...} })` for dark mode rendering:

```
background:            #111111
primaryColor:          #2d2d2d
primaryTextColor:      #e5e5e5
primaryBorderColor:    #555555
secondaryColor:        #333333
secondaryTextColor:    #cccccc
secondaryBorderColor:  #555555
tertiaryColor:         #252525
tertiaryTextColor:     #cccccc
tertiaryBorderColor:   #555555
lineColor:             #cccccc
textColor:             #e5e5e5
mainBkg:               #2d2d2d
nodeBkg:               #2d2d2d
nodeBorder:            #555555
clusterBkg:            #1e1e1e
clusterBorder:         #555555
titleColor:            #e5e5e5
edgeLabelBackground:   #1e1e1e
actorBorder:           #555555
actorBkg:              #2d2d2d
actorTextColor:        #e5e5e5
actorLineColor:        #888888
signalColor:           #cccccc
signalTextColor:       #e5e5e5
labelBoxBkgColor:      #2d2d2d
labelBoxBorderColor:   #555555
labelTextColor:        #e5e5e5
loopTextColor:         #e5e5e5
noteBorderColor:       #555555
noteBkgColor:          #333333
noteTextColor:         #e5e5e5
activationBorderColor: #555555
activationBkgColor:    #333333
defaultLinkColor:      #cccccc
arrowheadColor:        #cccccc
```

These are defined in `src/mermaid-theme.ts` and exported as `defaultMermaidDarkTheme`.

### Light Mode

For light mode, diagramkit uses the default Mermaid theme with a `#ffffff` background. No custom variables are injected.

---

## WCAG Contrast Optimization

`postProcessDarkSvg()` runs automatically on dark-mode SVGs (unless `--no-contrast` is passed).

### Algorithm

1. Scans all inline `fill` color values in the SVG (both `style="fill:#hex"` and `fill="#hex"` attribute forms).
2. Converts each hex color to RGB and computes WCAG 2.0 relative luminance.
3. If luminance > 0.4 (too bright for dark background):
   - Converts to HSL
   - Preserves the hue (color identity)
   - Caps saturation at 0.6 (prevents garish oversaturation)
   - Sets lightness to 0.25 (dark enough for contrast)
   - Converts back to hex
4. Colors with luminance ≤ 0.4 are left unchanged.

### Practical Effect

| Original Fill | Luminance | Action    | Result                    |
| ------------- | --------- | --------- | ------------------------- |
| `#2E5A88`     | ~0.10     | Unchanged | `#2E5A88`                 |
| `#4C78A8`     | ~0.18     | Unchanged | `#4C78A8`                 |
| `#E45756`     | ~0.24     | Unchanged | `#E45756`                 |
| `#dae8fc`     | ~0.79     | Darkened  | Darker blue with same hue |
| `#ffffff`     | 1.0       | Darkened  | Dark gray                 |
| `#f5f5f5`     | ~0.91     | Darkened  | Dark gray                 |

This is why mid-tone fills are preferred: they look the same in both light and dark renders.

### Validating contrast after rendering

Every render automatically runs the SVG-level contrast scan from
`diagramkit/color`. Failing combinations surface as `LOW_CONTRAST_TEXT`
warnings during validation:

```bash
npx diagramkit validate ./.diagramkit --recursive --json
```

The walker resolves the text fill (inline style, `fill` attribute, own
class CSS, then `.ancestor tag` CSS rules) and the effective background
(parent rect/path explicit fill, falling back to `#ffffff` for `*-light.svg`
and `#111111` for `*-dark.svg`). A combination is reported when its
contrast falls below 4.5:1 for normal text or 3:1 for large text
(>= 18px or >= 14px bold).

### Disabling

```bash
diagramkit render file.mermaid --no-contrast
```

Only disable when you need raw, unprocessed dark SVGs for custom post-processing.

---

## Best Practices for Theme-Safe Diagrams

1. **Use mid-tone fills** from the primary palette — they survive both modes unchanged.
2. **Never hardcode theme directives** — do not add `%%{init: {theme: ...}}%%`. Let diagramkit inject the appropriate theme.
3. **Use `classDef`** for reusable color definitions instead of inline styles.
4. **Test both variants** after rendering — check that both light and dark SVGs are readable.
5. **Avoid fills above luminance 0.4** if you need identical colors in both modes.
6. **Use `#ffffff` for text only**, not fills — white text on mid-tone backgrounds works in both modes.
7. **Use `--no-contrast` sparingly** — only when debugging or doing custom post-processing.

---

## classDef Styling Reference

### Syntax

```
classDef className property1:value1,property2:value2
```

### Applying Styles

```
%% Inline application
node1:::className

%% Batch application
class node1,node2,node3 className

%% Multiple classes
node1:::class1:::class2
```

### Supported Properties

| Property           | Example              | Notes                      |
| ------------------ | -------------------- | -------------------------- |
| `fill`             | `fill:#4C78A8`       | Background color           |
| `stroke`           | `stroke:#2E5A88`     | Border color               |
| `stroke-width`     | `stroke-width:2px`   | Border thickness           |
| `stroke-dasharray` | `stroke-dasharray:5` | Dashed border pattern      |
| `color`            | `color:#fff`         | Text color                 |
| `font-size`        | `font-size:14px`     | Text size                  |
| `font-weight`      | `font-weight:bold`   | Text weight                |
| `rx`               | `rx:10`              | Border radius (horizontal) |
| `ry`               | `ry:10`              | Border radius (vertical)   |
| `opacity`          | `opacity:0.8`        | Element opacity            |

### Common Definitions

```
classDef primary fill:#2E5A88,stroke:#1F4870,color:#fff
classDef secondary fill:#1F6E68,stroke:#155752,color:#fff
classDef accent fill:#B43A3A,stroke:#8E2828,color:#fff
classDef storage fill:#8B5E15,stroke:#6E4810,color:#fff
classDef success fill:#2D7A2D,stroke:#1E5A1E,color:#fff
classDef neutral fill:#5A5A5A,stroke:#3D3D3D,color:#fff
classDef highlight fill:#2E5A88,stroke:#1F4870,color:#fff,stroke-width:3px
classDef dashed fill:#2E5A88,stroke:#1F4870,color:#fff,stroke-dasharray:5
classDef transparent fill:transparent,stroke:#5A5A5A,color:#333
```

> [!IMPORTANT]
> Do NOT name a `classDef` `root`, `default`, `node`, `cluster`, or any
> other class Mermaid uses internally. Mermaid wraps groups in
> `<g class="root">` / `<g class="default">` etc., and a custom `classDef`
> with the same name leaks `tspan` color CSS to every label in the diagram.
> Use unique names like `root_node`, `primary_action`, etc.

### Complete Styling Example

```
%% Diagram: Styled Architecture
%% Type: flowchart
flowchart TD
    gw[API Gateway]:::primary
    auth[Auth Service]:::secondary
    orders[Order Service]:::secondary
    db[(PostgreSQL)]:::storage
    cache[(Redis)]:::accent
    monitor[Monitoring]:::neutral

    gw --> auth
    gw --> orders
    auth --> db
    orders --> db
    auth --> cache
    orders --> monitor

    classDef primary fill:#2E5A88,stroke:#1F4870,color:#fff
    classDef secondary fill:#1F6E68,stroke:#155752,color:#fff
    classDef accent fill:#B43A3A,stroke:#8E2828,color:#fff
    classDef storage fill:#8B5E15,stroke:#6E4810,color:#fff
    classDef neutral fill:#5A5A5A,stroke:#3D3D3D,color:#fff
```

---

## linkStyle Reference

### Syntax

```
linkStyle INDEX property1:value1,property2:value2
```

`INDEX` is the zero-based order of the edge as it appears in the source.

### Supported Properties

| Property           | Example              | Notes                    |
| ------------------ | -------------------- | ------------------------ |
| `stroke`           | `stroke:#4C78A8`     | Line color               |
| `stroke-width`     | `stroke-width:2px`   | Line thickness           |
| `stroke-dasharray` | `stroke-dasharray:5` | Dash pattern             |
| `fill`             | `fill:none`          | Usually `none` for edges |
| `color`            | `color:#333`         | Label color              |

### Batch Styling

```
linkStyle 0,1,2 stroke:#4C78A8,stroke-width:2px
linkStyle default stroke:#9B9B9B,stroke-width:1px
```

`default` applies to all edges not individually styled.

### Example

```
flowchart TD
    A[Source] --> B[Service A]
    A -.-> C[Service B]
    B ==> D[Database]
    C --> D

    linkStyle 0 stroke:#4C78A8,stroke-width:2px
    linkStyle 1 stroke:#E45756,stroke-width:1px,stroke-dasharray:5
    linkStyle 2 stroke:#54A24B,stroke-width:3px
    linkStyle 3 stroke:#9B9B9B,stroke-width:1px
```

### Counting Edge Indices

Edges are numbered in the order they appear in the source code:

```
flowchart TD
    A --> B      %% linkStyle 0
    A --> C      %% linkStyle 1
    B --> D      %% linkStyle 2
    C --> D      %% linkStyle 3
```

---

## Mermaid Quality Rules

### Node Count

- Keep most diagrams under ~15 nodes.
- Over 15 nodes: use subgraphs to group, or split into multiple diagrams.

### Subgraphs

- Use subgraphs for logical grouping (layers, stages, bounded contexts).
- Maximum 2–3 nesting levels.
- Give subgraphs descriptive IDs and quoted display titles: `subgraph svc["Service Layer"]`.

### Direction

- Use `TD` (top-down) for hierarchical flows and dependency chains.
- Use `LR` (left-right) for pipelines and sequential processes.
- Use `direction` inside subgraphs to override when child layout differs from parent.

### Labels

- Quote labels containing special characters: `id["Label with (parens) and : colons"]`.
- Keep labels short — 2–4 words.
- Use edge labels sparingly; prefer them for relationship types rather than descriptions.

### Splitting Large Diagrams

When a diagram exceeds 15 nodes or becomes hard to read:

1. Create an **overview** diagram showing high-level components.
2. Create **detail** diagrams for each subsystem or layer.
3. Name files clearly: `auth-overview.mermaid`, `auth-token-flow.mermaid`.
4. Reference detail diagrams from the overview context in surrounding documentation.

### General Quality

- One story per diagram — avoid combining unrelated concerns.
- Use consistent naming: `snake_case` IDs, Title Case labels.
- Place `classDef` and `linkStyle` at the end for readability.
- Prefer `classDef` over repeated inline styles.
- Commit the `.mermaid` source file — it is the editable truth.
