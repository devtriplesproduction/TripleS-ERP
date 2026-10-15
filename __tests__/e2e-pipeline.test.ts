import { describe, it, expect } from 'vitest'
import { getClientIpDetails, extractApproxLocation } from '@/lib/utils/device-parser'
import { logSecurityEvent, getMemoryAuditLogs } from '@/lib/utils/audit-logger'

describe('End-to-End Pipeline & Boundary Verification', () => {
  it('1. Captures public IP accurately in Vercel production deployment', async () => {
    const env = process.env as Record<string, any>
    const origEnv = env.NODE_ENV
    env.NODE_ENV = 'production'
    env.VERCEL = '1'

    const vercelHeaders = new Headers({
      'x-vercel-forwarded-for': '157.34.120.44',
      'x-vercel-ip-city': 'Mumbai',
      'x-vercel-ip-country': 'IN',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0.0.0',
    })

    const details = getClientIpDetails(vercelHeaders)
    expect(details.ip).toBe('157.34.120.44')
    expect(details.sourceHeader).toBe('x-vercel-forwarded-for')
    expect(details.classification).toBe('Public IP')
    expect(details.location).toBe('Mumbai, IN (Approximate)')

    // Log the event as would happen during successful login
    const record = await logSecurityEvent({
      eventType: 'login_success',
      status: 'Success',
      userId: 'test-user-vercel-success',
      ipAddress: details.ip,
      ipClassification: details.classification,
      location: details.location,
      userAgent: vercelHeaders.get('user-agent') || '',
      metadataSource: details.sourceHeader,
      metadata: { email: 'user@triplesproduction.com' },
    })

    expect(record.ip_address).toBe('157.34.120.44')
    expect(record.ip_classification).toBe('Public IP')
    expect(record.location).toBe('Mumbai, IN (Approximate)')
    expect(record.session_id).not.toContain('eyJ') // Zero token leakage

    env.NODE_ENV = origEnv
    delete env.VERCEL
  })

  it('2. Captures failed login attempt in production without logging password', async () => {
    const env = process.env as Record<string, any>
    const origEnv = env.NODE_ENV
    env.NODE_ENV = 'production'
    env.VERCEL = '1'

    const vercelHeaders = new Headers({
      'x-vercel-forwarded-for': '49.36.172.90',
      'x-vercel-ip-city': 'Pune',
      'x-vercel-ip-country': 'IN',
    })

    const details = getClientIpDetails(vercelHeaders)

    const record = await logSecurityEvent({
      eventType: 'login_failed',
      status: 'Failed',
      ipAddress: details.ip,
      ipClassification: details.classification,
      location: details.location,
      metadataSource: details.sourceHeader,
      metadata: {
        attempted_email: 'attacker@example.com',
        failure_reason: 'Invalid login credentials',
      },
    })

    expect(record.ip_address).toBe('49.36.172.90')
    expect(record.status).toBe('Failed')
    expect(record.ip_classification).toBe('Public IP')
    expect((record.metadata as any).password).toBeUndefined()
    expect((record.metadata as any).token).toBeUndefined()

    env.NODE_ENV = origEnv
    delete env.VERCEL
  })

  it('3. In local development on localhost:3000, captures ::1 truthfully as Localhost', async () => {
    const env = process.env as Record<string, any>
    const origEnv = env.NODE_ENV
    env.NODE_ENV = 'development'
    delete env.VERCEL

    // Next.js dev server on Windows with localhost connection
    const localDevHeaders = new Headers({
      'host': 'localhost:3000',
      'x-forwarded-for': '::1',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/155.0.0.0 Safari/537.36',
    })

    const details = getClientIpDetails(localDevHeaders)
    expect(details.ip).toBe('::1')
    expect(details.sourceHeader).toBe('x-forwarded-for')
    expect(details.classification).toBe('Localhost')
    expect(details.location).toBe('Localhost (Development Environment)')

    const record = await logSecurityEvent({
      eventType: 'login_success',
      status: 'Success',
      userId: 'test-local-dev-user',
      ipAddress: details.ip,
      ipClassification: details.classification,
      location: details.location,
      metadataSource: details.sourceHeader,
    })

    expect(record.ip_address).toBe('::1')
    expect(record.ip_classification).toBe('Localhost')
    expect(record.location).toBe('Localhost (Development Environment)')

    env.NODE_ENV = origEnv
  })

  it('4. In production when metadata is missing, stores null and classifies as Unavailable', async () => {
    const env = process.env as Record<string, any>
    const origEnv = env.NODE_ENV
    env.NODE_ENV = 'production'
    env.VERCEL = '1'

    const emptyHeaders = new Headers()
    const details = getClientIpDetails(emptyHeaders)
    expect(details.ip).toBeNull()
    expect(details.sourceHeader).toBe('none')
    expect(details.classification).toBe('Unavailable')
    expect(details.location).toBe('Approximate Location Unavailable')

    const record = await logSecurityEvent({
      eventType: 'login_failed',
      status: 'Failed',
      ipAddress: details.ip,
      ipClassification: details.classification,
      location: details.location,
      metadataSource: details.sourceHeader,
    })

    // Critical requirement: null must be stored, not an invented address
    expect(record.ip_address).toBeNull()
    expect(record.ip_classification).toBe('Unavailable')
    expect(record.location).toBe('Approximate Location Unavailable')

    env.NODE_ENV = origEnv
    delete env.VERCEL
  })

  it('5. Audit history immutability: existing records are not overwritten', async () => {
    const logs = getMemoryAuditLogs()
    const initialCount = logs.length

    // Log a new distinct event
    await logSecurityEvent({
      eventType: 'password_change',
      status: 'Success',
      userId: 'user-history-test',
      ipAddress: '192.168.1.50',
      ipClassification: 'Private Network',
      location: 'Private / Corporate Network',
    })

    const updatedLogs = getMemoryAuditLogs()
    expect(updatedLogs.length).toBeGreaterThan(initialCount)
  })
})
