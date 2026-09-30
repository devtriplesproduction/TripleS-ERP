import { createClient } from '@/lib/supabase/server'
import { getCompOffBalance } from '@/lib/actions/compoff'
import { LeaveClientPage } from '@/components/hr/leave/LeaveClientPage'
import { requireRole, getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function LeavePage() {
  const user = await requireRole('/hr/leave')
  const supabase = await createClient()
  
  const isHR = true
  const canApprove = true
  const isSuperAdmin = false

  // Use the authenticated user's linked employee record
  // For HR, we need to find their employee_onboarding record via their profile
  let employeeId = ''
  if (user.employee_id) {
    // Look up the employee_onboarding record by employee_id_number
    const { data: empRecord } = await supabase
      .from('employee_onboarding')
      .select('id')
      .eq('employee_id_number', user.employee_id)
      .single()
    employeeId = empRecord?.id || ''
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
