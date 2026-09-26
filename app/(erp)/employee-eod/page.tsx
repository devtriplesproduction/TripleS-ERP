// @ts-nocheck
import { getEODHistory, getEODStreak, EODReport } from "@/lib/actions/eod";
import { EODSubmissionForm } from "@/components/eod/EODSubmissionForm";
import { CheckCircle2, Clock, ShieldAlert, Send, History } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function EmployeeEODPage() {
  const user = { id: "11111111-1111-4111-8111-111111111111", first_name: "Omkar", last_name: "Sawant" };

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

  const tasksCompleted = todayEOD ? todayEOD.tasks_accomplished.split('\n').filter((t: string) => t.trim().length > 0).length : 0;
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
          <EODSubmissionForm 
            employeeId={user.id} 
            canEditDate={false} 
            canManage={false} 
          />
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
          <div className="bg-card text-card-foreground border-border rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col h-[400px]">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-black dark:bg-zinc-800 text-white dark:text-zinc-100 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Recent EOD Logs</h2>
              </div>
              <Link href="#" className="text-sm font-semibold text-black dark:text-white hover:text-black dark:text-white">View all</Link>
            </div>

            <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
              {history?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full space-y-3 opacity-80">
                  <div className="w-16 h-16 bg-card text-card-foreground border-border dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-full flex items-center justify-center mb-2">
                    <History className="w-8 h-8" />
                  </div>
                  <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">No recent logs</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.slice(0, 5).map((eod) => {
                    const eodDate = new Date(eod.report_date);
                    const taskLines = eod.tasks_accomplished.split('\n').filter((t: string) => t.trim().length > 0).length;
                    return (
                      <div key={eod.id} className="flex items-center p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card text-card-foreground border-border shadow-sm hover:shadow-md transition-shadow group">
                        {/* Date Block */}
                        <div className="flex flex-col items-center justify-center min-w-[50px] mr-4 text-black dark:text-white font-bold leading-tight">
                          <span className="text-xl">{eodDate.getDate()}</span>
                          <span className="text-[10px] uppercase tracking-wider">{eodDate.toLocaleString('default', { month: 'short' })}</span>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {eodDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </h4>
                          <p className="text-xs text-zinc-900 dark:text-zinc-100 mt-0.5">
                            {taskLines} tasks &bull; {eod.office_hours}h logged
                          </p>
                        </div>

                        {/* Status Badge */}
                        <div className="ml-3 flex-shrink-0 flex items-center gap-3">
                          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border flex items-center gap-1 ${eod.status === 'Approved' ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-emerald-500/20' : eod.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-amber-500/10 text-amber-600 border-amber-200'}`}>
                            {eod.status === 'Approved' && <CheckCircle2 className="w-3 h-3" />}
                            {eod.status === 'Pending' && <Clock className="w-3 h-3" />}
                            {eod.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}






