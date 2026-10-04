import { createClient } from '@/lib/supabase/server'
import { getCompOffBalance } from '@/lib/actions/compoff'
import { LeaveClientPage } from '@/components/hr/leave/LeaveClientPage'
import { requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function SuperAdminLeavePage() {
  const user = await requireRole('/super-admin/leave')
  const supabase = await createClient()
  
  const isSuperAdmin = true
  const canApprove = true

  let employeeId = ''
  if (user.employee_id) {
    const { data: empRecord } = await supabase
      .from('employee_onboarding')
      .select('id')
      .eq('employee_id_number', user.employee_id)
      .single()
    employeeId = empRecord?.id || ''
  }
  
  const { data: allLeaves, error } = await supabase.from('leave_requests').select(`
    *,
    employee:employee_onboarding!leave_requests_employee_id_fkey(first_name, last_name, email, department)
  `)

  if (error) {
    console.error("Failed to fetch leaves:", error)
  }
  
  const leavesList = allLeaves || []
  const myLeaves = leavesList.filter(l => l.employee_id === employeeId)
  const leavesToApprove = leavesList
  const compOffBalance = employeeId ? await getCompOffBalance(employeeId) : 0;

  return (
    <div className="max-w-7xl mx-auto">
      <LeaveClientPage
        myLeaves={myLeaves}
        canApprove={canApprove}
        leavesToApprove={leavesToApprove}
        isHR={false}
        compOffBalance={compOffBalance}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  )
}
