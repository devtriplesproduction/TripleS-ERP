export const dynamic = 'force-dynamic';
export const revalidate = 0;
// @ts-nocheck

import { getEODHistory, getEODStreak, EODReport, getAllEODs } from "@/lib/actions/eod";

import { createClient } from "@/lib/supabase/server";

import { EODSubmissionForm } from "@/components/eod/EODSubmissionForm";
import { ReviewDashboard } from "@/components/eod/ReviewDashboard";
import { CheckCircle2, Clock, ShieldAlert, Send, History, BarChart2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { LiveTaskCounter } from "@/components/eod/LiveTaskCounter";
import { countTasks } from "@/lib/utils";
import Link from "next/link";
import { RecentEODLogs } from "@/components/eod/RecentEODLogs";

import { BranchSelectorClient } from "@/components/eod/BranchSelectorClient";

import { EodTabsClient } from "@/components/eod/EodTabsClient";
import { requireRole } from '@/lib/auth'

interface PageProps {
  searchParams: { tab?: string, branch?: string };
}

export default async function EODPage({ searchParams }: PageProps) {
  const authUser = await requireRole('/eod')
  const supabase = await createClient();

  // Look up the employee's onboarding record via their profile employee_id
  let user: any = { id: '', first_name: '', last_name: '' }
  if (authUser.employee_id) {
    const { data } = await supabase
      .from('employee_onboarding')
      .select('id, first_name, last_name, employee_id_number')
      .eq('employee_id_number', authUser.employee_id)
      .single()
    if (data) user = data
  }

  const canReview = true;
  const canManage = true;
  const isSuperAdmin = false;

  // Determine active tab
  const params = await searchParams;
  const activeTab = isSuperAdmin ? 'review' : (canReview ? (params.tab || 'review') : 'submit');
  const selectedBranch = params.branch || 'all';

  let activeBranches: { id: string; name: string }[] = [];
  if (isSuperAdmin) {
    const { data } = { data: [{ id: "branch-1", name: "Main Branch" }] };
    if (data) {
      activeBranches = data;
    }
  }

  // --- Fetch Data for Submit Tab ---
  let history: EODReport[] = [];
  let streak = 0;
  let todayEOD: EODReport | undefined;
  let tasksCompleted = 0;
  let hoursLogged = 0;
  let hasBlockers = false;
  type EmployeeOption = { id: string; first_name: string; last_name: string; employee_id: string };
  type EODWithEmployee = EODReport & { profiles: EmployeeOption | null };
  let allEmployees: EmployeeOption[] = [];

  if (activeTab === 'submit') {
    const { data: h } = await getEODHistory(user.id, 'HR');
    history = (h || []) as EODReport[];
    const { streak: s } = await getEODStreak(user.id, 'HR');
    streak = s || 0;

    const getISTDateString = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const todayStr = getISTDateString();
    todayEOD = history.find((h) => h.report_date === todayStr);

    tasksCompleted = todayEOD ? todayEOD.tasks_accomplished.split('\n').filter((t: string) => t.trim().length > 0).length : 0;
    hoursLogged = todayEOD ? todayEOD.office_hours : 0;
    hasBlockers = !!(todayEOD && todayEOD.blockers && todayEOD.blockers.trim().length > 0);

    if (canManage) {
      const { data: emps } = { data: [] };
      allEmployees = (emps || []) as EmployeeOption[];
    }
  }

  // --- Fetch Data for Review Tab ---
  let allEODs: EODWithEmployee[] = [];
  let todayReportsCount = 0;

  if (activeTab === 'review' && canReview) {
    const { data: eods } = await getAllEODs({ branchId: selectedBranch, roleContextFilter: 'Employee' });
    allEODs = (eods || []) as unknown as EODWithEmployee[];

    if (allEmployees.length === 0) {
      const { data: emps } = { data: [] };
      allEmployees = (emps || []) as EmployeeOption[];
    }

    const todayStr2 = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    todayReportsCount = allEODs.filter((e) => e.report_date === todayStr2).length;
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="EOD Reports"
        subtitle={canReview ? "Review team reports or submit your own end-of-day update." : "Submit your daily end-of-day update."}
        actions={
          <div className="flex items-center gap-3">
            {canReview && (
              <EodTabsClient activeTab={activeTab} isSuperAdmin={!!isSuperAdmin} />
            )}

            {activeTab === 'review' ? (
              isSuperAdmin ? (
                <BranchSelectorClient branches={activeBranches} />
              ) : (
                <div className="bg-card text-card-foreground border-border text-zinc-900 dark:text-zinc-100 px-4 py-2.5 rounded-xl font-semibold border border-zinc-200 dark:border-zinc-800 flex items-center gap-2 shadow-sm">
                  <BarChart2 className="w-4 h-4 text-black dark:text-white" />
                  <span>{todayReportsCount}</span> <span className="text-zinc-900 dark:text-zinc-100 font-medium">Reports Today</span>
                </div>
              )
            ) : (
              <div className="bg-black dark:bg-zinc-800 text-white dark:text-zinc-100 px-4 py-2 rounded-xl font-semibold border border-black dark:border-white flex items-center gap-2">
                Current Streak: {streak} days 🔥
              </div>
            )}
          </div>
        }
      />

      {activeTab === 'review' && canReview ? (
        <ReviewDashboard initialEods={allEODs} employees={allEmployees} />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form */}
          <div className="xl:col-span-7 2xl:col-span-6">
            <EODSubmissionForm employeeId={authUser.id} canEditDate={canManage} employees={canManage ? allEmployees : undefined} canManage={canManage} employeeName={`${user.first_name} ${user.last_name}`} employeeStringId={user.employee_id_number || ''} />
          </div>

          {/* Right Column: Stats & Logs */}
          <div className="xl:col-span-5 2xl:col-span-6 space-y-6">

            {/* Today at a glance */}
            <div className="bg-card text-card-foreground border-border rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-black dark:bg-zinc-800 text-white dark:text-zinc-100 flex items-center justify-center text-black dark:text-white">
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
                    <div className="w-8 h-8 rounded-full bg-black dark:bg-zinc-800 text-white dark:text-zinc-100 flex items-center justify-center text-black dark:text-white">
                      <Clock className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Hours Logged</span>
                  </div>
                  <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{hoursLogged}h</div>
                  <div className="mt-1 text-xs text-zinc-900 dark:text-zinc-100 font-medium">Duration</div>
                </div>

              </div>
            </div>

            {/* Recent EOD Logs */}
            <RecentEODLogs history={history} user={{ first_name: user.first_name, last_name: user.last_name, employee_id: user.employee_id_number || '' }} />
          </div>
        </div>
      )}
    </div>
  );
}











