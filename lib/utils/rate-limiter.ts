/**
 * Sliding window in-memory rate limiter for administrative and security actions.
 * Automatically evicts stale entries to prevent memory growth.
 */

interface RateLimitRecord {
  timestamps: number[]
}

const rateLimitStore = new Map<string, RateLimitRecord>()

// Periodically clean up entries older than 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanupOldEntries(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now

  const cutoff = now - windowMs
  for (const [key, record] of rateLimitStore.entries()) {
    record.timestamps = record.timestamps.filter((t) => t > cutoff)
    if (record.timestamps.length === 0) {
      rateLimitStore.delete(key)
    }
  }
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  retryAfterSeconds?: number
}

/**
 * Checks if a given identifier exceeds the rate limit.
 * @param identifier Unique key (e.g., actor ID or IP + action)
 * @param limit Maximum allowed actions in the given window
 * @param windowMs Time window in milliseconds (default 60,000ms = 1 min)
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 5,
  windowMs: number = 60 * 1000
): RateLimitResult {
  const now = Date.now()
  cleanupOldEntries(windowMs)

  const cutoff = now - windowMs
  let record = rateLimitStore.get(identifier)

  if (!record) {
    record = { timestamps: [] }
    rateLimitStore.set(identifier, record)
  }

  // Filter timestamps within current window
  record.timestamps = record.timestamps.filter((t) => t > cutoff)

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0]
    const resetTimeMs = oldestTimestamp + windowMs
    const retryAfterSeconds = Math.max(1, Math.ceil((resetTimeMs - now) / 1000))

    return {
      success: false,
      remaining: 0,
      retryAfterSeconds,
    }
  }

  // Record this attempt
  record.timestamps.push(now)

  return {
    success: true,
    remaining: limit - record.timestamps.length,
  }
}

/**
 * Checks rate limit with Upstash Redis distributed backend when configured,
 * falling back safely to atomic in-memory sliding window for local dev and resilience.
 */
export async function checkRateLimitDistributed(
  identifier: string,
  limit: number = 5,
  windowMs: number = 60 * 1000
): Promise<RateLimitResult> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()

  // If Upstash Redis is not configured in environment, use local in-memory fallback
  if (!upstashUrl || !upstashToken || upstashUrl.includes('placeholder')) {
    return checkRateLimit(identifier, limit, windowMs)
  }

  const now = Date.now()
  const cutoff = now - windowMs
  const key = `ratelimit:${identifier}`
  const expireSec = Math.ceil(windowMs / 1000) + 1

  try {
    // Atomic sliding window pipeline:
    // 1. ZREMRANGEBYSCORE key 0 cutoff
    // 2. ZCARD key
    // 3. ZRANGE key 0 0 WITHSCORES
    const pipelinePayload = [
      ['ZREMRANGEBYSCORE', key, '0', String(cutoff)],
      ['ZCARD', key],
      ['ZRANGE', key, '0', '0', 'WITHSCORES'],
    ]

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 1500) // 1.5s timeout

    const res = await fetch(`${upstashUrl}/pipeline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${upstashToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pipelinePayload),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      throw new Error(`Upstash returned HTTP ${res.status}`)
    }

    const data = await res.json()
    const currentCount = Number(data[1]?.result) || 0

    if (currentCount >= limit) {
      const oldestEntry = data[2]?.result
      let oldestTimestamp = cutoff
      if (Array.isArray(oldestEntry) && oldestEntry.length >= 2) {
        oldestTimestamp = Number(oldestEntry[1]) || cutoff
      }
      const resetTimeMs = oldestTimestamp + windowMs
      const retryAfterSeconds = Math.max(1, Math.ceil((resetTimeMs - now) / 1000))

      return {
        success: false,
        remaining: 0,
        retryAfterSeconds,
      }
    }

    // Add current attempt and set expiration asynchronously
    await fetch(`${upstashUrl}/pipeline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${upstashToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['ZADD', key, String(now), `${now}_${Math.random().toString(36).substring(2, 6)}`],
        ['EXPIRE', key, String(expireSec)],
      ]),
    }).catch(() => {})

    return {
      success: true,
      remaining: Math.max(0, limit - (currentCount + 1)),
    }
  } catch (err: any) {
    // On Redis error or timeout, log safe warning (no tokens/secrets) and fall back to in-memory
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[RateLimiter] Upstash Redis unavailable, using in-memory fallback: ${err?.message}`)
    }
    return checkRateLimit(identifier, limit, windowMs)
  }
}

/**
 * Helper to reset rate limits (primarily for testing)
 */
export function resetRateLimit(identifier?: string) {
  if (identifier) {
    rateLimitStore.delete(identifier)
  } else {
    rateLimitStore.clear()
  }
}
