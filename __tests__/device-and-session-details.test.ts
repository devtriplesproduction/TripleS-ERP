import { describe, it, expect } from 'vitest'
import {
  parseDetailedUserAgent,
  parseUserAgent,
  classifyIp,
  normalizeIp,
  resolveClientMetadata,
  extractApproxLocation
} from '../lib/utils/device-parser'

describe('Device and Client Telemetry Detection', () => {
  it('accurately identifies TripleS Time Tracker Electron desktop client', () => {
    // 1. TripleS Time Tracker User Agent (Desktop app on Windows)
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) TripleS-Time-Tracker/1.0.0 Chrome/132.0.6834.83 Electron/34.2.0 Safari/537.36'
    const detailed = parseDetailedUserAgent(ua)

    expect(detailed.clientType).toBe('desktop_app')
    expect(detailed.appName).toBe('TripleS Time Tracker')
    expect(detailed.appVersion).toBe('1.0.0')
    expect(detailed.runtime).toBe('Electron 34.2.0')
    expect(detailed.displayName).toBe('TripleS Time Tracker v1.0.0')
    expect(detailed.browserName).toBeNull() // Native desktop app is NOT labeled as a browser
    expect(detailed.browserVersion).toBeNull()
    expect(detailed.fullOs).toBe('Windows 11 / 10')
    expect(detailed.deviceType).toBe('Desktop')
  })

  it('accurately parses standard web browsers (Edge, Chrome, Firefox, Safari)', () => {
    // Edge on Windows
    const edgeUa =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.2903.86'
    const edge = parseDetailedUserAgent(edgeUa)
    expect(edge.clientType).toBe('browser')
    expect(edge.browserName).toBe('Edge')
    expect(edge.browserMajorVersion).toBe('131')
    expect(edge.browserEngine).toBe('Blink')
    expect(edge.fullOs).toBe('Windows 11 / 10')
    expect(edge.displayName).toBe('Edge 131')

    // Chrome on macOS
    const chromeUa =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
    const chrome = parseDetailedUserAgent(chromeUa)
    expect(chrome.clientType).toBe('browser')
    expect(chrome.browserName).toBe('Chrome')
    expect(chrome.browserMajorVersion).toBe('132')
    expect(chrome.browserEngine).toBe('Blink')
    expect(chrome.fullOs).toBe('macOS 10.15.7')

    // Firefox on Linux
    const ffUa = 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0'
    const ff = parseDetailedUserAgent(ffUa)
    expect(ff.clientType).toBe('browser')
    expect(ff.browserName).toBe('Firefox')
    expect(ff.browserMajorVersion).toBe('124')
    expect(ff.browserEngine).toBe('Gecko')
    expect(ff.fullOs).toBe('Linux (Ubuntu)')
  })

  it('does not label missing IP as Private Network or fabricate locations', () => {
    expect(classifyIp(null)).toBe('Unavailable')
    expect(classifyIp('')).toBe('Unavailable')
    expect(classifyIp('-')).toBe('Unavailable')

    expect(extractApproxLocation(new Headers(), null)).toBe('Approximate Location Unavailable')
  })

  it('resolves real client IP and ISP metadata safely through resolveClientMetadata', async () => {
    const headers = new Headers({
      'x-vercel-forwarded-for': '157.34.120.44',
      'x-vercel-ip-city': 'Pune',
      'x-vercel-ip-country': 'IN',
      'x-vercel-ip-country-region': 'MH',
      'x-vercel-ip-latitude': '18.5204',
      'x-vercel-ip-longitude': '73.8567',
      'x-vercel-ip-timezone': 'Asia%2FKolkata'
    })

    const meta = await resolveClientMetadata(headers)
    expect(meta.ip).toBe('157.34.120.44')
    expect(meta.classification).toBe('Public IP')
    expect(meta.location).toContain('Pune')
    expect(meta.location).toContain('IN')
    expect(meta.location).toContain('(Approximate)')
    expect(meta.latitude).toBeCloseTo(18.5204, 2)
    expect(meta.longitude).toBeCloseTo(73.8567, 2)
    expect(meta.timezone).toBe('Asia/Kolkata')
  })
})
