/**
 * Minimal DOM declarations for code that runs inside Playwright page.evaluate().
 * These functions execute in the browser context, not Node.js.
 * We declare just enough to satisfy TypeScript without pulling in the full DOM lib.
 */
declare const document: {
  getElementById(id: string): any
  createElement(tag: string): any
  body: any
}
