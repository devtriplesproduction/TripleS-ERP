'use server'

import { createClient } from "@/lib/supabase/server"
import { processLeaveCompOff, getCompOffBalance } from "@/lib/actions/compoff"
import { guardServerAction, getCurrentUser } from "@/lib/auth"

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

  // 2. Process Comp Off Deduction if it's a Comp Off leave being approved
  if (leave.leave_type === 'Compensatory Off') {
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

  const supabase = await createClient()

  if (leaveData.leave_type === 'Compensatory Off') {
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

  // Authorization check: Only Admin, HR, or the employee themselves can cancel
  const isOwner = user.id === leave.employee_id || user.employee_id === leave.employee_id
  const isManagement = user.role === 'Admin' || user.role === 'HR'
  if (!isOwner && !isManagement) {
    return { success: false, error: "Unauthorized: You can only cancel your own leave requests" }
  }

  // If this was a Comp-Off leave, handle reversal of debit
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
