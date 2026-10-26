import { describe, it, expect } from 'vitest'
import {
  extractClientIp,
  getClientIpDetails,
  resolveClientMetadata,
  extractApproxLocation,
  normalizeIp,
  classifyIp,
  isVercelServerIp,
  isLoopbackIp,
  parseUserAgent,
  formatToKolkataTime,
} from '@/lib/utils/device-parser'
import {
  resolveIpGeolocation,
  extractEdgeHeaderLocation,
} from '@/lib/utils/ip-geolocation'
import {
  logSecurityEvent,
  updateSessionStatus,
  getMemoryAuditLogs,
} from '@/lib/utils/audit-logger'

describe('IP Normalization & Parsing Utilities', () => {
  it('normalizes IPv4-mapped IPv6 addresses (::ffff:x.x.x.x)', () => {
    expect(normalizeIp('::ffff:192.168.1.10')).toBe('192.168.1.10')
    expect(normalizeIp('::ffff:127.0.0.1')).toBe('127.0.0.1')
    expect(normalizeIp('::ffff:203.0.113.195')).toBe('203.0.113.195')
  })

  it('strips port from IPv4 addresses with port', () => {
    expect(normalizeIp('192.168.1.1:3000')).toBe('192.168.1.1')
    expect(normalizeIp('127.0.0.1:8080')).toBe('127.0.0.1')
  })

  it('strips bracket notation and port from IPv6 addresses', () => {
    expect(normalizeIp('[::1]')).toBe('::1')
    expect(normalizeIp('[::1]:3000')).toBe('::1')
    expect(normalizeIp('[2001:db8::1]:8080')).toBe('2001:db8::1')
  })

  it('normalizes expanded loopback IPv6 to ::1', () => {
    expect(normalizeIp('0:0:0:0:0:0:0:1')).toBe('::1')
  })

  it('returns null for empty, whitespace, null, or malformed inputs', () => {
    expect(normalizeIp('')).toBeNull()
    expect(normalizeIp('   ')).toBeNull()
    expect(normalizeIp('unavailable')).toBeNull()
    expect(normalizeIp(null)).toBeNull()
    expect(normalizeIp(undefined)).toBeNull()
  })
})

describe('IP Address Classification (RFC 1918, RFC 4193, Loopback, Public)', () => {
  it('identifies localhost loopback addresses correctly', () => {
    expect(classifyIp('127.0.0.1')).toBe('Localhost')
    expect(classifyIp('127.0.0.5')).toBe('Localhost')
    expect(classifyIp('::1')).toBe('Localhost')
    expect(classifyIp('localhost')).toBe('Localhost')
    expect(classifyIp('[::1]:3000')).toBe('Localhost')
    expect(classifyIp('::ffff:127.0.0.1')).toBe('Localhost')
  })

  it('identifies RFC 1918 private IPv4 networks correctly', () => {
    expect(classifyIp('10.0.0.1')).toBe('Private Network')
    expect(classifyIp('10.254.1.5')).toBe('Private Network')
    expect(classifyIp('172.16.0.1')).toBe('Private Network')
    expect(classifyIp('172.31.255.254')).toBe('Private Network')
    expect(classifyIp('192.168.1.1')).toBe('Private Network')
    expect(classifyIp('192.168.0.100')).toBe('Private Network')
  })

  it('identifies Link-Local and CGNAT private ranges', () => {
    expect(classifyIp('169.254.1.1')).toBe('Private Network')
    expect(classifyIp('100.64.0.1')).toBe('Private Network')
  })

  it('identifies private / unique local IPv6 addresses', () => {
    expect(classifyIp('fc00::1')).toBe('Private Network')
    expect(classifyIp('fd12:3456:789a::1')).toBe('Private Network')
    expect(classifyIp('fe80::1')).toBe('Private Network')
  })

  it('identifies public IPv4 and IPv6 addresses correctly', () => {
    expect(classifyIp('203.0.113.195')).toBe('Public IP')
    expect(classifyIp('157.34.120.44')).toBe('Public IP')
    expect(classifyIp('8.8.8.8')).toBe('Public IP')
    expect(classifyIp('2600:1f18:417f:1200::1')).toBe('Public IP')
  })

  it('classifies invalid or unavailable addresses as Unavailable', () => {
    expect(classifyIp('999.999.999.999')).toBe('Unavailable')
    expect(classifyIp('not-an-ip')).toBe('Unavailable')
    expect(classifyIp('0.0.0.0')).toBe('Unavailable')
    expect(classifyIp('255.255.255.255')).toBe('Unavailable')
    expect(classifyIp('')).toBe('Unavailable')
    expect(classifyIp(null)).toBe('Unavailable')
  })
})

