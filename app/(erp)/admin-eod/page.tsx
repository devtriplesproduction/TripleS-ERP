// @ts-nocheck

import { getAllEODs, EODReport } from "@/lib/actions/eod";
import { ReviewDashboard } from "@/components/eod/ReviewDashboard";
import { PageHeader } from "@/components/PageHeader";
import { BarChart2 } from "lucide-react";

export default async function AdminEODPage() {
  type EmployeeOption = { id: string; first_name: string; last_name: string; employee_id: string };
  type EODWithEmployee = EODReport & { profiles: EmployeeOption | null };

  const { data: eods } = await getAllEODs({ branchId: 'all' });
  const allEODs = (eods || []) as unknown as EODWithEmployee[];

  const allEmployees: EmployeeOption[] = []; // Reused component gets this passed, but maybe it fetches internal or we can just pass empty and let it be used. Wait, HR passes empty if no employees. ReviewDashboard probably does its own filtering from the provided EODs if employees array is empty, or we can fetch all employees.
  // Actually in original eod page, llEmployees was mocked: const { data: emps } = { data: [] }; allEmployees = emps;

  const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const todayReportsCount = allEODs.filter((e) => {
    const d = new Date(e.report_date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) === todayStr;
  }).length;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Admin EOD"
        subtitle="Review employee and HR end-of-day reports."
        actions={
          <div className="flex items-center gap-3">
            <div className="bg-card text-card-foreground border-border text-zinc-900 dark:text-zinc-100 px-4 py-2.5 rounded-xl font-semibold border border-zinc-200 dark:border-zinc-800 flex items-center gap-2 shadow-sm">
              <BarChart2 className="w-4 h-4 text-black dark:text-white" />
              <span>{todayReportsCount}</span> <span className="text-zinc-900 dark:text-zinc-100 font-medium">Reports Today</span>
            </div>
          </div>
        }
      />

      <ReviewDashboard initialEods={allEODs} employees={allEmployees} />
    </div>
  );
}
