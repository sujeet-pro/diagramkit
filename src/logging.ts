import type { LogLevel, Logger } from './types'

export type NormalizedLogLevel = 'silent' | 'error' | 'warn' | 'info' | 'verbose'

export function normalizeLogLevel(level?: LogLevel): NormalizedLogLevel {
  switch (level) {
    case 'silent':
      return 'silent'
    case 'error':
    case 'errors':
      return 'error'
    case 'warn':
    case 'warning':
    case 'warnings':
      return 'warn'
    case 'verbose':
      return 'verbose'
    case 'info':
    case 'log':
    default:
      return 'info'
  }
}

export function shouldLog(
  level: NormalizedLogLevel,
  at: 'error' | 'warn' | 'info' | 'verbose',
): boolean {
  const rank: Record<NormalizedLogLevel, number> = {
    silent: 0,
    error: 1,
    warn: 2,
    info: 3,
    verbose: 4,
  }
  const targetRank: Record<typeof at, number> = {
    error: 1,
    warn: 2,
    info: 3,
    verbose: 4,
  }
  return rank[level] >= targetRank[at]
}

export function createLeveledLogger(
  level: LogLevel | undefined,
  logger?: Logger,
): {
  level: NormalizedLogLevel
  error: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  info: (message: string, ...args: unknown[]) => void
  verbose: (message: string, ...args: unknown[]) => void
} {
  const normalized = normalizeLogLevel(level)
  const base = {
    log: logger?.log ?? console.log,
    warn: logger?.warn ?? console.warn,
    error: logger?.error ?? console.error,
  }
  return {
    level: normalized,
    error: (message, ...args) => {
      if (shouldLog(normalized, 'error')) base.error(message, ...args)
    },
    warn: (message, ...args) => {
      if (shouldLog(normalized, 'warn')) base.warn(message, ...args)
    },
    info: (message, ...args) => {
      if (shouldLog(normalized, 'info')) base.log(message, ...args)
    },
    verbose: (message, ...args) => {
      if (shouldLog(normalized, 'verbose')) base.log(message, ...args)
    },
  }
}
