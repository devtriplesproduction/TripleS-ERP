import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cancelLeaveAction, reviewLeaveAction, submitLeaveAction, resolveEmployeeOnboardingId } from '@/actions/leave.actions'

// Mock state
let mockCurrentUser: any = null
let mockLeaveRequests: any[] = []
let mockEmployeeOnboarding: any[] = []
let mockProfiles: any[] = []
let mockCompOffLedger: any[] = []

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(async () => mockCurrentUser),
  guardServerAction: vi.fn(async (allowedRoles: string[]) => {
    if (!mockCurrentUser) throw new Error('Authentication required')
    if (!allowedRoles.includes(mockCurrentUser.role)) {
      throw new Error('Unauthorized: insufficient permissions')
    }
    return mockCurrentUser
  }),
}))

vi.mock('@/lib/actions/compoff', () => ({
  processLeaveCompOff: vi.fn(async (leaveId: string, employeeId: string, diffDays: number, status: string) => {
    if (status === 'Cancelled' || status === 'Rejected') {
      mockCompOffLedger.push({
        id: `rev-${Date.now()}`,
        employee_id: employeeId,
        transaction_type: 'REVERSAL',
        hours: diffDays * 8,
        reference_id: leaveId,
      })
    }
  }),
  getCompOffBalance: vi.fn(async (employeeId: string) => 16),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => {
      let selectedFields = '*'
      let filters: { col: string; val: any }[] = []
      let singleMode = false
      let maybeSingleMode = false
      let insertPayload: any = null
      let updatePayload: any = null

      const queryBuilder = {
        select: (fields: string = '*') => {
          selectedFields = fields
          return queryBuilder
        },
        insert: (payload: any) => {
          insertPayload = payload
          return queryBuilder
        },
        update: (payload: any) => {
          updatePayload = payload
          return queryBuilder
        },
        eq: (col: string, val: any) => {
          filters.push({ col, val })
          return queryBuilder
        },
        single: async () => {
          singleMode = true
          return execute()
        },
        maybeSingle: async () => {
          maybeSingleMode = true
          return execute()
        },
        then: (resolve: any, reject: any) => {
          return execute().then(resolve, reject)
        },
      }

      async function execute() {
        let dataset: any[] = []
        if (table === 'leave_requests') dataset = mockLeaveRequests
        else if (table === 'employee_onboarding') dataset = mockEmployeeOnboarding
        else if (table === 'profiles') dataset = mockProfiles
        else if (table === 'comp_off_ledger') dataset = mockCompOffLedger

        if (insertPayload) {
          const row = {
            id: insertPayload.id || `leave-${Date.now()}-${Math.random()}`,
            status: insertPayload.status || 'Pending Level',
            created_at: new Date().toISOString(),
            ...insertPayload,
          }
          dataset.push(row)
          return { data: row, error: null }
        }

        if (updatePayload) {
          let updatedCount = 0
          for (const item of dataset) {
            let match = true
            for (const f of filters) {
              if (item[f.col] !== f.val) match = false
            }
            if (match) {
              Object.assign(item, updatePayload)
              updatedCount++
            }
          }
          return { data: null, error: null }
        }

        // Filter
        let results = dataset.filter((item) => {
          for (const f of filters) {
            if (item[f.col] !== f.val) return false
          }
          return true
        })

        if (singleMode || maybeSingleMode) {
          const first = results[0] || null
          if (singleMode && !first) {
            return { data: null, error: { message: 'Row not found' } }
          }
          return { data: first, error: null }
        }

        return { data: results, error: null }
      }

      return queryBuilder
    },
  })),
}))

