#!/usr/bin/env -S node --strip-types --no-warnings

import { spawn, type ChildProcess } from 'node:child_process'

const mode = process.argv[2]
const passthrough = process.argv.slice(3)

const VALID_MODES = ['dev', 'preview', 'build'] as const
type Mode = (typeof VALID_MODES)[number]

function isValidMode(value: string | undefined): value is Mode {
  return typeof value === 'string' && (VALID_MODES as readonly string[]).includes(value)
}

if (!isValidMode(mode)) {
  console.error('Usage: node scripts/run-pagesmith.ts <dev|preview|build> [args...]')
  process.exit(1)
}

const maxRetries = mode === 'build' ? 0 : 1
let attempts = 0
let child: ChildProcess | null = null
let stopping = false

function run(): void {
  attempts += 1
  child = spawn('npx', ['--no-install', 'pagesmith-docs', mode, ...passthrough], {
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

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.once(sig, () => {
    stopping = true
    if (child?.pid) child.kill(sig)
    process.exit(0)
  })
}

run()