describe('Trusted Header Extraction Hierarchy & Provenance Tracing', () => {
  it('prioritizes x-vercel-forwarded-for over all other proxy headers', () => {
    const headers = new Headers({
      'x-vercel-forwarded-for': '157.34.120.44',
      'x-forwarded-for': '1.1.1.1, 2.2.2.2',
      'x-real-ip': '3.3.3.3',
    })
    const details = getClientIpDetails(headers)
    expect(details.ip).toBe('157.34.120.44')
    expect(details.sourceHeader).toBe('x-vercel-forwarded-for')
    expect(details.classification).toBe('Public IP')
  })

  it('prioritizes cf-connecting-ip when x-vercel-forwarded-for is absent', () => {
    const headers = new Headers({
      'cf-connecting-ip': '198.51.100.4',
      'x-forwarded-for': '1.1.1.1',
    })
    const details = getClientIpDetails(headers)
    expect(details.ip).toBe('198.51.100.4')
    expect(details.sourceHeader).toBe('cf-connecting-ip')
    expect(details.classification).toBe('Public IP')
  })

  it('falls back to x-real-ip when edge proxy headers are absent', () => {
    const headers = new Headers({
      'x-real-ip': '49.36.172.90',
    })
    const details = getClientIpDetails(headers)
    expect(details.ip).toBe('49.36.172.90')
    expect(details.sourceHeader).toBe('x-real-ip')
    expect(details.classification).toBe('Public IP')
  })

  it('extracts first hop from x-forwarded-for chain safely', () => {
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
    })
    const ip = extractClientIp(headers)
    expect(ip).toBe('203.0.113.195')
  })

  it('falls back to local loopback in development when headers are missing', () => {
    const env = process.env as Record<string, any>
    const origEnv = env.NODE_ENV
    env.NODE_ENV = 'development'
    delete env.VERCEL
    const headers = new Headers()
    const details = getClientIpDetails(headers)
    expect(details.ip).toBe('::1')
    expect(details.sourceHeader).toBe('local-development-loopback')
    expect(details.classification).toBe('Localhost')
    env.NODE_ENV = origEnv
  })

  it('returns null and none in production when headers are missing', () => {
    const env = process.env as Record<string, any>
    const origEnv = env.NODE_ENV
    env.NODE_ENV = 'production'
    const headers = new Headers()
    const details = getClientIpDetails(headers)
    expect(details.ip).toBeNull()
    expect(details.sourceHeader).toBe('none')
    expect(details.classification).toBe('Unavailable')
    env.NODE_ENV = origEnv
  })
})

describe('Approximate Location Extraction', () => {
  it('labels localhost as development environment', () => {
    const headers = new Headers()
    expect(extractApproxLocation(headers, '127.0.0.1')).toBe('Localhost (Development Environment)')
    expect(extractApproxLocation(headers, '::1')).toBe('Localhost (Development Environment)')
  })

  it('labels private IP ranges as Private / Corporate Network', () => {
    const headers = new Headers()
    expect(extractApproxLocation(headers, '192.168.1.105')).toBe('Private / Corporate Network')
    expect(extractApproxLocation(headers, '10.0.0.1')).toBe('Private / Corporate Network')
  })

  it('extracts approximate location with (Approximate) suffix from Vercel headers', () => {
    const headers = new Headers({
      'x-vercel-ip-city': 'Mumbai',
      'x-vercel-ip-country': 'IN',
    })
    const loc = extractApproxLocation(headers, '157.34.120.44')
    expect(loc).toBe('Mumbai, IN (Approximate)')
  })

  it('falls back to Approximate Location Unavailable when public IP has no geo headers', () => {
    const headers = new Headers()
    const loc = extractApproxLocation(headers, '157.34.120.44')
    expect(loc).toBe('Approximate Location Unavailable')
  })

  it('handles null IP safely by returning Approximate Location Unavailable', () => {
    const headers = new Headers()
    expect(extractApproxLocation(headers, null)).toBe('Approximate Location Unavailable')
  })
})

