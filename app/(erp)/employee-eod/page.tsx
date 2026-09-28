// @ts-nocheck
import { getEODHistory, getEODStreak, EODReport } from "@/lib/actions/eod";
import { EODSubmissionForm } from "@/components/eod/EODSubmissionForm";
import { CheckCircle2, Clock, ShieldAlert, Send, History } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { LiveTaskCounter } from "@/components/eod/LiveTaskCounter";
import { countTasks } from "@/lib/utils";
import Link from "next/link";
import { RecentEODLogs } from "@/components/eod/RecentEODLogs";
import { createClient } from "@/lib/supabase/server";

export default async function EmployeeEODPage() {
  const supabase = await createClient();
  // TEST MODE: Mock Identity
  const { data: user } = await supabase.from('employee_onboarding').select('id, first_name, last_name').eq('id', 'a0ef8d37-d4fd-49c7-b20d-b8ed9a512379').single();

  // Fetch Data for Submit Tab
  const { data: h } = await getEODHistory(user.id);
  const history = (h || []) as EODReport[];
  const { streak: s } = await getEODStreak(user.id);
  const streak = s || 0;

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const todayEOD = history.find((report) => {
    const d = new Date(report.report_date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) === todayStr;
  });

  const tasksCompleted = todayEOD ? countTasks(todayEOD.tasks_accomplished) : 0;
  const hoursLogged = todayEOD ? todayEOD.office_hours : 0;
  const hasBlockers = !!(todayEOD && todayEOD.blockers && todayEOD.blockers.trim().length > 0);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Employee EOD"
        subtitle="Submit your daily end-of-day update."
        actions={
          <div className="flex items-center gap-3">
            <div className="bg-black dark:bg-zinc-800 text-white dark:text-zinc-100 px-4 py-2 rounded-xl font-semibold border border-black dark:border-white flex items-center gap-2">
              Current Streak: {streak} days 🔥
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form */}
        <div className="xl:col-span-7 2xl:col-span-6">
          <EODSubmissionForm employeeId={user.id} canEditDate={false} canManage={false} employeeName={`${user.first_name} ${user.last_name}`} employeeStringId="EMP-002" />
        </div>

        {/* Right Column: Stats & Logs */}
        <div className="xl:col-span-5 2xl:col-span-6 space-y-6">

          {/* Today at a glance */}
          <div className="bg-card text-card-foreground border-border rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-black dark:bg-zinc-800 text-white dark:text-zinc-100 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
              </div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Today at a glance</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card text-card-foreground border-border shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Tasks Completed</span>
                </div>
                <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{tasksCompleted}</div>
                <div className="mt-1 text-xs text-black dark:text-white font-medium cursor-pointer hover:underline">View details</div>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card text-card-foreground border-border shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-black dark:bg-zinc-800 text-white dark:text-zinc-100 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Hours Logged</span>
                </div>
                <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{hoursLogged}h</div>
                <div className="mt-1 text-xs text-zinc-900 dark:text-zinc-100 font-medium">Duration</div>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card text-card-foreground border-border shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Blockers</span>
                </div>
                <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{hasBlockers ? '1' : '0'}</div>
                <div className="mt-1 text-xs text-zinc-900 dark:text-zinc-100 font-medium">{hasBlockers ? 'Needs attention' : 'Good to go!'}</div>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card text-card-foreground border-border shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-500">
                    <Send className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Status</span>
                </div>
                <div className="mb-2">
                  {todayEOD ? (
                    <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs font-bold rounded-full">Submitted</span>
                  ) : (
                    <span className="px-3 py-1 bg-black dark:bg-zinc-800 text-white dark:text-zinc-100 text-xs font-bold rounded-full">Not Submitted</span>
                  )}
                </div>
                <div className="mt-auto text-xs text-zinc-900 dark:text-zinc-100 font-medium">{todayEOD ? 'Done for the day' : 'Submit to complete'}</div>
              </div>
            </div>
          </div>

          {/* Recent EOD Logs */}
          <RecentEODLogs history={history} user={{ first_name: user.first_name, last_name: user.last_name, employee_id: 'EMP-001' }} />
        </div>
      </div>
    </div>
  );
}








