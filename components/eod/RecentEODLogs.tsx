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
            <div className="space-y-2">
              {history.slice(0, 5).map((eod) => (
                <EodCard 
                  key={eod.id} 
                  eod={{ ...eod, profiles: user }} 
                  isReview={false} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
