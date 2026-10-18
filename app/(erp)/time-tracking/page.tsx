import { requireRole } from '@/lib/auth'
import { TimeTrackingAdminDashboard } from '@/components/time-tracking/TimeTrackingAdminDashboard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TimeTrackingPage() {
  // STRICT SERVER-SIDE ROLE ENFORCEMENT: Only Admin role can access
  await requireRole('/time-tracking')
  return <TimeTrackingAdminDashboard />
}
