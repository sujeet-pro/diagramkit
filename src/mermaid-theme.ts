import type { MermaidThemeVariables } from './types'

/**
 * Mermaid `themeVariables` injected for the **dark** render page (mermaid `base` theme).
 *
 * Two entries here exist specifically to satisfy WCAG 2.2 AA text contrast for
 * elements Mermaid otherwise leaves to poorly-contrasting defaults:
 *
 * - `sequenceNumberColor` — the `autonumber` badge digit. Mermaid's `base` theme
 *   derives it as `invert(lineColor)` → `#333333`, which is invisible against the
 *   dark canvas (and the badge's circle marker does not paint in the raster/SVG
 *   pipeline, so the digit sits directly on the page background). We pin it to the
 *   theme's light body text so it reads on `#111111` (and on the `#404040`
 *   participant boxes it can overlap). It is emitted via a scoped CSS rule
 *   (`.sequenceNumber { fill }`), so it is immune to {@link postProcessDarkSvg}.
 * - `xyChart` — xychart-beta axis titles / labels / ticks. Mermaid defaults these
 *   to `primaryTextColor` (`#e5e5e5`) as inline `fill="…"` attributes on `<text>`.
 *   We pin them explicitly to light values; {@link postProcessDarkSvg} preserves
 *   `<text>`/`<tspan>` fills so they are never darkened into the canvas.
 */
export const defaultMermaidDarkTheme: MermaidThemeVariables = {
  background: '#111111',
  primaryColor: '#2d2d2d',
  primaryTextColor: '#e5e5e5',
  primaryBorderColor: '#555555',
  secondaryColor: '#333333',
  secondaryTextColor: '#cccccc',
  secondaryBorderColor: '#555555',
  tertiaryColor: '#252525',
  tertiaryTextColor: '#cccccc',
  tertiaryBorderColor: '#555555',
  lineColor: '#cccccc',
  textColor: '#e5e5e5',
  mainBkg: '#2d2d2d',
  nodeBkg: '#2d2d2d',
  nodeBorder: '#555555',
  clusterBkg: '#1e1e1e',
  clusterBorder: '#555555',
  titleColor: '#e5e5e5',
  edgeLabelBackground: '#1e1e1e',
  actorBorder: '#555555',
  actorBkg: '#2d2d2d',
  actorTextColor: '#e5e5e5',
  actorLineColor: '#888888',
  signalColor: '#cccccc',
  signalTextColor: '#e5e5e5',
  labelBoxBkgColor: '#2d2d2d',
  labelBoxBorderColor: '#555555',
  labelTextColor: '#e5e5e5',
  loopTextColor: '#e5e5e5',
  noteBorderColor: '#555555',
  noteBkgColor: '#333333',
  noteTextColor: '#e5e5e5',
  activationBorderColor: '#555555',
  activationBkgColor: '#333333',
  defaultLinkColor: '#cccccc',
  arrowheadColor: '#cccccc',
  // Sequence autonumber badge digit — light body text so it reads on the dark canvas.
  sequenceNumberColor: '#e5e5e5',
  // xychart-beta axis text — explicit light values (nested object mirrors Mermaid's
  // `xyChart` theme block; all keys are provided because Mermaid replaces the whole
  // object with the override rather than merging it).
  xyChart: {
    backgroundColor: '#111111',
    titleColor: '#e5e5e5',
    dataLabelColor: '#e5e5e5',
    xAxisTitleColor: '#e5e5e5',
    xAxisLabelColor: '#e5e5e5',
    xAxisTickColor: '#cccccc',
    xAxisLineColor: '#cccccc',
    yAxisTitleColor: '#e5e5e5',
    yAxisLabelColor: '#e5e5e5',
    yAxisTickColor: '#cccccc',
    yAxisLineColor: '#cccccc',
    plotColorPalette:
      '#FFF4DD,#FFD8B1,#FFA07A,#ECEFF1,#D6DBDF,#C3E0A8,#FFB6A4,#FFD74D,#738FA7,#FFFFF0',
  },
}

/**
 * Mermaid `themeVariables` injected for the **light** render page (mermaid `default`
 * theme). Kept intentionally minimal: it only overrides the values whose Mermaid
 * defaults fail WCAG 2.2 AA against a light canvas, so the rest of the stock
 * `default` palette is preserved.
 *
 * - `sequenceNumberColor` — Mermaid's `default` theme uses `white`, which is
 *   invisible on the light canvas (and on the light participant boxes, ~`#eaeaea`,
 *   the badge overlaps). We pin it to the theme's dark body text.
 *
 * xychart-beta light labels already pass (they inherit `#333`-family text on the
 * light canvas), so no `xyChart` override is needed here.
 */
export const defaultMermaidLightTheme: MermaidThemeVariables = {
  sequenceNumberColor: '#333333',
}

/**
 * Corrective CSS injected via Mermaid's `themeCSS` init field (scoped by Mermaid
 * under the graph id, on top of the theme's generated stylesheet).
 *
 * Fixes the `htmlLabels:false` edge-label bug: with HTML labels off (required so
 * diagrams render inside `<img>`), Mermaid's neo look draws each edge-label
 * backdrop as `<path class="background">` (and `<rect class="background">`) with
 * **no fill rule at all**, so it falls back to the SVG initial value of solid
 * black — a black bar that buries the dark label text on the light canvas. Both
 * theme stylesheets style the *rect*-based `.edgeLabel rect` background but never
 * the neo `path.background`, so the fill never lands. We pin the edge-label
 * backdrop to the theme's `edgeLabelBackground` (the canvas-matching "erase"
 * colour) so the label reads on a clean backdrop in both themes.
 *
 * Scoped to `.edgeLabel` so node/cluster label backdrops (which are zero-size or
 * intentionally tinted) are untouched.
 */
export function mermaidLabelBackdropCSS(
  variant: 'light' | 'dark',
  themeVariables?: MermaidThemeVariables,
): string {
  const raw = themeVariables?.edgeLabelBackground
  const elBg = typeof raw === 'string' ? raw : variant === 'dark' ? '#1e1e1e' : '#ffffff'
  // Use ONLY a pure-class descendant selector. `.edgeLabel .background` matches
  // both the neo `<path class="background">` and the older `<rect class="background">`
  // (descendant, tag-agnostic) AND stays correctly scoped: it applies only to a
  // `background` element that is a descendant of `.edgeLabel`, never to the
  // same-named zero-size backdrop rects inside *node* labels. (A `tag.class`
  // form like `.edgeLabel rect.background` would drop its `.edgeLabel` scope in
  // diagramkit's regex CSS resolver and leak the fill onto every `background`
  // element — turning node label text into a white-on-white false positive.)
  return `.edgeLabel .background{fill:${elBg};}`
}
