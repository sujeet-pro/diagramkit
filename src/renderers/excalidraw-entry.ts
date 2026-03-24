/**
 * Browser entry point for excalidraw SVG export.
 * Bundled as IIFE and loaded into a Playwright page.
 */

import { exportToSvg } from '@excalidraw/excalidraw'
;(globalThis as any).__renderExcalidraw = async (
  json: string,
  darkMode: boolean,
): Promise<string> => {
  let data: any
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('Invalid Excalidraw JSON: file does not contain valid JSON')
  }
  const svg = await exportToSvg({
    elements: data.elements || [],
    appState: {
      ...data.appState,
      exportWithDarkMode: darkMode,
      viewBackgroundColor: darkMode ? '#111111' : '#ffffff',
      theme: darkMode ? 'dark' : 'light',
    },
    files: data.files || {},
  })
  return new XMLSerializer().serializeToString(svg)
}
;(globalThis as any).__excalidrawReady = true
