import { AttendanceDetail } from '@/components/hr/attendance/AttendanceDetail'
import { requireRole } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Employee Attendance Details | TripleS ERP',
  description: 'View detailed employee attendance history',
}

export default async function AttendanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireRole('/attendance')
  const resolvedParams = await params

  // Employees and Managers can only view their own attendance details
  if (user.role === 'Employee' || user.role === 'Manager') {
    if (resolvedParams.id !== user.id) {
      redirect('/attendance')
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <AttendanceDetail employeeId={resolvedParams.id} basePath="/attendance" />
    </div>
  )
}
