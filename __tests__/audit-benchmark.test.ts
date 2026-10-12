import { describe, it, expect, vi } from 'vitest'
import * as dotenv from 'dotenv'
dotenv.config()

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sfjerymoxnolxblhelho.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_dJRsn_raWyuOLg2OqvQ3JQ_N6zlzph7'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmamVyeW1veG5vbHhibGhlbGhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDA2MjIxMiwiZXhwIjoyMTA1NjM4MjEyfQ.vtc5GqbVwv-kuKINK9WoqkW7ujt7nti0zZf4fzdBYzU'

// Mock next/headers for test environment
vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => [],
    set: () => {},
  }),
}))

// Mock lib/auth for test environment
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
import { checkEmployeeProjectAccess, checkEmployeeHasTasks } from '@/lib/actions/projects'
import { globalSearchAction } from '@/actions/search.actions'
import { getAttendanceEmployees } from '@/lib/actions/attendance'
import { createAdminClient } from '@/lib/supabase/server'




describe('Performance Audit Benchmarks', () => {
  it('measures baseline execution time for calculateMonthlyPayroll', async () => {
    const start = performance.now()
    const result = await calculateMonthlyPayroll(2026, 10)
    const duration = performance.now() - start
    console.log(`[BENCHMARK] calculateMonthlyPayroll: ${duration.toFixed(2)}ms (Employees processed: ${result.length})`)
    expect(Array.isArray(result)).toBe(true)
  }, 30000)

  it('measures baseline execution time for checkEmployeeProjectAccess & checkEmployeeHasTasks', async () => {
    const admin = await createAdminClient()
    const { data: user } = await admin.from('profiles').select('id').limit(1).single()
    if (!user) return

    const start = performance.now()
    const [hasAccess, hasTasks] = await Promise.all([
      checkEmployeeProjectAccess(user.id),
      checkEmployeeHasTasks(user.id)
    ])
    const duration = performance.now() - start
    console.log(`[BENCHMARK] layout access checks: ${duration.toFixed(2)}ms`)
    expect(typeof hasAccess).toBe('boolean')
    expect(typeof hasTasks).toBe('boolean')
  }, 10000)

  it('measures baseline execution time for getAttendanceEmployees', async () => {
    const start = performance.now()
    const results = await getAttendanceEmployees(10, 2026)
    const duration = performance.now() - start
    console.log(`[BENCHMARK] getAttendanceEmployees: ${duration.toFixed(2)}ms (Employees with activity: ${results.length})`)
    expect(Array.isArray(results)).toBe(true)
  }, 20000)

  it('measures baseline execution time for globalSearchAction', async () => {
    const start = performance.now()
    const results = await globalSearchAction('Omkar')
    const duration = performance.now() - start
    console.log(`[BENCHMARK] globalSearchAction: ${duration.toFixed(2)}ms (Results found: ${results.length})`)
    expect(Array.isArray(results)).toBe(true)
  }, 15000)
})

