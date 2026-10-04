import { AttendanceList } from "@/components/hr/attendance/AttendanceList"
import { guardServerAction } from "@/lib/auth"

export const metadata = {
  title: "Employee Attendance | HR",
  description: "View and manage employee attendance",
}

export default async function HRAttendancePage() {
  await guardServerAction(['HR', 'Admin'])
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <AttendanceList basePath="/hr/attendance" />
    </div>
  )
}
