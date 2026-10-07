// @ts-nocheck
import { getEODHistory, getEODStreak, EODReport } from "@/lib/actions/eod";
import { EODSubmissionForm } from "@/components/eod/EODSubmissionForm";
import { CheckCircle2, Clock, ShieldAlert, Send, History, CalendarDays, FileText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { LiveTaskCounter } from "@/components/eod/LiveTaskCounter";
import { countTasks } from "@/lib/utils";
import { formatOfficeHoursAsHHMM, formatMinutesAsHHMM } from "@/lib/utils/time";
import Link from "next/link";
import { RecentEODLogs } from "@/components/eod/RecentEODLogs";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from '@/lib/auth'

export default async function EmployeeEODPage() {
  const authUser = await requireRole('/employee-eod')
  const supabase = await createClient();

  // Look up the employee's onboarding record
  let user: any = null
  if (authUser.employee_id) {
    const { data } = await supabase
      .from('employee_onboarding')
      .select('id, first_name, last_name, employee_id_number, department, designation')
      .eq('employee_id_number', authUser.employee_id)
      .single()
    user = data
  }

  if (!user) {
    return <div className="p-8 text-center text-muted-foreground">Employee record not found. Contact HR.</div>
  }

  // Fetch Data for Submit Tab
  const { data: h } = await getEODHistory(authUser.id);
  const history = (h || []) as EODReport[];
  const { streak: s } = await getEODStreak(authUser.id);
  const streak = s || 0;

  console.log("=== UI EOD FETCH DEBUG ===");
  console.log("AuthUser.id:", authUser.id);
  console.log("Resolved Employee Onboarding ID:", user?.employee_id_number);
  console.log("Requested Role Context: Employee");
  console.log("Records returned:", history.length);
  history.forEach(h => console.log(`  -> ID: ${h.id}, Date: ${h.report_date}, Status: ${h.status}, Role: ${h.role_context}`));
  console.log("==========================");

  const today = new Date();
  const getISTDateString = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(today);
  const todayStr = getISTDateString();
  const todayEOD = history.find((report) => report.report_date === todayStr);

  const tasksCompleted = todayEOD ? countTasks(todayEOD.tasks_accomplished) : 0;
  const hoursLogged = todayEOD ? todayEOD.office_hours : 0;
  const hasBlockers = !!(todayEOD && todayEOD.blockers && todayEOD.blockers.trim().length > 0);

  return (
        <div className="max-w-[1280px] mx-auto space-y-4">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5 md:gap-2">
          <h1 className="text-[28px] font-bold text-foreground tracking-tight leading-none">Daily Status Report</h1>
          <p className="text-sm md:text-base text-muted-foreground">Log your daily achievements and identify blockers.</p>
        </div>
        <div className="bg-card text-card-foreground px-4 py-2.5 rounded-xl border border-border shadow-sm flex items-center gap-3 self-start md:self-center md:mt-0">
          <div className="w-8 h-8 rounded-full bg-muted/50 border border-border flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm font-semibold">Current Streak:</span>
            <span className="text-base font-bold">{streak} days {"\u{1F525}"}</span>
          </div>
        </div>
      </div>

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
              {today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          <EODSubmissionForm employeeId={authUser.id} canEditDate={false} canManage={false} />
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
          <h3 className="text-lg font-bold text-foreground mb-4 pl-1">Recent EOD Reports</h3>
          <RecentEODLogs history={history} user={{ first_name: user.first_name, last_name: user.last_name, employee_id: user.employee_id_number || '' }} />
        </div>
      </div>
  );
}






