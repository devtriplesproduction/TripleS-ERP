// @ts-nocheck
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dropdown } from '@/components/ui/Dropdown';
import {
  Search,
  SlidersHorizontal,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  FileSearch,
  FileText,
  Calendar,
  Loader2,
  BarChart2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { EODReport } from '@/lib/actions/eod';
import { reviewEODAction, batchReviewEODAction, updateEODAction } from '@/actions/eod.actions';
import { DatePicker } from '@/components/ui/date-picker';
import { EodCard } from './EodCard';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';

type Employee = { id: string; first_name: string; last_name: string; employee_id: string };
type EnrichedEOD = EODReport & { profiles: Employee | null };

export function ReviewDashboard({
  initialEods,
  employees,
  currentUserId,
  showHeader = false,
  todayReportsCount: initialTodayReportsCount,
  branchSelector,
  reviewEodButton,
}: {
  initialEods: EnrichedEOD[];
  employees: Employee[];
  currentUserId?: string;
  showHeader?: boolean;
  todayReportsCount?: number;
  branchSelector?: React.ReactNode;
  reviewEodButton?: React.ReactNode;
}) {
  const [eods, setEods] = useState<EnrichedEOD[]>(initialEods);
  useEffect(() => { setEods(initialEods); }, [initialEods]);
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [daysLimit, setDaysLimit] = useState(7);

  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);

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
  };

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

  const handleBatchApprovePending = async () => {
    const pendingIds = filteredEods.filter(e => e.status === 'Pending').map(e => e.id);
    if (pendingIds.length === 0) {
      toast.info('No pending reports to approve in current view');
      return;
    }

    if (!confirm(`Are you sure you want to approve all ${pendingIds.length} pending EOD reports in this view?`)) {
      return;
    }

    setBatchProcessing(true);
    const idempotencyKey = `dashboard-batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    try {
      const res = await batchReviewEODAction({
        eod_ids: pendingIds,
        action: 'Approve',
        idempotency_key: idempotencyKey,
      });

      if (res.success || (res.succeeded && res.succeeded.length > 0)) {
        const approvedSet = new Set(res.succeeded);
        setEods(prev => prev.map(e => approvedSet.has(e.id) ? { ...e, status: 'Approved' } : e));
        toast.success(`Successfully approved ${res.succeeded.length} reports!`);
        if (res.failed && res.failed.length > 0) {
          toast.error(`${res.failed.length} reports failed: ${res.failed[0].error}`);
        }
      } else {
        toast.error(res.error || "Batch approval failed");
      }
    } catch {
      toast.error("Unexpected error in batch approval");
    } finally {
      setBatchProcessing(false);
    }
  };

  // Client-side filtering logic
  const { filteredEods, hasMore } = useMemo(() => {
    const matched = eods.filter(eod => {
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
          eod.profiles.first_name?.toLowerCase().includes(s) ||
          eod.profiles.last_name?.toLowerCase().includes(s) ||
          eod.profiles.employee_id?.toLowerCase().includes(s) ||
          (eod.profiles as any).department?.toLowerCase().includes(s)
        );
        const matchesEmployeeId = (eod as any).employee_id?.toLowerCase().includes(s);
        const matchesRoleContext = (eod as any).role_context?.toLowerCase().includes(s);
        if (!matchesTasks && !matchesBlockers && !matchesName && !matchesEmployeeId && !matchesRoleContext) return false;
      }

      return true;
    });

    if (fromDate || toDate) {
      return { filteredEods: matched, hasMore: false };
    }

    const uniqueDates = Array.from(new Set(matched.map(e => e.report_date))).sort().reverse();
    const allowedDates = new Set(uniqueDates.slice(0, daysLimit));
    const finalFiltered = matched.filter(e => allowedDates.has(e.report_date));

    return { 
      filteredEods: finalFiltered, 
      hasMore: uniqueDates.length > daysLimit 
    };
  }, [eods, search, selectedEmployee, fromDate, toDate, daysLimit]);

  // Statistics
  const totalReports = filteredEods.length;
  const approved = filteredEods.filter(e => e.status === 'Approved').length;
  const pending = filteredEods.filter(e => e.status === 'Pending').length;
  const rejected = filteredEods.filter(e => e.status === 'Rejected').length;

  const getISTDateString = () =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  const todayStr = getISTDateString();
  const reportsToday =
    initialTodayReportsCount !== undefined
      ? initialTodayReportsCount
      : eods.filter((e) => e.report_date === todayStr).length;

  const filterInputStyles = "!h-11 filter-control w-full !bg-card !border !border-border !rounded-xl !text-sm transition-all focus:!ring-2 focus:!ring-orange-500/20 focus:!border-orange-400 !text-foreground !shadow-sm";

  return (
    <div className="space-y-6 w-full">
      {/* Top Header matching reference image */}
      {showHeader && (
        <PageHeader
          title="Review EOD"
          subtitle="Review employee and HR end-of-day reports."
          icon={FileText}
          actions={
            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap justify-start sm:justify-end shrink-0">
              {(reviewEodButton || branchSelector) && (
                <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                  {reviewEodButton}
                  {branchSelector}
                </div>
              )}
              <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap shrink-0">
                {/* Reports */}
                <div className="w-[130px] sm:w-[136px] h-[60px] rounded-xl border border-border/80 bg-card/60 px-3 py-2 flex items-center shrink-0 shadow-xs">
                  <div className="w-8 h-8 rounded-lg bg-muted/50 border border-border/80 flex items-center justify-center shrink-0 mr-2.5">
                    <FileText className="w-4 h-4 text-foreground/80" />
                  </div>
                  <div className="min-w-0 flex flex-col justify-center">
                    <span className="text-[11px] font-medium text-muted-foreground leading-none truncate">
                      Reports
                    </span>
                    <span className="text-lg font-bold text-foreground leading-tight mt-1">
                      {totalReports}
                    </span>
                  </div>
                </div>

                {/* Approved */}
                <div className="w-[130px] sm:w-[136px] h-[60px] rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-3 py-2 flex items-center shrink-0 shadow-xs">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 mr-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex flex-col justify-center">
                    <span className="text-[11px] font-medium text-neutral-300 leading-none truncate">
                      Approved
                    </span>
                    <span className="text-lg font-bold text-foreground leading-tight mt-1">
                      {approved}
                    </span>
                  </div>
                </div>

                {/* Pending */}
                <div className="w-[130px] sm:w-[136px] h-[60px] rounded-xl border border-amber-500/25 bg-amber-950/20 px-3 py-2 flex items-center shrink-0 shadow-xs">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 mr-2.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="min-w-0 flex flex-col justify-center">
                    <span className="text-[11px] font-medium text-neutral-300 leading-none truncate">
                      Pending
                    </span>
                    <span className="text-lg font-bold text-foreground leading-tight mt-1">
                      {pending}
                    </span>
                  </div>
                </div>

                {/* Today */}
                <div className="w-[130px] sm:w-[136px] h-[60px] rounded-xl border border-border/80 bg-card/60 px-3 py-2 flex items-center shrink-0 shadow-xs">
                  <div className="w-8 h-8 rounded-lg bg-muted/50 border border-border/80 flex items-center justify-center shrink-0 mr-2.5">
                    <BarChart2 className="w-4 h-4 text-foreground/80" />
                  </div>
                  <div className="min-w-0 flex flex-col justify-center">
                    <span className="text-[11px] font-medium text-muted-foreground leading-none truncate">
                      Today
                    </span>
                    <span className="text-lg font-bold text-foreground leading-tight mt-1">
                      {reportsToday}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          }
        />
      )}

      {/* When showHeader is true: Filters row directly below header without surrounding grey panel */}
      {showHeader ? (
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          {/* Employee search */}
          <div className="relative flex-1 w-full min-w-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by employee name, department, or ID..."
              className="!h-11 w-full !bg-muted/40 dark:!bg-[#141416] hover:!bg-muted/60 dark:hover:!bg-[#1a1a1d] !border !border-border/80 hover:!border-border dark:hover:!border-border focus-visible:!border-neutral-500 !rounded-xl !pl-10 !pr-4 !text-sm !text-foreground placeholder:!text-muted-foreground !shadow-none transition-colors"
            />
          </div>

          {/* All Employees dropdown */}
          <div className="w-full sm:w-[190px] lg:w-[210px] shrink-0">
            <Dropdown
              className="!space-y-0 !w-full"
              buttonClassName="!h-11 !w-full !rounded-xl !bg-muted/40 dark:!bg-[#141416] hover:!bg-muted/60 dark:hover:!bg-[#1a1a1d] !border !border-border/80 hover:!border-border focus:!border-neutral-500 !text-sm !text-foreground !px-3.5 !shadow-none !justify-between transition-colors"
              value={selectedEmployee}
              onChange={(val) => setSelectedEmployee(val as string)}
              placeholder="All Employees"
              options={[
                { label: 'All Employees', value: 'all' },
                ...employees
                  .filter((emp) => emp.first_name?.toLowerCase() !== 'admin')
                  .map((emp) => ({
                    label: `${emp.first_name} ${emp.last_name || ''}`.trim(),
                    value: emp.id,
                  })),
              ]}
            />
          </div>

          {/* Start Date */}
          <div className="w-full sm:w-[150px] lg:w-[165px] shrink-0">
            <DatePicker
              placeholder="Start Date"
              value={fromDate}
              onChange={(date) => setFromDate(date)}
              className="!h-11 !w-full !rounded-xl !bg-muted/40 dark:!bg-[#141416] hover:!bg-muted/60 dark:hover:!bg-[#1a1a1d] !border !border-border/80 hover:!border-border focus-visible:!border-neutral-500 !text-sm !text-foreground !px-3.5 !justify-between !flex !items-center !shadow-none transition-colors"
            />
          </div>

          {/* End Date */}
          <div className="w-full sm:w-[150px] lg:w-[165px] shrink-0">
            <DatePicker
              placeholder="End Date"
              value={toDate}
              onChange={(date) => setToDate(date)}
              className="!h-11 !w-full !rounded-xl !bg-muted/40 dark:!bg-[#141416] hover:!bg-muted/60 dark:hover:!bg-[#1a1a1d] !border !border-border/80 hover:!border-border focus-visible:!border-neutral-500 !text-sm !text-foreground !px-3.5 !justify-between !flex !items-center !shadow-none transition-colors"
            />
          </div>
        </div>
      ) : (
        /* Fallback filter section for other pages */
        <div className="bg-card text-card-foreground border-border rounded-2xl border border-border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4 text-foreground">
            <SlidersHorizontal className="w-5 h-5 text-foreground" />
            <h3 className="font-semibold">Filter Reports</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-end">
            <div className="space-y-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search..."
                  className={cn(filterInputStyles, "!pl-9 !pr-4 !py-2")}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</label>
              <Dropdown
                className="!space-y-0"
                buttonClassName={cn(filterInputStyles, "!px-3 !py-2")}
                value={selectedEmployee}
                onChange={val => setSelectedEmployee(val as string)}
                placeholder="All Employees"
                options={[
                  { label: 'All Employees', value: 'all' },
                  ...employees
                    .filter(emp => emp.first_name?.toLowerCase() !== 'admin')
                    .map(emp => ({
                    label: emp.first_name + ' ' + (emp.last_name || ''),
                    value: emp.id
                  }))
                ]}
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">From</label>
              <DatePicker
                placeholder="Start Date"
                value={fromDate}
                onChange={(date) => setFromDate(date)}
                className={cn(filterInputStyles, "!px-3 !py-2 !justify-between !flex !items-center")}
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">To</label>
              <DatePicker
                placeholder="End Date"
                value={toDate}
                onChange={(date) => setToDate(date)}
                className={cn(filterInputStyles, "!px-3 !py-2 !justify-between !flex !items-center")}
              />
            </div>
          </div>
        </div>
      )}

      {/* Batch approve action if pending > 0 */}
      {pending > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
          <div className="text-amber-200">
            There are <span className="font-semibold text-foreground">{pending}</span> pending reports in the current filter.
          </div>
          <Button
            size="sm"
            variant="default"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm rounded-xl h-8 px-3 text-xs"
            disabled={batchProcessing}
            onClick={handleBatchApprovePending}
          >
            {batchProcessing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
            {batchProcessing ? "Batch Approving..." : `Approve All ${pending} Pending Reports`}
          </Button>
        </div>
      )}

      {/* Fallback stats section for other pages when !showHeader */}
      {!showHeader && (
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
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 p-2 rounded-xl bg-amber-500/5 sm:bg-transparent">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-100 dark:border-amber-500/20 flex-shrink-0">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
              </div>
              <div>
                <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending</div>
                <div className="text-xl sm:text-3xl font-bold text-foreground">{pending}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 p-2 rounded-xl bg-rose-500/5 sm:bg-transparent">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-100 dark:border-rose-500/20 flex-shrink-0">
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600" />
              </div>
              <div>
                <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rejected</div>
                <div className="text-xl sm:text-3xl font-bold text-foreground">{rejected}</div>
              </div>
            </div>
          </div>
        </div>
      )}

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
            <div className="space-y-10">
              {Object.entries(
                filteredEods.reduce((acc, eod) => {
                  if (!acc[eod.report_date]) acc[eod.report_date] = [];
                  acc[eod.report_date].push(eod);
                  return acc;
                }, {} as Record<string, typeof filteredEods>)
              )
              .sort((a, b) => b[0].localeCompare(a[0]))
              .map(([date, groupEods]) => {
                const dateObj = new Date(date);
                const dateString = dateObj.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
                return (
                  <div key={date} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold tracking-wider text-muted-foreground">{dateString}</h3>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="space-y-2">
                      {groupEods.map((eod) => (
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
                  </div>
                );
              })}
            </div>
            
            {hasMore && (
              <div className="pt-2 pb-6 flex justify-center">
                <Button 
                  variant="outline" 
                  className="rounded-xl px-8"
                  onClick={() => setDaysLimit(prev => prev + 7)}
                >
                  Load More 7 Days
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