describe('Leave & WFH Cancellation Authorization', () => {
  beforeEach(() => {
    mockCurrentUser = null
    mockCompOffLedger = []

    mockEmployeeOnboarding = [
      {
        id: 'onb-shital-uuid',
        first_name: 'Shital',
        last_name: 'Khulape',
        employee_id_number: 'EMP-004',
        email: 'shital.khulape@tsp.com',
        role: 'Employee',
        employment_status: 'Active',
      },
      {
        id: 'onb-prince-uuid',
        first_name: 'Prince',
        last_name: 'Nandagawali',
        employee_id_number: 'EMP-001',
        email: 'prince@tsp.com',
        role: 'Employee',
        employment_status: 'Active',
      },
      {
        id: 'onb-suraj-uuid',
        first_name: 'Suraj',
        last_name: 'Mane',
        employee_id_number: 'EMP-005',
        email: 'suraj@tsp.com',
        role: 'Employee',
        employment_status: 'Active',
      },
      {
        id: 'onb-hr-uuid',
        first_name: 'H',
        last_name: 'R',
        employee_id_number: 'EMP-006',
        email: 'hr@tsp.com',
        role: 'HR',
        employment_status: 'Active',
      },
    ]

    mockProfiles = [
      {
        id: 'prof-shital-auth-id',
        employee_id: 'EMP-004',
        role: 'Employee',
        first_name: 'Shital',
        last_name: 'Khulape',
      },
      {
        id: 'prof-prince-auth-id',
        employee_id: 'EMP-001',
        role: 'Employee',
        first_name: 'Prince',
        last_name: 'Nandagawali',
      },
      {
        id: 'prof-suraj-auth-id',
        employee_id: 'EMP-005',
        role: 'Employee',
        first_name: 'Suraj',
        last_name: 'Mane',
      },
      {
        id: 'prof-hr-auth-id',
        employee_id: 'EMP-006',
        role: 'HR',
        first_name: 'H',
        last_name: 'R',
      },
      {
        id: 'prof-admin-auth-id',
        employee_id: null,
        role: 'Admin',
        first_name: 'Admin',
        last_name: 'User',
      },
    ]

    mockLeaveRequests = [
      // Shital's pending comp-off leave (like in the screenshot, Oct 31, 2026)
      {
        id: 'leave-shital-pending-compoff',
        employee_id: 'onb-shital-uuid',
        leave_type: 'Compensatory Off',
        request_type: 'LEAVE',
        start_date: '2026-10-31',
        end_date: '2026-10-31',
        is_half_day: true,
        status: 'Pending HR',
        reason: 'unnecessary bus card queue',
      },
      // Shital's pending casual leave
      {
        id: 'leave-shital-pending-casual',
        employee_id: 'onb-shital-uuid',
        leave_type: 'Casual Leave',
        request_type: 'LEAVE',
        start_date: '2026-10-31',
        end_date: '2026-10-31',
        is_half_day: true,
        status: 'Pending HR',
        reason: 'personal reason',
      },
      // Shital's upcoming approved leave (future date)
      {
        id: 'leave-shital-upcoming-approved',
        employee_id: 'onb-shital-uuid',
        leave_type: 'Casual Leave',
        request_type: 'LEAVE',
        start_date: '2026-11-20',
        end_date: '2026-11-21',
        is_half_day: false,
        status: 'Approved',
        reason: 'family function',
      },
      // Shital's past approved leave (already completed)
      {
        id: 'leave-shital-past-approved',
        employee_id: 'onb-shital-uuid',
        leave_type: 'Compensatory Off',
        request_type: 'LEAVE',
        start_date: '2026-10-21',
        end_date: '2026-10-21',
        is_half_day: false,
        status: 'Approved',
        reason: 'due to personal reason',
      },
      // Shital's already cancelled request
      {
        id: 'leave-shital-already-cancelled',
        employee_id: 'onb-shital-uuid',
        leave_type: 'Sick Leave',
        request_type: 'LEAVE',
        start_date: '2026-10-10',
        end_date: '2026-10-10',
        is_half_day: false,
        status: 'Cancelled',
        reason: 'feeling better',
      },
      // Shital's rejected request
      {
        id: 'leave-shital-rejected',
        employee_id: 'onb-shital-uuid',
        leave_type: 'Casual Leave',
        request_type: 'LEAVE',
        start_date: '2026-10-25',
        end_date: '2026-10-25',
        is_half_day: false,
        status: 'Rejected',
        reason: 'critical sprint deadline',
      },
      // Prince's pending leave request
      {
        id: 'leave-prince-pending',
        employee_id: 'onb-prince-uuid',
        leave_type: 'Sick Leave',
        request_type: 'LEAVE',
        start_date: '2026-11-05',
        end_date: '2026-11-06',
        is_half_day: false,
        status: 'Pending HR',
        reason: 'fever and headache',
      },
      // Suraj's pending WFH request
      {
        id: 'wfh-suraj-pending',
        employee_id: 'onb-suraj-uuid',
        leave_type: null,
        request_type: 'WFH',
        start_date: '2026-11-10',
        end_date: '2026-11-10',
        is_half_day: false,
        status: 'Pending HR',
        reason: 'home network maintenance',
      },
    ]
  })

  describe('1. Logged-in Employee Cancelling Their Own Requests', () => {
    it('allows Shital to cancel her own Pending Compensatory Off request without authorization error', async () => {
      // Authenticated as Shital (profiles.id !== employee_onboarding.id)
      mockCurrentUser = {
        id: 'prof-shital-auth-id',
        email: 'shital.khulape@tsp.com',
        role: 'Employee',
        employee_id: 'EMP-004',
        employee_name: 'Shital Khulape',
        onboarding_id: 'onb-shital-uuid',
      }

      const res = await cancelLeaveAction('leave-shital-pending-compoff')
      expect(res.success).toBe(true)

      const leave = mockLeaveRequests.find((l) => l.id === 'leave-shital-pending-compoff')
      expect(leave?.status).toBe('Cancelled')
    })

    it('allows Shital to cancel her own Pending request even when onboarding_id is resolved dynamically', async () => {
      // Authenticated as Shital without pre-populated onboarding_id in session
      mockCurrentUser = {
        id: 'prof-shital-auth-id',
        email: 'shital.khulape@tsp.com',
        role: 'Employee',
        employee_id: 'EMP-004',
        employee_name: 'Shital Khulape',
      }

      const res = await cancelLeaveAction('leave-shital-pending-casual')
      expect(res.success).toBe(true)

      const leave = mockLeaveRequests.find((l) => l.id === 'leave-shital-pending-casual')
      expect(leave?.status).toBe('Cancelled')
    })

    it('allows cancelling an upcoming approved leave and reverses comp-off ledger debit', async () => {
      mockCurrentUser = {
        id: 'prof-shital-auth-id',
        email: 'shital.khulape@tsp.com',
        role: 'Employee',
        employee_id: 'EMP-004',
        onboarding_id: 'onb-shital-uuid',
      }

      const res = await cancelLeaveAction('leave-shital-upcoming-approved')
      expect(res.success).toBe(true)

      const leave = mockLeaveRequests.find((l) => l.id === 'leave-shital-upcoming-approved')
      expect(leave?.status).toBe('Cancelled')
    })
  })

  describe('2. Multi-Employee Isolation (Prevent Cross-Account Cancellation)', () => {
    it('prevents Prince from cancelling Shital’s pending leave request', async () => {
      // Authenticated as Prince
      mockCurrentUser = {
        id: 'prof-prince-auth-id',
        email: 'prince@tsp.com',
        role: 'Employee',
        employee_id: 'EMP-001',
        employee_name: 'Prince Nandagawali',
        onboarding_id: 'onb-prince-uuid',
      }

      const res = await cancelLeaveAction('leave-shital-pending-compoff')
      expect(res.success).toBe(false)
      expect(res.error).toBe('Unauthorized: You can only cancel your own leave requests')

      // Verify Shital's leave was NOT cancelled
      const leave = mockLeaveRequests.find((l) => l.id === 'leave-shital-pending-compoff')
      expect(leave?.status).toBe('Pending HR')
    })

    it('prevents Suraj from cancelling Prince’s pending leave request', async () => {
      // Authenticated as Suraj
      mockCurrentUser = {
        id: 'prof-suraj-auth-id',
        email: 'suraj@tsp.com',
        role: 'Employee',
        employee_id: 'EMP-005',
        employee_name: 'Suraj Mane',
        onboarding_id: 'onb-suraj-uuid',
      }

      const res = await cancelLeaveAction('leave-prince-pending')
      expect(res.success).toBe(false)
      expect(res.error).toBe('Unauthorized: You can only cancel your own leave requests')

      const leave = mockLeaveRequests.find((l) => l.id === 'leave-prince-pending')
      expect(leave?.status).toBe('Pending HR')
    })

    it('prevents Shital from cancelling Suraj’s WFH request', async () => {
      // Authenticated as Shital
      mockCurrentUser = {
        id: 'prof-shital-auth-id',
        email: 'shital.khulape@tsp.com',
        role: 'Employee',
        employee_id: 'EMP-004',
        onboarding_id: 'onb-shital-uuid',
      }

      const res = await cancelLeaveAction('wfh-suraj-pending')
      expect(res.success).toBe(false)
      expect(res.error).toBe('Unauthorized: You can only cancel your own leave requests')

      const leave = mockLeaveRequests.find((l) => l.id === 'wfh-suraj-pending')
      expect(leave?.status).toBe('Pending HR')
    })
  })

  describe('3. Non-Cancellable Requests & Business Rules', () => {
    it('prevents cancelling an already cancelled leave request', async () => {
      mockCurrentUser = {
        id: 'prof-shital-auth-id',
        email: 'shital.khulape@tsp.com',
        role: 'Employee',
        employee_id: 'EMP-004',
        onboarding_id: 'onb-shital-uuid',
      }

      const res = await cancelLeaveAction('leave-shital-already-cancelled')
      expect(res.success).toBe(false)
      expect(res.error).toBe('This request has already been cancelled')
    })

    it('prevents cancelling an already rejected leave request', async () => {
      mockCurrentUser = {
        id: 'prof-shital-auth-id',
        email: 'shital.khulape@tsp.com',
        role: 'Employee',
        employee_id: 'EMP-004',
        onboarding_id: 'onb-shital-uuid',
      }

      const res = await cancelLeaveAction('leave-shital-rejected')
      expect(res.success).toBe(false)
      expect(res.error).toBe('Cannot cancel a rejected request')
    })

    it('prevents employees from cancelling past approved leaves that were already completed', async () => {
      mockCurrentUser = {
        id: 'prof-shital-auth-id',
        email: 'shital.khulape@tsp.com',
        role: 'Employee',
        employee_id: 'EMP-004',
        onboarding_id: 'onb-shital-uuid',
      }

      // Past approved leave from Oct 21, 2026
      const res = await cancelLeaveAction('leave-shital-past-approved')
      expect(res.success).toBe(false)
      expect(res.error).toBe('Cannot cancel a leave request that has already been completed')

      const leave = mockLeaveRequests.find((l) => l.id === 'leave-shital-past-approved')
      expect(leave?.status).toBe('Approved')
    })
  })

  describe('4. HR and Admin Permissions & Workflow Preservation', () => {
    it('allows Admin to cancel an employee leave request', async () => {
      mockCurrentUser = {
        id: 'prof-admin-auth-id',
        email: 'admin@tsp.com',
        role: 'Admin',
        employee_id: null,
      }

      const res = await cancelLeaveAction('leave-shital-pending-casual')
      expect(res.success).toBe(true)

      const leave = mockLeaveRequests.find((l) => l.id === 'leave-shital-pending-casual')
      expect(leave?.status).toBe('Cancelled')
    })

    it('allows HR to cancel an employee leave request', async () => {
      mockCurrentUser = {
        id: 'prof-hr-auth-id',
        email: 'hr@tsp.com',
        role: 'HR',
        employee_id: 'EMP-006',
        onboarding_id: 'onb-hr-uuid',
      }

      const res = await cancelLeaveAction('leave-prince-pending')
      expect(res.success).toBe(true)

      const leave = mockLeaveRequests.find((l) => l.id === 'leave-prince-pending')
      expect(leave?.status).toBe('Cancelled')
    })

    it('prevents HR/Admin from reviewing an already cancelled leave', async () => {
      mockCurrentUser = {
        id: 'prof-hr-auth-id',
        email: 'hr@tsp.com',
        role: 'HR',
        employee_id: 'EMP-006',
      }

      const res = await reviewLeaveAction('leave-shital-already-cancelled', 'Approved')
      expect(res.success).toBe(false)
      expect(res.error).toBe('Cannot review an already cancelled leave request')
    })
  })

  describe('5. Canonical Identity Resolver Unit Tests', () => {
    it('resolves directly from onboarding_id if provided', async () => {
      const id = await resolveEmployeeOnboardingId(
        { onboarding_id: 'onb-shital-uuid', employee_id: 'EMP-004' },
        null
      )
      expect(id).toBe('onb-shital-uuid')
    })

    it('resolves from employee_id_number via database lookup', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const client = await createClient()

      const id = await resolveEmployeeOnboardingId(
        { employee_id: 'EMP-004', id: 'prof-shital-auth-id' },
        client
      )
      expect(id).toBe('onb-shital-uuid')
    })

    it('returns null if employee onboarding record does not exist', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const client = await createClient()

      const id = await resolveEmployeeOnboardingId(
        { employee_id: 'EMP-999', id: 'unknown-id' },
        client
      )
      expect(id).toBe(null)
    })
  })
})
