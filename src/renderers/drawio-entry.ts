/**
 * Browser entry point for draw.io SVG rendering.
 * Bundled as IIFE and loaded into a Playwright page.
 *
 * Parses mxGraphModel XML and converts common shapes/edges to SVG.
 * Not pixel-perfect — handles the common cases for readable output.
 */

interface CellGeometry {
  x: number
  y: number
  width: number
  height: number
}

interface ParsedCell {
  id: string
  value: string
  vertex: boolean
  edge: boolean
  source: string
  target: string
  style: Record<string, string>
  geometry: CellGeometry | null
  parent: string
}

function parseStyle(raw: string): Record<string, string> {
  const result: Record<string, string> = {}
  if (!raw) return result
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=')
    if (eq > 0) {
      result[part.slice(0, eq).trim()] = part.slice(eq + 1).trim()
    } else if (part.trim()) {
      // Style keys without values act as flags (e.g. "rounded")
      result[part.trim()] = '1'
    }
  }
  return result
}

function parseCells(doc: Document): ParsedCell[] {
  const cells: ParsedCell[] = []
  const mxCells = doc.querySelectorAll('mxCell')

  for (const cell of mxCells) {
    const geo = cell.querySelector('mxGeometry')
    let geometry: CellGeometry | null = null

    if (geo) {
      geometry = {
        x: parseFloat(geo.getAttribute('x') || '0'),
        y: parseFloat(geo.getAttribute('y') || '0'),
        width: parseFloat(geo.getAttribute('width') || '0'),
        height: parseFloat(geo.getAttribute('height') || '0'),
      }
    }

    cells.push({
      id: cell.getAttribute('id') || '',
      value: cell.getAttribute('value') || '',
      vertex: cell.getAttribute('vertex') === '1',
      edge: cell.getAttribute('edge') === '1',
      source: cell.getAttribute('source') || '',
      target: cell.getAttribute('target') || '',
      style: parseStyle(cell.getAttribute('style') || ''),
      geometry,
      parent: cell.getAttribute('parent') || '',
    })
  }

  return cells
}

function computeBounds(cells: ParsedCell[]): {
  minX: number
  minY: number
  maxX: number
  maxY: number
} {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity

  for (const cell of cells) {
    if (!cell.geometry) continue
    const { x, y, width, height } = cell.geometry

    if (cell.vertex) {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x + width)
      maxY = Math.max(maxY, y + height)
    }
  }

  // Fallback when no vertices have geometry
  if (minX === Infinity) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600 }
  }

  return { minX, minY, maxX, maxY }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Strip basic HTML tags from draw.io cell values (they often contain <b>, <br>, etc.) */
function stripHtml(str: string): string {
  const div = document.createElement('div')
  div.innerHTML = str
  return div.textContent || div.innerText || ''
}

function adjustColorForDark(hex: string, isDark: boolean): string {
  if (!isDark || !hex) return hex

  // White backgrounds become dark
  const lower = hex.toLowerCase()
  if (lower === '#ffffff' || lower === '#fff') return '#2d2d2d'
  if (lower === '#000000' || lower === '#000') return '#e5e5e5'

  // Parse hex to determine luminance
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b

  // Light colors get darkened, dark colors get lightened
  if (lum > 0.6) {
    const factor = 0.3
    const dr = Math.round(r * factor * 255)
    const dg = Math.round(g * factor * 255)
    const db = Math.round(b * factor * 255)
    return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`
  }

  return hex
}

function getTextColor(style: Record<string, string>, darkMode: boolean): string {
  if (style.fontColor) return adjustColorForDark(style.fontColor, darkMode)
  return darkMode ? '#e5e5e5' : '#333333'
}

function getFillColor(style: Record<string, string>, darkMode: boolean): string {
  if (style.fillColor && style.fillColor !== 'none') {
    return adjustColorForDark(style.fillColor, darkMode)
  }
  return darkMode ? '#2d2d2d' : '#ffffff'
}

function getStrokeColor(style: Record<string, string>, darkMode: boolean): string {
  if (style.strokeColor && style.strokeColor !== 'none') {
    return adjustColorForDark(style.strokeColor, darkMode)
  }
  return darkMode ? '#888888' : '#333333'
}

function renderVertex(cell: ParsedCell, darkMode: boolean): string {
  if (!cell.geometry) return ''

  const { x, y, width, height } = cell.geometry
  const fill = getFillColor(cell.style, darkMode)
  const stroke = getStrokeColor(cell.style, darkMode)
  const textColor = getTextColor(cell.style, darkMode)
  const strokeWidth = parseFloat(cell.style.strokeWidth || '1')
  const shape = cell.style.shape || ''
  const label = stripHtml(cell.value)
  const fontSize = parseFloat(cell.style.fontSize || '12')

  let shapeSvg = ''

  if (shape === 'ellipse') {
    const cx = x + width / 2
    const cy = y + height / 2
    shapeSvg = `<ellipse cx="${cx}" cy="${cy}" rx="${width / 2}" ry="${height / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
  } else if (shape === 'rhombus') {
    const cx = x + width / 2
    const cy = y + height / 2
    const points = `${cx},${y} ${x + width},${cy} ${cx},${y + height} ${x},${cy}`
    shapeSvg = `<polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
  } else if (shape === 'cylinder') {
    const ry = Math.min(height * 0.1, 12)
    shapeSvg = [
      `<path d="M${x},${y + ry} `,
      `L${x},${y + height - ry} `,
      `Q${x},${y + height} ${x + width / 2},${y + height} `,
      `Q${x + width},${y + height} ${x + width},${y + height - ry} `,
      `L${x + width},${y + ry} `,
      `Q${x + width},${y} ${x + width / 2},${y} `,
      `Q${x},${y} ${x},${y + ry} Z" `,
      `fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`,
      `<path d="M${x},${y + ry} Q${x},${y + 2 * ry} ${x + width / 2},${y + 2 * ry} Q${x + width},${y + 2 * ry} ${x + width},${y + ry}" `,
      `fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>`,
    ].join('')
  } else {
    // Default rectangle
    const rx = cell.style.rounded === '1' ? 8 : 0
    shapeSvg = `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
  }

  // Add text label centered in the shape
  let labelSvg = ''
  if (label) {
    const cx = x + width / 2
    const cy = y + height / 2
    labelSvg = `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" fill="${textColor}">${escapeXml(label)}</text>`
  }

  return shapeSvg + labelSvg
}

