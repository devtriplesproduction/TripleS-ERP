import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSafeRedirectUrl, isPublicRoute, PUBLIC_ROUTES } from '@/config/rbac'

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({
    'x-forwarded-for': '127.0.0.1',
    'user-agent': 'Vitest-Test-Agent',
  })),
}))

// Mock next/navigation
const mockRedirect = vi.fn()
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    mockRedirect(url)
    throw new Error(`NEXT_REDIRECT:${url}`)
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Supabase clients
let mockSignInError: any = null
let mockUserData: any = null
const mockSignOut = vi.fn(async () => ({ error: null }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: vi.fn(async ({ email, password }) => {
        if (mockSignInError) {
          return { data: { user: null, session: null }, error: mockSignInError }
        }
        return {
          data: {
            user: mockUserData || { id: 'test-user-id', email, app_metadata: {} },
            session: { access_token: 'valid-token' },
          },
          error: null,
        }
      }),
      signOut: mockSignOut,
      getUser: vi.fn(async () => ({
        data: { user: mockUserData },
        error: null,
      })),
    },
  })),
  createAdminClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: { id: 'profile-1', employee_id: 'EMP-001', first_name: 'Test', last_name: 'User' },
            error: null,
          })),
        })),
      })),
      insert: vi.fn(async () => ({ error: null })),
    })),
  })),
}))

// Mock audit logger so it doesn't fail on missing db
vi.mock('@/lib/utils/audit-logger', () => ({
  logSecurityEvent: vi.fn(async () => ({ id: 'mock-audit-id' })),
}))

import { loginAction, logoutAction } from '@/actions/auth.actions'

describe('Authentication & Redirect Safety', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignInError = null
    mockUserData = null
  })

  describe('Public Route Recognition', () => {
    it('recognizes /login as a public route', () => {
      expect(isPublicRoute('/login')).toBe(true)
    })

    it('recognizes /unauthorized as a public route', () => {
      expect(isPublicRoute('/unauthorized')).toBe(true)
    })

    it('recognizes /access-disabled as a public route', () => {
      expect(isPublicRoute('/access-disabled')).toBe(true)
    })

    it('protects internal ERP routes from public access', () => {
      expect(isPublicRoute('/dashboard')).toBe(false)
      expect(isPublicRoute('/tasks')).toBe(false)
      expect(isPublicRoute('/projects')).toBe(false)
      expect(isPublicRoute('/time-tracking')).toBe(false)
      expect(isPublicRoute('/hr/onboarding')).toBe(false)
      expect(isPublicRoute('/')).toBe(false)
    })
  })

  describe('getSafeRedirectUrl - Open Redirect & Loop Prevention', () => {
    it('returns internal routes safely', () => {
      expect(getSafeRedirectUrl('/time-tracking')).toBe('/time-tracking')
      expect(getSafeRedirectUrl('/projects/123')).toBe('/projects/123')
      expect(getSafeRedirectUrl('/hr/attendance?month=2026-10')).toBe('/hr/attendance?month=2026-10')
      expect(getSafeRedirectUrl('/my-tasks')).toBe('/my-tasks')
      expect(getSafeRedirectUrl('  /tasks  ')).toBe('/tasks')
    })

    it('prevents redirect loop on root "/" by falling back to /dashboard', () => {
      expect(getSafeRedirectUrl('/')).toBe('/dashboard')
    })

    it('prevents redirect loops on /login by falling back to /dashboard', () => {
      expect(getSafeRedirectUrl('/login')).toBe('/dashboard')
      expect(getSafeRedirectUrl('/login?redirect=%2F')).toBe('/dashboard')
      expect(getSafeRedirectUrl('/login?redirect=/tasks')).toBe('/dashboard')
      expect(getSafeRedirectUrl('/login/reset')).toBe('/dashboard')
    })

    it('prevents redirecting to error pages after login', () => {
      expect(getSafeRedirectUrl('/unauthorized')).toBe('/dashboard')
      expect(getSafeRedirectUrl('/access-disabled')).toBe('/dashboard')
    })

    it('blocks absolute URLs and external domains (Open Redirect Protection)', () => {
      expect(getSafeRedirectUrl('https://evil.com')).toBe('/dashboard')
      expect(getSafeRedirectUrl('http://attacker.com/login')).toBe('/dashboard')
      expect(getSafeRedirectUrl('https://google.com')).toBe('/dashboard')
    })

    it('blocks protocol-relative URLs (//evil.com)', () => {
      expect(getSafeRedirectUrl('//evil.com')).toBe('/dashboard')
      expect(getSafeRedirectUrl('//evil.com/path')).toBe('/dashboard')
      expect(getSafeRedirectUrl('///evil.com')).toBe('/dashboard')
    })

    it('blocks Windows backslash bypasses (/\\evil.com and \\evil.com)', () => {
      expect(getSafeRedirectUrl('/\\evil.com')).toBe('/dashboard')
      expect(getSafeRedirectUrl('\\evil.com')).toBe('/dashboard')
      expect(getSafeRedirectUrl('/path\\with\\backslash')).toBe('/dashboard')
    })

    it('blocks javascript: and other dangerous pseudo-protocols', () => {
      expect(getSafeRedirectUrl('javascript:alert(1)')).toBe('/dashboard')
      expect(getSafeRedirectUrl('data:text/html,<script>alert(1)</script>')).toBe('/dashboard')
    })

    it('handles empty, null, or undefined gracefully', () => {
      expect(getSafeRedirectUrl(null)).toBe('/dashboard')
      expect(getSafeRedirectUrl(undefined)).toBe('/dashboard')
      expect(getSafeRedirectUrl('')).toBe('/dashboard')
      expect(getSafeRedirectUrl('   ')).toBe('/dashboard')
    })

    it('allows a custom default fallback destination', () => {
      expect(getSafeRedirectUrl(null, '/home')).toBe('/home')
      expect(getSafeRedirectUrl('https://evil.com', '/home')).toBe('/home')
      expect(getSafeRedirectUrl('/', '/home')).toBe('/home')
    })
  })

  describe('Authentication Flow - loginAction & logoutAction', () => {
    it('returns failure when invalid credentials are provided', async () => {
      mockSignInError = { message: 'Invalid login credentials' }
      const result = await loginAction('wrong@triplesproduction.com', 'badpassword')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid login credentials')
    })

    it('returns success on valid credentials', async () => {
      mockUserData = { id: 'valid-user-1', email: 'user@triplesproduction.com', app_metadata: {} }
      const result = await loginAction('user@triplesproduction.com', 'CorrectPass123!')

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('logoutAction signs out the user and redirects to /login', async () => {
      mockUserData = { id: 'logout-user-1', email: 'logout@triplesproduction.com' }

      await expect(logoutAction()).rejects.toThrow('NEXT_REDIRECT:/login')
      expect(mockSignOut).toHaveBeenCalled()
      expect(mockRedirect).toHaveBeenCalledWith('/login')
    })
  })
})
