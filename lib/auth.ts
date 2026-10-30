/**
 * Server-side auth helpers.
 * Used to get current user, enforce authentication, and enforce role access.
 */
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { hasRouteAccess, type AppRole } from '@/config/rbac'
import { cache } from 'react'

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
 * Cached per-request using React cache to eliminate duplicate Supabase round-trips.
 * Returns null if not authenticated.
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  try {
    const supabaseUrl = (
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    )?.trim().replace(/^["']|["']$/g, '')
    const supabaseAnonKey = (
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_KEY
    )?.trim().replace(/^["']|["']$/g, '')

    if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'placeholder') {
      console.warn('[Auth] Missing Supabase environment variables')
      return null
    }

    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) return null

    // Check if banned or deactivated in Supabase Auth app_metadata
    if (user.app_metadata?.deactivated || (user as any).banned_until) {
      return null
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, employee_id, first_name, last_name, is_hod')
      .eq('id', user.id)
      .single()

    if (!profile) return null

    // Check profiles is_active if column populated
    if ((profile as any).is_active === false) {
      return null
    }

    let is_hod = !!profile.is_hod
    let department: string | null = null
    let designation: string | null = null
    let division: string | null = null
    let resolvedRole = (profile.role || 'Employee') as AppRole

    if (profile.employee_id) {
      const { data: emp } = await supabase
        .from('employee_onboarding')
        .select('is_hod, department, designation, division, role, employment_status')
        .eq('employee_id_number', profile.employee_id)
        .maybeSingle()

      if (emp) {
        // Inactive employees must not access ERP pages or server actions
        if (emp.employment_status === 'Inactive' || emp.employment_status === 'Terminated') {
          return null
        }
        if (!is_hod) is_hod = !!emp.is_hod
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
  } catch (err: any) {
    if (err?.digest === 'DYNAMIC_SERVER_USAGE' || err?.digest?.startsWith('NEXT_')) {
      throw err
    }
    console.error('[Auth] getCurrentUser error:', err)
    return null
  }
})

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
  if (!hasRouteAccess(user.role, pathname, user.is_hod)) {
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