import { getHolidaysAction } from "@/actions/holiday.actions";
import { HolidayManager } from "@/components/modules/HolidayManager";
import { requireRole } from '@/lib/auth'

export default async function AdminHolidaysPage() {
  await requireRole('/admin-holiday')
  const { data: holidays, success } = await getHolidaysAction();
  
  if (!success) {
    return <div className="p-8 text-center text-muted-foreground">Failed to load holidays.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <HolidayManager initialHolidays={holidays || []} isAdmin={true} />
    </div>
  );
}
