'use server';

import { createClient } from "@/lib/supabase/server";
import { processLeaveCompOff } from "@/lib/actions/compoff";

export async function reviewLeaveAction(leaveId: string, newStatus: string) {
  const supabase = await createClient();
  
  // 1. Fetch current leave to validate
  const { data: leave, error: fetchError } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('id', leaveId)
    .single();

  if (fetchError || !leave) {
    return { success: false, error: "Leave request not found" };
  }

  // 2. Process Comp Off Deduction if it's a Comp Off leave being approved
  if (leave.leave_type === 'Compensatory Off') {
    // Determine duration
    const startDate = new Date(leave.start_date);
    const endDate = new Date(leave.end_date);
    // Simple duration in days (inclusive)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (leave.is_half_day) diffDays = 0.5;

    await processLeaveCompOff(leaveId, leave.employee_id, diffDays, newStatus);
  }

  // 3. Update Status
  const { error: updateError } = await supabase
    .from('leave_requests')
    .update({ status: newStatus })
    .eq('id', leaveId);

  if (updateError) {
    return { success: false, error: "Failed to update leave status" };
  }

  return { success: true };
}

import { getCompOffBalance } from "@/lib/actions/compoff";

export async function submitLeaveAction(leaveData: any) {
  const supabase = await createClient();

  if (leaveData.leave_type === 'Compensatory Off') {
    const balance = await getCompOffBalance(leaveData.employee_id);
    const sDate = new Date(leaveData.start_date);
    const eDate = new Date(leaveData.end_date);
    const diffTime = Math.abs(eDate.getTime() - sDate.getTime());
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (leaveData.is_half_day) diffDays = 0.5;
    
    if (balance < diffDays * 8) {
      return { success: false, error: "Insufficient Comp Off balance." };
    }
  }

  const { data, error } = await supabase
    .from('leave_requests')
    .insert(leaveData)
    .select('*, employee:employee_onboarding!leave_requests_employee_id_fkey(first_name, last_name, email, department)')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}
