export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { createClient } from '@/lib/supabase/server';
// @ts-nocheck

import { getAllEODs, EODReport } from "@/lib/actions/eod";
import { ReviewDashboard } from "@/components/eod/ReviewDashboard";

export default async function AdminEODPage() {
  const supabase = await createClient();
  // TEST MODE: Force identity
  const { data: user } = await supabase.from('employee_onboarding').select('id, first_name, last_name').eq('id', '889bab81-e196-4f40-9793-7cdac9524ed3').single();
  // Bypass authUser check
  type EmployeeOption = { id: string; first_name: string; last_name: string; employee_id: string };
  type EODWithEmployee = EODReport & { profiles: EmployeeOption | null };

  const { data: eods } = await getAllEODs({ branchId: 'all' });
  const allEODs = (eods || []) as unknown as EODWithEmployee[];

  const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
  const adminSupa = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: emps } = await adminSupa.from('profiles').select('id, first_name, last_name, employee_id').neq('role', 'SUPER_ADMIN').neq('role', 'Admin').neq('first_name', 'admin');
  const allEmployees: EmployeeOption[] = (emps || []) as EmployeeOption[];

  const getISTDateString = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const todayStr = getISTDateString();
  const todayReportsCount = allEODs.filter((e) => e.report_date === todayStr).length;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <ReviewDashboard
        initialEods={allEODs}
        employees={allEmployees}
        showHeader={true}
        todayReportsCount={todayReportsCount}
      />
    </div>
  );
}
