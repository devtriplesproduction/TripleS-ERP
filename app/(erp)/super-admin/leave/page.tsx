import { createClient } from '@/lib/supabase/client'
import { LeaveClientPage } from '@/components/hr/leave/LeaveClientPage'

export const dynamic = 'force-dynamic'

export default async function SuperAdminLeavePage() {
  const supabase = createClient()
  
  // Super Admin context
  const isSuperAdmin = true
  const canApprove = true // Needed to show approvals tab and actions
  
  // Super Admin views ALL leave requests across all departments
  const { data: allLeaves, error } = await supabase.from('leave_requests').select(`
    *,
    employee:employee_onboarding!leave_requests_employee_id_fkey(first_name, last_name, email, department)
  `)

  if (error) {
    console.error("Failed to fetch leaves:", error)
  }
  
  const leavesList = allLeaves || []
  
  // Super Admin doesn't have personal leaves shown here
  const myLeaves: any[] = []
  
  // All leaves are shown in the Approvals tab
  const leavesToApprove = leavesList
  
  // No personal comp-off balance for Super Admin in this view
  const compOffBalance = 0

  return (
    <div className="max-w-7xl mx-auto">
      <LeaveClientPage
        myLeaves={myLeaves}
        canApprove={canApprove}
        leavesToApprove={leavesToApprove}
        isHR={false} // Depending on RBAC, might be combined or separate
        compOffBalance={compOffBalance}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  )
}
