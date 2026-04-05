import { spawn } from 'node:child_process'

const mode = process.argv[2]
const passthrough = process.argv.slice(3)

if (!mode || !['dev', 'preview', 'build'].includes(mode)) {
  console.error('Usage: node scripts/run-pagesmith.mjs <dev|preview|build> [args...]')
  process.exit(1)
}

const maxRetries = mode === 'build' ? 0 : 1
let attempts = 0
let child = null
let stopping = false

function run() {
  attempts += 1
  child = spawn('npx', ['--no-install', 'pagesmith', mode, ...passthrough], {
    stdio: 'inherit',
    env: process.env,
  })

  child.on('exit', (code, signal) => {
    if (stopping) return
    if (signal) {
      process.kill(process.pid, signal)
      return
    }
    if (code === 0) {
      process.exit(0)
      return
    }
    if (attempts <= maxRetries) {
      console.warn(`pagesmith ${mode} exited with code ${code}. Retrying once...`)
      setTimeout(run, 1000)
      return
    }
    process.exit(code ?? 1)
  })
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.once(sig, () => {
    stopping = true
    if (child?.pid) child.kill(sig)
    process.exit(0)
  })
}

run()
