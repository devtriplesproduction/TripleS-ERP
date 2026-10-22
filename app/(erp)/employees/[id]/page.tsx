import { getEmployeeById } from '@/lib/actions/onboarding'
import { notFound } from 'next/navigation'
import { EmployeeDetailsClient } from '@/components/hr/onboarding/employee-details-modal'
import { requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Employee Profile | TripleS ERP',
}

export default async function EmployeeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const currentUser = await requireRole('/employees')
  const { id } = await params
  const { employee } = await getEmployeeById(id)

  if (!employee) {
    notFound()
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 min-w-0 overflow-hidden">
      <EmployeeDetailsClient employee={employee} currentUserRole={currentUser.role} />
    </div>
  )
}
