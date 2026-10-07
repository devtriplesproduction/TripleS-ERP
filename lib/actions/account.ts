'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { determineERPRole } from '@/config/rbac'

export async function createEmployeeAccount(employeeId: string) {
  const supabase = await createClient()

  // 1. Check if caller is admin/hr
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single()

  if (!currentProfile || (currentProfile.role !== 'Admin' && currentProfile.role !== 'HR')) {
    return { success: false, error: 'Unauthorized: Only Admin or HR can create accounts' }
  }

  // 2. Fetch employee details
  const { data: employee, error: empError } = await supabase
    .from('employee_onboarding')
    .select('*')
    .eq('id', employeeId)
    .single()

  if (empError || !employee) {
    return { success: false, error: 'Employee not found' }
  }

  if (!employee.email) {
    return { success: false, error: 'Employee must have a work email to create an account' }
  }

  try {
    const adminClient = await createAdminClient()

    // 3. Check if user exists in auth.users by email
    const { data: existingUsers, error: usersError } = await adminClient.auth.admin.listUsers()
    if (usersError) throw usersError

    let targetUserId = employee.auth_user_id
    let authUser = existingUsers.users.find(u => u.email === employee.email)

    if (authUser) {
      targetUserId = authUser.id
    } else {
      // 4. Create the auth user if it doesn't exist
      const { data: newAuthUser, error: createError } = await adminClient.auth.admin.createUser({
        email: employee.email,
        email_confirm: true,
        // You could auto-generate a secure password and email it, or set a default
        password: 'ChangeMe@123', 
        user_metadata: {
          first_name: employee.first_name,
          last_name: employee.last_name
        }
      })

      if (createError) throw createError
      targetUserId = newAuthUser.user.id
    }

    if (!targetUserId) {
      throw new Error('Failed to resolve auth user ID')
    }

    // 5. Upsert into profiles table
    const computedRole = determineERPRole(employee.department, employee.division, employee.designation)
    
    const { error: profileError } = await (adminClient as any)
      .from('profiles')
      .upsert({
        id: targetUserId,
        employee_id: employee.employee_id_number,
        first_name: employee.first_name,
        last_name: employee.last_name,
        role: employee.role || computedRole
      }, { onConflict: 'id' })

    if (profileError) throw profileError

    // Revalidate paths
    revalidatePath('/hr/onboarding')
    revalidatePath(`/hr/onboarding/${employeeId}`)

    return { success: true, message: 'Account created and linked successfully.' }
  } catch (error: any) {
    console.error('Account creation error:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}

export async function getEmployeeAccountStatus(onboardingId: string) {
  try {
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    
    if (!currentUser) return { hasAccount: false, isHod: false, authUserId: null }

    const { data: employee } = await supabase
      .from('employee_onboarding')
      .select('employee_id_number, email')
      .eq('id', onboardingId)
      .single()

    if (!employee || !employee.employee_id_number) {
      return { hasAccount: false, isHod: false, authUserId: null }
    }

    const adminClient = await createAdminClient()

    const { data: profile } = await (adminClient as any)
      .from('profiles')
      .select('id, is_hod')
      .eq('employee_id', employee.employee_id_number)
      .maybeSingle()

    if (!profile || !profile.id) {
      return { hasAccount: false, isHod: false, authUserId: null }
    }

    const { data: authUser, error: userError } = await adminClient.auth.admin.getUserById(profile.id)

    if (userError || !authUser?.user) {
      return { hasAccount: false, isHod: false, authUserId: null }
    }

    return {
      hasAccount: true,
      authUserId: profile.id,
      profileId: profile.id,
      employeeId: employee.employee_id_number,
      isHod: profile.is_hod === true
    }
  } catch (err) {
    console.error('Error fetching account status:', err)
    return { hasAccount: false, isHod: false, authUserId: null }
  }
}
