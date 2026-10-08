export const dynamic = 'force-dynamic';
export const revalidate = 0;
// @ts-nocheck

import { getEODHistory, getEODStreak, EODReport, getAllEODs } from "@/lib/actions/eod";

import { createClient } from "@/lib/supabase/server";

import { EODSubmissionForm } from "@/components/eod/EODSubmissionForm";
import { ReviewDashboard } from "@/components/eod/ReviewDashboard";
import { CheckCircle2, Clock, ShieldAlert, Send, History, BarChart2, CalendarDays, FileText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { LiveTaskCounter } from "@/components/eod/LiveTaskCounter";
import { countTasks } from "@/lib/utils";
import Link from "next/link";
import { formatOfficeHoursAsHHMM, formatMinutesAsHHMM } from "@/lib/utils/time";
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
      const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
      const adminSupa = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data: emps } = await adminSupa.from('profiles').select('id, first_name, last_name, employee_id').neq('role', 'SUPER_ADMIN').neq('role', 'Admin').neq('first_name', 'admin');
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
      const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
      const adminSupa = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data: emps } = await adminSupa.from('profiles').select('id, first_name, last_name, employee_id').neq('role', 'SUPER_ADMIN').neq('role', 'Admin').neq('first_name', 'admin');
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
              <div className="bg-black dark:bg-zinc-800 text-white dark:text-zinc-100 px-4 py-2 rounded-xl font-semibold border border-black dark:border-white flex items-center gap-2 whitespace-nowrap">
                Current Streak: {streak} days 🔥
              </div>
            )}
          </div>
        }
      />

      {activeTab === 'review' && canReview ? (
        <ReviewDashboard initialEods={allEODs} employees={allEmployees} />
      ) : (
        <div className="max-w-[1280px] mx-auto space-y-4 w-full">


          {/* Form */}
          <div className="bg-card text-card-foreground border-border rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-muted/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-card/80 shadow-sm flex items-center justify-center border border-border/50">
                  <FileText className="w-4 h-4 text-foreground/80" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Today's EOD</h2>
              </div>
              <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground bg-card/50 px-3 py-1.5 rounded-md border border-border/40">
                <CalendarDays className="w-3.5 h-3.5 opacity-70" />
                {new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date())}
              </div>
            </div>
            <EODSubmissionForm employeeId={authUser.id} canEditDate={false} canManage={false} employeeName={`${user.first_name} ${user.last_name}`} employeeStringId={user.employee_id_number || ''} />
          </div>

          {/* Today's Summary */}
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4 pl-1">Today's Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-border bg-card text-card-foreground shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Tasks Completed</span>
                <div className="text-2xl font-bold text-foreground">{tasksCompleted}</div>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card text-card-foreground shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Hours Logged</span>
                <div className="text-2xl font-bold text-foreground">{todayEOD ? formatOfficeHoursAsHHMM(Number(hoursLogged)) : "0.00"}</div>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card text-card-foreground shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Today's Work Duration</span>
                <div className="text-2xl font-bold text-foreground">{todayEOD ? formatOfficeHoursAsHHMM(Number(hoursLogged)) : "0.00"}</div>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card text-card-foreground shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Extra Hours</span>
                <div className="text-2xl font-bold text-foreground">
                  {todayEOD && Number(hoursLogged) > 8 ? formatMinutesAsHHMM(Math.round(Number(hoursLogged) * 60) - 480) : "0.00"}
                </div>
              </div>
            </div>
          </div>

          {/* Recent EOD Reports */}
          <div>
            <RecentEODLogs history={history} user={{ first_name: user.first_name, last_name: user.last_name, employee_id: user.employee_id_number || '' }} />
          </div>
        </div>
      )}
    </div>
  );
}












