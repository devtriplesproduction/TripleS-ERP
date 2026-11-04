import { describe, it, expect, beforeEach } from 'vitest'
import { checkRateLimit, resetRateLimit } from '../lib/utils/rate-limiter'

describe('Rate Limiter Utility', () => {
  beforeEach(() => {
    resetRateLimit()
  })

  it('allows actions within the threshold', () => {
    const key = 'test-key-1'
    for (let i = 0; i < 5; i++) {
      const res = checkRateLimit(key, 5, 1000)
      expect(res.success).toBe(true)
    }
  })

  it('blocks actions exceeding the threshold', () => {
    const key = 'test-key-2'
    for (let i = 0; i < 3; i++) {
      checkRateLimit(key, 3, 5000)
    }
    const blocked = checkRateLimit(key, 3, 5000)
    expect(blocked.success).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('isolates different keys', () => {
    checkRateLimit('user-a', 1, 1000)
    const blockedUserA = checkRateLimit('user-a', 1, 1000)
    const allowedUserB = checkRateLimit('user-b', 1, 1000)

    expect(blockedUserA.success).toBe(false)
    expect(allowedUserB.success).toBe(true)
  })

  it('handles checkRateLimitDistributed with resilient local fallback', async () => {
    const { checkRateLimitDistributed } = await import('../lib/utils/rate-limiter')
    const key = 'dist-test-key'
    for (let i = 0; i < 3; i++) {
      const res = await checkRateLimitDistributed(key, 3, 2000)
      expect(res.success).toBe(true)
    }
    const blocked = await checkRateLimitDistributed(key, 3, 2000)
    expect(blocked.success).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })
})

describe('Performance Telemetry Monitor Utility', () => {
  it('measures async operations and tracks percentiles', async () => {
    const { measureAsync, getOperationStats, getSlowestOperations } = await import('../lib/utils/perf-monitor')

    const result = await measureAsync('test_action', async () => {
      return 42
    })
    expect(result).toBe(42)

    const stats = getOperationStats('test_action')
    expect(stats).not.toBeNull()
    expect(stats?.count).toBeGreaterThanOrEqual(1)
    expect(stats?.p50Ms).toBeGreaterThanOrEqual(0)

    const slowest = getSlowestOperations(5)
    expect(Array.isArray(slowest)).toBe(true)
  })
})
