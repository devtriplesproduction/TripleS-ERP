import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateEmployeeData, getEmployeeById } from '@/lib/actions/onboarding'
import {
  calculateProbationEndDate,
  parseMonthsFromDuration,
  getDurationForDates,
  formatProbationDateDisplay,
  getProbationStatus,
} from '@/lib/utils/probation'

// Mock state
let mockCurrentUser: any = {
  id: 'user-admin-1',
  email: 'admin@triples.com',
  role: 'Admin',
  employee_id: 'TSP001',
}

let mockEmployees: Record<string, any> = {}
let revalidatedPaths: string[] = []

vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => {
    revalidatedPaths.push(path)
  },
}))

vi.mock('@/lib/auth', () => ({
  getCurrentUser: async () => mockCurrentUser,
  guardServerAction: async (allowedRoles: string[]) => {
    if (!mockCurrentUser) throw new Error('Authentication required')
    if (!allowedRoles.includes(mockCurrentUser.role)) {
      throw new Error('Unauthorized: insufficient permissions')
    }
    return mockCurrentUser
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => ({
      select: (cols: string = '*') => ({
        eq: (col: string, val: string) => ({
          single: async () => {
            if (table === 'employee_onboarding' && col === 'id') {
              const emp = mockEmployees[val]
              if (!emp) return { data: null, error: { message: 'Not found' } }
              return { data: { ...emp }, error: null }
            }
            return { data: null, error: null }
          },
          order: () => ({
            then: (resolve: any) => resolve({ data: [], error: null }),
          }),
        }),
      }),
      update: (payload: any) => ({
        eq: async (col: string, val: string) => {
          if (table === 'employee_onboarding' && col === 'id') {
            const emp = mockEmployees[val]
            if (!emp) return { data: null, error: { message: 'Employee not found' } }
            Object.assign(emp, payload)
            return { data: emp, error: null }
          }
          return { data: null, error: null }
        },
      }),
    }),
  }),
  createAdminClient: async () => ({
    from: (table: string) => ({
      select: () => ({
        eq: (col: string, val: string) => ({
          single: async () => {
            if (table === 'employee_onboarding' && col === 'id') {
              const emp = mockEmployees[val]
              if (!emp) return { data: null, error: { message: 'Not found' } }
              return { data: { ...emp }, error: null }
            }
            return { data: null, error: { message: 'Not found' } }
          },
        }),
      }),
      update: () => ({
        eq: async () => ({ data: null, error: null }),
      }),
    }),
    auth: {
      admin: {
        listUsers: async () => ({ data: { users: [] }, error: null }),
        updateUserById: async () => ({ data: null, error: null }),
      },
    },
  }),
}))

describe('Probation Period End-to-End Logic & Persistence', () => {
  beforeEach(() => {
    revalidatedPaths = []
    mockCurrentUser = {
      id: 'user-admin-1',
      email: 'admin@triples.com',
      role: 'Admin',
      employee_id: 'TSP001',
    }
    mockEmployees = {
      'emp-suraj': {
        id: 'emp-suraj',
        first_name: 'Suraj',
        last_name: 'Admin',
        employee_id_number: 'TSP002',
        joining_date: '2026-10-01',
        employment_type: 'Full Time',
        employment_status: 'Active',
        probation_start_date: null,
        probation_end_date: null,
        probation_period: null,
      },
      'emp-no-joining': {
        id: 'emp-no-joining',
        first_name: 'Jane',
        last_name: 'Doe',
        employee_id_number: 'TSP003',
        joining_date: null,
        employment_type: 'Full Time',
        employment_status: 'Active',
        probation_start_date: null,
        probation_end_date: null,
        probation_period: null,
      },
    }
  })

  describe('Date Calculation and Empty States', () => {
    it('automatically calculates probation end date when duration is selected from joining date', () => {
      const emp = mockEmployees['emp-suraj']
      expect(emp.joining_date).toBe('2026-10-01')

      // Select 3 months
      const calculatedEnd3 = calculateProbationEndDate(emp.joining_date, 3)
      expect(calculatedEnd3).toBe('2027-01-01')

      // Select 6 months
      const calculatedEnd6 = calculateProbationEndDate(emp.joining_date, 6)
      expect(calculatedEnd6).toBe('2027-04-01')

      // Select 12 months
      const calculatedEnd12 = calculateProbationEndDate(emp.joining_date, 12)
      expect(calculatedEnd12).toBe('2027-10-01')
    })

    it('displays clear empty state and does NOT invent a fictitious date when joining date is missing', () => {
      const emp = mockEmployees['emp-no-joining']
      expect(emp.joining_date).toBeNull()

      const calculated = calculateProbationEndDate(emp.joining_date, 3)
      expect(calculated).toBeNull()

      // Empty state formatting
      expect(formatProbationDateDisplay(emp.joining_date)).toBe('-')
      expect(formatProbationDateDisplay(emp.probation_end_date)).toBe('-')
    })

    it('allows Admin/HR to manually pick/adjust probation end date to custom date', () => {
      const joiningDate = '2026-10-01'
      const customDate = '2027-02-15'

      // Matching duration should report custom
      const duration = getDurationForDates(joiningDate, customDate)
      expect(duration).toBe('custom')
    })
  })

  describe('Server Action Persistence', () => {
    it('allows Admin to save probation details and persists them', async () => {
      mockCurrentUser.role = 'Admin'

      const result = await updateEmployeeData('emp-suraj', {
        probation_period: '3 Months',
        probation_end_date: '2027-01-01',
        probation_start_date: '2026-10-01',
      })

      expect(result.success).toBe(true)
      expect(mockEmployees['emp-suraj'].probation_period).toBe('3 Months')
      expect(mockEmployees['emp-suraj'].probation_end_date).toBe('2027-01-01')
      expect(mockEmployees['emp-suraj'].probation_start_date).toBe('2026-10-01')

      // Check revalidation
      expect(revalidatedPaths).toContain('/employees/emp-suraj')
      expect(revalidatedPaths).toContain('/employees')
    })

    it('allows HR to save probation details', async () => {
      mockCurrentUser.role = 'HR'

      const result = await updateEmployeeData('emp-suraj', {
        probation_period: '6 Months',
        probation_end_date: '2027-04-01',
        probation_start_date: '2026-10-01',
      })

      expect(result.success).toBe(true)
      expect(mockEmployees['emp-suraj'].probation_period).toBe('6 Months')
      expect(mockEmployees['emp-suraj'].probation_end_date).toBe('2027-04-01')
    })

    it('rejects non-Admin and non-HR users with Unauthorized', async () => {
      mockCurrentUser.role = 'Employee'

      await expect(
        updateEmployeeData('emp-suraj', {
          probation_period: '3 Months',
          probation_end_date: '2027-01-01',
        })
      ).rejects.toThrow('Unauthorized')
    })

    it('clears probation details when None / No Probation is selected', async () => {
      mockCurrentUser.role = 'Admin'

      // Set first
      mockEmployees['emp-suraj'].probation_period = '3 Months'
      mockEmployees['emp-suraj'].probation_end_date = '2027-01-01'

      // Clear
      const result = await updateEmployeeData('emp-suraj', {
        probation_period: null,
        probation_end_date: null,
      })

      expect(result.success).toBe(true)
      expect(mockEmployees['emp-suraj'].probation_period).toBeNull()
      expect(mockEmployees['emp-suraj'].probation_end_date).toBeNull()
    })
  })
})
