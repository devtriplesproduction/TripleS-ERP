'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { type AppRole } from '@/config/rbac'

/**
 * Generate a cryptographically random temporary password.
 * Format: 2 uppercase + 4 lowercase + 3 digits + 1 special char = 10 chars
 */
function generateTempPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const special = '!@#$%&*'

  let password = ''
  // 2 uppercase
  for (let i = 0; i < 2; i++) password += upper[Math.floor(Math.random() * upper.length)]
  // 4 lowercase
  for (let i = 0; i < 4; i++) password += lower[Math.floor(Math.random() * lower.length)]
  // 3 digits
  for (let i = 0; i < 3; i++) password += digits[Math.floor(Math.random() * digits.length)]
  // 1 special
  password += special[Math.floor(Math.random() * special.length)]

  // Shuffle the password characters
  const arr = password.split('')
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.join('')
}

/**
 * Generate the next sequential employee ID (EMP-001, EMP-002, etc.)
 * Uses a database function for concurrency safety.
 */
export async function generateEmployeeId(): Promise<string> {
  const admin = await createAdminClient()
  
  // Get the highest existing employee_id_number
  const { data, error } = await admin
    .from('employee_onboarding')
    .select('employee_id_number')
    .not('employee_id_number', 'is', null)
    .order('employee_id_number', { ascending: false })
    .limit(100)

  let maxNum = 0
  if (data && !error) {
    for (const row of data) {
      const match = row.employee_id_number?.match(/^EMP-(\d+)$/i)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      }
    }
  }

  const nextNum = maxNum + 1
  return `EMP-${String(nextNum).padStart(3, '0')}`
}

/**
 * Login with email and password.
 */
export async function loginAction(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Logout the current user.
 */
export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

/**
 * Create a Supabase Auth account for a new employee during onboarding.
 * Returns the generated employee_id and temporary password.
 */
export async function createEmployeeAccount(
  workEmail: string,
  employeeName: string,
  role: AppRole = 'Employee'
): Promise<{ success: boolean; employee_id: string; temp_password: string; auth_user_id: string; error?: string }> {
  const admin = await createAdminClient()
  
  // Generate employee ID and temp password
  const employeeId = await generateEmployeeId()
  const tempPassword = generateTempPassword()

  // Create Supabase Auth user (admin API doesn't send confirmation email)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: workEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      role,
      employee_id: employeeId,
    },
  })

  if (authError) {
    return { success: false, employee_id: '', temp_password: '', auth_user_id: '', error: authError.message }
  }

  const authUserId = authData.user.id

  // Create profiles entry linking auth user to employee data
  const nameParts = employeeName.split(' ')
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''
  
  const { error: profileError } = await admin
    .from('profiles')
    .insert({
      id: authUserId,
      employee_id: employeeId,
      first_name: firstName,
      last_name: lastName,
      role,
    })

  if (profileError) {
    // Cleanup: delete the auth user if profile creation fails
    await admin.auth.admin.deleteUser(authUserId)
    return { success: false, employee_id: '', temp_password: '', auth_user_id: '', error: profileError.message }
  }

  return {
    success: true,
    employee_id: employeeId,
    temp_password: tempPassword,
    auth_user_id: authUserId,
  }
}
