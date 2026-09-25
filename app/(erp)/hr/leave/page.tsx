import { createClient } from '@/lib/supabase/client'
import { LeaveClientPage } from '@/components/hr/leave/LeaveClientPage'

export const dynamic = 'force-dynamic'

export default async function LeavePage() {
  const supabase = createClient()
  
  // Dummy authenticated user check
  const isSuperAdmin = false
  const isHR = true
  const canApprove = true
  const { data: emps } = await supabase.from('employee_onboarding').select('id').limit(2)
  const employeeId = emps?.[1]?.id || emps?.[0]?.id || null

  const { data: allLeaves } = await supabase.from('leave_requests').select(`
    *,
    employee:employee_onboarding!leave_requests_employee_id_fkey(first_name, last_name, email, department)
  `) || { data: [] }
  
  const leavesList = allLeaves || []
  const myLeaves = leavesList.filter(l => l.employee_id === employeeId)
  
  const leavesToApproveList = leavesList.filter((l: any) => l.employee_id !== employeeId)
  
  const compOffBalance = 0

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
