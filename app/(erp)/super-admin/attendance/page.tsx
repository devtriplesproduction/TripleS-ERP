import { AttendanceList } from "@/components/hr/attendance/AttendanceList"
import { guardServerAction } from "@/lib/auth"

export const metadata = {
  title: "Employee Attendance | Admin",
  description: "View and manage employee attendance",
}

export default async function AdminAttendancePage() {
  await guardServerAction(['Admin'])
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <AttendanceList basePath="/super-admin/attendance" />
    </div>
  )
}
