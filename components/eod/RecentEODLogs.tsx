// @ts-nocheck
'use client';

import { useState } from 'react';
import { CheckCircle2, Clock, History, FileText, User, Calendar, MapPin, AlertTriangle, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatWorkedTime } from '@/lib/utils/time';
import { EodCard } from './EodCard';

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
  const [page, setPage] = useState(1);
  const itemsPerPage = 7;
  const totalPages = Math.ceil((history?.length || 0) / itemsPerPage);
  const currentItems = history?.slice((page - 1) * itemsPerPage, page * itemsPerPage) || [];

  return (
    <>
      <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border overflow-hidden flex flex-col min-h-[400px]">
        <div className="p-5 flex items-center justify-between border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Submission History</h2>
          <span className="text-sm text-muted-foreground font-medium">Recent Activity</span>
        </div>

        <div className="p-5 flex flex-col gap-2">
          {history?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-80">
              <History className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No recent logs</p>
            </div>
          ) : (
            <>
              {currentItems.map((eod) => (
                <HistoryRow key={eod.id} eod={eod} />
              ))}
              <div className="flex items-center justify-between pt-4 mt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Showing {history.length > 0 ? (page - 1) * itemsPerPage + 1 : 0} to {Math.min(page * itemsPerPage, history.length)} of {history.length}
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    Previous
                  </button>
                  <button 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function HistoryRow({ eod }: { eod: EODLog }) {
  const [expanded, setExpanded] = useState(false);

  // Date parsing
  const [y, m, d] = eod.report_date.split('-');
  const dateStr = `${d}/${m}`;
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
  const dayStr = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

  // Tasks
  const taskCount = eod.tasks_accomplished
    ? eod.tasks_accomplished.split('\n').filter((t) => t.trim().length > 0).length
    : 0;
  
  // Format hours
  const totalMinutes = Math.round((eod.office_hours || 0) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hoursStr = minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;

  // Status Colors
  let statusBadgeClasses = "bg-muted text-foreground border-border";
  if (eod.status === 'Approved' || eod.status === 'APPROVED') {
    statusBadgeClasses = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  } else if (eod.status === 'Submitted' || eod.status === 'Pending' || eod.status === 'SUBMITTED' || eod.status === 'PENDING') {
    statusBadgeClasses = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  } else if (eod.status === 'Rejected' || eod.status === 'REJECTED') {
    statusBadgeClasses = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
  }

  // Activity Dot Color
  let dotColor = "bg-muted-foreground";
  if (eod.status === 'Approved' || eod.status === 'APPROVED') dotColor = "bg-emerald-500";
  else if (eod.status === 'Submitted' || eod.status === 'Pending' || eod.status === 'SUBMITTED' || eod.status === 'PENDING') dotColor = "bg-blue-400";
  else if (eod.status === 'Rejected' || eod.status === 'REJECTED') dotColor = "bg-rose-500";

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden transition-all duration-200">
      {/* Compact Row */}
      <div 
        className="flex items-center px-4 py-3 cursor-pointer hover:bg-muted/30"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6">
          <div className="flex items-center gap-4 text-sm w-40 shrink-0">
            <span className="text-muted-foreground font-medium">{dateStr}</span>
            <div className="w-px h-3 bg-border" />
            <span className="text-foreground font-semibold">{dayStr}</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{taskCount} tasks completed</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-foreground font-medium">{hoursStr} logged</span>
            
            <div className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${statusBadgeClasses} ml-2`}>
              {eod.status.toUpperCase()}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 ml-4 shrink-0">
          <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-border p-4 sm:p-5 bg-muted/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Tasks Completed</div>
              <div className="space-y-2">
                {eod.tasks_accomplished?.split('\n').filter(t => t.trim().length > 0).map((task, i) => {
                  let cleanTask = task.trim();
                  if (cleanTask.startsWith('-')) cleanTask = cleanTask.substring(1).trim();
                  else if (cleanTask.startsWith('•')) cleanTask = cleanTask.substring(1).trim();
                  return (
                    <div key={i} className="text-sm text-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{cleanTask}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Blockers</div>
                <div className="text-sm text-foreground whitespace-pre-wrap">
                  {eod.blockers && eod.blockers.toLowerCase() !== 'no' && eod.blockers.toLowerCase() !== 'none' ? eod.blockers : 'None'}
                </div>
              </div>
              
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Tomorrow's Plan</div>
                <div className="text-sm text-foreground whitespace-pre-wrap">
                  {eod.tomorrows_plan ? (
                    <div className="space-y-2">
                      {eod.tomorrows_plan.split('\n').filter((t: string) => t.trim().length > 0).map((task: string, i: number) => {
                        let cleanTask = task.trim();
                        if (cleanTask.startsWith('-')) cleanTask = cleanTask.substring(1).trim();
                        else if (cleanTask.startsWith('•')) cleanTask = cleanTask.substring(1).trim();
                        return (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{cleanTask}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    'No plan provided'
                  )}
                </div>
              </div>

              {eod.rejection_reason && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-500 mb-3">Review Note</div>
                  <div className="text-sm text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg whitespace-pre-wrap">
                    {eod.rejection_reason}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
