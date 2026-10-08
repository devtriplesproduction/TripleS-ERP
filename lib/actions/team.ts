'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'

export interface AssignableEmployee {
  id: string // profiles id / user_id
  name: string
  employee_id: string | null
  department: string | null
  designation: string | null
  profile_photo: string | null
}

/**
 * Fetch list of active employees for project & task assignments.
 * STRICT SECURITY RULE:
 * This action NEVER queries or exposes salary, stipend, basic_salary, CTC,
 * payroll, bank details, or private financial compensation.
 */
export async function getAssignableEmployees(): Promise<{ success: boolean; data: AssignableEmployee[]; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, data: [], error: 'Authentication required' }
    }

    const admin = await createAdminClient()

    // 1. Fetch profiles
    const { data: profiles, error: profileErr } = await admin
      .from('profiles')
      .select('id, first_name, last_name, employee_id')
      .order('first_name', { ascending: true })

    if (profileErr || !profiles) {
      return { success: true, data: [] }
    }

    // 2. Fetch employee_onboarding non-sensitive details only
    const { data: onboarding } = await admin
      .from('employee_onboarding')
      .select('employee_id_number, department, designation, profile_photo')

    const onboardingMap = new Map<string, any>()
    if (onboarding) {
      for (const emp of onboarding) {
        if (emp.employee_id_number) {
          onboardingMap.set(emp.employee_id_number, emp)
        }
      }
    }

    const result: AssignableEmployee[] = profiles
      .filter(p => p.first_name?.toLowerCase() !== 'admin' && `${p.first_name || ''} ${p.last_name || ''}`.trim().toLowerCase() !== 'admin')
      .filter(p => p.employee_id && onboardingMap.has(p.employee_id))
      .map(p => {
      const emp = p.employee_id ? onboardingMap.get(p.employee_id) : null
      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Employee'

      return {
        id: p.id,
        name: fullName,
        employee_id: p.employee_id,
        department: emp?.department || null,
        designation: emp?.designation || null,
        profile_photo: emp?.profile_photo || null,
      }
    })

    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, data: [], error: err.message || 'Failed to fetch employees' }
  }
}
