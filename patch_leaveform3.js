const fs = require('fs');
let code = fs.readFileSync('components/hr/leave/LeaveForm.tsx', 'utf8');

if (!code.includes("submitLeaveAction")) {
  code = code.replace(
    `import { createClient } from "@/lib/supabase/client"`,
    `import { createClient } from "@/lib/supabase/client"\nimport { submitLeaveAction } from "@/actions/leave.actions"`
  );
}

const oldInsert = `    const { data, error } = await supabase
      .from('leave_requests')
      .insert(newLeave)
      .select('*, employee:employee_onboarding!leave_requests_employee_id_fkey(first_name, last_name, email, department)')
      .single()

    setLoading(false)

    if (error) {
      console.error(error)
      toast.error("Failed to submit leave application")
    } else {
      toast.success("Leave application submitted successfully")
      onSuccess(data)
    }`;

const newInsert = `    const res = await submitLeaveAction(newLeave);

    setLoading(false)

    if (!res.success) {
      console.error(res.error)
      toast.error(res.error || "Failed to submit leave application")
    } else {
      toast.success("Leave application submitted successfully")
      onSuccess(res.data)
    }`;

code = code.replace(oldInsert, newInsert);
fs.writeFileSync('components/hr/leave/LeaveForm.tsx', code);
console.log("Patched LeaveForm for server action");
