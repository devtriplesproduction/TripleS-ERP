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
 * Helper to reset rate limits (primarily for testing)
 */
export function resetRateLimit(identifier?: string) {
  if (identifier) {
    rateLimitStore.delete(identifier)
  } else {
    rateLimitStore.clear()
  }
}
