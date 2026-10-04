import { AttendanceDetail } from "@/components/hr/attendance/AttendanceDetail"
import { guardServerAction } from "@/lib/auth"

export const metadata = {
  title: "Employee Attendance Details | HR",
  description: "View detailed employee attendance",
}

export default async function HRAttendanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await guardServerAction(['HR', 'Admin'])
  const resolvedParams = await params;
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <AttendanceDetail employeeId={resolvedParams.id} basePath="/hr/attendance" />
    </div>
  )
}
