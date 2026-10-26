/**
 * Server-Side IP Geolocation Service
 *
 * Resolves approximate city, region, and country for client IP addresses using:
 * 1. Fast-path: Trusted edge platform headers (e.g. Vercel, Cloudflare) with zero network latency.
 * 2. Reliable external IP Geolocation API (ipinfo.io with IPINFO_TOKEN or fallback to ip-api.com).
 *
 * Security & Integrity Guarantees:
 * - Runs strictly on the server side. Secrets (e.g. IPINFO_TOKEN) are never exposed to the client bundle.
 * - In-memory LRU cache prevents rate-limiting and redundant network requests.
 * - Strict 2-second timeout via AbortSignal ensures authentication and server actions never hang.
 * - Honestly returns "Unknown" upon failure or unverified location; never guesses or fabricates locations.
 * - Detects VPN / Proxy / Datacenter hosting indicators.
 */

import { classifyIp, normalizeIp } from './device-parser'

export interface IpGeolocationResult {
  location: string
  isProxy: boolean
  isHosting: boolean
  city?: string | null
  region?: string | null
  country?: string | null
  countryCode?: string | null
}

interface CacheEntry {
  result: IpGeolocationResult
  expiresAt: number
}

// In-memory LRU-like cache (max 500 entries, 1-hour TTL)
const geoCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const MAX_CACHE_SIZE = 500

function getFromCache(ip: string): IpGeolocationResult | null {
  const entry = geoCache.get(ip)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    geoCache.delete(ip)
    return null
  }
  return entry.result
}

