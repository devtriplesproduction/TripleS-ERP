import { createClient } from '@/lib/supabase/server'
import { getCompOffBalance } from '@/lib/actions/compoff'
import { LeaveClientPage } from '@/components/hr/leave/LeaveClientPage'
import { requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function SuperAdminLeavePage() {
  await requireRole('/super-admin/leave')
  const supabase = await createClient()
  
  const isSuperAdmin = true
  const canApprove = true
  
  const { data: allLeaves, error } = await supabase.from('leave_requests').select(`
    *,
    employee:employee_onboarding!leave_requests_employee_id_fkey(first_name, last_name, email, department)
  `)

  if (error) {
    console.error("Failed to fetch leaves:", error)
  }
  
  const leavesList = allLeaves || []
  const myLeaves: any[] = []
  const leavesToApprove = leavesList
  const compOffBalance = 0;

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
