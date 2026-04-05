import { describe, expect, it, vi } from 'vite-plus/test'
import { createLeveledLogger, normalizeLogLevel, shouldLog } from './logging'

describe('logging', () => {
  it('normalizes log level aliases', () => {
    expect(normalizeLogLevel('errors')).toBe('error')
    expect(normalizeLogLevel('warnings')).toBe('warn')
    expect(normalizeLogLevel('log')).toBe('info')
    expect(normalizeLogLevel('verbose')).toBe('verbose')
    expect(normalizeLogLevel(undefined)).toBe('info')
  })

  it('applies threshold behavior correctly', () => {
    expect(shouldLog('silent', 'error')).toBe(false)
    expect(shouldLog('error', 'error')).toBe(true)
    expect(shouldLog('error', 'warn')).toBe(false)
    expect(shouldLog('warn', 'warn')).toBe(true)
    expect(shouldLog('info', 'info')).toBe(true)
    expect(shouldLog('info', 'verbose')).toBe(false)
    expect(shouldLog('verbose', 'verbose')).toBe(true)
  })

  it('routes output through the provided logger', () => {
    const log = vi.fn()
    const warn = vi.fn()
    const error = vi.fn()
    const logger = createLeveledLogger('warn', { log, warn, error })

    logger.verbose('v')
    logger.info('i')
    logger.warn('w')
    logger.error('e')

    expect(log).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith('w')
    expect(error).toHaveBeenCalledWith('e')
  })
})
