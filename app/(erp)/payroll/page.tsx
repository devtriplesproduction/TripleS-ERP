import { PayrollClientPage } from '@/components/hr/payroll/PayrollClientPage'
import { EmployeePayrollClientPage } from '@/components/hr/payroll/EmployeePayrollClientPage'
import { getEmployees } from '@/lib/actions/onboarding'
import { requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Payroll | TripleS ERP',
  description: 'Manage and view employee compensation, salary structures, and monthly disbursement calculations',
}

export default async function PayrollPage() {
  const user = await requireRole('/payroll')

  // HR and Admin get the full management interface (completely untouched)
  if (user.role === 'HR' || user.role === 'Admin') {
    const employees = await getEmployees()
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <PayrollClientPage title="Payroll Management" initialEmployees={employees} />
      </div>
    )
  }

  // Normal Employee role gets strictly read-only "My Payroll" view
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <EmployeePayrollClientPage user={user} />
    </div>
  )
}

