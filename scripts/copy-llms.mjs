import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const root = process.cwd()
const outRoot = resolve(root, 'gh-pages')

function copyIfExists(src, dest) {
  if (!existsSync(src)) {
    return
  }
  mkdirSync(dirname(dest), { recursive: true })
  copyFileSync(src, dest)
  console.log(`Copied ${src} -> ${dest}`)
}

// Pagesmith package-level llms files from installed packages.
// Root-level and /packages/diagramkit/ copies are handled by pagesmith assets config.
const packageFiles = [
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
