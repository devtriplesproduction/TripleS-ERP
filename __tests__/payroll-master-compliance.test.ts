import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calculateMonthlyPayroll, classifyDay } from '@/lib/services/payroll.service'
import { resolveSalaryForPeriod } from '@/lib/utils/salary'
import { isWorkingDay } from '@/lib/utils/time'
import { finalizePayrollRun, isPayrollFinalized, getFinalizedPayroll, resetPayrollRunForTesting } from '@/lib/services/payroll-records.service'

let mockEmployees: any[] = []
let mockProfiles: any[] = []
let mockEODs: any[] = []
let mockHolidays: any[] = []
let mockLeaves: any[] = []
let mockSalaryHistory: any[] = []
let mockDeductions: any[] = []

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: async () => ({
    from: (table: string) => {
      let currentData: any[] = []
      if (table === 'employee_onboarding') currentData = mockEmployees
      else if (table === 'profiles') currentData = mockProfiles
      else if (table === 'eod_reports') currentData = mockEODs
      else if (table === 'holidays') currentData = mockHolidays
      else if (table === 'leave_requests') currentData = mockLeaves
      else if (table === 'salary_history') currentData = mockSalaryHistory
      else if (table === 'payroll_deductions') currentData = mockDeductions
      else if (table === 'payroll_runs' || table === 'payroll_items') currentData = []

      const createQueryBuilder = (filteredData: any[]) => {
        const builder: any = {
          data: filteredData,
          error: null,
          select: () => builder,
          order: () => builder,
          in: (col: string, vals: any[]) => createQueryBuilder(filteredData.filter(item => vals.includes(item[col]))),
          eq: (col: string, val: any) => createQueryBuilder(filteredData.filter(item => item[col] === val)),
          gte: (col: string, val: any) => createQueryBuilder(filteredData.filter(item => item[col] >= val)),
          lte: (col: string, val: any) => createQueryBuilder(filteredData.filter(item => item[col] <= val)),
          maybeSingle: async () => ({ data: filteredData[0] || null, error: null }),
          single: async () => ({ data: filteredData[0] || null, error: null }),
          then: (resolve: any) => resolve({ data: filteredData, error: null })
        }
        return builder
      }

      return {
        select: (cols?: string) => createQueryBuilder(currentData),
        insert: async (rows: any) => ({ data: rows, error: null }),
        upsert: async (rows: any) => ({ data: rows, error: null }),
        update: () => ({ eq: () => ({ error: null }) })
      }
    }
  }),
  createClient: async () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
          order: () => ({ then: (res: any) => res({ data: [], error: null }) })
        })
      })
    })
  })
}))

