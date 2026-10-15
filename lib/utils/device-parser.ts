/**
 * Device and Request Metadata Parser
 * Safely extracts client IP, approximate location, browser, OS, and device type.
 * Never throws and handles malformed or missing headers gracefully.
 */

export type IpClassification = 'Localhost' | 'Private Network' | 'Public IP' | 'Unavailable'

export interface ClientIpDetails {
  ip: string | null
  sourceHeader: string
  classification: IpClassification
  location: string
}

export interface ParsedClientInfo {
  ip: string | null
  classification: IpClassification
  location: string
  browser: string
  os: string
  device: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown'
  userAgent: string
}

/**
 * Normalizes IPv4 and IPv6 addresses safely.
 * Strips ports, brackets, and IPv4-mapped IPv6 prefixes (::ffff:).
 * Returns null if the address is empty, malformed, or unavailable.
 */
export function normalizeIp(rawIp: string | null | undefined): string | null {
  if (!rawIp) return null
  let ip = rawIp.trim()

  if (ip === '' || ip.toLowerCase() === 'unavailable' || ip.toLowerCase() === 'unknown' || ip === 'null') {
    return null
  }

  // 1. Strip IPv6 bracket notation, e.g. [::1] or [::1]:8080
  if (ip.startsWith('[')) {
    const closingIdx = ip.indexOf(']')
    if (closingIdx !== -1) {
      ip = ip.substring(1, closingIdx)
    }
  } else if (ip.includes('.') && ip.includes(':')) {
    // 2. Strip port from IPv4 with port, e.g. 192.168.1.1:3000
    // Check that it's not an IPv6 address (which has multiple colons)
    const colonCount = (ip.match(/:/g) || []).length
    if (colonCount === 1) {
      const parts = ip.split(':')
      if (parts[0] && isValidIpv4(parts[0])) {
        ip = parts[0]
      }
    }
  }

  // 3. Strip IPv4-mapped IPv6 prefix, e.g. ::ffff:192.168.1.1 or ::ffff:127.0.0.1
  if (ip.toLowerCase().startsWith('::ffff:')) {
    const candidate = ip.substring(7)
    if (isValidIpv4(candidate)) {
      ip = candidate
    }
  }

  // 4. Normalize expanded loopback IPv6
  if (ip === '0:0:0:0:0:0:0:1') {
    ip = '::1'
  }

  // Validate that result is a valid IP or localhost
  if (isValidIpv4(ip) || isValidIpv6(ip) || ip === 'localhost') {
    return ip
  }

  return null
}

/**
 * Strict IPv4 syntax check (0.0.0.0 - 255.255.255.255, no leading zeros)
 */
export function isValidIpv4(ip: string): boolean {
  if (!ip) return false
  const parts = ip.split('.')
  if (parts.length !== 4) return false
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return false
    const n = parseInt(part, 10)
    if (n < 0 || n > 255) return false
    if (part.length > 1 && part.startsWith('0')) return false
  }
  return true
}

/**
 * Validates IPv6 syntax (including :: compressed formats and loopback)
 */
export function isValidIpv6(ip: string): boolean {
  if (!ip) return false
  if (ip === '::' || ip === '::1') return true
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/
  return ipv6Regex.test(ip)
}

/**
 * Classifies an IP address into Localhost, Private Network, Public IP, or Unavailable.
 */
