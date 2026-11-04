import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getEmployeeAuditLogs, revokeSessionAction } from '@/lib/actions/security-audit'
import { logSecurityEvent, updateSessionStatus } from '@/lib/utils/audit-logger'

// Mock getCurrentUser and headers
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(async () => ({
    id: 'admin-user-id',
    email: 'admin@triplesproduction.com',
    role: 'Admin',
  })),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({
    'x-forwarded-for': '157.34.120.44',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
  })),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('Security Audit Trail & KPI Calculations', { timeout: 45000 }, () => {
  const testEmpId = '090b2e9a-850c-491d-9746-a2d6ccfd16cd' // Princes Dyna
  const testEmpNum = 'EMP-014'

  it('fetches complete historical records and accurate KPIs for Princes Dyna', async () => {
    const res = await getEmployeeAuditLogs(testEmpId)
    expect(res).toBeDefined()
    expect(res.records).toBeDefined()
    expect(Array.isArray(res.records)).toBe(true)
    expect(res.summary).toBeDefined()

    // Princes Dyna has 1 active session in time_sessions in DB
    expect(res.summary.activeSessions).toBeGreaterThanOrEqual(1)
    expect(res.summary.successfulLogins).toBeGreaterThanOrEqual(1)
    expect(res.summary.totalAttempts).toBeGreaterThanOrEqual(1)
    expect(res.summary.totalAttempts).toBe(res.summary.successfulLogins + res.summary.failedLogins)

    // Check that records are ordered descending by created_at
    for (let i = 0; i < res.records.length - 1; i++) {
      const currTime = new Date(res.records[i].created_at).getTime()
      const nextTime = new Date(res.records[i + 1].created_at).getTime()
      expect(currTime).toBeGreaterThanOrEqual(nextTime)
    }
  })

  it('fetches multiple historical sessions and expired sessions for Omkar Sawant (EMP-003)', async () => {
    const res = await getEmployeeAuditLogs('EMP-003')
    expect(res).toBeDefined()
    expect(res.summary).toBeDefined()

    // Omkar has 5 time_sessions in DB (3 active, 2 expired)
    expect(res.summary.totalAttempts).toBeGreaterThanOrEqual(5)
    expect(res.summary.successfulLogins).toBeGreaterThanOrEqual(5)
    expect(res.summary.activeSessions).toBeGreaterThanOrEqual(1)

    // Check that expired sessions are present in records
    const expired = res.records.filter(r => r.session_status === 'Expired')
    expect(expired.length).toBeGreaterThan(0)
  })

  it('does not count password changes as login attempts in KPIs', async () => {
    // Record a password change event for test employee
    await logSecurityEvent({
      eventType: 'password_change',
      status: 'Success',
      employeeId: testEmpId,
      employeeIdNumber: testEmpNum,
      authMethod: 'Admin Action',
      ipAddress: '223.233.80.144',
      location: 'Pune, MH, IN (Approximate)',
    })

    const res = await getEmployeeAuditLogs(testEmpId)
    // Password change should appear in history records
    const pwChanges = res.records.filter(r => r.event_type === 'password_change')
    expect(pwChanges.length).toBeGreaterThan(0)

    // But totalAttempts must strictly equal successfulLogins + failedLogins (excluding password changes)
    expect(res.summary.totalAttempts).toBe(res.summary.successfulLogins + res.summary.failedLogins)
  })

  it('records failed login attempts and reflects them in Failed Attempts KPI', async () => {
    // Record a failed login event
    await logSecurityEvent({
      eventType: 'login_failed',
      status: 'Failed',
      employeeId: testEmpId,
      employeeIdNumber: testEmpNum,
      authMethod: 'Password',
      ipAddress: '203.0.113.50',
      metadata: { attempted_email: 'princes.dyna@tsp.com', failure_reason: 'Invalid credentials' },
    })

    const res = await getEmployeeAuditLogs(testEmpId)
    expect(res.summary.failedLogins).toBeGreaterThanOrEqual(1)
    expect(res.summary.totalAttempts).toBe(res.summary.successfulLogins + res.summary.failedLogins)

    const failedRecord = res.records.find(r => r.event_type === 'login_failed')
    expect(failedRecord).toBeDefined()
    expect(failedRecord?.status).toBe('Failed')
  })

  it('filters historical records by status (success, failed, suspicious)', async () => {
    const successRes = await getEmployeeAuditLogs(testEmpId, { status: 'success' })
    expect(successRes.records.every(r => r.status === 'Success')).toBe(true)

    const failedRes = await getEmployeeAuditLogs(testEmpId, { status: 'failed' })
    expect(failedRes.records.every(r => r.status === 'Failed')).toBe(true)
  })

  it('filters historical records by search query across IP, browser, and event type', async () => {
    const searchRes = await getEmployeeAuditLogs(testEmpId, { search: 'password' })
    expect(searchRes.records.some(r => r.event_type === 'password_change')).toBe(true)
  })

  it('supports pagination with pageSize and page navigation', async () => {
    const page1 = await getEmployeeAuditLogs('EMP-003', { page: 1, pageSize: 2 })
    expect(page1.records.length).toBeLessThanOrEqual(2)
    expect(page1.page).toBe(1)
    expect(page1.totalPages).toBeGreaterThanOrEqual(2)

    const page2 = await getEmployeeAuditLogs('EMP-003', { page: 2, pageSize: 2 })
    expect(page2.page).toBe(2)
    // Records on page 2 should not be identical to page 1
    if (page1.records.length > 0 && page2.records.length > 0) {
      expect(page1.records[0].id).not.toBe(page2.records[0].id)
    }
  })
})
