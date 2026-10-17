import { createAdminClient } from '@/lib/supabase/server'

export interface EmployeeValidationResult {
  allActive: boolean
  inactiveUserIds: string[]
  inactiveNames: string[]
  activeUserIds: string[]
}

/**
 * Validate whether a list of user IDs (profiles.id) or employee ID numbers belong to active employees.
 * Authoritative active status checks:
 * 1. profiles.is_active !== false AND profiles.deactivated_at IS NULL
 * 2. employee_onboarding.employment_status NOT IN ('Inactive', 'Terminated') AND employee_onboarding.deactivated_at IS NULL
 */
export async function validateActiveEmployees(
  userIds: string[],
  customAdminClient?: any
): Promise<EmployeeValidationResult> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)))
  if (uniqueIds.length === 0) {
    return {
      allActive: true,
      inactiveUserIds: [],
      inactiveNames: [],
      activeUserIds: [],
    }
  }

  const admin = customAdminClient || (await createAdminClient())

  try {
    // 1. Fetch profiles by ID
    const { data: profiles, error: pErr } = await admin
      .from('profiles')
      .select('id, first_name, last_name, employee_id, role')
      .in('id', uniqueIds)

    if (pErr) {
      console.error('[validateActiveEmployees] Profile query error:', pErr)
    }

    const profileMap = new Map<string, any>()
    const profileByEmpCode = new Map<string, any>()
    const empNumbers = new Set<string>()

    ;(profiles || []).forEach((p: any) => {
      profileMap.set(p.id, p)
      if (p.employee_id) {
        profileByEmpCode.set(p.employee_id, p)
        empNumbers.add(p.employee_id)
      }
    })

    // If any IDs were not found by profiles.id, try resolving via profiles.employee_id
    const missingIds = uniqueIds.filter((id) => !profileMap.has(id))
    if (missingIds.length > 0) {
      const { data: byEmpCode } = await admin
        .from('profiles')
        .select('id, first_name, last_name, employee_id, role')
        .in('employee_id', missingIds)

      ;(byEmpCode || []).forEach((p: any) => {
        profileMap.set(p.id, p)
        if (p.employee_id) {
          profileByEmpCode.set(p.employee_id, p)
          empNumbers.add(p.employee_id)
        }
      })
      missingIds.forEach((id) => empNumbers.add(id))
    }

    // 2. Fetch corresponding onboarding records
    const onboardingMap = new Map<string, any>()
    const allEmpNumbers = Array.from(empNumbers)

    if (allEmpNumbers.length > 0) {
      const { data: emps, error: empErr } = await admin
        .from('employee_onboarding')
        .select('id, employee_id_number, employment_status, first_name, last_name')
        .in('employee_id_number', allEmpNumbers)

      if (empErr) {
        console.error('[validateActiveEmployees] Onboarding query error:', empErr)
      }

      ;(emps || []).forEach((e: any) => {
        if (e.employee_id_number) onboardingMap.set(e.employee_id_number, e)
        if (e.id) onboardingMap.set(e.id, e)
      })
    }

    // Also check onboarding by ID for any remaining unresolved IDs
    const stillMissing = uniqueIds.filter(
      (id) => !profileMap.has(id) && !onboardingMap.has(id)
    )
    if (stillMissing.length > 0) {
      const { data: onbById } = await admin
        .from('employee_onboarding')
        .select('id, employee_id_number, employment_status, first_name, last_name')
        .in('id', stillMissing)

      ;(onbById || []).forEach((e: any) => {
        if (e.employee_id_number) onboardingMap.set(e.employee_id_number, e)
        if (e.id) onboardingMap.set(e.id, e)
      })
    }

    const inactiveUserIds: string[] = []
    const inactiveNames: string[] = []
    const activeUserIds: string[] = []

    for (const uid of uniqueIds) {
      const profile = profileMap.get(uid) || profileByEmpCode.get(uid)
      const onboarding =
        (profile?.employee_id ? onboardingMap.get(profile.employee_id) : null) ||
        onboardingMap.get(uid)

      if (!profile && !onboarding) {
        inactiveUserIds.push(uid)
        inactiveNames.push(`User (${uid.slice(0, 8)})`)
        continue
      }

      const name =
        `${profile?.first_name || onboarding?.first_name || ''} ${profile?.last_name || onboarding?.last_name || ''}`.trim() ||
        profile?.role ||
        'Employee'

      // Check profile deactivation fields (for test mocks and profile lifecycle)
      if (profile && (profile.is_active === false || profile.deactivated_at != null)) {
        inactiveUserIds.push(uid)
        inactiveNames.push(name)
        continue
      }

      // Check linked onboarding employment status (authoritative status)
      if (onboarding) {
        const status = (onboarding.employment_status || '').toLowerCase()
        if (
          status === 'inactive' ||
          status === 'terminated' ||
          (status && status !== 'active') ||
          onboarding.deactivated_at != null
        ) {
          inactiveUserIds.push(uid)
          inactiveNames.push(name)
          continue
        }
      }

      activeUserIds.push(uid)
    }

    return {
      allActive: inactiveUserIds.length === 0,
      inactiveUserIds,
      inactiveNames,
      activeUserIds,
    }
  } catch (err) {
    console.error('[validateActiveEmployees] Unexpected error:', err)
    return {
      allActive: false,
      inactiveUserIds: uniqueIds,
      inactiveNames: ['Verification Failed'],
      activeUserIds: [],
    }
  }
}

/**
 * Check if a single user ID is active.
 */
export async function isEmployeeActive(
  userId: string,
  customAdminClient?: any
): Promise<boolean> {
  const res = await validateActiveEmployees([userId], customAdminClient)
  return res.allActive
}

/**
 * Get all active employee user IDs (profiles.id).
 */
export async function getActiveEmployeeIds(
  customAdminClient?: any
): Promise<Set<string>> {
  const admin = customAdminClient || (await createAdminClient())
  const activeSet = new Set<string>()

  try {
    const [profilesRes, onboardingRes] = await Promise.all([
      admin.from('profiles').select('id, employee_id'),
      admin.from('employee_onboarding').select('employee_id_number, employment_status'),
    ])

    const onboardingMap = new Map<string, any>()
    ;(onboardingRes.data || []).forEach((e: any) => {
      if (e.employee_id_number) {
        onboardingMap.set(e.employee_id_number, e)
      }
    })

    ;(profilesRes.data || []).forEach((p: any) => {
      if (p.is_active === false || p.deactivated_at != null) {
        return
      }

      if (p.employee_id) {
        const onb = onboardingMap.get(p.employee_id)
        if (onb) {
          const status = (onb.employment_status || '').toLowerCase()
          if (status === 'inactive' || status === 'terminated' || onb.deactivated_at != null) {
            return
          }
        }
      }

      activeSet.add(p.id)
    })
  } catch (err) {
    console.error('[getActiveEmployeeIds] Error querying active IDs:', err)
  }

  return activeSet
}
