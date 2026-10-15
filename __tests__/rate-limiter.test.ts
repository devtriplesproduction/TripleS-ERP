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
})
