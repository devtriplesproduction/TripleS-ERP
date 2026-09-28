import { createClient } from '@/lib/supabase/client'
import { getCompOffBalance } from '@/lib/actions/compoff'
import { LeaveClientPage } from '@/components/hr/leave/LeaveClientPage'

export const dynamic = 'force-dynamic'

export default async function EmployeeLeavePage() {
  const supabase = createClient()
  
  // Dummy authenticated user check for Employee
  const isSuperAdmin = false
  const isHR = false
  const canApprove = false // Crucial: This hides the Approvals tab and HR functions
  // Fetch first employee for testing self-service without auth
  // TEST MODE: Force identity
  let employeeId = 'a0ef8d37-d4fd-49c7-b20d-b8ed9a512379';

  // We reuse the same query but logically an employee only fetches their own leaves or we filter it down
  // In a real app, RLS (Row Level Security) would limit this.
  const { data: allLeaves } = await supabase.from('leave_requests').select(`
    *,
    employee:employee_onboarding!leave_requests_employee_id_fkey(first_name, last_name, email, department)
  `) || { data: [] }
  
  const leavesList = allLeaves || []
  
  const myLeaves = leavesList.filter(l => l.employee_id === employeeId)
  
  // No leaves to approve for an employee
  const leavesToApprove: any[] = []
  
  // Mock compOff balance
  const compOffBalance = employeeId ? await getCompOffBalance(employeeId) : 0;

  return (
    <div className="max-w-7xl mx-auto">
      <LeaveClientPage
        myLeaves={myLeaves}
        canApprove={canApprove}
        leavesToApprove={leavesToApprove}
        isHR={isHR}
        compOffBalance={compOffBalance}
        isSuperAdmin={isSuperAdmin}
        currentEmployeeId={employeeId}
      />
    </div>
  )
}
