#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const root = process.cwd()
const outRoot = resolve(root, 'gh-pages')

function copyIfExists(src: string, dest: string): void {
  if (!existsSync(src)) {
    console.warn(`Skipping: source missing ${src}`)
    return
  }
  mkdirSync(dirname(dest), { recursive: true })
  copyFileSync(src, dest)
  console.log(`Copied ${src} -> ${dest}`)
}

/* ── diagramkit llms files ── */

// Source of truth: repo root. Copy to both the docs site root and the
// per-package folder (/packages/diagramkit/) so agents can fetch them
// from either location during browsing.
const diagramkitLlms = ['llms.txt', 'llms-full.txt'] as const

for (const name of diagramkitLlms) {
  const src = resolve(root, name)
  copyIfExists(src, join(outRoot, name))
  copyIfExists(src, join(outRoot, 'packages/diagramkit', name))
}

/* ── Pagesmith package llms files ── */

// Copy the installed pagesmith packages' own llms files so consumers of the
// docs site can reference them without hitting npm.
const packageFiles: Array<{ src: string; dest: string }> = [
  {
    src: join(root, 'node_modules/@pagesmith/core/ai-guidelines/llms.txt'),
    dest: join(outRoot, 'packages/pagesmith/core/llms.txt'),
  },
  {
    src: join(root, 'node_modules/@pagesmith/core/ai-guidelines/llms-full.txt'),
    dest: join(outRoot, 'packages/pagesmith/core/llms-full.txt'),
  },
  {
    src: join(root, 'node_modules/@pagesmith/docs/ai-guidelines/llms.txt'),
    dest: join(outRoot, 'packages/pagesmith/docs/llms.txt'),
  },
  {
    src: join(root, 'node_modules/@pagesmith/docs/ai-guidelines/llms-full.txt'),
    dest: join(outRoot, 'packages/pagesmith/docs/llms-full.txt'),
  },
]

for (const file of packageFiles) {
  copyIfExists(file.src, file.dest)
}
