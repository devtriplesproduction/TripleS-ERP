import { PayrollClientPage } from '@/components/hr/payroll/PayrollClientPage'
import { getEmployees } from '@/lib/actions/onboarding'

export const dynamic = 'force-dynamic'

export default async function AdminPayrollPage() {
  const employees = await getEmployees()

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PayrollClientPage title="Admin Payroll" initialEmployees={employees} />
    </div>
  )
}
