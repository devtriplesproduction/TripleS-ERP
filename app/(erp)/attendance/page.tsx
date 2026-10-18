import { AttendanceList } from '@/components/hr/attendance/AttendanceList'
import { AttendanceDetail } from '@/components/hr/attendance/AttendanceDetail'
import { requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Attendance | TripleS ERP',
  description: 'View and track daily attendance, office check-ins, and leave integration',
}

export default async function AttendancePage() {
  const user = await requireRole('/attendance')

  // Administrative view for Admin and HR
  if (user.role === 'Admin' || user.role === 'HR') {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <AttendanceList basePath="/attendance" />
      </div>
    )
  }

  // Individual staff attendance view for Employee and Manager
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <AttendanceDetail employeeId={user.id} basePath="/dashboard" />
    </div>
  )
}
