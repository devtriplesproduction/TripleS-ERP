import { describe, it, expect, vi } from 'vitest'
import * as dotenv from 'dotenv'
dotenv.config()

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sfjerymoxnolxblhelho.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_dJRsn_raWyuOLg2OqvQ3JQ_N6zlzph7'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmamVyeW1veG5vbHhibGhlbGhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDA2MjIxMiwiZXhwIjoyMTA1NjM4MjEyfQ.vtc5GqbVwv-kuKINK9WoqkW7ujt7nti0zZf4fzdBYzU'

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => [],
    set: () => {},
  }),
}))

// Mock lib/auth
vi.mock('@/lib/auth', () => ({
  getCurrentUser: async () => ({
    id: '6af63eb6-12a6-4809-97c6-ef0792eeab53',
    email: 'admin@test.com',
    role: 'Admin',
    employee_id: 'EMP-001',
    employee_name: 'Admin User',
  }),
  guardServerAction: async () => ({
    id: '6af63eb6-12a6-4809-97c6-ef0792eeab53',
    role: 'Admin',
  }),
  requireAuth: async () => ({
    id: '6af63eb6-12a6-4809-97c6-ef0792eeab53',
    email: 'admin@test.com',
    role: 'Admin',
  }),
}))

import { calculateMonthlyPayroll } from '@/lib/services/payroll.service'

describe('October 2026 Live Supabase Payroll Verification', () => {
  it('evaluates all 12 eligible employees and calculates accurate payroll', async () => {
    const results = await calculateMonthlyPayroll(2026, 10)

    // 1. Processed employee count must equal 12
    expect(results).toHaveLength(12)

    // Verify all 12 employees are evaluated with hasPayrollData = true
    results.forEach(emp => {
      expect(emp.hasPayrollData).toBe(true)
      expect(typeof emp.salary).toBe('number')
      expect(typeof emp.netPayable).toBe('number')
      expect(typeof emp.grossPay).toBe('number')
      expect(typeof emp.totalDeductions).toBe('number')
    })

    // 2. EMP-011 (Kavita Verma) must have missing salary warning
    const kavita = results.find(r => r.employeeIdNumber === 'EMP-011')
    expect(kavita).toBeDefined()
    expect(kavita?.hasMissingSalary).toBe(true)
    expect(kavita?.validationWarning).toBeDefined()
    expect(kavita?.netPayable).toBe(0)

    // 3. EMP-004 (Shital Khulape) must have active EOD work and approved leaves
    const shital = results.find(r => r.employeeIdNumber === 'EMP-004')
    expect(shital).toBeDefined()
    expect(shital?.actualWorkedHours).toBeGreaterThan(150)
    expect(shital?.netPayable).toBeGreaterThan(15000)

    // 4. EMP-003 (Omkar Sawant) intern stipend must be evaluated
    const omkar = results.find(r => r.employeeIdNumber === 'EMP-003')
    expect(omkar).toBeDefined()
    expect(omkar?.salary).toBe(8000)
    expect(omkar?.actualWorkedHours).toBeGreaterThan(100)

    // 5. Total Payout must be non-zero and sum all processed employees
    const totalPayout = results.reduce((sum, r) => sum + r.netPayable, 0)
    expect(totalPayout).toBeGreaterThan(20000)
  }, 30000)
})
