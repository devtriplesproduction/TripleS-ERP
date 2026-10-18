import { PayrollClientPage } from '@/components/hr/payroll/PayrollClientPage'
import { getEmployees } from '@/lib/actions/onboarding'
import { requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Payroll Management | TripleS ERP',
  description: 'Manage employee compensation, salary structures, and monthly disbursement calculations',
}

export default async function PayrollPage() {
  await requireRole('/payroll')
  const employees = await getEmployees()

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PayrollClientPage title="Payroll Management" initialEmployees={employees} />
    </div>
  )
}
