import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculateMonthlyBasicSalary,
  calculateIncrementPercentage,
  resolveCurrentSalary
} from '@/lib/utils/salary'
import { addSalaryIncrementAction, getSalaryHistoryAction } from '@/lib/actions/payroll'

// Mocks
let mockCurrentUser: any = {
  id: 'user-admin-1',
  email: 'admin@triples.com',
  role: 'Admin',
  employee_id: 'TSP001',
  employee_name: 'Admin User',
}

let mockSalaryHistory: Record<string, any[]> = {}
let mockEmployees: Record<string, any> = {}
let revalidatedPaths: string[] = []

vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => {
    revalidatedPaths.push(path)
  },
}))

vi.mock('@/lib/auth', () => ({
  getCurrentUser: async () => mockCurrentUser,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => ({
      select: (cols: string) => ({
        eq: (col: string, val: string) => ({
          order: () => ({
            order: async () => {
              if (table === 'salary_history') {
                return { data: mockSalaryHistory[val] || [], error: null }
              }
              return { data: [], error: null }
            }
          }),
          single: async () => {
            if (table === 'employee_onboarding') {
              const emp = mockEmployees[val]
              if (!emp) return { data: null, error: { message: 'Not found' } }
              return { data: emp, error: null }
            }
            return { data: null, error: null }
          }
        })
      }),
      insert: async (row: any) => {
        if (table === 'salary_history') {
          // Check for NOT NULL constraint violations matching postgres
          if (row.increment_percentage === null || row.increment_percentage === undefined) {
            return {
              data: null,
              error: {
                message: 'null value in column "increment_percentage" of relation "salary_history" violates not-null constraint'
              }
            }
          }
          if (row.previous_salary === null || row.previous_salary === undefined) {
            return {
              data: null,
              error: {
                message: 'null value in column "previous_salary" of relation "salary_history" violates not-null constraint'
              }
            }
          }
          if (row.new_salary === null || row.new_salary === undefined) {
            return {
              data: null,
              error: {
                message: 'null value in column "new_salary" of relation "salary_history" violates not-null constraint'
              }
            }
          }
          if (!mockSalaryHistory[row.employee_id]) {
            mockSalaryHistory[row.employee_id] = []
          }
          const record = { id: 'hist-' + Date.now(), ...row, created_at: new Date().toISOString() }
          mockSalaryHistory[row.employee_id].unshift(record)
          return { data: [record], error: null }
        }
        return { data: null, error: null }
      },
      update: (payload: any) => ({
        eq: async (col: string, val: string) => {
          if (table === 'employee_onboarding') {
            const emp = mockEmployees[val]
            if (!emp) return { data: null, error: { message: 'Employee not found' } }
            Object.assign(emp, payload)
            return { data: emp, error: null }
          }
          return { data: null, error: null }
        }
      })
    })
  })
}))

