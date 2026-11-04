/**
 * Server-Side IP Geolocation Service
 *
 * Resolves approximate city, region, country, latitude, longitude, timezone, and ISP for client IP addresses using:
 * 1. Fast-path: Trusted edge platform headers (e.g. Vercel, Cloudflare) with zero network latency.
 * 2. Reliable external IP Geolocation API (ipinfo.io with IPINFO_TOKEN or fallback to ip-api.com).
 *
 * Security & Integrity Guarantees:
 * - Runs strictly on the server side. Secrets (e.g. IPINFO_TOKEN) are never exposed to the client bundle.
 * - In-memory LRU cache prevents rate-limiting and redundant network requests.
 * - Strict 2-second timeout via AbortSignal ensures authentication and server actions never hang.
 * - Honestly returns "Lookup failed" or "Not captured" upon failure or unverified location; never guesses or fabricates locations.
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
  latitude?: number | null
  longitude?: number | null
  timezone?: string | null
  isp?: string | null
  status: 'success' | 'unavailable' | 'failed' | 'private'
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
  const vercelLat = getHeader('x-vercel-ip-latitude')
  const vercelLon = getHeader('x-vercel-ip-longitude')
  const vercelTz = getHeader('x-vercel-ip-timezone')

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
        latitude: vercelLat ? parseFloat(vercelLat) : null,
        longitude: vercelLon ? parseFloat(vercelLon) : null,
        timezone: vercelTz ? decodeURIComponent(vercelTz) : null,
        isp: null,
        status: 'success'
      }
    }
  }

  // 2. Cloudflare edge headers
  const cfCity = getHeader('cf-ipcity')
  const cfRegion = getHeader('cf-region-code') || getHeader('cf-region')
  const cfCountry = getHeader('cf-ipcountry')
  const cfLat = getHeader('cf-iplatitude')
  const cfLon = getHeader('cf-iplongitude')
  const cfTz = getHeader('cf-timezone')

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
        latitude: cfLat ? parseFloat(cfLat) : null,
        longitude: cfLon ? parseFloat(cfLon) : null,
        timezone: cfTz || null,
        isp: null,
        status: 'success'
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
 * Never throws. On failure or unverified location, honestly returns "Lookup failed" or "Unavailable".
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
      status: 'unavailable'
    }
  }

  const classification = classifyIp(ip)

  if (classification === 'Localhost') {
    return {
      location: 'Localhost (Development Environment)',
      isProxy: false,
      isHosting: false,
      city: null,
      region: null,
      country: null,
      countryCode: null,
      latitude: null,
      longitude: null,
      timezone: 'Asia/Kolkata',
      isp: null,
      status: 'private'
    }
  }

  if (classification === 'Private Network') {
    return {
      location: 'Private / Corporate Network',
      isProxy: false,
      isHosting: false,
      city: null,
      region: null,
      country: null,
      countryCode: null,
      latitude: null,
      longitude: null,
      timezone: null,
      isp: null,
      status: 'private'
    }
  }

  if (classification === 'Unavailable') {
    return {
      location: 'Unavailable',
      isProxy: false,
      isHosting: false,
      city: null,
      region: null,
      country: null,
      countryCode: null,
      latitude: null,
      longitude: null,
      timezone: null,
      isp: null,
      status: 'unavailable'
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
        const isp = data.org || data.company?.name || null
        let latitude: number | null = null
        let longitude: number | null = null
        if (data.loc && typeof data.loc === 'string') {
          const [lat, lon] = data.loc.split(',')
          latitude = parseFloat(lat) || null
          longitude = parseFloat(lon) || null
        }

        const parts = [city, region, country].filter(Boolean)
        const locationStr = parts.length > 0 ? `${parts.join(', ')} (Approximate)` : 'Lookup failed'

        const result: IpGeolocationResult = {
          location: locationStr,
          isProxy,
          isHosting,
          city,
          region,
          country,
          countryCode: data.country || null,
          latitude,
          longitude,
          timezone: data.timezone || null,
          isp,
          status: parts.length > 0 ? 'success' : 'failed'
        }

        setToCache(ip, result)
        return result
      }
    }

    // 2. Fallback: ip-api.com (public, reliable, no secret needed)
    // Query fields: status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,proxy,hosting,query
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,proxy,hosting,query`,
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
        const isp = data.isp || data.org || null

        const parts = [city, region, country].filter(Boolean)
        const locationStr = parts.length > 0 ? `${parts.join(', ')} (Approximate)` : 'Lookup failed'

        const result: IpGeolocationResult = {
          location: locationStr,
          isProxy,
          isHosting,
          city,
          region,
          country,
          countryCode: data.countryCode || null,
          latitude: typeof data.lat === 'number' ? data.lat : null,
          longitude: typeof data.lon === 'number' ? data.lon : null,
          timezone: data.timezone || null,
          isp,
          status: 'success'
        }

        setToCache(ip, result)
        return result
      }
    }
  } catch (err) {
    // Network failure, timeout, or lookup unavailable
    // Do not throw; gracefully fall back to honest "Lookup failed"
  }

  const fallbackResult: IpGeolocationResult = {
    location: 'Lookup failed',
    isProxy: false,
    isHosting: false,
    status: 'failed'
  }

  setToCache(ip, fallbackResult)
  return fallbackResult
}
