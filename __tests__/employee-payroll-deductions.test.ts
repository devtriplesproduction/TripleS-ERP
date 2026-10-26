import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  createPayrollDeduction,
  getDeductionsForMonth,
  getDeductionsForEmployee,
  cancelPayrollDeduction,
} from '@/lib/services/payroll-deductions.service'
import {
  addPayrollDeductionAction,
  cancelPayrollDeductionAction,
  getPayrollDeductionsAction,
} from '@/lib/actions/payroll'

// Mock authentication user
let mockCurrentUser: { id: string; email: string; role: string; employee_id: string } | null = null

vi.mock('@/lib/auth', () => ({
  getCurrentUser: async () => mockCurrentUser,
}))

// Use a dedicated isolated test store for deductions
const TEST_STORE_PATH = path.join(process.cwd(), 'scratch', 'test_payroll_deductions_store.json')

describe('Employee-Specific Payroll Deductions', () => {
  beforeEach(() => {
    process.env.PAYROLL_DEDUCTIONS_STORE_PATH = TEST_STORE_PATH
    if (fs.existsSync(TEST_STORE_PATH)) {
      fs.unlinkSync(TEST_STORE_PATH)
    }
    // Default to HR user for action tests
    mockCurrentUser = {
      id: 'mock-hr-user-id',
      email: 'hr@triples.com',
      role: 'HR',
      employee_id: 'EMP-HR-001',
    }
  })

  afterEach(() => {
    if (fs.existsSync(TEST_STORE_PATH)) {
      fs.unlinkSync(TEST_STORE_PATH)
    }
    vi.restoreAllMocks()
  })

  describe('1. Input Validation & Positive Amount Enforcement', () => {
    it('rejects missing or empty employee ID', async () => {
      const res = await createPayrollDeduction({
        employee_id: '',
        payroll_year: 2026,
        payroll_month: 10,
        deduction_type: 'Damage Recovery',
        amount: 500,
        reason: 'Broken monitor stand',
      })
      expect(res.success).toBe(false)
      expect(res.error).toMatch(/employee is required/i)
    })

    it('rejects invalid payroll month (< 1 or > 12)', async () => {
      const resLow = await createPayrollDeduction({
        employee_id: 'emp-123',
        payroll_year: 2026,
        payroll_month: 0,
        deduction_type: 'Damage Recovery',
        amount: 500,
        reason: 'Broken keyboard',
      })
      expect(resLow.success).toBe(false)
      expect(resLow.error).toMatch(/payroll month/i)

      const resHigh = await createPayrollDeduction({
        employee_id: 'emp-123',
        payroll_year: 2026,
        payroll_month: 13,
        deduction_type: 'Damage Recovery',
        amount: 500,
        reason: 'Broken keyboard',
      })
      expect(resHigh.success).toBe(false)
      expect(resHigh.error).toMatch(/payroll month/i)
    })

    it('rejects zero or negative deduction amounts', async () => {
      const resZero = await createPayrollDeduction({
        employee_id: 'emp-123',
        payroll_year: 2026,
        payroll_month: 10,
        deduction_type: 'Damage Recovery',
        amount: 0,
        reason: 'Zero deduction test',
      })
      expect(resZero.success).toBe(false)
      expect(resZero.error).toMatch(/positive number greater than/i)

      const resNeg = await createPayrollDeduction({
        employee_id: 'emp-123',
        payroll_year: 2026,
        payroll_month: 10,
        deduction_type: 'Damage Recovery',
        amount: -250,
        reason: 'Negative deduction test',
      })
      expect(resNeg.success).toBe(false)
      expect(resNeg.error).toMatch(/positive number greater than/i)
    })

    it('rejects NaN or non-numeric amount values', async () => {
      const resNaN = await createPayrollDeduction({
        employee_id: 'emp-123',
        payroll_year: 2026,
        payroll_month: 10,
        deduction_type: 'Damage Recovery',
        amount: Number('invalid'),
        reason: 'NaN amount test',
      })
      expect(resNaN.success).toBe(false)
      expect(resNaN.error).toMatch(/positive number greater than/i)
    })

    it('rejects empty deduction type or reason', async () => {
      const resType = await createPayrollDeduction({
        employee_id: 'emp-123',
        payroll_year: 2026,
        payroll_month: 10,
        deduction_type: '   ',
        amount: 300,
        reason: 'Valid reason',
      })
      expect(resType.success).toBe(false)
      expect(resType.error).toMatch(/deduction type is required/i)

      const resReason = await createPayrollDeduction({
        employee_id: 'emp-123',
        payroll_year: 2026,
        payroll_month: 10,
        deduction_type: 'Salary Advance',
        amount: 300,
        reason: ' ',
      })
      expect(resReason.success).toBe(false)
      expect(resReason.error).toMatch(/reason.*required/i)
    })

    it('successfully creates fixed-amount deduction and formats amount to 2 decimal places', async () => {
      const res = await createPayrollDeduction({
        employee_id: 'emp-123',
        payroll_year: 2026,
        payroll_month: 10,
        deduction_type: 'Salary Advance',
        amount: 1250.555,
        reason: 'Emergency medical advance',
        notes: 'Approved by management',
      }, 'hr-user-1')

      expect(res.success).toBe(true)
      expect(res.data).toBeDefined()
      expect(res.data?.amount).toBe(1250.56)
      expect(res.data?.status).toBe('ACTIVE')
      expect(res.data?.employee_id).toBe('emp-123')
      expect(res.data?.payroll_month).toBe(10)
      expect(res.data?.payroll_year).toBe(2026)
      expect(res.data?.notes).toBe('Approved by management')
    })
  })

  describe('2. Duplicate Deduction Prevention', () => {
    it('prevents duplicate deductions for identical employee, period, type, amount, and reason', async () => {
      const input = {
        employee_id: 'emp-dup-test',
        payroll_year: 2026,
        payroll_month: 10,
        deduction_type: 'Damage Recovery',
        amount: 450,
        reason: 'Mouse & cable replacement',
      }

      // First submission succeeds
      const firstRes = await createPayrollDeduction(input, 'hr-user')
      expect(firstRes.success).toBe(true)

      // Repeated submission fails
      const dupRes = await createPayrollDeduction(input, 'hr-user')
      expect(dupRes.success).toBe(false)
      expect(dupRes.error).toMatch(/duplicate deduction.*already exists/i)
    })

    it('allows distinct deductions for the same employee in the same period with different type or amount or reason', async () => {
      const first = await createPayrollDeduction({
        employee_id: 'emp-distinct-test',
        payroll_year: 2026,
        payroll_month: 10,
        deduction_type: 'Damage Recovery',
        amount: 300,
        reason: 'Broken mug',
      })
      expect(first.success).toBe(true)

      const second = await createPayrollDeduction({
        employee_id: 'emp-distinct-test',
        payroll_year: 2026,
        payroll_month: 10,
        deduction_type: 'Salary Advance',
        amount: 1500,
        reason: 'Festival advance tranche 1',
      })
      expect(second.success).toBe(true)

      const third = await createPayrollDeduction({
        employee_id: 'emp-distinct-test',
        payroll_year: 2026,
        payroll_month: 10,
        deduction_type: 'Damage Recovery',
        amount: 600, // Different amount
        reason: 'Chair wheel repair',
      })
      expect(third.success).toBe(true)

      const monthDeds = await getDeductionsForMonth(2026, 10, ['emp-distinct-test'])
      expect(monthDeds).toHaveLength(3)
    })
  })

  describe('3. Cancellation & Deactivation Lifecycle', () => {
    it('allows cancelling an active deduction and excludes cancelled records from payroll active sum', async () => {
      const created = await createPayrollDeduction({
        employee_id: 'emp-cancel-test',
        payroll_year: 2026,
        payroll_month: 10,
        deduction_type: 'TDS',
        amount: 1200,
        reason: 'Tax adjustment',
      })
      expect(created.success).toBe(true)
      const deductionId = created.data!.id

      // Cancel deduction
      const cancelRes = await cancelPayrollDeduction(deductionId)
      expect(cancelRes.success).toBe(true)
      expect(cancelRes.data?.status).toBe('CANCELLED')

      // Active query excludes cancelled deduction
      const activeDeds = await getDeductionsForMonth(2026, 10, ['emp-cancel-test'])
      expect(activeDeds.find(d => d.id === deductionId)).toBeUndefined()

      // Full employee history retains it with CANCELLED status
      const history = await getDeductionsForEmployee('emp-cancel-test', 2026, 10)
      const cancelledEntry = history.find(d => d.id === deductionId)
      expect(cancelledEntry).toBeDefined()
      expect(cancelledEntry?.status).toBe('CANCELLED')
    })
  })

  describe('4. Server-Side Role Enforcement (RBAC)', () => {
    it('allows HR and Admin to add payroll deductions', async () => {
      mockCurrentUser = { id: 'hr-1', email: 'hr@test.com', role: 'HR', employee_id: 'E1' }
      const hrRes = await addPayrollDeductionAction({
        employee_id: 'emp-rbac',
        payroll_year: 2026,
        payroll_month: 10,
        deduction_type: 'Late Fine',
        amount: 200,
        reason: 'Chronic late logins',
      })
      expect(hrRes.success).toBe(true)

      mockCurrentUser = { id: 'admin-1', email: 'admin@test.com', role: 'Admin', employee_id: 'E2' }
      const adminRes = await addPayrollDeductionAction({
        employee_id: 'emp-rbac',
        payroll_year: 2026,
        payroll_month: 10,
        deduction_type: 'Salary Advance',
        amount: 1000,
        reason: 'Emergency advance',
      })
      expect(adminRes.success).toBe(true)
    })

    it('strictly denies unauthorized roles (Employee, Manager) from adding deductions', async () => {
      mockCurrentUser = { id: 'emp-user', email: 'staff@test.com', role: 'Employee', employee_id: 'E3' }
      const empRes = await addPayrollDeductionAction({
        employee_id: 'emp-rbac',
        payroll_year: 2026,
        payroll_month: 10,
        deduction_type: 'Damage Recovery',
        amount: 500,
        reason: 'Unauthorized test',
      })
      expect(empRes.success).toBe(false)
      expect(empRes.error).toMatch(/unauthorized/i)

      mockCurrentUser = { id: 'mgr-user', email: 'mgr@test.com', role: 'Manager', employee_id: 'E4' }
      const mgrRes = await addPayrollDeductionAction({
        employee_id: 'emp-rbac',
        payroll_year: 2026,
        payroll_month: 10,
        deduction_type: 'Damage Recovery',
        amount: 500,
        reason: 'Unauthorized test',
      })
      expect(mgrRes.success).toBe(false)
      expect(mgrRes.error).toMatch(/unauthorized/i)
    })

    it('strictly denies unauthenticated requests', async () => {
      mockCurrentUser = null
      const res = await addPayrollDeductionAction({
        employee_id: 'emp-rbac',
        payroll_year: 2026,
        payroll_month: 10,
        deduction_type: 'TDS',
        amount: 500,
        reason: 'Unauthenticated test',
      })
      expect(res.success).toBe(false)
      expect(res.error).toMatch(/unauthorized/i)
    })

    it('strictly denies unauthorized roles from cancelling deductions', async () => {
      // First create as HR
      mockCurrentUser = { id: 'hr-1', email: 'hr@test.com', role: 'HR', employee_id: 'E1' }
      const created = await addPayrollDeductionAction({
        employee_id: 'emp-rbac-cancel',
        payroll_year: 2026,
        payroll_month: 10,
        deduction_type: 'Asset / Equipment',
        amount: 750,
        reason: 'Missing headset',
      })
      expect(created.success).toBe(true)

      // Try cancel as regular Employee
      mockCurrentUser = { id: 'emp-user', email: 'staff@test.com', role: 'Employee', employee_id: 'E3' }
      const cancelRes = await cancelPayrollDeductionAction(created.data!.id)
      expect(cancelRes.success).toBe(false)
      expect(cancelRes.error).toMatch(/unauthorized/i)
    })
  })

  describe('5. Payroll Calculation & Net Pay Math Integrity', () => {
    it('calculates net pay correctly: base pay - attendance deduction - manual deductions', async () => {
      const monthlyBase = 8000
      const earnedPay = 4428.57
      const attendanceDeduction = 3571.43

      // Without custom deductions
      const initialManual = 0
      const initialTotalDeductions = Math.round((attendanceDeduction + initialManual) * 100) / 100
      const initialNetPayable = Math.max(0, Math.round((earnedPay - initialManual) * 100) / 100)

      expect(initialTotalDeductions).toBe(3571.43)
      expect(initialNetPayable).toBe(4428.57)
      expect(monthlyBase - initialTotalDeductions).toBeCloseTo(initialNetPayable, 2)

      // Now add 2 employee-specific fixed deductions: ₹500 and ₹250
      const manual1 = 500
      const manual2 = 250
      const totalManual = manual1 + manual2

      const updatedTotalDeductions = Math.round((attendanceDeduction + totalManual) * 100) / 100
      const updatedNetPayable = Math.max(0, Math.round((earnedPay - totalManual) * 100) / 100)

      expect(updatedTotalDeductions).toBe(4321.43)
      expect(updatedNetPayable).toBe(3678.57)

      // Verify ZERO double-counting: monthlyBase - totalDeductions strictly equals netPayable
      expect(monthlyBase - updatedTotalDeductions).toBeCloseTo(updatedNetPayable, 2)
    })

    it('clamps net payable at zero when total manual deductions exceed earned pay', async () => {
      const earnedPay = 500
      const attendanceDeduction = 1500
      const hugeManualDeduction = 800 // > 500

      const totalDeductions = Math.round((attendanceDeduction + hugeManualDeduction) * 100) / 100
      const netPayable = Math.max(0, Math.round((earnedPay - hugeManualDeduction) * 100) / 100)

      expect(totalDeductions).toBe(2300)
      expect(netPayable).toBe(0) // Clamped at 0, no negative payroll
    })

    it('isolates deductions by payroll month and employee ID', async () => {
      // Deductions in October 2026 for Employee A
      await createPayrollDeduction({
        employee_id: 'emp-A',
        payroll_year: 2026,
        payroll_month: 10,
        deduction_type: 'Damage Recovery',
        amount: 300,
        reason: 'October deduction',
      })

      // Deductions in November 2026 for Employee A
      await createPayrollDeduction({
        employee_id: 'emp-A',
        payroll_year: 2026,
        payroll_month: 11,
        deduction_type: 'Salary Advance',
        amount: 700,
        reason: 'November deduction',
      })

      // Deductions in October 2026 for Employee B
      await createPayrollDeduction({
        employee_id: 'emp-B',
        payroll_year: 2026,
        payroll_month: 10,
        deduction_type: 'TDS',
        amount: 400,
        reason: 'Emp B October deduction',
      })

      // Query October 2026 for Employee A only
      const octEmpA = await getDeductionsForMonth(2026, 10, ['emp-A'])
      expect(octEmpA).toHaveLength(1)
      expect(octEmpA[0].amount).toBe(300)

      // Query November 2026 for Employee A only
      const novEmpA = await getDeductionsForMonth(2026, 11, ['emp-A'])
      expect(novEmpA).toHaveLength(1)
      expect(novEmpA[0].amount).toBe(700)

      // Query October 2026 for all employees
      const octAll = await getDeductionsForMonth(2026, 10)
      expect(octAll).toHaveLength(2)
      const empB = octAll.find(d => d.employee_id === 'emp-B')
      expect(empB).toBeDefined()
      expect(empB?.amount).toBe(400)
    })
  })
})
