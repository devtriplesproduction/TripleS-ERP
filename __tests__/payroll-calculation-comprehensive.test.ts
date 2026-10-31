import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calculateMonthlyPayroll } from '@/lib/services/payroll.service'
import { calculateMonthlyBasicSalary, calculateIncrementPercentage, resolveCurrentSalary } from '@/lib/utils/salary'

// Mock Supabase admin client for calculateMonthlyPayroll
let mockEmployees: any[] = []
let mockProfiles: any[] = []
let mockEODs: any[] = []
let mockHolidays: any[] = []
let mockLeaves: any[] = []
let mockCompOffLedger: any[] = []

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: async () => ({
    from: (table: string) => {
      let currentData: any[] = []
      if (table === 'employee_onboarding') currentData = mockEmployees
      else if (table === 'profiles') currentData = mockProfiles
      else if (table === 'eod_reports') currentData = mockEODs
      else if (table === 'holidays') currentData = mockHolidays
      else if (table === 'leave_requests') currentData = mockLeaves
      else if (table === 'comp_off_ledger') currentData = mockCompOffLedger

      const createQueryBuilder = (filteredData: any[]) => {
        const builder: any = {
          data: filteredData,
          error: null,
          select: () => builder,
          in: (col: string, vals: any[]) => createQueryBuilder(filteredData.filter(item => vals.includes(item[col]))),
          eq: (col: string, val: any) => createQueryBuilder(filteredData.filter(item => item[col] === val)),
          gte: (col: string, val: any) => createQueryBuilder(filteredData.filter(item => item[col] >= val)),
          lte: (col: string, val: any) => createQueryBuilder(filteredData.filter(item => item[col] <= val)),
          then: (resolve: any) => resolve({ data: filteredData, error: null })
        }
        return builder
      }

      return {
        select: (cols?: string) => createQueryBuilder(currentData),
        insert: async (rows: any[]) => {
          mockCompOffLedger.push(...rows)
          return { data: rows, error: null }
        }
      }
    }
  })
}))

describe('Comprehensive Payroll Calculations', () => {
  beforeEach(() => {
    mockEmployees = []
    mockProfiles = []
    mockEODs = []
    mockHolidays = []
    mockLeaves = []
    mockCompOffLedger = []
  })

  it('correctly resolves basic_salary for regular employees and stipend for interns', async () => {
    mockEmployees = [
      {
        id: 'emp-1',
        first_name: 'Suraj',
        last_name: 'Mane',
        department: 'Engineering',
        salary: 264000, // Annual CTC
        basic_salary: 22000, // Monthly Basic
        employee_id_number: 'EMP-001',
        employment_type: 'Full Time',
        stipend: null
      },
      {
        id: 'emp-2',
        first_name: 'Prachi',
        last_name: 'Thorat',
        department: 'Design',
        salary: null,
        basic_salary: null,
        employee_id_number: 'EMP-002',
        employment_type: 'Intern',
        stipend: 8000
      }
    ]

    mockProfiles = [
      { id: 'auth-1', employee_id: 'EMP-001' },
      { id: 'auth-2', employee_id: 'EMP-002' }
    ]

    // 1 EOD for each
    mockEODs = [
      { id: 'eod-1', employee_id: 'auth-1', office_hours: 8, report_date: '2026-10-01', status: 'Approved' },
      { id: 'eod-2', employee_id: 'auth-2', office_hours: 8, report_date: '2026-10-01', status: 'Approved' }
    ]

    const results = await calculateMonthlyPayroll(2026, 10, ['emp-1', 'emp-2'])

    expect(results).toHaveLength(2)
    // Suraj: monthly base should be 22,000, NOT 264,000!
    expect(results[0].salary).toBe(22000)
    expect(results[0].standardHours).toBe(208)

    // Prachi: intern stipend should be 8,000
    expect(results[1].salary).toBe(8000)
    expect(results[1].standardHours).toBe(208)
  })

  it('calculates standard daily rate based on 26 days (208 hours basis)', async () => {
    mockEmployees = [
      {
        id: 'emp-1',
        first_name: 'John',
        last_name: 'Doe',
        department: 'Engineering',
        salary: 312000,
        basic_salary: 26000, // 26,000 / 26 days = 1,000/day
        employee_id_number: 'EMP-003',
        employment_type: 'Full Time',
        stipend: null
      }
    ]
    mockProfiles = [{ id: 'auth-3', employee_id: 'EMP-003' }]

    // Suppose employee logged one EOD with 3.5 hours (< 4 hours => unpaid leave)
    mockEODs = [
      { id: 'eod-3', employee_id: 'auth-3', office_hours: 3.5, report_date: '2026-10-01', status: 'Approved' }
    ]

    const results = await calculateMonthlyPayroll(2026, 10, ['emp-1'])
    expect(results[0].daysUnpaidLeaveEod).toBe(1)
    expect(results[0].standardHours).toBe(208)
    // Extra comp off is earned for <4h work
    expect(results[0].compOffMinutesEarned).toBe(210) // 3.5h = 210 mins
    // Cash overtime is always 0
    expect(results[0].overtimePay).toBe(0)
  })

  it('properly accounts for approved unpaid leaves in payroll deductions', async () => {
    mockEmployees = [
      {
        id: 'emp-1',
        first_name: 'Alice',
        last_name: 'Smith',
        department: 'Operations',
        salary: 26000 * 12,
        basic_salary: 26000, // 1000/day
        employee_id_number: 'EMP-004',
        employment_type: 'Full Time',
        stipend: null
      }
    ]
    mockProfiles = [{ id: 'auth-4', employee_id: 'EMP-004' }]

    mockEODs = [
      { id: 'eod-4', employee_id: 'auth-4', office_hours: 8, report_date: '2026-10-01', status: 'Approved' }
    ]

    // Approved Unpaid Leave for 2 days
    mockLeaves = [
      {
        id: 'leave-1',
        employee_id: 'auth-4',
        start_date: '2026-10-05',
        end_date: '2026-10-06',
        is_half_day: false,
        request_type: 'Leave',
        leave_type: 'Unpaid',
        status: 'Approved'
      }
    ]

    const results = await calculateMonthlyPayroll(2026, 10, ['emp-1'])
    expect(results[0].unpaidLeaveHours).toBe(16) // 2 days * 8h = 16h
    // Unpaid leave deduction is applied
    expect(results[0].unpaidLeaveDeduction).toBeGreaterThan(0)
  })
})
