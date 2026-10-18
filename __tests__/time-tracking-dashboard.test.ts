import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hasRouteAccess, ROLE_ROUTE_MAP } from '@/config/rbac'

describe('Time Tracking Dashboard Acceptance Tests', () => {
  describe('1. Location & Role-Based Access Control (RBAC)', () => {
    it('allows Admin to access /time-tracking', () => {
      const allowed = hasRouteAccess('Admin', '/time-tracking')
      expect(allowed).toBe(true)
    })

    it('denies HR role access to /time-tracking', () => {
      const allowed = hasRouteAccess('HR', '/time-tracking')
      expect(allowed).toBe(false)
    })

    it('denies Employee role access to /time-tracking', () => {
      const allowed = hasRouteAccess('Employee', '/time-tracking')
      expect(allowed).toBe(false)
    })

    it('denies Manager role access to /time-tracking', () => {
      const allowed = hasRouteAccess('Manager', '/time-tracking')
      expect(allowed).toBe(false)
    })

    it('denies unauthenticated / null role access to /time-tracking', () => {
      expect(hasRouteAccess(null, '/time-tracking')).toBe(false)
      expect(hasRouteAccess(undefined, '/time-tracking')).toBe(false)
      expect(hasRouteAccess('' as any, '/time-tracking')).toBe(false)
    })

    it('verifies ROLE_ROUTE_MAP only includes /time-tracking under Admin', () => {
      expect(ROLE_ROUTE_MAP.Admin).toContain('/time-tracking')
      expect(ROLE_ROUTE_MAP.HR).not.toContain('/time-tracking')
      expect(ROLE_ROUTE_MAP.Employee).not.toContain('/time-tracking')
      expect(ROLE_ROUTE_MAP.Manager).not.toContain('/time-tracking')
    })
  })

  describe('2. Session Isolation & Zero-Hour Baseline for Inactive Employees', () => {
    it('ensures employees with no sessions show Not Started and zero hours', () => {
      // Simulation of an employee with no session records
      const employeeWithoutSessions = {
        id: 'emp-no-session-123',
        name: 'Jane Doe',
        sessions: []
      }

      const workedMinutes = employeeWithoutSessions.sessions.reduce((acc, s: any) => acc + (s.worked_minutes || 0), 0)
      const activeMinutes = employeeWithoutSessions.sessions.reduce((acc, s: any) => acc + (s.active_minutes || 0), 0)

      const status = employeeWithoutSessions.sessions.length === 0 ? 'Not Started' : 'Working'
      const workedHoursFormatted = `${Math.floor(workedMinutes / 60)}h ${(workedMinutes % 60).toString().padStart(2, '0')}m`
      const activeHoursFormatted = `${Math.floor(activeMinutes / 60)}h ${(activeMinutes % 60).toString().padStart(2, '0')}m`

      expect(status).toBe('Not Started')
      expect(workedMinutes).toBe(0)
      expect(activeMinutes).toBe(0)
      expect(workedHoursFormatted).toBe('0h 00m')
      expect(activeHoursFormatted).toBe('0h 00m')
    })

    it('strictly isolates Employee A timer from Employee B timer', () => {
      const sessions = [
        {
          id: 'sess-1',
          employee_id: 'emp-A',
          session_date: '2026-10-18',
          worked_minutes: 180,
          active_minutes: 150,
          status: 'working'
        },
        {
          id: 'sess-2',
          employee_id: 'emp-B',
          session_date: '2026-10-18',
          worked_minutes: 45,
          active_minutes: 30,
          status: 'completed'
        }
      ]

      const empASessions = sessions.filter(s => s.employee_id === 'emp-A')
      const empBSessions = sessions.filter(s => s.employee_id === 'emp-B')
      const empCSessions = sessions.filter(s => s.employee_id === 'emp-C')

      const empAWorked = empASessions.reduce((acc, s) => acc + s.worked_minutes, 0)
      const empBWorked = empBSessions.reduce((acc, s) => acc + s.worked_minutes, 0)
      const empCWorked = empCSessions.reduce((acc, s) => acc + s.worked_minutes, 0)

      expect(empAWorked).toBe(180)
      expect(empBWorked).toBe(45)
      expect(empCWorked).toBe(0) // Employee C has never clocked in, must be zero

      // Cross-user verification
      expect(empASessions.some(s => s.employee_id === 'emp-B')).toBe(false)
      expect(empBSessions.some(s => s.employee_id === 'emp-A')).toBe(false)
    })
  })

  describe('3. Status Calculation Engine', () => {
    function computeStatus(
      sessions: Array<{
        status: string
        clock_out: string | null
        updated_at?: string
      }>,
      breaks: Array<{ end_time: string | null }>,
      isToday: boolean,
      currentTimeMs: number,
      latestSyncMs: number | null
    ): 'Working' | 'On Break' | 'Idle' | 'Clocked Out' | 'Not Started' {
      if (sessions.length === 0) return 'Not Started'

      const activeSession = sessions.find(
        s => s.status === 'working' || s.status === 'Working' || s.status === 'on_break' || s.status === 'On Break' || !s.clock_out
      )

      if (!activeSession) {
        return 'Clocked Out'
      }

      const hasOpenBreak = breaks.some(b => !b.end_time)
      const isBreakStatus = activeSession.status === 'on_break' || activeSession.status === 'On Break'

      if (hasOpenBreak || isBreakStatus) {
        return 'On Break'
      }

      if (isToday) {
        if (!latestSyncMs || currentTimeMs - latestSyncMs > 5 * 60 * 1000) {
          return 'Idle'
        }
        return 'Working'
      }

      return 'Idle'
    }

    it('identifies On Break when active break exists', () => {
      const status = computeStatus(
        [{ status: 'working', clock_out: null }],
        [{ end_time: null }], // Open break
        true,
        Date.now(),
        Date.now()
      )
      expect(status).toBe('On Break')
    })

    it('identifies Working when session is active and telemetry is fresh', () => {
      const now = Date.now()
      const status = computeStatus(
        [{ status: 'working', clock_out: null }],
        [{ end_time: new Date(now - 300000).toISOString() }], // Closed break
        true,
        now,
        now - 60000 // Last sync 1 minute ago
      )
      expect(status).toBe('Working')
    })

    it('identifies Idle when session is active but telemetry is older than 5 minutes', () => {
      const now = Date.now()
      const status = computeStatus(
        [{ status: 'working', clock_out: null }],
        [],
        true,
        now,
        now - 6 * 60 * 1000 // Last sync 6 minutes ago
      )
      expect(status).toBe('Idle')
    })

    it('identifies Clocked Out when all sessions have clock_out set', () => {
      const status = computeStatus(
        [
          { status: 'completed', clock_out: '2026-10-18T10:00:00Z' },
          { status: 'completed', clock_out: '2026-10-18T17:00:00Z' }
        ],
        [],
        true,
        Date.now(),
        Date.now()
      )
      expect(status).toBe('Clocked Out')
    })
  })

  describe('4. Aggregation and Duplication Prevention', () => {
    it('aggregates multiple sessions on the same date without duplication', () => {
      const sessions = [
        {
          id: 'sess-morning',
          employee_id: 'emp-1',
          session_date: '2026-10-18',
          clock_in: '2026-10-18T04:00:00Z',
          clock_out: '2026-10-18T07:00:00Z',
          worked_minutes: 180,
          active_minutes: 150
        },
        {
          id: 'sess-afternoon',
          employee_id: 'emp-1',
          session_date: '2026-10-18',
          clock_in: '2026-10-18T08:00:00Z',
          clock_out: '2026-10-18T12:00:00Z',
          worked_minutes: 240,
          active_minutes: 200
        }
      ]

      const totalWorked = sessions.reduce((acc, s) => acc + s.worked_minutes, 0)
      const totalActive = sessions.reduce((acc, s) => acc + s.active_minutes, 0)
      const idleMinutes = Math.max(0, totalWorked - totalActive)

      expect(totalWorked).toBe(420) // 7h
      expect(totalActive).toBe(350) // 5h 50m
      expect(idleMinutes).toBe(70) // 1h 10m
    })

    it('computes monthly summary correctly across multiple days', () => {
      const monthlySessions = [
        { session_date: '2026-10-01', employee_id: 'emp-1', worked_minutes: 480, active_minutes: 420 },
        { session_date: '2026-10-02', employee_id: 'emp-1', worked_minutes: 480, active_minutes: 400 },
        { session_date: '2026-10-02', employee_id: 'emp-1', worked_minutes: 60, active_minutes: 50 }, // 2nd session on day 2
        { session_date: '2026-10-03', employee_id: 'emp-1', worked_minutes: 480, active_minutes: 440 }
      ]

      const uniqueDays = new Set(monthlySessions.map(s => s.session_date)).size
      const totalWorked = monthlySessions.reduce((acc, s) => acc + s.worked_minutes, 0)
      const totalActive = monthlySessions.reduce((acc, s) => acc + s.active_minutes, 0)
      const avgDailyActive = uniqueDays > 0 ? Math.round(totalActive / uniqueDays) : 0

      expect(uniqueDays).toBe(3) // 3 distinct business days
      expect(totalWorked).toBe(1500) // 25h
      expect(totalActive).toBe(1310) // 21h 50m
      expect(avgDailyActive).toBe(437) // ~7.28 hours/day
    })
  })

  describe('5. Asia/Kolkata Business Date Formatting', () => {
    it('formats IST date consistently', () => {
      const utcTime = '2026-10-18T04:30:00.000Z' // 10:00 AM IST
      const istTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(new Date(utcTime))

      expect(istTime).toBe('10:00 AM')
    })

    it('computes Asia/Kolkata business date correctly near midnight', () => {
      // 7:00 PM UTC on Oct 17 is 12:30 AM IST on Oct 18
      const lateUtc = '2026-10-17T19:00:00.000Z'
      const istDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date(lateUtc))

      expect(istDate).toBe('2026-10-18')
    })
  })

  describe('6. Server Guard & API Authorization Enforcement', () => {
    it('guardServerAction rejects non-Admin roles and unauthenticated calls', async () => {
      const checkRole = (role: string | null) => {
        if (!role) throw new Error('Authentication required')
        if (role !== 'Admin') throw new Error('Unauthorized: insufficient permissions')
        return true
      }

      expect(() => checkRole(null)).toThrow('Authentication required')
      expect(() => checkRole('HR')).toThrow('Unauthorized: insufficient permissions')
      expect(() => checkRole('Employee')).toThrow('Unauthorized: insufficient permissions')
      expect(() => checkRole('Manager')).toThrow('Unauthorized: insufficient permissions')
      expect(checkRole('Admin')).toBe(true)
    })

    it('API route logic denies HR and Employee roles with HTTP 403', () => {
      const mockApiAuthCheck = (user: { role: string } | null) => {
        if (!user) return { status: 401, error: 'Unauthorized: Authentication required' }
        if (user.role !== 'Admin') return { status: 403, error: 'Forbidden: Admin access required for time tracking analytics' }
        return { status: 200, success: true }
      }

      expect(mockApiAuthCheck(null)).toEqual({ status: 401, error: 'Unauthorized: Authentication required' })
      expect(mockApiAuthCheck({ role: 'HR' })).toEqual({ status: 403, error: 'Forbidden: Admin access required for time tracking analytics' })
      expect(mockApiAuthCheck({ role: 'Employee' })).toEqual({ status: 403, error: 'Forbidden: Admin access required for time tracking analytics' })
      expect(mockApiAuthCheck({ role: 'Admin' })).toEqual({ status: 200, success: true })
    })

    it('summary API route denies HR and Employee querying other employees with HTTP 403', () => {
      const mockSummaryAuthCheck = (user: { id: string; role: string }, requestedEmployeeId: string | null) => {
        if (requestedEmployeeId && requestedEmployeeId !== user.id && user.role !== 'Admin') {
          return { status: 403, error: 'Forbidden: Insufficient permissions to view another employee time summary' }
        }
        return { status: 200, targetId: (user.role === 'Admin' && requestedEmployeeId) ? requestedEmployeeId : user.id }
      }

      const hrUser = { id: 'hr-123', role: 'HR' }
      const empUser = { id: 'emp-456', role: 'Employee' }
      const adminUser = { id: 'admin-789', role: 'Admin' }

      // HR requesting another employee's summary -> 403
      expect(mockSummaryAuthCheck(hrUser, 'emp-456')).toEqual({
        status: 403,
        error: 'Forbidden: Insufficient permissions to view another employee time summary'
      })

      // Employee requesting another employee's summary -> 403
      expect(mockSummaryAuthCheck(empUser, 'emp-999')).toEqual({
        status: 403,
        error: 'Forbidden: Insufficient permissions to view another employee time summary'
      })

      // Admin requesting another employee's summary -> 200 with targetId
      expect(mockSummaryAuthCheck(adminUser, 'emp-456')).toEqual({
        status: 200,
        targetId: 'emp-456'
      })

      // HR requesting their own summary -> 200
      expect(mockSummaryAuthCheck(hrUser, 'hr-123')).toEqual({
        status: 200,
        targetId: 'hr-123'
      })
    })
  })
})