describe('User-Agent & Kolkata Time Formatting', () => {
  it('parses Chrome on Windows desktop User-Agent', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
    const result = parseUserAgent(ua)
    expect(result.browser).toBe('Chrome 129')
    expect(result.os).toBe('Windows 11 / 10')
    expect(result.device).toBe('Desktop')
  })

  it('parses Safari on iPhone mobile User-Agent', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
    const result = parseUserAgent(ua)
    expect(result.browser).toBe('Safari 17')
    expect(result.os).toBe('iOS')
    expect(result.device).toBe('Mobile')
  })

  it('formats dates consistently in Asia/Kolkata timezone', () => {
    const iso = '2026-10-15T09:00:00.000Z' // 2:30 PM IST (+5:30)
    const formatted = formatToKolkataTime(iso)
    expect(formatted).toContain('15 Oct 2026')
    expect(formatted.toLowerCase()).toContain('02:30 pm')
  })
})

describe('Security Audit Logger & Deduplication', () => {
  it('records successful login event with IP classification and session details', async () => {
    const record = await logSecurityEvent({
      eventType: 'login_success',
      status: 'Success',
      userId: 'auth-user-dedup-1',
      employeeIdNumber: 'EMP-999',
      ipAddress: '157.34.120.44',
      location: 'Mumbai, IN (Approximate)',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0.0.0',
    })

    expect(record.id).toBeDefined()
    expect(record.ip_address).toBe('157.34.120.44')
    expect(record.ip_classification).toBe('Public IP')
    expect(record.session_status).toBe('Active')
    expect(record.session_id).toBeDefined()
    expect(record.session_id).not.toContain('eyJ') // Never JWT/token
  })

  it('stores null ip_address when IP is unavailable in production', async () => {
    const record = await logSecurityEvent({
      eventType: 'login_failed',
      status: 'Failed',
      userId: 'auth-user-no-ip',
      ipAddress: null,
    })

    expect(record.ip_address).toBeNull()
    expect(record.ip_classification).toBe('Unavailable')
    expect(record.location).toBe('Approximate Location Unavailable')
  })

  it('deduplicates rapid retry events within retry window', async () => {
    const options = {
      eventType: 'login_failed' as const,
      status: 'Failed' as const,
      userId: 'auth-retry-user',
      ipAddress: '198.51.100.99',
      metadata: { attempted_email: 'test-retry@triples.com' },
    }

    const first = await logSecurityEvent(options)
    const second = await logSecurityEvent(options)

    // Second call within 3s window should return the exact same record without creating a duplicate
    expect(second.id).toBe(first.id)
  })

  it('records loopback dev event with Localhost classification', async () => {
    const record = await logSecurityEvent({
      eventType: 'login_success',
      status: 'Success',
      userId: 'auth-loopback-user',
      ipAddress: '::1',
    })

    expect(record.ip_address).toBe('::1')
    expect(record.ip_classification).toBe('Localhost')
    expect(record.location).toBe('Localhost (Development Environment)')
  })

  it('updates session status on session revocation', async () => {
    const sessionId = `sess_revoke_${Date.now()}`
    await logSecurityEvent({
      eventType: 'login_success',
      status: 'Success',
      sessionId,
      sessionStatus: 'Active',
    })

    const updated = await updateSessionStatus(sessionId, 'Revoked')
    expect(updated).toBe(true)

    const logs = getMemoryAuditLogs()
    const found = logs.find(l => l.session_id === sessionId)
    expect(found?.session_status).toBe('Revoked')
  })
})

