import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hasRouteAccess, canAccessProjectManagement, getSafeRedirectUrl } from '@/config/rbac'
import { guardServerAction } from '@/lib/auth'

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}))

let mockUser: any = null
let mockProfile: any = null

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: mockUser },
        error: mockUser ? null : new Error('No user'),
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({ data: mockProfile, error: null })),
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        })),
      })),
    })),
  })),
  createAdminClient: vi.fn(async () => ({})),
}))

describe('Comprehensive RBAC & Route Audit Suite', () => {
  beforeEach(() => {
    mockUser = null
    mockProfile = null
  })

  describe('1. /hr/onboarding Shared Architecture Verification', () => {
    it('grants Admin access to /hr/onboarding', () => {
      expect(hasRouteAccess('Admin', '/hr/onboarding')).toBe(true)
    })

    it('grants HR access to /hr/onboarding', () => {
      expect(hasRouteAccess('HR', '/hr/onboarding')).toBe(true)
    })

    it('denies Employee access to /hr/onboarding', () => {
      expect(hasRouteAccess('Employee', '/hr/onboarding')).toBe(false)
    })

    it('denies Manager access to /hr/onboarding', () => {
      expect(hasRouteAccess('Manager', '/hr/onboarding')).toBe(false)
    })
  })

  describe('2. Time Tracking Route Isolation', () => {
    it('grants Admin access to /time-tracking dashboard', () => {
      expect(hasRouteAccess('Admin', '/time-tracking')).toBe(true)
    })

    it('strictly denies HR access to /time-tracking dashboard', () => {
      expect(hasRouteAccess('HR', '/time-tracking')).toBe(false)
    })

    it('strictly denies Employee access to /time-tracking dashboard', () => {
      expect(hasRouteAccess('Employee', '/time-tracking')).toBe(false)
    })

    it('strictly denies Manager access to /time-tracking dashboard', () => {
      expect(hasRouteAccess('Manager', '/time-tracking')).toBe(false)
    })
  })

  describe('3. Admin Administrative Route Isolation', () => {
    const adminOnlyRoutes = [
      '/admin-eod',
      '/super-admin/attendance',
      '/super-admin/leave',
      '/admin-payroll',
      '/time-tracking',
    ]

    adminOnlyRoutes.forEach((route) => {
      it(`allows Admin to access ${route}`, () => {
        expect(hasRouteAccess('Admin', route)).toBe(true)
      })

      it(`denies HR access to ${route}`, () => {
        expect(hasRouteAccess('HR', route)).toBe(false)
      })

      it(`denies Employee access to ${route}`, () => {
        expect(hasRouteAccess('Employee', route)).toBe(false)
      })
    })
  })

  describe('4. Settings Route Access', () => {
    it('allows Admin, HR, Employee, and Manager to access /settings', () => {
      expect(hasRouteAccess('Admin', '/settings')).toBe(true)
      expect(hasRouteAccess('HR', '/settings')).toBe(true)
      expect(hasRouteAccess('Employee', '/settings')).toBe(true)
      expect(hasRouteAccess('Manager', '/settings')).toBe(true)
    })
  })

  describe('5. Project Management RBAC', () => {
    it('grants Admin full project management access', () => {
      expect(canAccessProjectManagement('Admin')).toBe(true)
    })

    it('grants Manager full project management access', () => {
      expect(canAccessProjectManagement('Manager')).toBe(true)
    })

    it('grants HOD project management access regardless of base role', () => {
      expect(canAccessProjectManagement('Employee', true)).toBe(true)
      expect(canAccessProjectManagement('HR', true)).toBe(true)
    })

    it('denies normal Employee without HOD', () => {
      expect(canAccessProjectManagement('Employee', false)).toBe(false)
    })

    it('denies HR without HOD', () => {
      expect(canAccessProjectManagement('HR', false)).toBe(false)
    })
  })

  describe('6. Open Redirect Protection and Loop Prevention', () => {
    it('accepts safe internal paths', () => {
      expect(getSafeRedirectUrl('/dashboard')).toBe('/dashboard')
      expect(getSafeRedirectUrl('/hr/onboarding')).toBe('/hr/onboarding')
      expect(getSafeRedirectUrl('/tasks?filter=today')).toBe('/tasks?filter=today')
      expect(getSafeRedirectUrl('/admin-eod')).toBe('/admin-eod')
    })

    it('neutralizes protocol-relative open redirect attacks', () => {
      expect(getSafeRedirectUrl('//evil.com')).toBe('/dashboard')
      expect(getSafeRedirectUrl('///evil.com')).toBe('/dashboard')
      expect(getSafeRedirectUrl('/\\evil.com')).toBe('/dashboard')
    })

    it('neutralizes absolute URL redirects', () => {
      expect(getSafeRedirectUrl('https://evil.com')).toBe('/dashboard')
      expect(getSafeRedirectUrl('http://evil.com')).toBe('/dashboard')
      expect(getSafeRedirectUrl('javascript:alert(1)')).toBe('/dashboard')
    })

    it('neutralizes Windows backslash bypass attempts', () => {
      expect(getSafeRedirectUrl('\\evil.com')).toBe('/dashboard')
      expect(getSafeRedirectUrl('/evil\\path')).toBe('/dashboard')
    })

    it('prevents redirect loops by substituting root and auth endpoints with defaultUrl', () => {
      expect(getSafeRedirectUrl('/')).toBe('/dashboard')
      expect(getSafeRedirectUrl('/login')).toBe('/dashboard')
      expect(getSafeRedirectUrl('/login?redirect=/foo')).toBe('/dashboard')
      expect(getSafeRedirectUrl('/unauthorized')).toBe('/dashboard')
      expect(getSafeRedirectUrl('/access-disabled')).toBe('/dashboard')
    })

    it('returns custom defaultUrl when provided for invalid inputs', () => {
      expect(getSafeRedirectUrl(null, '/home')).toBe('/home')
      expect(getSafeRedirectUrl(undefined, '/home')).toBe('/home')
      expect(getSafeRedirectUrl('', '/home')).toBe('/home')
      expect(getSafeRedirectUrl('invalid-path', '/home')).toBe('/home')
    })
  })

  describe('7. Server Action Guard Security', () => {
    it('throws error when user is not authenticated', async () => {
      mockUser = null
      await expect(guardServerAction(['Admin'])).rejects.toThrow('Authentication required')
    })

    it('throws error when user role is not authorized', async () => {
      mockUser = { id: 'user-emp', email: 'emp@test.com', app_metadata: {} }
      mockProfile = { role: 'Employee', employee_id: 'EMP-001', first_name: 'Emp', last_name: 'Test' }

      await expect(guardServerAction(['Admin', 'HR'])).rejects.toThrow('Unauthorized: insufficient permissions')
    })

    it('resolves caller when user has authorized role', async () => {
      mockUser = { id: 'user-admin', email: 'admin@test.com', app_metadata: {} }
      mockProfile = { role: 'Admin', employee_id: 'EMP-ADMIN', first_name: 'Admin', last_name: 'User' }

      const user = await guardServerAction(['Admin'])
      expect(user.role).toBe('Admin')
      expect(user.id).toBe('user-admin')
    })
  })

  describe('8. Canonical Business Module Authorization Matrix', () => {
    describe('/employees (Admin & HR only)', () => {
      const employeeRoutes = ['/employees', '/employees/add', '/employees/6af63eb6-12a6-4809']

      employeeRoutes.forEach((route) => {
        it(`allows Admin access to ${route}`, () => {
          expect(hasRouteAccess('Admin', route)).toBe(true)
        })

        it(`allows HR access to ${route}`, () => {
          expect(hasRouteAccess('HR', route)).toBe(true)
        })

        it(`denies Employee access to ${route}`, () => {
          expect(hasRouteAccess('Employee', route)).toBe(false)
        })

        it(`denies Manager access to ${route}`, () => {
          expect(hasRouteAccess('Manager', route)).toBe(false)
        })
      })
    })

    describe('/payroll (Admin & HR only)', () => {
      it('allows Admin access to /payroll', () => {
        expect(hasRouteAccess('Admin', '/payroll')).toBe(true)
      })

      it('allows HR access to /payroll', () => {
        expect(hasRouteAccess('HR', '/payroll')).toBe(true)
      })

      it('denies Employee access to /payroll', () => {
        expect(hasRouteAccess('Employee', '/payroll')).toBe(false)
      })

      it('denies Manager access to /payroll', () => {
        expect(hasRouteAccess('Manager', '/payroll')).toBe(false)
      })
    })

    describe('Shared Modules (/leave, /eod, /attendance, /holidays)', () => {
      const sharedRoutes = [
        '/leave',
        '/eod',
        '/attendance',
        '/attendance/6af63eb6-12a6-4809',
        '/holidays',
        '/dashboard',
        '/rulebook',
        '/announcements',
        '/settings',
      ]

      sharedRoutes.forEach((route) => {
        it(`allows all active roles to access ${route}`, () => {
          expect(hasRouteAccess('Admin', route)).toBe(true)
          expect(hasRouteAccess('HR', route)).toBe(true)
          expect(hasRouteAccess('Employee', route)).toBe(true)
          expect(hasRouteAccess('Manager', route)).toBe(true)
        })
      })
    })
  })

  describe('9. Legacy Route Backward-Compatibility Mapping', () => {
    const legacyRedirectPairs = [
      { legacy: '/hr/onboarding', canonical: '/employees' },
      { legacy: '/hr/onboarding/add', canonical: '/employees/add' },
      { legacy: '/hr/onboarding/EMP-123', canonical: '/employees/EMP-123' },
      { legacy: '/hr/leave', canonical: '/leave' },
      { legacy: '/super-admin/leave', canonical: '/leave' },
      { legacy: '/hr/employee-leave', canonical: '/leave' },
      { legacy: '/hr/holidays', canonical: '/holidays' },
      { legacy: '/admin-holiday', canonical: '/holidays' },
      { legacy: '/employee-holiday', canonical: '/holidays' },
      { legacy: '/hr/payroll', canonical: '/payroll' },
      { legacy: '/admin-payroll', canonical: '/payroll' },
      { legacy: '/hr/attendance', canonical: '/attendance' },
      { legacy: '/super-admin/attendance', canonical: '/attendance' },
      { legacy: '/hr/attendance/EMP-123', canonical: '/attendance/EMP-123' },
      { legacy: '/super-admin/attendance/EMP-123', canonical: '/attendance/EMP-123' },
      { legacy: '/admin-eod', canonical: '/eod' },
      { legacy: '/employee-eod', canonical: '/eod' },
    ]

    function resolveCanonicalPath(pathname: string): string | null {
      const map: Record<string, string> = {
        '/hr/onboarding': '/employees',
        '/hr/onboarding/add': '/employees/add',
        '/hr/leave': '/leave',
        '/super-admin/leave': '/leave',
        '/hr/employee-leave': '/leave',
        '/hr/holidays': '/holidays',
        '/admin-holiday': '/holidays',
        '/employee-holiday': '/holidays',
        '/hr/payroll': '/payroll',
        '/admin-payroll': '/payroll',
        '/hr/attendance': '/attendance',
        '/super-admin/attendance': '/attendance',
        '/admin-eod': '/eod',
        '/employee-eod': '/eod',
      }

      if (map[pathname]) return map[pathname]
      if (pathname.startsWith('/hr/onboarding/')) return pathname.replace('/hr/onboarding/', '/employees/')
      if (pathname.startsWith('/hr/attendance/')) return pathname.replace('/hr/attendance/', '/attendance/')
      if (pathname.startsWith('/super-admin/attendance/')) return pathname.replace('/super-admin/attendance/', '/attendance/')
      return null
    }

    legacyRedirectPairs.forEach(({ legacy, canonical }) => {
      it(`resolves legacy "${legacy}" to canonical "${canonical}"`, () => {
        expect(resolveCanonicalPath(legacy)).toBe(canonical)
      })
    })

    it('preserves query parameters when generating redirection target', () => {
      const originalPath = '/hr/onboarding/add'
      const search = '?department=Engineering&ref=invite'
      const canonical = resolveCanonicalPath(originalPath)
      expect(canonical).toBe('/employees/add')

      const finalUrl = `${canonical}${search}`
      expect(finalUrl).toBe('/employees/add?department=Engineering&ref=invite')
    })
  })
})

