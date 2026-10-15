import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resetRateLimit } from '../lib/utils/rate-limiter'

// Mock state
let mockCurrentUser: any = {
  id: 'actor-admin-uuid-1234',
  email: 'admin@triples.com',
  role: 'Admin',
  employee_id: 'EMP-001',
  employee_name: 'Super Admin',
}

let mockEmployees: Record<string, any> = {
  'emp-uuid-1': {
    id: 'emp-uuid-1',
    employee_id_number: 'EMP-002',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@triples.com',
    role: 'Employee',
    auth_user_id: 'auth-user-uuid-2',
  },
  'emp-uuid-hr': {
    id: 'emp-uuid-hr',
    employee_id_number: 'EMP-003',
    first_name: 'Jane',
    last_name: 'HR',
    email: 'jane.hr@triples.com',
    role: 'HR',
    auth_user_id: 'auth-user-uuid-3',
  },
  'emp-uuid-admin': {
    id: 'emp-uuid-admin',
    employee_id_number: 'EMP-004',
    first_name: 'Chief',
    last_name: 'Admin',
    email: 'chief.admin@triples.com',
    role: 'Admin',
    auth_user_id: 'auth-user-uuid-4',
  },
  'emp-uuid-no-auth': {
    id: 'emp-uuid-no-auth',
    employee_id_number: 'EMP-005',
    first_name: 'NoAuth',
    last_name: 'User',
    email: 'noauth@triples.com',
    role: 'Employee',
    auth_user_id: null,
  },
}

let mockAuthUsers: Record<string, any> = {
  'auth-user-uuid-2': {
    id: 'auth-user-uuid-2',
    email: 'john.doe@triples.com',
    user_metadata: { employee_id: 'EMP-002' },
  },
  'auth-user-uuid-3': {
    id: 'auth-user-uuid-3',
    email: 'jane.hr@triples.com',
    user_metadata: { employee_id: 'EMP-003' },
  },
  'auth-user-uuid-4': {
    id: 'auth-user-uuid-4',
    email: 'chief.admin@triples.com',
    user_metadata: { employee_id: 'EMP-004' },
  },
}

let mockActivityLogs: any[] = []
let mockAuthUpdateError: any = null

vi.mock('@/lib/auth', () => ({
  getCurrentUser: async () => mockCurrentUser,
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: async () => ({
    from: (table: string) => {
      if (table === 'employee_onboarding') {
        return {
          select: () => ({
            eq: (col: string, val: string) => ({
              maybeSingle: async () => {
                const emp = Object.values(mockEmployees).find((e: any) => e[col] === val)
                return { data: emp || null, error: null }
              },
            }),
            or: (cond: string) => ({
              maybeSingle: async () => {
                const parts = cond.split(',')
                let found: any = null
                for (const part of parts) {
                  const [col, val] = part.split('.eq.')
                  if (col && val) {
                    const match = Object.values(mockEmployees).find((e: any) => e[col] === val || e.id === val || e.employee_id_number === val)
                    if (match) {
                      found = match
                      break
                    }
                  }
                }
                return { data: found || null, error: null }
              },
            }),
          }),
        }
      }
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: (col: string, val: string) => ({
              maybeSingle: async () => {
                const emp = Object.values(mockEmployees).find((e: any) => e[col] === val)
                if (!emp) return { data: null, error: null }
                return {
                  data: {
                    id: emp.auth_user_id,
                    role: emp.role,
                    employee_id: emp.employee_id_number,
                  },
                  error: null,
                }
              },
            }),
          }),
        }
      }
      if (table === 'activity_logs') {
        return {
          insert: async (records: any) => {
            const arr = Array.isArray(records) ? records : [records]
            mockActivityLogs.push(...arr)
            return { error: null }
          },
        }
      }
      return {
        select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      }
    },
    auth: {
      admin: {
        getUserById: async (uid: string) => {
          const user = mockAuthUsers[uid]
          if (!user) return { data: { user: null }, error: { message: 'User not found' } }
          return { data: { user }, error: null }
        },
        listUsers: async () => ({
          data: { users: Object.values(mockAuthUsers) },
          error: null,
        }),
        updateUserById: async (uid: string, attrs: any) => {
          if (mockAuthUpdateError) {
            return { data: null, error: mockAuthUpdateError }
          }
          return { data: { user: { id: uid, ...attrs } }, error: null }
        },
      },
    },
  }),
}))

import { changeEmployeePasswordAction, getEmployeePasswordChangeInfo } from '../lib/actions/password'