export function classifyIp(rawIp: string | null | undefined): IpClassification {
  if (!rawIp) return 'Unavailable'
  const ip = normalizeIp(rawIp)
  if (!ip) return 'Unavailable'

  // 1. Localhost identification (IPv4 loopback 127.0.0.0/8, IPv6 ::1, localhost string)
  if (
    ip === '::1' ||
    ip === 'localhost' ||
    ip === '127.0.0.1' ||
    (isValidIpv4(ip) && ip.startsWith('127.'))
  ) {
    return 'Localhost'
  }

  // 2. IPv4 Range Analysis
  if (isValidIpv4(ip)) {
    const [b0, b1] = ip.split('.').map(Number)
    // 0.0.0.0 or 255.255.255.255
    if (b0 === 0 || b0 === 255) return 'Unavailable'
    // RFC 1918 Private Ranges:
    // 10.0.0.0/8
    if (b0 === 10) return 'Private Network'
    // 172.16.0.0/12 (172.16.x.x - 172.31.x.x)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return 'Private Network'
    // 192.168.0.0/16
    if (b0 === 192 && b1 === 168) return 'Private Network'
    // RFC 3927 Link-Local: 169.254.0.0/16
    if (b0 === 169 && b1 === 254) return 'Private Network'
    // RFC 6598 Carrier-Grade NAT: 100.64.0.0/10
    if (b0 === 100 && b1 >= 64 && b1 <= 127) return 'Private Network'

    return 'Public IP'
  }

  // 3. IPv6 Range Analysis
  if (isValidIpv6(ip)) {
    const lower = ip.toLowerCase()
    // Unique Local Addresses (fc00::/7)
    if (lower.startsWith('fc') || lower.startsWith('fd')) {
      return 'Private Network'
    }
    // Link-Local Addresses (fe80::/10)
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) {
      return 'Private Network'
    }
    return 'Public IP'
  }

  return 'Unavailable'
}

/**
 * Comprehensive client IP extraction with trusted metadata header tracing.
 * Captures the actual client IP on the server side using platform-provided proxy headers.
 */
export function getClientIpDetails(
  headers: Headers | Record<string, string | string[] | undefined>
): ClientIpDetails {
  const getHeader = (name: string): string | null => {
    if (typeof (headers as Headers).get === 'function') {
      return (headers as Headers).get(name)
    }
    const val = (headers as Record<string, any>)[name] || (headers as Record<string, any>)[name.toLowerCase()]
    if (Array.isArray(val)) return val[0] || null
    return val || null
  }

  // Candidate headers in strict trust hierarchy:
  // 1. x-vercel-forwarded-for: Vercel edge proxy (trusted, cannot be spoofed by client)
  // 2. cf-connecting-ip: Cloudflare edge proxy
  // 3. true-client-ip: Akamai / Cloudflare Enterprise
  // 4. x-real-ip: Reverse proxy client IP
  // 5. x-forwarded-for: Standard proxy header (first non-internal hop)
  const headerKeys = [
    'x-vercel-forwarded-for',
    'cf-connecting-ip',
    'true-client-ip',
    'x-real-ip',
    'x-forwarded-for',
  ]

  let resolvedIp: string | null = null
  let sourceHeader = 'none'

  for (const key of headerKeys) {
    const rawVal = getHeader(key)
    if (!rawVal) continue

    // Handle comma-separated list of proxies (e.g. client, proxy1, proxy2): take first hop
    const firstHop = rawVal.split(',')[0].trim()
    const normalized = normalizeIp(firstHop)

    if (normalized) {
      resolvedIp = normalized
      sourceHeader = key
      break
    }
  }

  // Fallback behavior:
  // In production (Vercel): do NOT invent an address if trusted headers are absent; return null
  const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL)
  if (!resolvedIp) {
    if (isProduction) {
      resolvedIp = null
      sourceHeader = 'none'
    } else {
      // In local development: truthful loopback address
      resolvedIp = '::1'
      sourceHeader = 'local-development-loopback'
    }
  }

  const classification = classifyIp(resolvedIp)
  const location = extractApproxLocation(headers, resolvedIp)

  return {
    ip: resolvedIp,
    sourceHeader,
    classification,
    location,
  }
}

/**
 * Extract trusted client IP from server request headers.
 * In production on Vercel, uses platform's documented trusted proxy metadata.
 * Never blindly trusts arbitrary client-supplied headers.
 * If cannot be determined in production, returns null.
 */
export function extractClientIp(headers: Headers | Record<string, string | string[] | undefined>): string | null {
  return getClientIpDetails(headers).ip
}