describe('Salary & Hike Management Tests', () => {
  beforeEach(() => {
    mockCurrentUser = {
      id: 'user-admin-1',
      email: 'admin@triples.com',
      role: 'Admin',
      employee_id: 'TSP001',
      employee_name: 'Admin User',
    }
    mockSalaryHistory = {}
    mockEmployees = {}
    revalidatedPaths = []
  })

  describe('1. Increment Percentage Calculation', () => {
    it('calculates standard percentage correctly: (new - prev) / prev * 100', () => {
      // 20000 -> 25000 is 25%
      expect(calculateIncrementPercentage(20000, 25000)).toBe(25)
      // 22000 -> 25000 is 13.64%
      expect(calculateIncrementPercentage(22000, 25000)).toBe(13.64)
      // 100 -> 18000 is 17900%
      expect(calculateIncrementPercentage(100, 18000)).toBe(17900)
      // 1 -> 2 is 100%
      expect(calculateIncrementPercentage(1, 2)).toBe(100)
    })

    it('safely handles zero or missing previous salary without returning Infinity, NaN, or null', () => {
      expect(calculateIncrementPercentage(0, 50000)).toBe(0)
      expect(calculateIncrementPercentage(null, 50000)).toBe(0)
      expect(calculateIncrementPercentage(undefined, 50000)).toBe(0)
      expect(calculateIncrementPercentage(-100, 50000)).toBe(0)
    })

    it('safely handles invalid new salary inputs', () => {
      expect(calculateIncrementPercentage(20000, 0)).toBe(0)
      expect(calculateIncrementPercentage(20000, null)).toBe(0)
      expect(calculateIncrementPercentage(20000, undefined)).toBe(0)
      expect(calculateIncrementPercentage(20000, NaN)).toBe(0)
    })
  })

  describe('2. Resolve Current Salary from DB Records', () => {
    it('prefers the latest salary_history new_salary if present', () => {
      const emp = {
        salary: 240000,
        basic_salary: 20000,
        employment_type: 'Full Time'
      }
      const history = [
        { new_salary: 25000, previous_salary: 20000, effective_date: '2026-10-01' },
        { new_salary: 20000, previous_salary: 15000, effective_date: '2026-01-01' }
      ]
      expect(resolveCurrentSalary(emp, history)).toBe(25000)
    })

    it('resolves basic_salary for Full Time employee when no history exists', () => {
      const emp = {
        salary: 264000,
        basic_salary: 22000,
        stipend: null,
        employment_type: 'Full Time'
      }
      expect(resolveCurrentSalary(emp, [])).toBe(22000)
    })

    it('resolves monthly basic salary from annual salary if basic_salary is not set', () => {
      const emp = {
        salary: 120000,
        basic_salary: null,
        stipend: null,
        employment_type: 'Full Time'
      }
      expect(resolveCurrentSalary(emp, [])).toBe(10000) // 120000 / 12
    })

    it('resolves stipend for Interns (e.g. Prachi Thorat with stipend = 1)', () => {
      const prachi = {
        salary: null,
        basic_salary: null,
        stipend: 1,
        employment_type: 'Intern'
      }
      // Must NEVER default to 0 when stipend exists!
      expect(resolveCurrentSalary(prachi, [])).toBe(1)
    })

    it('resolves stipend for Interns with regular stipend (e.g. Omkar with stipend = 8000)', () => {
      const omkar = {
        salary: null,
        basic_salary: null,
        stipend: 8000,
        employment_type: 'Intern'
      }
      expect(resolveCurrentSalary(omkar, [])).toBe(8000)
    })

    it('returns null (genuinely missing) when employee has no salary records, never defaulting to 0', () => {
      const missingSalaryEmp = {
        salary: null,
        basic_salary: null,
        stipend: null,
        employment_type: 'Full Time'
      }
      expect(resolveCurrentSalary(missingSalaryEmp, [])).toBeNull()
      expect(resolveCurrentSalary(null, null)).toBeNull()
    })
  })

  describe('3. addSalaryIncrementAction Flow and Constraint Safety', () => {
    it('applies hike successfully for employee with existing salary and non-null increment_percentage', async () => {
      const empId = 'emp-suraj-1'
      mockEmployees[empId] = {
        id: empId,
        first_name: 'Suraj',
        last_name: 'Mane',
        salary: 264000,
        basic_salary: 22000,
        employment_type: 'Full Time'
      }

      const res = await addSalaryIncrementAction(empId, 22000, 25000, 13.64, '2026-11-01', 300000)
      expect(res.success).toBe(true)
      expect(res.newSalary).toBe(25000)
      expect(res.incrementPercentage).toBe(13.64)

      // Verify salary history row
      const history = mockSalaryHistory[empId]
      expect(history).toHaveLength(1)
      expect(history[0].previous_salary).toBe(22000)
      expect(history[0].new_salary).toBe(25000)
      expect(history[0].increment_percentage).toBe(13.64)
      expect(history[0].effective_date).toBe('2026-11-01')

      // Verify employee_onboarding was updated
      expect(mockEmployees[empId].salary).toBe(300000)
      expect(mockEmployees[empId].basic_salary).toBe(25000)

      // Verify paths revalidated
      expect(revalidatedPaths).toContain('/employees')
      expect(revalidatedPaths).toContain(`/employees/${empId}`)
      expect(revalidatedPaths).toContain('/payroll')
    })

    it('safely handles zero or missing previous salary without violating database NOT NULL constraint', async () => {
      const empId = 'emp-missing-1'
      mockEmployees[empId] = {
        id: empId,
        first_name: 'New',
        last_name: 'Joiner',
        salary: null,
        basic_salary: null,
        employment_type: 'Full Time'
      }

      // Previous salary is 0 / null
      const res = await addSalaryIncrementAction(empId, 0, 30000, null, '2026-10-23', 360000)
      expect(res.success).toBe(true)
      expect(res.incrementPercentage).toBe(0) // Calculated safely as 0, not null/Infinity!

      const history = mockSalaryHistory[empId]
      expect(history).toHaveLength(1)
      expect(history[0].previous_salary).toBe(0) // Safe numeric
      expect(history[0].new_salary).toBe(30000)
      expect(history[0].increment_percentage).toBe(0) // Satisfies not-null!
    })

    it('keeps stipend in sync when hike is applied to an Intern', async () => {
      const empId = 'emp-prachi-1'
      mockEmployees[empId] = {
        id: empId,
        first_name: 'Prachi',
        last_name: 'Thorat',
        salary: null,
        basic_salary: null,
        stipend: 1,
        employment_type: 'Intern'
      }

      // Intern receiving a hike from 1 to 2 (100% increment)
      const res = await addSalaryIncrementAction(empId, 1, 2, 100, '2026-10-23', 24)
      expect(res.success).toBe(true)

      expect(mockEmployees[empId].salary).toBe(24)
      expect(mockEmployees[empId].basic_salary).toBe(2)
      expect(mockEmployees[empId].stipend).toBe(2) // Stipend updated in sync!

      const history = mockSalaryHistory[empId]
      expect(history[0].previous_salary).toBe(1)
      expect(history[0].new_salary).toBe(2)
      expect(history[0].increment_percentage).toBe(100)
    })

    it('allows confirming baseline salary when new salary equals previous salary (e.g. 1 to 1)', async () => {
      const empId = 'emp-prachi-same'
      mockEmployees[empId] = {
        id: empId,
        first_name: 'Prachi',
        last_name: 'Thorat',
        salary: null,
        basic_salary: null,
        stipend: 1,
        employment_type: 'Intern'
      }

      // User confirms salary at 1
      const res = await addSalaryIncrementAction(empId, 1, 1, 0, '2026-10-23', 12)
      expect(res.success).toBe(true)
      expect(res.newSalary).toBe(1)
      expect(res.incrementPercentage).toBe(0)

      const history = mockSalaryHistory[empId]
      expect(history).toHaveLength(1)
      expect(history[0].previous_salary).toBe(1)
      expect(history[0].new_salary).toBe(1)
      expect(history[0].increment_percentage).toBe(0)
    })

    it('rejects unauthorized users from applying salary increments', async () => {
      mockCurrentUser = {
        id: 'user-employee-1',
        role: 'Employee'
      }

      const res = await addSalaryIncrementAction('emp-1', 20000, 25000, 25, '2026-10-23', 300000)
      expect(res.success).toBe(false)
      expect(res.error).toContain('Unauthorized')
    })
  })

  describe('4. getSalaryHistoryAction and Salary Details Resolution', () => {
    it('fetches history and current salary accurately', async () => {
      const empId = 'emp-suraj-1'
      mockEmployees[empId] = {
        id: empId,
        first_name: 'Suraj',
        last_name: 'Mane',
        salary: 264000,
        basic_salary: 22000,
        employment_type: 'Full Time'
      }
      mockSalaryHistory[empId] = [
        {
          id: 'hist-1',
          employee_id: empId,
          previous_salary: 18000,
          new_salary: 22000,
          increment_percentage: 22.22,
          effective_date: '2026-07-01'
        }
      ]

      const res = await getSalaryHistoryAction(empId)
      expect(res.success).toBe(true)
      expect(res.data).toHaveLength(1)
      expect(res.currentSalary).toBe(22000)
      expect(res.employee.first_name).toBe('Suraj')
    })

    it('returns currentSalary as null when salary is genuinely missing', async () => {
      const empId = 'emp-no-salary'
      mockEmployees[empId] = {
        id: empId,
        salary: null,
        basic_salary: null,
        stipend: null,
        employment_type: 'Full Time'
      }
      mockSalaryHistory[empId] = []

      const res = await getSalaryHistoryAction(empId)
      expect(res.success).toBe(true)
      expect(res.currentSalary).toBeNull()
    })
  })
})
