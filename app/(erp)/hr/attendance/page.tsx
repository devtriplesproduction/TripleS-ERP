import { AttendanceList } from "@/components/hr/attendance/AttendanceList"
import { guardServerAction } from "@/lib/auth"

export const metadata = {
  title: "Employee Attendance | HR",
  description: "View and manage employee attendance",
}

export default async function HRAttendancePage() {
  await guardServerAction(['HR', 'Admin'])
  return (
    <div className="p-6 h-[calc(100vh-4rem)] overflow-y-auto w-full max-w-7xl mx-auto">
      <AttendanceList basePath="/hr/attendance" />
    </div>
  )
}
