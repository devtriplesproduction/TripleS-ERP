'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { getProfilePhotoUrl } from '@/lib/utils/profile-photos'

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

    // 1. Fetch profiles and employee_onboarding concurrently
    const [profilesRes, onboardingRes] = await Promise.all([
      admin.from('profiles').select('id, first_name, last_name, employee_id').order('first_name', { ascending: true }),
      admin.from('employee_onboarding').select('employee_id_number, department, designation, profile_photo, employment_status')
    ])

    const profiles = profilesRes.data
    const onboarding = onboardingRes.data

    if (profilesRes.error || !profiles) {
      return { success: true, data: [] }
    }

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
      .filter(p => {
        // Exclude profiles that are deactivated or inactive
        const pAny = p as any
        if (pAny.is_active === false || pAny.deactivated_at != null) {
          return false
        }
        // Exclude profiles without matching onboarding record
        if (!p.employee_id || !onboardingMap.has(p.employee_id)) {
          return false
        }
        // Exclude inactive / terminated onboarding records
        const emp = onboardingMap.get(p.employee_id)
        const status = (emp?.employment_status || '').toLowerCase()
        if (status === 'inactive' || status === 'terminated' || (status && status !== 'active') || emp?.deactivated_at != null) {
          return false
        }
        return true
      })
      .map(p => {
      const emp = p.employee_id ? onboardingMap.get(p.employee_id) : null
      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Employee'

      return {
        id: p.id,
        name: fullName,
        employee_id: p.employee_id,
        department: emp?.department || null,
        designation: emp?.designation || null,
        profile_photo: getProfilePhotoUrl(emp?.profile_photo),
      }
    })

    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, data: [], error: err.message || 'Failed to fetch employees' }
  }
}
