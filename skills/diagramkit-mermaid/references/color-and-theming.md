# Color and Theming Reference

Comprehensive reference for colors, dark mode, contrast optimization, and styling in Mermaid diagrams rendered by diagramkit.

---

## Primary Mid-Tone Palette

These colors work in both light and dark mode. The WCAG contrast optimizer preserves them because they are mid-tone (luminance ≤ 0.4).

| Purpose             | Fill      | Stroke    | Text      |
| ------------------- | --------- | --------- | --------- |
| Primary / API       | `#4C78A8` | `#2E5A88` | `#ffffff` |
| Secondary / Service | `#72B7B2` | `#4A9A95` | `#ffffff` |
| Accent / Alert      | `#E45756` | `#C23B3A` | `#ffffff` |
| Storage / Data      | `#E4A847` | `#C08C35` | `#ffffff` |
| Success             | `#54A24B` | `#3D8B3D` | `#ffffff` |
| Neutral             | `#9B9B9B` | `#7B7B7B` | `#ffffff` |

Use these with `classDef`:

```
classDef primary fill:#4C78A8,stroke:#2E5A88,color:#fff
classDef secondary fill:#72B7B2,stroke:#4A9A95,color:#fff
classDef accent fill:#E45756,stroke:#C23B3A,color:#fff
classDef storage fill:#E4A847,stroke:#C08C35,color:#fff
classDef success fill:#54A24B,stroke:#3D8B3D,color:#fff
classDef neutral fill:#9B9B9B,stroke:#7B7B7B,color:#fff
```

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
| `#4C78A8`     | ~0.17     | Unchanged | `#4C78A8`                 |
| `#E45756`     | ~0.19     | Unchanged | `#E45756`                 |
| `#dae8fc`     | ~0.79     | Darkened  | Darker blue with same hue |
| `#ffffff`     | 1.0       | Darkened  | Dark gray                 |
| `#f5f5f5`     | ~0.91     | Darkened  | Dark gray                 |

This is why mid-tone fills are preferred: they look the same in both light and dark renders.

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
classDef primary fill:#4C78A8,stroke:#2E5A88,color:#fff
classDef secondary fill:#72B7B2,stroke:#4A9A95,color:#fff
classDef accent fill:#E45756,stroke:#C23B3A,color:#fff
classDef storage fill:#E4A847,stroke:#C08C35,color:#fff
classDef success fill:#54A24B,stroke:#3D8B3D,color:#fff
classDef neutral fill:#9B9B9B,stroke:#7B7B7B,color:#fff
classDef highlight fill:#4C78A8,stroke:#2E5A88,color:#fff,stroke-width:3px
classDef dashed fill:#4C78A8,stroke:#2E5A88,color:#fff,stroke-dasharray:5
classDef transparent fill:transparent,stroke:#9B9B9B,color:#333
```

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

    classDef primary fill:#4C78A8,stroke:#2E5A88,color:#fff
    classDef secondary fill:#72B7B2,stroke:#4A9A95,color:#fff
    classDef accent fill:#E45756,stroke:#C23B3A,color:#fff
    classDef storage fill:#E4A847,stroke:#C08C35,color:#fff
    classDef neutral fill:#9B9B9B,stroke:#7B7B7B,color:#fff
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