function renderEdge(cell: ParsedCell, cellMap: Map<string, ParsedCell>, darkMode: boolean): string {
  const source = cellMap.get(cell.source)
  const target = cellMap.get(cell.target)

  if (!source?.geometry || !target?.geometry) return ''

  const sx = source.geometry.x + source.geometry.width / 2
  const sy = source.geometry.y + source.geometry.height / 2
  const tx = target.geometry.x + target.geometry.width / 2
  const ty = target.geometry.y + target.geometry.height / 2

  const stroke = getStrokeColor(cell.style, darkMode)
  const textColor = getTextColor(cell.style, darkMode)
  const strokeWidth = parseFloat(cell.style.strokeWidth || '1')
  const label = stripHtml(cell.value)
  const fontSize = parseFloat(cell.style.fontSize || '11')

  // Dashed line support
  const dashed = cell.style.dashed === '1' ? ' stroke-dasharray="6,3"' : ''

  // Arrow marker id unique per color
  const markerId = `arrow-${stroke.replace('#', '')}`

  let edgeSvg = `<line x1="${sx}" y1="${sy}" x2="${tx}" y2="${ty}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashed} marker-end="url(#${markerId})"/>`

  // Edge label at midpoint
  if (label) {
    const mx = (sx + tx) / 2
    const my = (sy + ty) / 2
    const bgColor = darkMode ? '#111111' : '#ffffff'
    edgeSvg += `<rect x="${mx - label.length * 3.5}" y="${my - fontSize * 0.7}" width="${label.length * 7}" height="${fontSize * 1.4}" fill="${bgColor}" rx="2"/>`
    edgeSvg += `<text x="${mx}" y="${my}" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" fill="${textColor}">${escapeXml(label)}</text>`
  }

  return edgeSvg
}

;(globalThis as any).__renderDrawio = (xml: string, darkMode: boolean): string => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'text/xml')

  const cells = parseCells(doc)
  const cellMap = new Map(cells.map((c) => [c.id, c]))

  const bounds = computeBounds(cells)
  const padding = 20
  const viewMinX = bounds.minX - padding
  const viewMinY = bounds.minY - padding
  const viewWidth = bounds.maxX - bounds.minX + padding * 2
  const viewHeight = bounds.maxY - bounds.minY + padding * 2

  const bgColor = darkMode ? '#111111' : '#ffffff'

  // Collect unique stroke colors for arrow markers
  const edgeCells = cells.filter((c) => c.edge)
  const strokeColors = new Set<string>()
  for (const cell of edgeCells) {
    strokeColors.add(getStrokeColor(cell.style, darkMode))
  }

  // Build arrow markers
  let defs = '<defs>'
  for (const color of strokeColors) {
    const id = `arrow-${color.replace('#', '')}`
    defs += `<marker id="${id}" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="${color}"/></marker>`
  }
  defs += '</defs>'

  // Render all elements: edges first (below), then vertices (above)
  let body = ''

  for (const cell of edgeCells) {
    body += renderEdge(cell, cellMap, darkMode)
  }

  for (const cell of cells) {
    if (cell.vertex) {
      body += renderVertex(cell, darkMode)
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewMinX} ${viewMinY} ${viewWidth} ${viewHeight}" width="${viewWidth}" height="${viewHeight}">`,
    `<rect x="${viewMinX}" y="${viewMinY}" width="${viewWidth}" height="${viewHeight}" fill="${bgColor}"/>`,
    defs,
    body,
    '</svg>',
  ].join('')
}

;(globalThis as any).__drawioReady = true
