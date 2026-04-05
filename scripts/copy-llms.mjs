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

// Diagramkit project-level llms files.
for (const file of ['llms.txt', 'llms-full.txt', 'llms-quick.txt']) {
  const src = join(root, file)
  copyIfExists(src, join(outRoot, file))
  copyIfExists(src, join(outRoot, 'packages/diagramkit', file))
}

// Pagesmith package-level llms files from installed packages.
const packageFiles = [
  {
    src: join(root, 'node_modules/@pagesmith/core/docs/llms.txt'),
    dest: join(outRoot, 'packages/pagesmith/core/llms.txt'),
  },
  {
    src: join(root, 'node_modules/@pagesmith/core/docs/llms-full.txt'),
    dest: join(outRoot, 'packages/pagesmith/core/llms-full.txt'),
  },
  {
    src: join(root, 'node_modules/@pagesmith/docs/docs/llms.txt'),
    dest: join(outRoot, 'packages/pagesmith/docs/llms.txt'),
  },
  {
    src: join(root, 'node_modules/@pagesmith/docs/docs/llms-full.txt'),
    dest: join(outRoot, 'packages/pagesmith/docs/llms-full.txt'),
  },
]

for (const file of packageFiles) {
  copyIfExists(file.src, file.dest)
}
