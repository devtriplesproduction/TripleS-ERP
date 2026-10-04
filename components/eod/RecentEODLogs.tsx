// @ts-nocheck
'use client';

import { useState } from 'react';
import { CheckCircle2, Clock, History, FileText, User, Calendar, MapPin, AlertTriangle, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatWorkedTime } from '@/lib/utils/time';

type EODLog = {
  id: string;
  report_date: string;
  tasks_accomplished: string;
  office_hours: number;
  location: string;
  blockers?: string;
  status: string;
  tomorrows_plan?: string;
  role_context?: string;
  rejection_reason?: string;
};

type UserInfo = {
  first_name: string;
  last_name: string;
  employee_id?: string;
};

export function RecentEODLogs({ history, user }: { history: EODLog[]; user: UserInfo }) {
  const [selectedEod, setSelectedEod] = useState<EODLog | null>(null);

  return (
    <>
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
                      <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {eodDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </h4>
                      <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                        {taskLines} tasks &bull; {formatWorkedTime(Math.round(Number(eod.office_hours) * 60))}
                      </p>
                    </div>

                    {/* Status Badge + View Button */}
                    <div className="ml-2 sm:ml-3 flex-shrink-0 flex items-center gap-1.5 sm:gap-2">
                      <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider rounded-full border flex items-center gap-1 ${eod.status === 'Approved' ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-emerald-500/20' :
                        eod.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                          'bg-amber-500/10 text-amber-600 border-amber-200'
                        }`}>
                        {eod.status === 'Approved' && <CheckCircle2 className="w-3 h-3" />}
                        {eod.status === 'Pending' && <Clock className="w-3 h-3" />}
                        {eod.status}
                      </span>
                      <button
                        onClick={() => setSelectedEod(eod)}
                        className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors shrink-0"
                        title="View EOD"
                        aria-label="View EOD"
                      >
                        <Eye className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* EOD View Modal */}
      {selectedEod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="w-[calc(100vw-1.5rem)] sm:max-w-2xl rounded-2xl sm:rounded-3xl bg-card text-card-foreground border-border shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)]">

            {/* Modal Header */}
            <div className="bg-muted px-4 sm:px-6 py-4 sm:py-5 border-b border-border flex items-center justify-between sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-muted flex items-center justify-center text-foreground shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">EOD Report</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">Review details</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-muted-foreground hover:text-muted-foreground hover:bg-slate-200/50 h-8 w-8"
                onClick={() => setSelectedEod(null)}
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Employee Info Card */}
                <div className="bg-card text-card-foreground border-border rounded-2xl border border-border p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-foreground">
                    <User className="w-4 h-4 text-foreground" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Employee Details</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-lg border-2 border-white shadow-sm">
                      {user.first_name?.[0]}{user.last_name?.[0]}
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-lg">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm font-medium text-muted-foreground bg-muted inline-block px-2 py-0.5 rounded-md mt-1">
                        {user.employee_id || 'EMP-001'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Report Meta Card */}
                <div className="bg-card text-card-foreground border-border rounded-2xl border border-border p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 mb-2 text-foreground">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Report Info</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Date</p>
                      <p className="font-semibold text-foreground text-sm">
                        {new Date(selectedEod.report_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                      <span className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md inline-flex items-center gap-1 ${selectedEod.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-500' :
                        selectedEod.status === 'Rejected' ? 'bg-rose-100/80 text-rose-700' :
                          'bg-amber-100/80 text-amber-700'
                        }`}>
                        {selectedEod.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</p>
                      <p className="font-semibold text-foreground text-sm">{selectedEod.location}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Hours</p>
                      <p className="font-semibold text-foreground text-sm">{formatWorkedTime(Math.round(Number(selectedEod.office_hours) * 60))}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-muted rounded-2xl p-5 border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-bold text-foreground">Tasks Accomplished</h3>
                  </div>
                  <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-sm bg-card text-card-foreground border-border p-4 rounded-xl border border-border shadow-sm">
                    {selectedEod.tasks_accomplished}
                  </div>
                </div>

                {selectedEod.blockers && (
                  <div className="bg-muted rounded-2xl p-5 border border-border mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      <h3 className="font-bold text-foreground">Blockers & Issues</h3>
                    </div>
                    <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-sm bg-card text-card-foreground border-border p-4 rounded-xl border border-border shadow-sm">
                      {selectedEod.blockers}
                    </div>
                  </div>
                )}

                {selectedEod.tomorrows_plan && (
                  <div className="bg-muted rounded-2xl p-5 border border-border mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-5 h-5 text-blue-500" />
                      <h3 className="font-bold text-foreground">Tomorrow's Plan</h3>
                    </div>
                    <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-sm bg-card text-card-foreground border-border p-4 rounded-xl border border-border shadow-sm">
                      {selectedEod.tomorrows_plan}
                    </div>
                  </div>
                )}

                {selectedEod.status === 'Rejected' && selectedEod.rejection_reason && (
                  <div className="bg-muted rounded-2xl p-5 border border-border mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <X className="w-5 h-5 text-rose-500" />
                      <h3 className="font-bold text-foreground">Reason for Rejection</h3>
                    </div>
                    <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-sm bg-card text-card-foreground border-border p-4 rounded-xl border border-border shadow-sm">
                      {selectedEod.rejection_reason}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-border bg-muted p-4 sm:p-6 sticky bottom-0 z-10 shrink-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  {selectedEod.status === 'Approved' ? (
                    <><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> This report has been approved.</>
                  ) : selectedEod.status === 'Rejected' ? (
                    <><X className="w-4 h-4 text-rose-500 shrink-0" /> This report was rejected.</>
                  ) : (
                    <><Clock className="w-4 h-4 text-amber-500 shrink-0" /> This report is pending review.</>
                  )}
                </div>
                <Button variant="ghost" className="rounded-xl w-full sm:w-auto" onClick={() => setSelectedEod(null)}>
                  Close
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
