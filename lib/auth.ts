/**
 * Server-side auth helpers.
 * Used to get current user, enforce authentication, and enforce role access.
 */
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { hasRouteAccess, type AppRole } from '@/config/rbac'

export interface AuthUser {
  id: string
  email: string
  role: AppRole
  employee_id: string | null
  employee_name: string | null
  is_hod?: boolean
  department?: string | null
  designation?: string | null
  division?: string | null
}

/**
 * Get the currently authenticated user and their profile.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) return null

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, employee_id, first_name, last_name')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  let is_hod = false
  let department: string | null = null
  let designation: string | null = null
  let division: string | null = null
  let resolvedRole = (profile.role || 'Employee') as AppRole

  if (profile.employee_id) {
    const { data: emp } = await supabase
      .from('employee_onboarding')
      .select('is_hod, department, designation, division, role')
      .eq('employee_id_number', profile.employee_id)
      .maybeSingle()

    if (emp) {
      is_hod = !!emp.is_hod
      department = emp.department || null
      designation = emp.designation || null
      division = emp.division || null
      if (resolvedRole === 'Employee' && emp.role === 'Manager') {
        resolvedRole = 'Manager'
      }
    }
  }

  return {
    id: user.id,
    email: user.email || '',
    role: resolvedRole,
    employee_id: profile.employee_id,
    employee_name: (profile.first_name || profile.last_name) ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : null,
    is_hod,
    department,
    designation,
    division,
  }
}

/**
 * Require authentication. Redirects to /login if not authenticated.
 * Returns the authenticated user.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}

/**
 * Require specific role access for a route. 
 * Redirects to /unauthorized if the user doesn't have permission.
 */
export async function requireRole(pathname: string): Promise<AuthUser> {
  const user = await requireAuth()
  if (!hasRouteAccess(user.role, pathname)) {
    redirect('/unauthorized')
  }
  return user
}

/**
 * Server action guard: validates auth + role for a given route context.
 * Throws an error instead of redirecting (for use in server actions).
 */
export async function guardServerAction(allowedRoles: AppRole[]): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Authentication required')
  if (!allowedRoles.includes(user.role)) throw new Error('Unauthorized: insufficient permissions')
  return user
}
