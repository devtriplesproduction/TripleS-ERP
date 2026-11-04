'use server'

import { createClient } from "@/lib/supabase/server"
import { processLeaveCompOff, getCompOffBalance } from "@/lib/actions/compoff"
import { guardServerAction, getCurrentUser } from "@/lib/auth"
import { checkRateLimit } from "@/lib/utils/rate-limiter"

/**
 * Resolves the canonical employee_onboarding ID for an authenticated user.
 * Supports users with onboarding_id, employee_id_number, profile id, or email.
 */
export async function resolveEmployeeOnboardingId(
  user: { id?: string; employee_id?: string | null; email?: string | null; onboarding_id?: string | null },
  supabase: any
): Promise<string | null> {
  if (user.onboarding_id) {
    return user.onboarding_id
  }

  // 1. Look up by employee_id_number (e.g. 'EMP-004')
  if (user.employee_id) {
    const { data: empByNumber } = await supabase
      .from('employee_onboarding')
      .select('id')
      .eq('employee_id_number', user.employee_id)
      .maybeSingle()
    if (empByNumber?.id) return empByNumber.id
  }

  // 2. Check if user.id is already an employee_onboarding id
  if (user.id) {
    const { data: empById } = await supabase
      .from('employee_onboarding')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()
    if (empById?.id) return empById.id

    // 3. Or check profile to find employee_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('employee_id')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.employee_id) {
      const { data: empByProfileNum } = await supabase
        .from('employee_onboarding')
        .select('id')
        .eq('employee_id_number', profile.employee_id)
        .maybeSingle()
      if (empByProfileNum?.id) return empByProfileNum.id
    }
  }

  // 4. Fallback lookup by email
  if (user.email) {
    const { data: empByEmail } = await supabase
      .from('employee_onboarding')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()
    if (empByEmail?.id) return empByEmail.id
  }

  return null
}

export async function reviewLeaveAction(leaveId: string, newStatus: string) {
  await guardServerAction(['Admin', 'HR'])
  const supabase = await createClient()

  // 1. Fetch current leave to validate
  const { data: leave, error: fetchError } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('id', leaveId)
    .single()

  if (fetchError || !leave) {
    return { success: false, error: "Leave request not found" }
  }

  // Cannot review an already cancelled leave request
  if (leave.status === 'Cancelled') {
    return { success: false, error: "Cannot review an already cancelled leave request" }
  }

  // 2. Process Comp Off Deduction if it's a Comp Off leave being approved
  const isCompOffLeave = leave.leave_type === 'Compensatory Off' || (leave.leave_type || '').toLowerCase().includes('comp')
  if (isCompOffLeave) {
    // Determine duration
    const startDate = new Date(leave.start_date)
    const endDate = new Date(leave.end_date)
    // Simple duration in days (inclusive)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    if (leave.is_half_day) diffDays = 0.5

    await processLeaveCompOff(leaveId, leave.employee_id, diffDays, newStatus)
  }

  // 3. Update Status
  const { error: updateError } = await supabase
    .from('leave_requests')
    .update({ status: newStatus })
    .eq('id', leaveId)

  if (updateError) {
    return { success: false, error: "Failed to update leave status" }
  }

  return { success: true }
}

export async function submitLeaveAction(leaveData: any) {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Authentication required" }
  }

  const rl = checkRateLimit(`leave-submit:${user.id}`, 10, 60 * 1000)
  if (!rl.success) {
    return { success: false, error: `Too many leave requests. Please wait ${rl.retryAfterSeconds || 10}s.` }
  }

  const supabase = await createClient()
  const userOnboardingId = await resolveEmployeeOnboardingId(user, supabase)
  const isManagement = user.role === 'Admin' || user.role === 'HR' || (user.role as string) === 'Super Admin'

  // Non-management employees can only submit for themselves using their canonical employee identity
  if (!isManagement) {
    if (!userOnboardingId) {
      return { success: false, error: "Employee onboarding record not found" }
    }
    if (
      leaveData.employee_id &&
      leaveData.employee_id !== userOnboardingId &&
      leaveData.employee_id !== user.id &&
      leaveData.employee_id !== user.employee_id
    ) {
      return { success: false, error: "Unauthorized: You can only submit leave requests for yourself" }
    }
    leaveData.employee_id = userOnboardingId
  } else if (!leaveData.employee_id) {
    leaveData.employee_id = userOnboardingId || user.id
  }

  if (leaveData.leave_type === 'Compensatory Off' || (leaveData.leave_type || '').toLowerCase().includes('comp')) {
    const balance = await getCompOffBalance(leaveData.employee_id)
    const sDate = new Date(leaveData.start_date)
    const eDate = new Date(leaveData.end_date)
    const diffTime = Math.abs(eDate.getTime() - sDate.getTime())
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    if (leaveData.is_half_day) diffDays = 0.5

    if (balance < diffDays * 8) {
      return { success: false, error: "Insufficient Comp Off balance." }
    }
  }

  const { data, error } = await supabase
    .from('leave_requests')
    .insert(leaveData)
    .select('*, employee:employee_onboarding!leave_requests_employee_id_fkey(first_name, last_name, email, department)')
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function cancelLeaveAction(leaveId: string) {
  if (!leaveId || typeof leaveId !== 'string') {
    return { success: false, error: "Invalid leave ID" }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Authentication required" }
  }

  const supabase = await createClient()

  const { data: leave, error: fetchError } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('id', leaveId)
    .single()

  if (fetchError || !leave) {
    return { success: false, error: "Leave request not found" }
  }

  // Prevent cancellation of requests that are already cancelled or rejected
  if (leave.status === 'Cancelled') {
    return { success: false, error: "This request has already been cancelled" }
  }

  if (leave.status === 'Rejected') {
    return { success: false, error: "Cannot cancel a rejected request" }
  }

  const isManagement = user.role === 'Admin' || user.role === 'HR' || (user.role as string) === 'Super Admin'

  // Prevent regular employees from cancelling approved leaves that have already elapsed/completed in the past
  const todayStr = new Date().toISOString().split('T')[0]
  if (leave.status === 'Approved' && leave.end_date < todayStr && !isManagement) {
    return { success: false, error: "Cannot cancel a leave request that has already been completed" }
  }

  // Resolve canonical onboarding ID for current user
  const userOnboardingId = await resolveEmployeeOnboardingId(user, supabase)

  // Authorization check: Compare using canonical employee identity
  const isOwner = Boolean(
    (userOnboardingId && leave.employee_id === userOnboardingId) ||
    (user.id && leave.employee_id === user.id) ||
    (user.employee_id && leave.employee_id === user.employee_id)
  )

  if (!isOwner && !isManagement) {
    return { success: false, error: "Unauthorized: You can only cancel your own leave requests" }
  }

  // If this was an Approved Comp-Off leave, handle reversal of debit
  if (leave.leave_type === 'Compensatory Off') {
    const startDate = new Date(leave.start_date)
    const endDate = new Date(leave.end_date)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    if (leave.is_half_day) diffDays = 0.5

    await processLeaveCompOff(leaveId, leave.employee_id, diffDays, 'Cancelled')
  }

  const { error: updateError } = await supabase
    .from('leave_requests')
    .update({ status: 'Cancelled' })
    .eq('id', leaveId)

  if (updateError) {
    return { success: false, error: "Failed to cancel leave request" }
  }

  return { success: true }
}
