import { getHolidaysAction } from "@/actions/holiday.actions";
import { HolidayManager } from "@/components/modules/HolidayManager";

export default async function EmployeeHolidaysPage() {
  const { data: holidays, success } = await getHolidaysAction();
  
  if (!success) {
    return <div className="p-8 text-center text-muted-foreground">Failed to load holidays.</div>;
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <HolidayManager initialHolidays={holidays || []} isAdmin={false} />
    </div>
  );
}
