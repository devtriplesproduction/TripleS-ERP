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
    '/hr/onboarding',
    '/hr/leave',
    '/eod',
    '/hr/holidays',
    '/hr/payroll',
    '/hr/attendance',
    '/dashboard',
    '/rulebook',
    '/announcements',
    '/my-tasks',
  ],
  Admin: [
    '/admin-eod',
    '/admin-holiday',
    '/admin-payroll',
    '/super-admin/leave',
    '/super-admin/attendance',
    '/hr/onboarding',
    '/hr/attendance',
    '/dashboard',
    '/rulebook',
    '/announcements',
    '/clients',
    '/projects',
    '/tasks',
    '/my-tasks',
  ],
  Employee: [
    '/hr/employee-leave',
    '/employee-eod',
    '/employee-holiday',
    '/attendance',
    '/dashboard',
    '/rulebook',
    '/my-tasks',
  ],
  Manager: [
    '/dashboard',
    '/attendance',
    '/employee-eod',
    '/employee-holiday',
    '/rulebook',
    '/announcements',
    '/my-tasks',
  ],
}

/**
 * Check if a user has Project Management access.
 * Admin has full access.
 * HOD (is_hod = true) has access as an additional responsibility.
 * HR does NOT automatically get Project Management access.
 * Normal employees do NOT get access.
 */
export function canAccessProjectManagement(role?: AppRole | string | null, isHod?: boolean): boolean {
  if (role === 'Admin') return true
  return !!isHod
}

/** Public routes that don't require authentication */
export const PUBLIC_ROUTES = ['/login', '/unauthorized']

/**
 * Check if a given role has permission to access a specific pathname.
 */
export function hasRouteAccess(
  role: AppRole | string | null | undefined, 
  pathname: string, 
  isHod?: boolean
): boolean {
  if (!role || !ALL_ROLES.includes(role as AppRole)) return false

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
