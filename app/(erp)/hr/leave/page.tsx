import { createClient } from '@/lib/supabase/client'
import { getCompOffBalance } from '@/lib/actions/compoff'
import { LeaveClientPage } from '@/components/hr/leave/LeaveClientPage'

export const dynamic = 'force-dynamic'

export default async function LeavePage() {
  const supabase = createClient()
  
  // Dummy authenticated user check
  const isSuperAdmin = false
  const isHR = true
  const canApprove = true
  const { data: { user } } = await supabase.auth.getUser();
  let employeeId = user?.id;
  if (!employeeId) {
    // Use Omkar for HR testing
    employeeId = '889bab81-e196-4f40-9793-7cdac9524ed3';
  }

  const { data: allLeaves } = await supabase.from('leave_requests').select(`
    *,
    employee:employee_onboarding!leave_requests_employee_id_fkey(first_name, last_name, email, department)
  `) || { data: [] }
  
  const leavesList = allLeaves || []
  const myLeaves = leavesList.filter(l => l.employee_id === employeeId)
  
  const leavesToApproveList = leavesList.filter((l: any) => l.employee_id !== employeeId)
  
  const compOffBalance = employeeId ? await getCompOffBalance(employeeId) : 0;

  return (
    <div className="max-w-7xl mx-auto">
      <LeaveClientPage
        myLeaves={myLeaves}
        canApprove={canApprove}
        leavesToApprove={leavesToApproveList}
        isHR={isHR}
        compOffBalance={compOffBalance}
        isSuperAdmin={isSuperAdmin}
        currentEmployeeId={employeeId}
      />
    </div>
  )
}
