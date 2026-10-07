// @ts-nocheck
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dropdown } from '@/components/ui/Dropdown';
import { Search, SlidersHorizontal, RefreshCcw, CheckCircle2, Clock, XCircle, AlertCircle, FileSearch, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { EODReport } from '@/lib/actions/eod';
import { reviewEODAction, updateEODAction } from '@/actions/eod.actions';
import { DatePicker } from '@/components/ui/date-picker';
import { EodCard } from './EodCard';
import { toast } from 'sonner';

type Employee = { id: string; first_name: string; last_name: string; employee_id: string };
type EnrichedEOD = EODReport & { profiles: Employee | null };

export function ReviewDashboard({
  initialEods,
  employees,
  currentUserId
}: {
  initialEods: EnrichedEOD[];
  employees: Employee[];
  currentUserId?: string;
}) {
  const [eods, setEods] = useState<EnrichedEOD[]>(initialEods);
  useEffect(() => { setEods(initialEods); }, [initialEods]);
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set());

  const handleSaveEdit = async (eodId: string, formDataFields: any) => {
    setSubmittingIds(prev => new Set(prev).add(eodId));
    try {
      const eodToEdit = eods.find(e => e.id === eodId);
      if (!eodToEdit) throw new Error("EOD not found");

      const formData = new FormData();
      formData.append('employee_id', eodToEdit.employee_id);
      formData.append('report_date', eodToEdit.report_date);
      formData.append('tasks_accomplished', eodToEdit.tasks_accomplished || '');
      formData.append('office_hours', String(formDataFields.office_hours));
      formData.append('location', eodToEdit.location);
      formData.append('blockers', eodToEdit.blockers || 'None');
      formData.append('tomorrows_plan', eodToEdit.tomorrows_plan || '');
      formData.append('role_context', (eodToEdit as any).role_context || 'Employee');
      
      // Pass the admin note to rejection_reason so it saves using the existing field
      if (formDataFields.admin_note !== undefined) {
         formData.append('admin_note', formDataFields.admin_note);
      }

      const res = await updateEODAction(formData);
      if (res.success) {
        setEods(prev => prev.map(e => e.id === eodId ? { 
          ...e, 
          ...formDataFields,
          rejection_reason: formDataFields.admin_note // Update locally
        } : e));
        toast.success("EOD Updated Successfully");
      } else {
        toast.error(res.error || 'Failed to update EOD.');
      }
    } catch (e) {
      toast.error('Unexpected error occurred.');
    } finally {
      setSubmittingIds(prev => {
        const next = new Set(prev);
        next.delete(eodId);
        return next;
      });
    }
  }

  const handleAction = async (eodId: string, action: 'Approve' | 'Reject', reason?: string) => {
    setSubmittingIds(prev => new Set(prev).add(eodId));

    const formData = new FormData();
    formData.append('eod_id', eodId);
    formData.append('action', action);
    if (action === 'Reject' && reason) {
      formData.append('rejection_reason', reason);
    }

    try {
      const res = await reviewEODAction(formData);
      if (res.success) {
        setEods(prev => prev.map(e => {
          if (e.id === eodId) {
            return { 
              ...e, 
              status: action === 'Approve' ? 'Approved' : 'Rejected',
              ...(action === 'Reject' && reason ? { rejection_reason: reason } : {})
            };
          }
          return e;
        }));
        toast.success(`EOD ${action === 'Approve' ? 'Approved' : 'Rejected'} Successfully`);
      } else {
        toast.error(res.error || "Failed to submit action");
      }
    } catch (err: unknown) {
      toast.error("An unexpected error occurred");
    } finally {
      setSubmittingIds(prev => {
        const next = new Set(prev);
        next.delete(eodId);
        return next;
      });
    }
  };

  // Client-side filtering logic
  const filteredEods = useMemo(() => {
    return eods.filter(eod => {
      // Employee filter
      if (selectedEmployee !== 'all' && eod.employee_id !== selectedEmployee) return false;

      // Date filters
      if (fromDate && eod.report_date < fromDate) return false;
      if (toDate && eod.report_date > toDate) return false;

      // Search filter
      if (search) {
        const s = search.toLowerCase();
        const matchesTasks = eod.tasks_accomplished?.toLowerCase().includes(s);
        const matchesBlockers = eod.blockers?.toLowerCase().includes(s);
        const matchesName = eod.profiles && (
          eod.profiles.first_name.toLowerCase().includes(s) ||
          eod.profiles.last_name.toLowerCase().includes(s)
        );
        if (!matchesTasks && !matchesBlockers && !matchesName) return false;
      }

      return true;
    });
  }, [eods, search, selectedEmployee, fromDate, toDate]);

  // Statistics
  const totalReports = filteredEods.length;
  const approved = filteredEods.filter(e => e.status === 'Approved').length;
  const pending = filteredEods.filter(e => e.status === 'Pending').length;
  const rejected = filteredEods.filter(e => e.status === 'Rejected').length;

  const calcPercent = (val: number) => totalReports === 0 ? 0 : Math.round((val / totalReports) * 100 * 100) / 100;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setSearch('');
    setSelectedEmployee('all');
    setFromDate('');
    setToDate('');
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Filters Section */}
      <div className="bg-card text-card-foreground border-border rounded-2xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4 text-foreground">
          <SlidersHorizontal className="w-5 h-5 text-foreground" />
          <h3 className="font-semibold">Filter Reports</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="h-11 w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</label>
            <Dropdown
              className="!space-y-0"
              buttonClassName="w-full h-11 bg-muted border border-border rounded-xl"
              value={selectedEmployee}
              onChange={val => setSelectedEmployee(val as string)}
              placeholder="All Employees"
              options={[
                { label: 'All Employees', value: 'all' },
                ...employees.map(emp => ({
                  label: emp.first_name + ' ' + (emp.last_name || ''),
                  value: emp.id
                }))
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">From</label>
            <DatePicker
              placeholder="Start Date"
              value={fromDate}
              onChange={(date) => setFromDate(date)}
              triggerClassName="h-11 bg-muted border-border rounded-xl"
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">To</label>
            <DatePicker
              placeholder="End Date"
              value={toDate}
              onChange={(date) => setToDate(date)}
              triggerClassName="h-11 bg-muted border-border rounded-xl"
              className="w-full"
            />
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleRefresh}
              className="h-11 w-full sm:w-auto px-4 bg-muted border-border text-foreground hover:bg-muted rounded-xl"
            >
              <RefreshCcw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-card text-card-foreground border-border rounded-2xl border border-border shadow-sm p-4 sm:p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">

          <div className="flex items-center gap-3 sm:gap-4 p-2 rounded-xl bg-muted/20 sm:bg-transparent">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-muted flex items-center justify-center border border-border flex-shrink-0">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
            </div>
            <div>
              <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Reports</div>
              <div className="text-xl sm:text-3xl font-bold text-foreground">{totalReports}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground font-medium">Selected range</div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 p-2 rounded-xl bg-emerald-500/5 sm:bg-transparent">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20 flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
            </div>
            <div>
              <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Approved</div>
              <div className="text-xl sm:text-3xl font-bold text-foreground">{approved}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground font-medium">{calcPercent(approved)}%</div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 p-2 rounded-xl bg-amber-500/5 sm:bg-transparent">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-100 dark:border-amber-500/20 flex-shrink-0">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
            </div>
            <div>
              <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending</div>
              <div className="text-xl sm:text-3xl font-bold text-foreground">{pending}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground font-medium">{calcPercent(pending)}%</div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 p-2 rounded-xl bg-rose-500/5 sm:bg-transparent">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-100 dark:border-rose-500/20 flex-shrink-0">
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600" />
            </div>
            <div>
              <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rejected</div>
              <div className="text-xl sm:text-3xl font-bold text-foreground">{rejected}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground font-medium">{calcPercent(rejected)}%</div>
            </div>
          </div>

        </div>
      </div>

      {/* Data Section */}
      <div className="flex flex-col gap-4 min-h-[300px]">
        {filteredEods.length === 0 ? (
          <div className="bg-card text-card-foreground border-border rounded-2xl border border-border shadow-sm flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-muted rounded-full flex items-center justify-center mb-6 relative border-4 border-background shadow-sm">
              <FileSearch className="w-12 h-12 sm:w-16 sm:h-16 text-orange-400 absolute" />
              <div className="absolute -top-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 bg-card text-card-foreground border-border rounded-full shadow flex items-center justify-center">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">No Reports Found</h2>
            <p className="text-muted-foreground text-xs sm:text-sm max-w-sm mx-auto mb-6">
              Try adjusting your filters, search terms, or date range to find what you&apos;re looking for.
            </p>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setSearch('');
                setSelectedEmployee('all');
                setFromDate('');
                setToDate('');
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEods.map((eod) => (
              <EodCard 
                key={eod.id}
                eod={eod}
                isReview={true}
                isSubmitting={submittingIds.has(eod.id)}
                currentUserId={currentUserId}
                onAction={(id, action, reason) => handleAction(id, action, reason)}
                onSaveEdit={handleSaveEdit}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
