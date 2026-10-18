import { getHolidaysAction } from '@/actions/holiday.actions'
import { HolidayManager } from '@/components/modules/HolidayManager'
import { requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Company Holidays | TripleS ERP',
  description: 'View corporate holiday calendar and manage paid leave observances',
}

export default async function HolidaysPage() {
  const user = await requireRole('/holidays')
  const { data: holidays, success } = await getHolidaysAction()

  if (!success) {
    return <div className="p-8 text-center text-muted-foreground">Failed to load holidays.</div>
  }

  const isAdminOrHR = user.role === 'Admin' || user.role === 'HR'

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <HolidayManager initialHolidays={holidays || []} isAdmin={isAdminOrHR} />
    </div>
  )
}
