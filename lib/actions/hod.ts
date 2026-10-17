'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function assignHod(authUserId: string, employeeIdNumber: string, department: string) {
  const supabase = await createClient()
  
  // Verify if caller is admin/hr
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'Admin' && profile.role !== 'HR')) {
    return { success: false, error: 'Unauthorized: Only Admin or HR can assign HODs' }
  }

  try {
    const adminClient = await createAdminClient()

    // Server-side active employee validation for HOD assignment
    const [{ data: targetEmp }, { data: targetProfile }] = await Promise.all([
      (adminClient as any)
        .from('employee_onboarding')
        .select('employment_status')
        .eq('employee_id_number', employeeIdNumber)
        .maybeSingle(),
      (adminClient as any)
        .from('profiles')
        .select('id')
        .eq('id', authUserId)
        .maybeSingle(),
    ])

    const isInactive =
      targetEmp?.employment_status === 'Inactive' ||
      targetEmp?.employment_status === 'Terminated' ||
      (targetEmp?.employment_status && targetEmp.employment_status.toLowerCase() !== 'active') ||
      targetEmp?.deactivated_at != null ||
      targetProfile?.is_active === false ||
      targetProfile?.deactivated_at != null

    if (isInactive) {
      return {
        success: false,
        error: 'Cannot assign inactive or deactivated employee as Head of Department.',
      }
    }

    // 1. Update profiles and employee_onboarding tables concurrently
    const [profileRes, empRes] = await Promise.all([
      (adminClient as any).from('profiles').update({ is_hod: true }).eq('id', authUserId).select(),
      (adminClient as any).from('employee_onboarding').update({ is_hod: true }).eq('employee_id_number', employeeIdNumber).select()
    ])

    const { data: updatedProfile, error: profileError } = profileRes
    const { data: updatedEmp, error: empError } = empRes

    if (profileError) {
      if (!profileError.message.includes('column "is_hod" of relation "profiles" does not exist')) {
        throw profileError
      }
    } else if (!updatedProfile || updatedProfile.length === 0) {
      throw new Error(`No profile found or updated for user ${authUserId}`)
    }

    if (empError) {
      if (!empError.message.includes('column "is_hod" of relation "employee_onboarding" does not exist')) {
        throw empError
      }
    } else if (!updatedEmp || updatedEmp.length === 0) {
      throw new Error(`No onboarding record found or updated for EMP ID ${employeeIdNumber}`)
    }


    // In case there is still a department_hod_assignments table, update it as additive history
    // We ignore errors if the table doesn't exist (like in the case of missing migration)
    const { error: assignError } = await (adminClient as any)
      .from('department_hod_assignments')
      .insert({
        department,
        employee_id: authUserId,
        assigned_by: user.id,
        is_active: true
      })
    
    if (assignError && !assignError.message.includes('does not exist')) {
      console.warn('Failed to insert history:', assignError)
    }

    revalidatePath('/hr/onboarding')
    revalidatePath('/hr/onboarding', 'layout')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    console.error('Error assigning HOD:', error)
    return { success: false, error: error.message || 'Failed to assign HOD' }
  }
}

export async function removeHod(authUserId: string, employeeIdNumber: string, department: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'Admin' && profile.role !== 'HR')) {
    return { success: false, error: 'Unauthorized: Only Admin or HR can remove HODs' }
  }

  try {
    const adminClient = await createAdminClient()

    // 1. Update profiles and employee_onboarding tables concurrently
    const [profileRes, empRes] = await Promise.all([
      (adminClient as any).from('profiles').update({ is_hod: false }).eq('id', authUserId).select(),
      (adminClient as any).from('employee_onboarding').update({ is_hod: false }).eq('employee_id_number', employeeIdNumber).select()
    ])

    const { data: updatedProfile, error: profileError } = profileRes
    const { data: updatedEmp, error: empError } = empRes

    if (profileError) {
      if (!profileError.message.includes('does not exist')) throw profileError
    } else if (!updatedProfile || updatedProfile.length === 0) {
      throw new Error(`No profile found or updated for user ${authUserId}`)
    }

    if (empError) {
      if (!empError.message.includes('does not exist')) throw empError
    } else if (!updatedEmp || updatedEmp.length === 0) {
      throw new Error(`No onboarding record found or updated for EMP ID ${employeeIdNumber}`)
    }


    // 3. Mark inactive in history table if it exists
    const { error: historyError } = await (adminClient as any)
      .from('department_hod_assignments')
      .update({
        is_active: false,
        removed_at: new Date().toISOString(),
        removed_by: user.id
      })
      .eq('employee_id', authUserId)
      .eq('department', department)
      .eq('is_active', true)
      
    if (historyError && !historyError.message.includes('does not exist')) {
      console.warn('Failed to update history:', historyError)
    }

    revalidatePath('/hr/onboarding')
    revalidatePath('/hr/onboarding', 'layout')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    console.error('Error removing HOD:', error)
    return { success: false, error: error.message || 'Failed to remove HOD' }
  }
}

export async function getActiveHodForDepartment(department: string) {
  const supabase = await createClient()
  
  // First try the profiles table if is_hod is native
  const { data: profileHod, error: pErr } = await (supabase as any)
    .from('profiles')
    .select('id, first_name, last_name, email, designation')
    .eq('department', department)
    .eq('is_hod', true)
    .maybeSingle()

  if (profileHod) {
    return {
      id: profileHod.id,
      employee_id: profileHod.id,
      department,
      profiles: profileHod
    }
  }

  // Fallback to history table if exists
  const { data, error } = await (supabase as any)
    .from('department_hod_assignments')
    .select(`
      id,
      employee_id,
      department,
      assigned_at,
      profiles:employee_id (
        id,
        first_name,
        last_name,
        email,
        designation
      )
    `)
    .eq('department', department)
    .eq('is_active', true)
    .maybeSingle()

  return data || null
}

export async function getHodAssignmentsForEmployee(authUserId: string, employeeIdNumber: string) {
  const supabase = await createClient()
  
  // Check profiles.is_hod
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('is_hod, department')
    .eq('id', authUserId)
    .maybeSingle()
    
  if (profile?.is_hod && profile?.department) {
    return [{ department: profile.department, employee_id: authUserId, is_active: true }]
  }

  // Fallback to checking onboarding table
  const { data: emp } = await (supabase as any)
    .from('employee_onboarding')
    .select('is_hod, department')
    .eq('employee_id_number', employeeIdNumber)
    .maybeSingle()
    
  if (emp?.is_hod && emp?.department) {
    return [{ department: emp.department, employee_id: authUserId, is_active: true }]
  }

  // Fallback to history table
  const { data, error } = await (supabase as any)
    .from('department_hod_assignments')
    .select('*')
    .eq('employee_id', authUserId)
    .eq('is_active', true)

  return data || []
}