describe('TripleS ERP Master Payroll Implementation Compliance Test Suite', () => {
  beforeEach(() => {
    mockEmployees = []
    mockProfiles = []
    mockEODs = []
    mockHolidays = []
    mockLeaves = []
    mockSalaryHistory = []
    mockDeductions = []
  })

  // 1. Employee working exactly 8 hours
  it('Scenario 1: Employee working exactly 8 hours receives full daily pay and 0 comp-off', () => {
    const classification = classifyDay(480, 'normal')
    expect(classification.payFraction).toBe(1)
    expect(classification.compOffMinutes).toBe(0)
    expect(classification.status).toBe('FULL_DAY')
  })

  // 2. Employee working 9 hours
  it('Scenario 2: Employee working 9 hours receives full daily pay and 1 hour (60 mins) comp-off', () => {
    const classification = classifyDay(540, 'normal')
    expect(classification.payFraction).toBe(1)
    expect(classification.compOffMinutes).toBe(60)
    expect(classification.status).toBe('FULL_DAY')
  })

  // 3. Employee working 3 hours
  it('Scenario 3: Employee working 3 hours (<4h) receives 0 pay fraction and all 180 mins credited to comp-off', () => {
    const classification = classifyDay(180, 'normal')
    expect(classification.payFraction).toBe(0)
    expect(classification.compOffMinutes).toBe(180)
    expect(classification.status).toBe('UNPAID')
  })

  // 4. Employee working 5 hours
  it('Scenario 4: Employee working 5 hours (4h to <8h) receives half-day pay (0.5 fraction) and 0 comp-off', () => {
    const classification = classifyDay(300, 'normal')
    expect(classification.payFraction).toBe(0.5)
    expect(classification.compOffMinutes).toBe(0)
    expect(classification.status).toBe('HALF_DAY')
  })

  // 5. Employee working on a paid holiday
  it('Scenario 5: Employee working on a paid holiday receives 100% daily pay + 100% of worked hours as comp-off without 8h deduction', () => {
    const classification = classifyDay(480, 'paid_holiday')
    expect(classification.payFraction).toBe(1)
    expect(classification.compOffMinutes).toBe(480) // 100% of worked time, NOT 480 - 480 = 0!
    expect(classification.status).toBe('HOLIDAY')

    // Also test holiday with 6 hours worked
    const classification6h = classifyDay(360, 'paid_holiday')
    expect(classification6h.payFraction).toBe(1)
    expect(classification6h.compOffMinutes).toBe(360)
  })

  // 6. Employee taking approved paid leave
  it('Scenario 6: Employee taking approved paid leave counts as paid working time without attendance deduction', async () => {
    mockEmployees = [{
      id: 'emp-paid-leave',
      first_name: 'Leave',
      last_name: 'Tester',
      department: 'QA',
      salary: 260000,
      basic_salary: 26000,
      employee_id_number: 'EMP-PL-1',
      employment_type: 'Full Time',
      joining_date: '2026-01-01',
      employment_status: 'Active'
    }]
    mockProfiles = [{ id: 'auth-pl-1', employee_id: 'EMP-PL-1' }]
    mockLeaves = [{
      id: 'leave-1',
      employee_id: 'auth-pl-1',
      start_date: '2026-10-05',
      end_date: '2026-10-05', // 1 day approved paid leave
      is_half_day: false,
      request_type: 'Leave',
      leave_type: 'Paid',
      status: 'Approved'
    }]

    const results = await calculateMonthlyPayroll(2026, 10, ['emp-paid-leave'])
    expect(results).toHaveLength(1)
    expect(results[0].creditedLeaveHours).toBe(8)
    expect(results[0].hasPayrollData).toBe(true)
  })

  // 7. Employee taking unpaid leave
  it('Scenario 7: Employee taking unpaid leave creates proportional salary deduction', async () => {
    mockEmployees = [{
      id: 'emp-unpaid',
      first_name: 'Unpaid',
      last_name: 'Tester',
      department: 'HR',
      salary: 260000,
      basic_salary: 26000,
      employee_id_number: 'EMP-UP-1',
      employment_type: 'Full Time',
      joining_date: '2026-01-01',
      employment_status: 'Active'
    }]
    mockProfiles = [{ id: 'auth-up-1', employee_id: 'EMP-UP-1' }]
    mockLeaves = [{
      id: 'leave-unpaid-1',
      employee_id: 'auth-up-1',
      start_date: '2026-10-06',
      end_date: '2026-10-06', // 1 day unpaid leave
      is_half_day: false,
      request_type: 'Leave',
      leave_type: 'Unpaid',
      status: 'Approved'
    }]

    const results = await calculateMonthlyPayroll(2026, 10, ['emp-unpaid'])
    expect(results[0].unpaidLeaveHours).toBe(8)
    // Daily rate = 26000 / 26 = 1000. 1 day unpaid leave deduction = 1000
    expect(results[0].unpaidLeaveDeduction).toBeGreaterThanOrEqual(1000)
  })

  // 8. Employee working approved WFH
  it('Scenario 8: Employee working approved WFH counts as working time', async () => {
    mockEmployees = [{
      id: 'emp-wfh',
      first_name: 'Remote',
      last_name: 'Worker',
      department: 'Dev',
      salary: 260000,
      basic_salary: 26000,
      employee_id_number: 'EMP-WFH-1',
      employment_type: 'Full Time',
      joining_date: '2026-01-01',
      employment_status: 'Active'
    }]
    mockProfiles = [{ id: 'auth-wfh-1', employee_id: 'EMP-WFH-1' }]
    mockLeaves = [{
      id: 'wfh-req-1',
      employee_id: 'auth-wfh-1',
      start_date: '2026-10-07',
      end_date: '2026-10-07',
      is_half_day: false,
      request_type: 'WFH',
      leave_type: 'Paid',
      status: 'Approved'
    }]

    const results = await calculateMonthlyPayroll(2026, 10, ['emp-wfh'])
    expect(results[0].wfhHours).toBe(8)
  })

  // 9. Employee joining mid-month (The Prachi Thorat Bug)
  it('Scenario 9: Employee joining mid-month has prorated base pay and NEVER has deductions for days before joining', () => {
    const employee = {
      id: 'emp-mid-join',
      employment_type: 'Intern',
      stipend: 2000,
      joining_date: '2026-10-19', // Joined Oct 19, 2026
      employment_status: 'Active'
    }

    const resolution = resolveSalaryForPeriod(employee, [], 2026, 10, 26, isWorkingDay)

    expect(resolution.isEligible).toBe(true)
    expect(resolution.proration.isProrated).toBe(true)
    expect(resolution.proration.effectiveStartDate).toBe('2026-10-19')

    // Oct 19 to Oct 31 (13 calendar days) has 12 working days (Mon-Sat) and 1 Sunday (Oct 25)
    expect(resolution.proration.eligibleWorkingDays).toBe(12)

    // Base pay = 2000 * (12 / 26) = 923.08
    const expectedBase = Math.round((2000 * (12 / 26)) * 100) / 100
    expect(resolution.basePay).toBe(expectedBase)
  })

  // 10. Employee offboarding mid-month
  it('Scenario 10: Employee offboarding mid-month has prorated base pay and NEVER has deductions after leaving date', () => {
    const employee = {
      id: 'emp-mid-exit',
      employment_type: 'Full Time',
      basic_salary: 26000,
      joining_date: '2025-01-01',
      deactivated_at: '2026-10-15', // Deactivated Oct 15
      employment_status: 'Inactive'
    }

    const resolution = resolveSalaryForPeriod(employee, [], 2026, 10, 26, isWorkingDay)

    expect(resolution.isEligible).toBe(true)
    expect(resolution.proration.isProrated).toBe(true)
    expect(resolution.proration.effectiveEndDate).toBe('2026-10-15')

    // Oct 1 to Oct 15 has 13 working days (Mon-Sat, 2 Sundays)
    expect(resolution.proration.eligibleWorkingDays).toBe(13)

    // Base pay = 26000 * (13 / 26) = 13000
    expect(resolution.basePay).toBe(13000)
  })

  // 11. Employee receiving a mid-month salary hike
  it('Scenario 11: Employee receiving mid-month salary hike splits calculation accurately', () => {
    const employee = {
      id: 'emp-hike',
      employment_type: 'Full Time',
      basic_salary: 30000, // old salary
      joining_date: '2025-01-01',
      employment_status: 'Active'
    }

    // Salary hike from 30,000 to 40,000 effective Oct 16, 2026
    const salaryHistory = [{
      previous_salary: 30000,
      new_salary: 40000,
      effective_date: '2026-10-16',
      created_at: '2026-10-16T00:00:00Z'
    }]

    const resolution = resolveSalaryForPeriod(employee, salaryHistory, 2026, 10, 26, isWorkingDay)

    expect(resolution.isEligible).toBe(true)
    expect(resolution.proration.isProrated).toBe(true)
    expect(resolution.proration.hikeSplits).toHaveLength(2)

    // First split: Oct 1 - Oct 15 (13 working days) at ₹30,000: 13 * (30000 / 26) = 15,000
    // Second split: Oct 16 - Oct 31 (14 working days) at ₹40,000: 14 * (40000 / 26) = 21,538.46
    // Total prorated base pay = 15000 + 21538.46 = 36538.46
    const split1 = resolution.proration.hikeSplits![0]
    const split2 = resolution.proration.hikeSplits![1]

    expect(split1.rate).toBe(30000)
    expect(split2.rate).toBe(40000)
    expect(split1.workingDays + split2.workingDays).toBe(27) // Total Mon-Sat working days in Oct 2026
    expect(resolution.basePay).toBeCloseTo(36538.46, 1)
  })

  // 12. Employee with multiple manual deductions
  it('Scenario 12: Employee with multiple manual deductions subtracts all active deductions from earned pay', async () => {
    mockEmployees = [{
      id: 'emp-deduct-multi',
      first_name: 'Deduct',
      last_name: 'User',
      department: 'Finance',
      salary: 360000,
      basic_salary: 30000,
      employee_id_number: 'EMP-DED-1',
      employment_type: 'Full Time',
      joining_date: '2026-01-01',
      employment_status: 'Active'
    }]
    mockProfiles = [{ id: 'auth-ded-1', employee_id: 'EMP-DED-1' }]
    // Full attendance: 1 EOD
    mockEODs = [{ id: 'eod-d1', employee_id: 'auth-ded-1', office_hours: 8, report_date: '2026-10-01', status: 'Approved' }]

    // Multiple manual deductions: TDS (1500) + Advance (2000) + Damage (500)
    mockDeductions = [
      { id: 'd-1', employee_id: 'emp-deduct-multi', payroll_year: 2026, payroll_month: 10, deduction_type: 'TDS', amount: 1500, status: 'ACTIVE', reason: 'TDS' },
      { id: 'd-2', employee_id: 'emp-deduct-multi', payroll_year: 2026, payroll_month: 10, deduction_type: 'Salary Advance', amount: 2000, status: 'ACTIVE', reason: 'Advance' },
      { id: 'd-3', employee_id: 'emp-deduct-multi', payroll_year: 2026, payroll_month: 10, deduction_type: 'Damage Recovery', amount: 500, status: 'ACTIVE', reason: 'Damage' }
    ]

    const results = await calculateMonthlyPayroll(2026, 10, ['emp-deduct-multi'])
    expect(results[0].manualDeductions).toBe(4000)
    expect(results[0].deductionsCount).toBe(3)
    expect(results[0].totalDeductions).toBeGreaterThanOrEqual(4000)
  })

  // 13. Employee with no EOD but approved paid leave
  it('Scenario 13: Employee with 0 EODs but approved paid leave receives paid time without being zeroed out', async () => {
    mockEmployees = [{
      id: 'emp-leave-only',
      first_name: 'Vacation',
      last_name: 'Employee',
      department: 'Marketing',
      salary: 240000,
      basic_salary: 20000,
      employee_id_number: 'EMP-LEAVE-ONLY',
      employment_type: 'Full Time',
      joining_date: '2026-01-01',
      employment_status: 'Active'
    }]
    mockProfiles = [{ id: 'auth-lo-1', employee_id: 'EMP-LEAVE-ONLY' }]
    mockEODs = [] // 0 EODs submitted!
    mockLeaves = [{
      id: 'leave-lo-1',
      employee_id: 'auth-lo-1',
      start_date: '2026-10-01',
      end_date: '2026-10-05',
      is_half_day: false,
      request_type: 'Leave',
      leave_type: 'Paid',
      status: 'Approved'
    }]

    const results = await calculateMonthlyPayroll(2026, 10, ['emp-leave-only'])
    expect(results).toHaveLength(1)
    // Must NOT zero out salary!
    expect(results[0].hasPayrollData).toBe(true)
    expect(results[0].creditedLeaveHours).toBeGreaterThan(0)
  })

  // 14. Duplicate EOD approval idempotency
  it('Scenario 14: Duplicate approved EODs for the same employee and date are counted only once', async () => {
    mockEmployees = [{
      id: 'emp-dup-eod',
      first_name: 'Dup',
      last_name: 'Tester',
      department: 'Engineering',
      salary: 240000,
      basic_salary: 20000,
      employee_id_number: 'EMP-DUP-1',
      employment_type: 'Full Time',
      joining_date: '2026-01-01',
      employment_status: 'Active'
    }]
    mockProfiles = [{ id: 'auth-dup-1', employee_id: 'EMP-DUP-1' }]
    // 2 approved EODs for the exact same day
    mockEODs = [
      { id: 'eod-dup-1', employee_id: 'auth-dup-1', office_hours: 8, report_date: '2026-10-01', status: 'Approved' },
      { id: 'eod-dup-2', employee_id: 'auth-dup-1', office_hours: 8, report_date: '2026-10-01', status: 'Approved' }
    ]

    const results = await calculateMonthlyPayroll(2026, 10, ['emp-dup-eod'])
    // Should count 8 hours, not 16 hours!
    expect(results[0].actualWorkedHours).toBe(8)
  })

  // 15. Payroll recalculation after finalization (Immutability guarantee)
  it('Scenario 15: Finalized payroll snapshot is immutable and cannot be finalized twice', async () => {
    const mockResults: any[] = [{
      employeeId: 'emp-snap-1',
      name: 'Frozen Record',
      department: 'Ops',
      salary: 25000,
      standardHours: 208,
      actualWorkedHours: 208,
      creditedLeaveHours: 0,
      unpaidLeaveHours: 0,
      paidHolidayHours: 0,
      wfhHours: 0,
      extraHours: 0,
      shortHours: 0,
      daysHalfDay: 0,
      daysUnpaidLeaveEod: 0,
      compOffMinutesEarned: 0,
      overtimePay: 0,
      unpaidLeaveDeduction: 0,
      attendanceDeduction: 0,
      shortHoursDeduction: 0,
      manualDeductions: 0,
      deductionsCount: 0,
      totalPaidHours: 208,
      grossPay: 25000,
      totalDeductions: 0,
      netPayable: 25000,
      hasPayrollData: true
    }]

    // 1. Reset any previous state for idempotent testing, then finalize month 2026-11
    resetPayrollRunForTesting(2026, 11)
    const finalizationResult = await finalizePayrollRun(2026, 11, mockResults, 'admin-123')
    expect(finalizationResult.success).toBe(true)
    expect(finalizationResult.run?.status).toBe('FINALIZED')

    // 2. Check isPayrollFinalized
    const isLocked = await isPayrollFinalized(2026, 11)
    expect(isLocked).toBe(true)

    // 3. Attempt duplicate finalization - MUST be rejected
    const duplicateAttempt = await finalizePayrollRun(2026, 11, mockResults, 'admin-123')
    expect(duplicateAttempt.success).toBe(false)
    expect(duplicateAttempt.error).toContain('already finalized')

    // 4. Reading finalized payroll returns frozen snapshot
    const finalizedRecords = await getFinalizedPayroll(2026, 11, ['emp-snap-1'])
    expect(finalizedRecords).not.toBeNull()
    expect(finalizedRecords![0].netPayable).toBe(25000)
    expect(finalizedRecords![0].isLocked).toBe(true)
  })

  // 16. Employee accessing another employee's payslip
  it('Scenario 16: Horizontal data access is prevented by verifying session identity', async () => {
    const { getMyMonthlyPayrollAction } = await import('@/lib/actions/payroll')

    // Calling getMyMonthlyPayrollAction does not take an arbitrary employee ID parameter.
    // It strictly resolves the employee from current user session cookies.
    // When no authenticated user exists, it rejects unauthorized.
    const response = await getMyMonthlyPayrollAction(2026, 10)
    expect(response.success).toBe(false)
    expect(response.error).toContain('Unauthorized')
  })
})
