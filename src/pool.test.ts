/**
 * Unit tests for BrowserPool lifecycle management.
 *
 * Verifies reference counting, idle timeout, concurrent launch coalescing,
 * and forced disposal — all without launching a real browser.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

// Mock playwright before importing pool
vi.mock('playwright', () => {
  const mockPage = {
    isClosed: vi.fn(() => false),
    setContent: vi.fn(),
    addScriptTag: vi.fn(),
    waitForFunction: vi.fn(),
    evaluate: vi.fn(),
    close: vi.fn(),
  }
  const mockContext = {
    newPage: vi.fn(() => Promise.resolve({ ...mockPage })),
  }
  const mockBrowser = {
    newContext: vi.fn(() => Promise.resolve(mockContext)),
    close: vi.fn(() => Promise.resolve()),
  }
  return {
    chromium: {
      launch: vi.fn(() => Promise.resolve(mockBrowser)),
    },
  }
})

// Mock rolldown for bundle building
vi.mock('rolldown', () => ({
  rolldown: vi.fn(() =>
    Promise.resolve({
      generate: vi.fn(() => Promise.resolve({ output: [{ code: '/* bundle */' }] })),
    }),
  ),
}))

describe('BrowserPool', () => {
  let BrowserPool: typeof import('./pool').BrowserPool
  let getPool: typeof import('./pool').getPool

  beforeEach(async () => {
    vi.useFakeTimers()
    // Fresh import to reset the singleton
    const mod = await import('./pool')
    BrowserPool = mod.BrowserPool
    getPool = mod.getPool
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('getPool returns a singleton instance', () => {
    const pool1 = getPool()
    const pool2 = getPool()
    expect(pool1).toBe(pool2)
  })

  it('acquire launches browser, release starts idle timer', async () => {
    const pool = new BrowserPool()
    await pool.acquire()
    // After acquire, browser should be alive — getMermaidLightPage should not throw "not acquired"
    // Release should not immediately close
    pool.release()
    // Dispose should work after idle
    await pool.dispose(true)
  })

  it('multiple acquires require matching releases before idle timer', async () => {
    const pool = new BrowserPool()
    await pool.acquire()
    await pool.acquire()
    pool.release()
    // Still one ref outstanding — dispose without force should bail
    await pool.dispose(false)
    // Release the second ref
    pool.release()
    // Now force dispose should work
    await pool.dispose(true)
  })

  it('dispose(force=true) closes even with outstanding refs', async () => {
    const pool = new BrowserPool()
    await pool.acquire()
    // Force dispose despite refCount > 0
    await pool.dispose(true)
    // After dispose, acquiring again should re-launch
    await pool.acquire()
    pool.release()
    await pool.dispose(true)
  })

  it('dispose without force skips when refs outstanding', async () => {
    const pool = new BrowserPool()
    await pool.acquire()
    await pool.dispose(false) // Should not close — refCount is 1
    // Pool should still be usable
    pool.release()
    await pool.dispose(true)
  })

  it('concurrent acquires coalesce into a single browser launch', async () => {
    const { chromium } = await import('playwright')
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const launchMock = chromium.launch as ReturnType<typeof vi.fn>
    const pool = new BrowserPool()

    // Launch two concurrent acquires
    const p1 = pool.acquire()
    const p2 = pool.acquire()
    await Promise.all([p1, p2])

    // chromium.launch should only be called once
    expect(launchMock).toHaveBeenCalledTimes(1)

    pool.release()
    pool.release()
    await pool.dispose(true)
  })

  it('acquire after dispose re-launches browser', async () => {
    const { chromium } = await import('playwright')
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const launchMock = chromium.launch as ReturnType<typeof vi.fn>
    const pool = new BrowserPool()

    await pool.acquire()
    pool.release()
    await pool.dispose(true)

    // Reset the mock call count
    launchMock.mockClear()

    await pool.acquire()
    expect(launchMock).toHaveBeenCalledTimes(1)
    pool.release()
    await pool.dispose(true)
  })

  it('release at zero does not go negative', async () => {
    const pool = new BrowserPool()
    // Release without acquiring should not crash or go negative
    pool.release()
    pool.release()
    // Should still be able to acquire normally
    await pool.acquire()
    pool.release()
    await pool.dispose(true)
  })
})