describe('Change Password Server Action & Permissions', () => {
  beforeEach(() => {
    resetRateLimit()
    mockActivityLogs = []
    mockAuthUpdateError = null
    mockCurrentUser = {
      id: 'actor-admin-uuid-1234',
      email: 'admin@triples.com',
      role: 'Admin',
      employee_id: 'EMP-001',
      employee_name: 'Super Admin',
    }
  })

  it('rejects unauthenticated requests', async () => {
    mockCurrentUser = null
    const res = await changeEmployeePasswordAction({
      employeeId: 'emp-uuid-1',
      newPassword: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
    })
    expect(res.success).toBe(false)
    expect(res.error).toContain('Authentication required')
  })

  it('rejects unauthorized employee role attempts', async () => {
    mockCurrentUser = {
      id: 'actor-emp-uuid',
      email: 'regular@triples.com',
      role: 'Employee',
      employee_id: 'EMP-099',
    }
    const res = await changeEmployeePasswordAction({
      employeeId: 'emp-uuid-1',
      newPassword: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
    })
    expect(res.success).toBe(false)
    expect(res.error).toContain('Insufficient permissions')
  })

  it('allows Admin to change an employee password', async () => {
    const res = await changeEmployeePasswordAction({
      employeeId: 'emp-uuid-1',
      newPassword: 'BrandNewSecure#2026',
      confirmPassword: 'BrandNewSecure#2026',
    })
    expect(res.success).toBe(true)
    expect(res.message).toContain('updated successfully')

    // Verify audit log
    expect(mockActivityLogs).toHaveLength(1)
    const log = mockActivityLogs[0]
    expect(log.action).toBe('administrative_password_change')
    expect(log.user_id).toBe('actor-admin-uuid-1234')
    expect(log.target_user_id).toBe('auth-user-uuid-2')
    expect(log.details.result).toBe('success')

    // CRITICAL SECURITY CHECK: Ensure password is NOT in audit log
    const serializedLog = JSON.stringify(log)
    expect(serializedLog).not.toContain('BrandNewSecure#2026')
  })

  it('allows HR to change a regular employee password', async () => {
    mockCurrentUser = {
      id: 'actor-hr-uuid',
      email: 'hr@triples.com',
      role: 'HR',
      employee_id: 'EMP-003',
    }
    const res = await changeEmployeePasswordAction({
      employeeId: 'emp-uuid-1',
      newPassword: 'BrandNewSecure#2026',
      confirmPassword: 'BrandNewSecure#2026',
    })
    expect(res.success).toBe(true)
  })

  it('prevents HR from changing an Admin password', async () => {
    mockCurrentUser = {
      id: 'actor-hr-uuid',
      email: 'hr@triples.com',
      role: 'HR',
      employee_id: 'EMP-003',
    }
    const res = await changeEmployeePasswordAction({
      employeeId: 'emp-uuid-admin',
      newPassword: 'BrandNewSecure#2026',
      confirmPassword: 'BrandNewSecure#2026',
    })
    expect(res.success).toBe(false)
    expect(res.error).toContain('HR users cannot change passwords for Administrator accounts')

    // Audit log records failure
    expect(mockActivityLogs.length).toBeGreaterThanOrEqual(1)
    expect(mockActivityLogs[0].details.result).toBe('failure')
  })

  it('rejects passwords failing validation policy', async () => {
    const res = await changeEmployeePasswordAction({
      employeeId: 'emp-uuid-1',
      newPassword: 'short',
      confirmPassword: 'short',
    })
    expect(res.success).toBe(false)
    expect(res.error).toContain('Password must be at least 8 characters long')
  })

  it('rejects mismatched passwords', async () => {
    const res = await changeEmployeePasswordAction({
      employeeId: 'emp-uuid-1',
      newPassword: 'BrandNewSecure#2026',
      confirmPassword: 'DifferentSecure#2026',
    })
    expect(res.success).toBe(false)
    expect(res.error).toContain('do not match')
  })

  it('returns a clear error when employee has no linked auth account', async () => {
    const res = await changeEmployeePasswordAction({
      employeeId: 'emp-uuid-no-auth',
      newPassword: 'BrandNewSecure#2026',
      confirmPassword: 'BrandNewSecure#2026',
    })
    expect(res.success).toBe(false)
    expect(res.error).toContain('does not have a linked Supabase Auth account')
  })

  it('handles Supabase Auth update errors gracefully', async () => {
    mockAuthUpdateError = { message: 'Database connection timeout in Supabase' }
    const res = await changeEmployeePasswordAction({
      employeeId: 'emp-uuid-1',
      newPassword: 'BrandNewSecure#2026',
      confirmPassword: 'BrandNewSecure#2026',
    })
    expect(res.success).toBe(false)
    expect(res.error).toContain('Database connection timeout')

    // Verifies audit log recorded failure
    const failureLog = mockActivityLogs.find((l) => l.details?.result === 'failure')
    expect(failureLog).toBeDefined()
    expect(failureLog?.details?.failure_reason).toContain('Database connection timeout')
  })

  it('rate limits repeated password change requests', async () => {
    for (let i = 0; i < 5; i++) {
      await changeEmployeePasswordAction({
        employeeId: 'emp-uuid-1',
        newPassword: 'BrandNewSecure#2026',
        confirmPassword: 'BrandNewSecure#2026',
      })
    }
    const blockedRes = await changeEmployeePasswordAction({
      employeeId: 'emp-uuid-1',
      newPassword: 'BrandNewSecure#2026',
      confirmPassword: 'BrandNewSecure#2026',
    })
    expect(blockedRes.success).toBe(false)
    expect(blockedRes.error).toContain('Too many password change requests')
  })

  it('returns employee info accurately in getEmployeePasswordChangeInfo', async () => {
    const info = await getEmployeePasswordChangeInfo('emp-uuid-1')
    expect(info.success).toBe(true)
    expect(info.hasAccount).toBe(true)
    expect(info.employeeName).toBe('John Doe')
    expect(info.employeeIdNumber).toBe('EMP-002')
    expect(info.canChangePassword).toBe(true)
  })
})
