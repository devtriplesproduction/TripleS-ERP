import { AttendanceDetail } from "@/components/hr/attendance/AttendanceDetail"
import { requireAuth } from "@/lib/auth"

export const metadata = {
  title: "My Attendance",
  description: "View your attendance details",
}

export default async function EmployeeAttendancePage() {
  const user = await requireAuth()
  
  return (
    <div className="p-6 h-[calc(100vh-4rem)] overflow-y-auto w-full max-w-7xl mx-auto">
      <AttendanceDetail employeeId={user.id} basePath="/dashboard" />
    </div>
  )
}