describe('Vercel Server Anycast IP & Loopback Filtering', () => {
  it('correctly identifies Vercel server Anycast IPs', () => {
    expect(isVercelServerIp('76.76.21.21')).toBe(true)
    expect(isVercelServerIp('76.76.21.1')).toBe(true)
    expect(isVercelServerIp('76.76.21.99:443')).toBe(true)
    expect(isVercelServerIp('157.34.120.44')).toBe(false)
    expect(isVercelServerIp('127.0.0.1')).toBe(false)
    expect(isVercelServerIp(null)).toBe(false)
  })

  it('correctly identifies loopback addresses', () => {
    expect(isLoopbackIp('127.0.0.1')).toBe(true)
    expect(isLoopbackIp('127.0.0.5')).toBe(true)
    expect(isLoopbackIp('::1')).toBe(true)
    expect(isLoopbackIp('localhost')).toBe(true)
    expect(isLoopbackIp('192.168.1.1')).toBe(false)
    expect(isLoopbackIp('157.34.120.44')).toBe(false)
    expect(isLoopbackIp(null)).toBe(false)
  })

  it('filters out loopback and Vercel server IPs in production proxy chain', () => {
    const env = process.env as Record<string, any>
    const origEnv = env.NODE_ENV
    env.NODE_ENV = 'production'
    env.VERCEL = '1'

    // Chain with spoofed 127.0.0.1 at start and Vercel server IP at end
    const headers = new Headers({
      'x-forwarded-for': '127.0.0.1, 157.34.120.44, 76.76.21.21',
    })

    const details = getClientIpDetails(headers)
    expect(details.ip).toBe('157.34.120.44')
    expect(details.classification).toBe('Public IP')
    expect(details.sourceHeader).toBe('x-forwarded-for')

    env.NODE_ENV = origEnv
    delete env.VERCEL
  })

  it('rejects in production when header contains only loopback or Vercel server IPs', () => {
    const env = process.env as Record<string, any>
    const origEnv = env.NODE_ENV
    env.NODE_ENV = 'production'
    env.VERCEL = '1'

    const headers = new Headers({
      'x-forwarded-for': '127.0.0.1, 76.76.21.21',
    })

    const details = getClientIpDetails(headers)
    expect(details.ip).toBeNull()
    expect(details.classification).toBe('Unavailable')
    expect(details.sourceHeader).toBe('none')

    env.NODE_ENV = origEnv
    delete env.VERCEL
  })
})

describe('IP Geolocation Resolution & Provider Integration', () => {
  it('extracts Vercel edge headers with region accurately', () => {
    const headers = new Headers({
      'x-vercel-ip-city': 'Mumbai',
      'x-vercel-ip-country-region': 'MH',
      'x-vercel-ip-country': 'IN',
    })

    const res = extractEdgeHeaderLocation(headers)
    expect(res).not.toBeNull()
    expect(res?.city).toBe('Mumbai')
    expect(res?.region).toBe('MH')
    expect(res?.country).toBe('IN')
    expect(res?.location).toBe('Mumbai, MH, IN (Approximate)')
  })

  it('extracts Cloudflare edge headers accurately', () => {
    const headers = new Headers({
      'cf-ipcity': 'London',
      'cf-region-code': 'ENG',
      'cf-ipcountry': 'GB',
    })

    const res = extractEdgeHeaderLocation(headers)
    expect(res).not.toBeNull()
    expect(res?.city).toBe('London')
    expect(res?.country).toBe('GB')
    expect(res?.location).toBe('London, ENG, GB (Approximate)')
  })

  it('truthfully reports Localhost for loopback IPs', async () => {
    const res = await resolveIpGeolocation('127.0.0.1')
    expect(res.location).toBe('Localhost (Development Environment)')
    expect(res.isProxy).toBe(false)
  })

  it('truthfully reports Private Network for RFC 1918 addresses', async () => {
    const res = await resolveIpGeolocation('192.168.1.100')
    expect(res.location).toBe('Private / Corporate Network')
    expect(res.isProxy).toBe(false)
  })

  it('honestly reports Unknown for null or unavailable IPs', async () => {
    const res = await resolveIpGeolocation(null)
    expect(res.location).toBe('Unknown')
    expect(res.isProxy).toBe(false)
  })

  it('resolves real public IP geolocation via external provider or fast-path', async () => {
    const res = await resolveIpGeolocation('157.34.120.44')
    expect(res.location).toBeDefined()
    expect(res.location).not.toBe('Local / Office Network')
    expect(typeof res.isProxy).toBe('boolean')
  })

  it('resolves client metadata via resolveClientMetadata end-to-end', async () => {
    const headers = new Headers({
      'x-vercel-forwarded-for': '157.34.120.44',
      'x-vercel-ip-city': 'Bengaluru',
      'x-vercel-ip-country-region': 'KA',
      'x-vercel-ip-country': 'IN',
    })

    const metadata = await resolveClientMetadata(headers)
    expect(metadata.ip).toBe('157.34.120.44')
    expect(metadata.classification).toBe('Public IP')
    expect(metadata.location).toBe('Bengaluru, KA, IN (Approximate)')
    expect(metadata.isProxy).toBe(false)
  })
})

