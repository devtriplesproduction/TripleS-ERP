import { PayrollClientPage } from '@/components/hr/payroll/PayrollClientPage'
import { getEmployees } from '@/lib/actions/onboarding'
import { requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function HrPayrollPage() {
  await requireRole('/hr/payroll')
  const employees = await getEmployees()

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PayrollClientPage title="HR Payroll" initialEmployees={employees} />
    </div>
  )
}