function setToCache(ip: string, result: IpGeolocationResult): void {
  if (geoCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = geoCache.keys().next().value
    if (oldestKey) geoCache.delete(oldestKey)
  }
  geoCache.set(ip, {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}

/**
 * Extracts approximate location from trusted server proxy headers (Vercel, Cloudflare).
 */
export function extractEdgeHeaderLocation(
  headers: Headers | Record<string, string | string[] | undefined>
): IpGeolocationResult | null {
  const getHeader = (name: string): string | null => {
    if (typeof (headers as Headers).get === 'function') {
      return (headers as Headers).get(name)
    }
    const val = (headers as Record<string, any>)[name] || (headers as Record<string, any>)[name.toLowerCase()]
    if (Array.isArray(val)) return val[0] || null
    return val || null
  }

  // 1. Vercel edge headers
  const vercelCity = getHeader('x-vercel-ip-city')
  const vercelRegion = getHeader('x-vercel-ip-country-region')
  const vercelCountry = getHeader('x-vercel-ip-country')

  if (vercelCity || vercelCountry) {
    let city: string | null = null
    if (vercelCity) {
      try {
        city = decodeURIComponent(vercelCity)
      } catch {
        city = vercelCity
      }
    }
    const region = vercelRegion ? vercelRegion.trim() : null
    const country = vercelCountry ? vercelCountry.trim() : null

    const parts = [city, region, country].filter(Boolean)
    if (parts.length > 0) {
      return {
        location: `${parts.join(', ')} (Approximate)`,
        isProxy: false,
        isHosting: false,
        city,
        region,
        country,
        countryCode: country,
      }
    }
  }

  // 2. Cloudflare edge headers
  const cfCity = getHeader('cf-ipcity')
  const cfRegion = getHeader('cf-region-code') || getHeader('cf-region')
  const cfCountry = getHeader('cf-ipcountry')

  if (cfCity || cfCountry) {
    const parts = [cfCity, cfRegion, cfCountry].filter(Boolean)
    if (parts.length > 0) {
      return {
        location: `${parts.join(', ')} (Approximate)`,
        isProxy: false,
        isHosting: false,
        city: cfCity || null,
        region: cfRegion || null,
        country: cfCountry || null,
        countryCode: cfCountry || null,
      }
    }
  }

  return null
}

/**
 * Resolves client IP geolocation using:
 * 1. Edge proxy headers (zero latency fast-path)
 * 2. In-memory cache
 * 3. Configurable IP Geolocation provider (ipinfo.io or ip-api.com) with timeout
 *
 * Never throws. On failure or unverified location, honestly returns "Unknown".
 */
export async function resolveIpGeolocation(
  rawIp: string | null | undefined,
  headers?: Headers | Record<string, string | string[] | undefined>
): Promise<IpGeolocationResult> {
  const ip = normalizeIp(rawIp)

  if (!ip) {
    return {
      location: 'Unknown',
      isProxy: false,
      isHosting: false,
    }
  }

  const classification = classifyIp(ip)

  if (classification === 'Localhost') {
    return {
      location: 'Localhost (Development Environment)',
      isProxy: false,
      isHosting: false,
    }
  }

  if (classification === 'Private Network') {
    return {
      location: 'Private / Corporate Network',
      isProxy: false,
      isHosting: false,
    }
  }

  if (classification === 'Unavailable') {
    return {
      location: 'Unknown',
      isProxy: false,
      isHosting: false,
    }
  }

  // Fast-path: Check trusted edge headers if provided
  if (headers) {
    const edgeResult = extractEdgeHeaderLocation(headers)
    if (edgeResult) {
      return edgeResult
    }
  }

  // Cache check
  const cached = getFromCache(ip)
  if (cached) {
    return cached
  }

  // External Geolocation Provider Lookup
  try {
    const token = process.env.IPINFO_TOKEN || process.env.IP_GEOLOCATION_API_KEY

    if (token) {
      // 1. IPInfo.io Provider (if token provided)
      const res = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/json?token=${encodeURIComponent(token)}`, {
        signal: AbortSignal.timeout(2000),
        headers: { Accept: 'application/json' },
      })

      if (res.ok) {
        const data = await res.json()
        const city = data.city || null
        const region = data.region || null
        const country = data.country || null
        const isProxy = Boolean(data.privacy?.proxy || data.privacy?.vpn || data.privacy?.tor)
        const isHosting = Boolean(data.privacy?.hosting)

        const parts = [city, region, country].filter(Boolean)
        const locationStr = parts.length > 0 ? `${parts.join(', ')} (Approximate)` : 'Unknown'

        const result: IpGeolocationResult = {
          location: locationStr,
          isProxy,
          isHosting,
          city,
          region,
          country,
          countryCode: data.country || null,
        }

        setToCache(ip, result)
        return result
      }
    }

    // 2. Fallback: ip-api.com (public, reliable, no secret needed)
    // Query fields: status,message,country,countryCode,region,regionName,city,proxy,hosting,query
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,countryCode,region,regionName,city,proxy,hosting,query`,
      {
        signal: AbortSignal.timeout(2000),
        headers: { Accept: 'application/json' },
      }
    )

    if (res.ok) {
      const data = await res.json()
      if (data.status === 'success') {
        const city = data.city || null
        const region = data.regionName || data.region || null
        const country = data.country || data.countryCode || null
        const isProxy = Boolean(data.proxy)
        const isHosting = Boolean(data.hosting)

        const parts = [city, region, country].filter(Boolean)
        const locationStr = parts.length > 0 ? `${parts.join(', ')} (Approximate)` : 'Unknown'

        const result: IpGeolocationResult = {
          location: locationStr,
          isProxy,
          isHosting,
          city,
          region,
          country,
          countryCode: data.countryCode || null,
        }

        setToCache(ip, result)
        return result
      }
    }
  } catch (err) {
    // Network failure, timeout, or lookup unavailable
    // Do not throw; gracefully fall back to honest "Unknown"
  }

  const fallbackResult: IpGeolocationResult = {
    location: 'Unknown',
    isProxy: false,
    isHosting: false,
  }

  setToCache(ip, fallbackResult)
  return fallbackResult
}
