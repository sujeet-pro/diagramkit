/**
 * npm-check-updates config.
 *
 * Goals:
 * - Get the latest version of every package by default.
 * - Never bump React (or its DOM/types twins) to a new major.
 * - Leave the vitest/vite-plus stack alone — its versions are dictated by the
 *   `vitest` -> @voidzero-dev/vite-plus-test override in package.json. In
 *   particular, @vitest/coverage-v8 must match the EXACT version that
 *   vite-plus-test pins as a peer (currently 4.1.4); bumping it via ncu
 *   produces an ERESOLVE on `npm install`.
 * - Respect peerDependencies so an upgrade can't silently break a sibling
 *   package that pins an older range.
 *
 * Docs: https://github.com/raineorshine/npm-check-updates#configuration-files
 */

const PIN_MAJOR = new Set(['react', 'react-dom', '@types/react', '@types/react-dom'])

// Packages whose versions are coupled to the `vitest` override in
// package.json. Update these manually in lockstep with vite-plus-test.
const REJECT = [
  '@vitest/coverage-v8',
  '@vitest/ui',
  'vitest',
  'vite',
  'vite-plus',
  '@voidzero-dev/vite-plus-core',
  '@voidzero-dev/vite-plus-test',
]

module.exports = {
  // Honor peerDependencies declared by installed packages — ncu refuses
  // upgrades that would violate any peer range in the dependency graph.
  peer: true,

  reject: REJECT,

  // Per-package upgrade target. `minor` keeps the current major; `latest`
  // jumps to the newest published version (including majors).
  target: (dependencyName) => {
    if (PIN_MAJOR.has(dependencyName)) return 'minor'
    return 'latest'
  },
}
