/**
 * Centralized Role-Based Access Control (RBAC) configuration.
 * All role → route permission mappings are defined here.
 * Adding new roles or modules only requires updating this file.
 */

export type AppRole = 'HR' | 'Admin' | 'Employee' | 'Manager'

/** All valid roles in the system */
export const ALL_ROLES: AppRole[] = ['HR', 'Admin', 'Employee', 'Manager']

/**
 * Route permission map: each role maps to the route prefixes it can access.
 * A user can access a route if any of their allowed prefixes match the pathname.
 */
export const ROLE_ROUTE_MAP: Record<AppRole, string[]> = {
  HR: [
    // Canonical Role-Neutral Business Modules
    '/employees',
    '/leave',
    '/eod',
    '/attendance',
    '/holidays',
    '/payroll',
    '/dashboard',
    '/rulebook',
    '/announcements',
    '/my-tasks',
    '/notes',
    '/quick-tasks',
    '/settings',
    // Legacy paths for seamless backward-compatible redirects
    '/hr/onboarding',
    '/hr/leave',
    '/hr/holidays',
    '/hr/payroll',
    '/hr/attendance',
  ],
  Admin: [
    // Canonical Role-Neutral Business Modules
    '/employees',
    '/leave',
    '/eod',
    '/attendance',
    '/holidays',
    '/payroll',
    '/content-management',
    '/time-tracking',
    '/projects',
    '/tasks',
    '/clients',
    '/my-tasks',
    '/dashboard',
    '/rulebook',
    '/announcements',
    '/notes',
    '/quick-tasks',
    '/settings',
    // Legacy paths for seamless backward-compatible redirects
    '/admin-eod',
    '/admin-holiday',
    '/admin-payroll',
    '/super-admin/leave',
    '/super-admin/attendance',
    '/hr/onboarding',
    '/hr/attendance',
  ],
  Employee: [
    // Canonical Role-Neutral Business Modules
    '/leave',
    '/eod',
    '/attendance',
    '/holidays',
    '/payroll',
    '/dashboard',
    '/rulebook',
    '/announcements',
    '/my-tasks',
    '/projects',
    '/notes',
    '/quick-tasks',
    '/settings',
    // Legacy paths for seamless backward-compatible redirects
    '/hr/employee-leave',
    '/employee-eod',
    '/employee-holiday',
  ],
  Manager: [
    // Canonical Role-Neutral Business Modules
    '/leave',
    '/eod',
    '/attendance',
    '/holidays',
    '/payroll',
    '/dashboard',
    '/rulebook',
    '/announcements',
    '/my-tasks',
    '/projects',
    '/tasks',
    '/clients',
    '/notes',
    '/quick-tasks',
    '/settings',
    // Legacy paths for seamless backward-compatible redirects
    '/hr/employee-leave',
    '/employee-eod',
    '/employee-holiday',
  ],
}

/**
 * Check if a user has Project Management access.
 * Admin and Manager have full access.
 * HOD (is_hod = true) has access as an additional responsibility.
 * HR does NOT automatically get Project Management access.
 * Normal employees do NOT get access unless assigned.
 */
export function canAccessProjectManagement(role?: AppRole | string | null, isHod?: boolean): boolean {
  if (role === 'Admin' || role === 'Manager') return true
  return !!isHod
}

/** Public routes that don't require authentication */
export const PUBLIC_ROUTES = ['/login', '/unauthorized', '/access-disabled']

/**
 * Check if a given role has permission to access a specific pathname.
 */
export function hasRouteAccess(
  role: AppRole | string | null | undefined, 
  pathname: string, 
  isHod?: boolean
): boolean {
  if (!role || !ALL_ROLES.includes(role as AppRole)) return false

  // Special Content Management access for HODs and Admin
  if (pathname.startsWith('/content-management')) {
    if (role === 'Admin' || isHod) return true
  }

  // Special Project Management bypass for HODs
  if (
    pathname.startsWith('/projects') || 
    pathname.startsWith('/tasks') || 
    pathname.startsWith('/clients')
  ) {
    if (canAccessProjectManagement(role as AppRole, isHod)) return true
  }

  const allowedPrefixes = ROLE_ROUTE_MAP[role as AppRole]
  if (!allowedPrefixes) return false
  return allowedPrefixes.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'))
}

/**
 * Get all accessible routes for a given role.
 */
export function getAccessibleRoutes(role: AppRole | string | null | undefined): string[] {
  if (!role || !ALL_ROLES.includes(role as AppRole)) return []
  return ROLE_ROUTE_MAP[role as AppRole] || []
}

/**
 * Check if a route is public (no auth required).
 */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))
}

/**
 * Get the default redirect path for a role after login.
 */
export function getDefaultRedirect(role: AppRole | string | null | undefined): string {
  return '/dashboard'
}

/**
 * Validate and sanitize an internal redirect destination to prevent open redirects and loops.
 * Disallows external URLs, protocol-relative URLs, Windows backslash bypasses, and self-referencing loops.
 */
export function getSafeRedirectUrl(
  target: string | null | undefined,
  defaultUrl: string = '/dashboard'
): string {
  if (!target || typeof target !== 'string') {
    return defaultUrl
  }

  const trimmed = target.trim()

  // Must begin with a single '/' and not '//' or '/\'
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return defaultUrl
  }

  // Reject any backslashes or protocol schemes that could bypass origin validation
  if (trimmed.includes('\\') || trimmed.includes(':')) {
    return defaultUrl
  }

  // Prevent redirect loops: root '/' and auth routes fall back to defaultUrl
  if (
    trimmed === '/' ||
    trimmed === '/login' ||
    trimmed.startsWith('/login?') ||
    trimmed.startsWith('/login/') ||
    trimmed === '/unauthorized' ||
    trimmed === '/access-disabled'
  ) {
    return defaultUrl
  }

  return trimmed
}

/**
 * Determine the ERP role based on organizational attributes.
 * Do NOT use Designation = HR alone as the permission check.
 * Admin accounts are separate and not resolved through this function.
 */
export function determineERPRole(department?: string, division?: string, designation?: string): AppRole {
  if (
    designation?.trim().toLowerCase() === 'hr' || 
    (department?.trim().toLowerCase() === 'management' && 
     division?.trim().toLowerCase() === 'general management' && 
     designation?.trim().toLowerCase() === 'hr')
  ) {
    return 'HR'
  }
  
  return 'Employee'
}

