import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resetRateLimit } from '../lib/utils/rate-limiter'

let mockCurrentUser: any = {
  id: 'user-self-uuid-1234',
  email: 'employee@triples.com',
  role: 'Employee',
  employee_id: 'EMP-009',
  employee_name: 'Alex Rivera',
}

let mockSignInError: any = null
let mockAuthUpdateError: any = null
let mockAuditEvents: any[] = []

vi.mock('@/lib/auth', () => ({
  getCurrentUser: async () => mockCurrentUser,
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      signInWithPassword: async ({ email, password }: any) => {
        if (mockSignInError) return { data: null, error: mockSignInError }
        if (password !== 'CorrectOldPwd#123') {
          return { data: null, error: { message: 'Invalid login credentials' } }
        }
        return { data: { user: { id: mockCurrentUser?.id, email } }, error: null }
      },
    },
  }),
  createAdminClient: async () => ({
    auth: {
      admin: {
        updateUserById: async (id: string, attributes: any) => {
          if (mockAuthUpdateError) return { data: null, error: mockAuthUpdateError }
          return { data: { user: { id, ...attributes } }, error: null }
        },
      },
    },
  }),
}))

vi.mock('@/lib/utils/audit-logger', () => ({
  logSecurityEvent: async (event: any) => {
    mockAuditEvents.push(event)
    return { success: true }
  },
}))

import { changeOwnPasswordAction } from '@/lib/actions/password'

describe('changeOwnPasswordAction (User Side Password Change)', () => {
  beforeEach(() => {
    resetRateLimit('user-pwd-change:user-self-uuid-1234')
    mockCurrentUser = {
      id: 'user-self-uuid-1234',
      email: 'employee@triples.com',
      role: 'Employee',
      employee_id: 'EMP-009',
      employee_name: 'Alex Rivera',
    }
    mockSignInError = null
    mockAuthUpdateError = null
    mockAuditEvents = []
  })

  it('rejects password change if user is not authenticated', async () => {
    mockCurrentUser = null
    const res = await changeOwnPasswordAction({
      currentPassword: 'CorrectOldPwd#123',
      newPassword: 'BrandNew#Secure2026',
      confirmPassword: 'BrandNew#Secure2026',
    })
    expect(res.success).toBe(false)
    expect(res.error).toContain('Authentication required')
  })

  it('requires current password to be entered', async () => {
    const res = await changeOwnPasswordAction({
      currentPassword: '',
      newPassword: 'BrandNew#Secure2026',
      confirmPassword: 'BrandNew#Secure2026',
    })
    expect(res.success).toBe(false)
    expect(res.error).toContain('Please enter your current password')
  })

  it('requires new password and confirm password to match', async () => {
    const res = await changeOwnPasswordAction({
      currentPassword: 'CorrectOldPwd#123',
      newPassword: 'BrandNew#Secure2026',
      confirmPassword: 'Different#Secure2026',
    })
    expect(res.success).toBe(false)
    expect(res.error).toContain('do not match')
  })

  it('rejects if new password is identical to current password', async () => {
    const res = await changeOwnPasswordAction({
      currentPassword: 'CorrectOldPwd#123',
      newPassword: 'CorrectOldPwd#123',
      confirmPassword: 'CorrectOldPwd#123',
    })
    expect(res.success).toBe(false)
    expect(res.error).toContain('must be different')
  })

  it('enforces password policy complexity (length, symbols, etc)', async () => {
    const res = await changeOwnPasswordAction({
      currentPassword: 'CorrectOldPwd#123',
      newPassword: 'short',
      confirmPassword: 'short',
    })
    expect(res.success).toBe(false)
    expect(res.errors).toBeDefined()
    expect(res.errors?.length).toBeGreaterThan(0)
  })

  it('rejects when current password does not verify with Supabase Auth', async () => {
    const res = await changeOwnPasswordAction({
      currentPassword: 'WrongPassword#999',
      newPassword: 'BrandNew#Secure2026',
      confirmPassword: 'BrandNew#Secure2026',
    })
    expect(res.success).toBe(false)
    expect(res.error).toContain('current password you entered is incorrect')
  })

  it('successfully updates user password and creates security audit log', async () => {
    const res = await changeOwnPasswordAction({
      currentPassword: 'CorrectOldPwd#123',
      newPassword: 'BrandNew#Secure2026',
      confirmPassword: 'BrandNew#Secure2026',
    })
    expect(res.success).toBe(true)
    expect(res.message).toContain('changed successfully')

    expect(mockAuditEvents).toHaveLength(1)
    expect(mockAuditEvents[0].eventType).toBe('password_change')
    expect(mockAuditEvents[0].status).toBe('Success')
    expect(mockAuditEvents[0].authMethod).toBe('User Self-Service')
    expect(mockAuditEvents[0].userId).toBe('user-self-uuid-1234')
  })

  it('rate limits user password change attempts after repeated requests', async () => {
    for (let i = 0; i < 5; i++) {
      await changeOwnPasswordAction({
        currentPassword: 'WrongPassword#999',
        newPassword: 'BrandNew#Secure2026',
        confirmPassword: 'BrandNew#Secure2026',
      })
    }
    const blockedRes = await changeOwnPasswordAction({
      currentPassword: 'CorrectOldPwd#123',
      newPassword: 'BrandNew#Secure2026',
      confirmPassword: 'BrandNew#Secure2026',
    })
    expect(blockedRes.success).toBe(false)
    expect(blockedRes.error).toContain('Too many password change attempts')
  })
})