/**
 * Extract approximate location from trusted server proxy headers (e.g. Vercel geolocation headers).
 * Strictly labelled as Approximate. Never claims exact physical coordinates.
 */
export function extractApproxLocation(
  headers: Headers | Record<string, string | string[] | undefined>,
  ip: string | null | undefined
): string {
  if (!ip) {
    return 'Approximate Location Unavailable'
  }

  const classification = classifyIp(ip)

  if (classification === 'Localhost') {
    return 'Localhost (Development Environment)'
  }

  if (classification === 'Private Network') {
    return 'Private / Corporate Network'
  }

  if (classification === 'Unavailable') {
    return 'Approximate Location Unavailable'
  }

  const getHeader = (name: string): string | null => {
    if (typeof (headers as Headers).get === 'function') {
      return (headers as Headers).get(name)
    }
    const val = (headers as Record<string, any>)[name] || (headers as Record<string, any>)[name.toLowerCase()]
    if (Array.isArray(val)) return val[0] || null
    return val || null
  }

  // Check Vercel edge geolocation headers
  const city = getHeader('x-vercel-ip-city')
  const country = getHeader('x-vercel-ip-country')

  if (city && country) {
    try {
      return `${decodeURIComponent(city)}, ${country} (Approximate)`
    } catch {
      return `${city}, ${country} (Approximate)`
    }
  }

  if (country) {
    return `${country} (Approximate)`
  }

  return 'Approximate Location Unavailable'
}

/**
 * Parses user-agent string into Browser, OS, and Device category.
 */
export function parseUserAgent(ua: string | null | undefined): {
  browser: string
  os: string
  device: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown'
} {
  if (!ua) {
    return { browser: 'Unknown Browser', os: 'Unknown OS', device: 'Unknown' }
  }

  // 1. Device Category
  let device: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown' = 'Desktop'
  if (/iPad|tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) {
    device = 'Tablet'
  } else if (/Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    device = 'Mobile'
  }

  // 2. Operating System
  let os = 'Unknown OS'
  if (/Windows NT 10.0/i.test(ua)) os = 'Windows 11 / 10'
  else if (/Windows NT 6.3/i.test(ua)) os = 'Windows 8.1'
  else if (/Windows NT 6.1/i.test(ua)) os = 'Windows 7'
  else if (/Windows NT/i.test(ua)) os = 'Windows'
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS'
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS'
  else if (/Android/i.test(ua)) os = 'Android'
  else if (/Linux/i.test(ua)) os = 'Linux'
  else if (/CrOS/i.test(ua)) os = 'Chrome OS'

  // 3. Browser
  let browser = 'Unknown Browser'
  if (/Edg\//i.test(ua)) {
    const match = ua.match(/Edg\/([\d.]+)/)
    browser = match ? `Edge ${match[1].split('.')[0]}` : 'Edge'
  } else if (/OPR\/|Opera/i.test(ua)) {
    const match = ua.match(/OPR\/([\d.]+)/)
    browser = match ? `Opera ${match[1].split('.')[0]}` : 'Opera'
  } else if (/Chrome\//i.test(ua) && !/Chromium\//i.test(ua)) {
    const match = ua.match(/Chrome\/([\d.]+)/)
    browser = match ? `Chrome ${match[1].split('.')[0]}` : 'Chrome'
  } else if (/Firefox\//i.test(ua)) {
    const match = ua.match(/Firefox\/([\d.]+)/)
    browser = match ? `Firefox ${match[1].split('.')[0]}` : 'Firefox'
  } else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    const match = ua.match(/Version\/([\d.]+)/)
    browser = match ? `Safari ${match[1].split('.')[0]}` : 'Safari'
  }

  return { browser, os, device }
}

/**
 * Formats a Date object or ISO string to Asia/Kolkata timezone standard display.
 * e.g. "15 Oct 2026, 02:30 pm"
 */
export function formatToKolkataTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—'
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(d.getTime())) return '—'

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d)
  } catch {
    return String(dateInput)
  }
}

