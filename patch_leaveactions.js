const fs = require('fs');
let code = fs.readFileSync('actions/leave.actions.ts', 'utf8');

const newAction = `
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
`;

code = code + newAction;
fs.writeFileSync('actions/leave.actions.ts', code);
console.log("Patched leave.actions.ts");
