// @ts-nocheck
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dropdown } from '@/components/ui/Dropdown';
import { Search, SlidersHorizontal, RefreshCcw, CheckCircle2, Clock, XCircle, AlertCircle, FileSearch, FileText, User, Calendar, MapPin, AlertTriangle, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatWorkedTime } from '@/lib/utils/time';
import { EODReport } from '@/lib/actions/eod';
import { reviewEODAction, updateEODAction } from '@/actions/eod.actions';
import { Edit2, Save, X as XIcon } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';

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
  const [selectedEod, setSelectedEod] = useState<EnrichedEOD | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<EnrichedEOD>>({});

  const handleEditChange = (field: keyof EnrichedEOD, value: string | number) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  }

  const handleSaveEdit = async () => {
    if (!selectedEod) return;
    setIsSubmitting(true);
    setActionError('');
    try {
      const formData = new FormData();
      formData.append('employee_id', selectedEod.employee_id);
      formData.append('report_date', selectedEod.report_date);
      formData.append('tasks_accomplished', editFormData.tasks_accomplished as string || '');
      formData.append('office_hours', String(editFormData.office_hours));
      formData.append('location', selectedEod.location);
      formData.append('blockers', editFormData.blockers as string || 'None');
      formData.append('job_card_numbers', editFormData.job_card_numbers as string || '');
      formData.append('tomorrows_plan', editFormData.tomorrows_plan as string || '');
      formData.append('role_context', (selectedEod as any).role_context || 'Employee');
      if (selectedEod.photo_url) formData.append('photo_url', selectedEod.photo_url);

      const res = await updateEODAction(formData);
      if (res.success) {
        setIsEditing(false);
        const updatedFields = {
          tasks_accomplished: editFormData.tasks_accomplished as string,
          blockers: editFormData.blockers as string,
          tomorrows_plan: editFormData.tomorrows_plan as string,
          office_hours: editFormData.office_hours as number,
          job_card_numbers: editFormData.job_card_numbers as string
        };
        setEods(prev => prev.map(e => e.id === selectedEod.id ? { ...e, ...updatedFields } : e));
        setSelectedEod(prev => prev ? { ...prev, ...updatedFields } : null);
      } else {
        setActionError(res.error || 'Failed to update EOD.');
      }
    } catch (e) {
      setActionError('Unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleOpenModal = (eod: EnrichedEOD) => {
    setIsEditing(false);
    setEditFormData({
      tasks_accomplished: eod.tasks_accomplished,
      blockers: eod.blockers || '',
      tomorrows_plan: eod.tomorrows_plan || '',
      office_hours: eod.office_hours,
      job_card_numbers: eod.job_card_numbers || '',
    });
    setSelectedEod(eod);
    setIsRejecting(false);
    setRejectReason('');
    setActionError('');
  };

  const handleAction = async (action: 'Approve' | 'Reject') => {
    if (!selectedEod) return;

    if (action === 'Reject' && !isRejecting) {
      setIsRejecting(true);
      return;
    }

    if (action === 'Reject' && (!rejectReason || rejectReason.trim() === '')) {
      setActionError("Rejection reason is required");
      return;
    }

    setIsSubmitting(true);
    setActionError('');

    const formData = new FormData();
    formData.append('eod_id', selectedEod.id);
    formData.append('action', action);
    if (action === 'Reject') {
      formData.append('rejection_reason', rejectReason);
    }

    try {
      const res = await reviewEODAction(formData);
      if (res.success) {
        setEods(prev => prev.map(e => {
          if (e.id === selectedEod.id) {
            return { ...e, status: action === 'Approve' ? 'Approved' : 'Rejected' };
          }
          return e;
        }));
        setSelectedEod(null);
      } else {
        setActionError(res.error || "Failed to submit action");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError("An unexpected error occurred");
      }
    } finally {
      setIsSubmitting(false);
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
  const rejected = filteredEods.filter(e => e.status === 'Rejected').length; // mapped to "Not Submitted" or "Rejected" in the UI? The mockup says "Not Submitted", but EODs in DB are Pending/Approved/Rejected. We'll use Rejected for the red cross.

  const calcPercent = (val: number) => totalReports === 0 ? 0 : Math.round((val / totalReports) * 100 * 100) / 100;

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Clear filters
    setSearch('');
    setSelectedEmployee('all');
    setFromDate('');
    setToDate('');
    // In a real app we'd re-fetch from the server, but for now we just simulate it
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

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 items-end">
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
                  label: `${emp.first_name} ${emp.last_name}`,
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

          <div className="shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleRefresh}
              className="h-11 px-4 bg-muted border-border text-foreground hover:bg-muted rounded-xl"
            >
              <RefreshCcw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-card text-card-foreground border-border rounded-2xl border border-border shadow-sm p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-x divide-slate-100">

          <div className="flex items-center gap-4 px-2">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center border border-border flex-shrink-0">
              <FileText className="w-6 h-6 text-foreground" />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Reports</div>
              <div className="text-3xl font-bold text-foreground">{totalReports}</div>
              <div className="text-xs text-muted-foreground font-medium">Selected range</div>
            </div>
          </div>

          <div className="flex items-center gap-4 px-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-100 flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Approved</div>
              <div className="text-3xl font-bold text-foreground">{approved}</div>
              <div className="text-xs text-muted-foreground font-medium">{calcPercent(approved)}%</div>
            </div>
          </div>

          <div className="flex items-center gap-4 px-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-100 flex-shrink-0">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending</div>
              <div className="text-3xl font-bold text-foreground">{pending}</div>
              <div className="text-xs text-muted-foreground font-medium">{calcPercent(pending)}%</div>
            </div>
          </div>

          <div className="flex items-center gap-4 px-6">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-100 flex-shrink-0">
              <XCircle className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rejected</div>
              <div className="text-3xl font-bold text-foreground">{rejected}</div>
              <div className="text-xs text-muted-foreground font-medium">{calcPercent(rejected)}%</div>
            </div>
          </div>

        </div>
      </div>

      {/* Data Section */}
      <div className="bg-card text-card-foreground border-border rounded-2xl border border-border shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        {filteredEods.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-32 h-32 bg-muted rounded-full flex items-center justify-center mb-6 relative border-4 border-white shadow-sm">
              <FileSearch className="w-16 h-16 text-orange-400 absolute" />
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-card text-card-foreground border-border rounded-full shadow flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">No Reports Found</h2>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6">
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
          <div className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted border-b border-border">
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hours</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEods.map((eod) => (
                    <tr key={eod.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">
                          {eod.profiles?.first_name} {eod.profiles?.last_name}
                        </div>
                        <div className="text-xs text-muted-foreground">{eod.profiles?.employee_id}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(eod.report_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md inline-flex items-center gap-1 ${eod.status === 'Approved' ? 'bg-emerald-500/20/80 text-emerald-500' :
                          eod.status === 'Rejected' ? 'bg-rose-100/80 text-rose-700' :
                            'bg-amber-100/80 text-amber-700'
                          }`}>
                          {eod.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{eod.location}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{formatWorkedTime(Math.round(Number(eod.office_hours) * 60))}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                          (eod as any).role_context === 'HR' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300' : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                        }`}>
                          {(eod as any).role_context || 'Employee'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Button variant="ghost" size="sm" className="text-foreground hover:bg-muted" onClick={() => handleOpenModal(eod)}>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {selectedEod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-3xl bg-card text-card-foreground border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            {/* Modal Header */}
            <div className="bg-muted px-6 py-5 border-b border-border flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-foreground">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground leading-tight">EOD Report</h2>
                  <p className="text-sm text-muted-foreground font-medium">Review details and take action</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-muted-foreground hover:text-muted-foreground hover:bg-slate-200/50"
                onClick={() => setSelectedEod(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Employee Info Card */}
                <div className="bg-card text-card-foreground border-border rounded-2xl border border-border p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-foreground">
                    <User className="w-4 h-4 text-foreground" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Employee Details</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-lg border-2 border-white shadow-sm">
                      {selectedEod.profiles?.first_name?.[0]}{selectedEod.profiles?.last_name?.[0]}
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-lg">
                        {selectedEod.profiles?.first_name} {selectedEod.profiles?.last_name}
                      </div>
                      <div className="text-sm font-medium text-muted-foreground bg-muted inline-block px-2 py-0.5 rounded-md mt-1">
                        {selectedEod.profiles?.employee_id}
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
                      <span className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md inline-flex items-center gap-1 ${selectedEod.status === 'Approved' ? 'bg-emerald-500/20/80 text-emerald-500' :
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
                      {isEditing ? (
    <div className="flex gap-1 mt-1">
    <Dropdown
      value={Math.floor(Math.round((editFormData.office_hours || 0) * 60) / 60).toString()}
      onChange={(val) => {
        const m = Math.round((editFormData.office_hours || 0) * 60) % 60;
        const totalMin = parseInt(val) * 60 + m;
        handleEditChange('office_hours', parseFloat((totalMin / 60).toFixed(2)));
      }}
      options={Array.from({ length: 25 }, (_, i) => ({ label: `${i}h`, value: i.toString() }))}
      placeholder="Hours"
      buttonClassName="w-full h-8 px-2 text-xs"
      contentClassName="max-h-56"
    />
    <Dropdown
      value={(Math.round((editFormData.office_hours || 0) * 60) % 60).toString()}
      onChange={(val) => {
        const h = Math.floor(Math.round((editFormData.office_hours || 0) * 60) / 60);
        const totalMin = h * 60 + parseInt(val);
        handleEditChange('office_hours', parseFloat((totalMin / 60).toFixed(2)));
      }}
      options={Array.from({ length: 60 }, (_, i) => ({ label: `${i}m`, value: i.toString() }))}
      placeholder="Minutes"
      buttonClassName="w-full h-8 px-2 text-xs"
      contentClassName="max-h-56"
    />
  </div>
  ) : (
    <p className="font-semibold text-foreground text-sm">{formatWorkedTime(Math.round(Number(selectedEod.office_hours) * 60))}</p>
  )}
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
                    {isEditing ? (
    <textarea value={editFormData.tasks_accomplished} onChange={e => handleEditChange('tasks_accomplished', e.target.value)} className="w-full flex rounded-lg border border-border bg-card text-card-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" rows={5} />
  ) : (
    selectedEod.tasks_accomplished
  )}
                  </div>
                </div>

                {(selectedEod.blockers || isEditing) && (
                  <div className="bg-muted rounded-2xl p-5 border border-border mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-5 h-5 text-orrange-500" />
                      <h3 className="font-bold text-foreground">Blockers & Issues</h3>
                    </div>
                    <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-sm bg-card text-card-foreground border-border p-4 rounded-xl border border-border shadow-sm">
                      {isEditing ? (
    <textarea value={editFormData.blockers} onChange={e => handleEditChange('blockers', e.target.value)} className="w-full flex rounded-lg border border-border bg-card text-card-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" rows={3} />
  ) : (
    selectedEod.blockers
  )}
                    </div>
                  </div>
                )}

                {(selectedEod.tomorrows_plan || isEditing) && (
                  <div className="bg-muted rounded-2xl p-5 border border-border mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-5 h-5 text-blue-500" />
                      <h3 className="font-bold text-foreground">Tomorrow's Plan</h3>
                    </div>
                    <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-sm bg-card text-card-foreground border-border p-4 rounded-xl border border-border shadow-sm">
                      {isEditing ? (
    <textarea value={editFormData.tomorrows_plan} onChange={e => handleEditChange('tomorrows_plan', e.target.value)} className="w-full flex rounded-lg border border-border bg-card text-card-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" rows={3} />
  ) : (
    selectedEod.tomorrows_plan
  )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="border-t border-border bg-muted p-6 sticky bottom-0 z-10">
              {selectedEod.status === 'Pending' ? (
                currentUserId && selectedEod.employee_id === currentUserId ? (
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500" /> You cannot review your own EOD report.
                    </div>
                    <Button variant="ghost" className="rounded-xl" onClick={() => setSelectedEod(null)}>
                      Close window
                    </Button>
                  </div>
                ) : (
                <>
                  {actionError && (
                    <div className="mb-4 text-sm text-foreground bg-muted p-3 rounded-xl border border-border flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> {actionError}
                    </div>
                  )}

                  {isRejecting ? (
                    <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-200">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reason for Rejection</label>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="w-full flex rounded-xl border border-border bg-card text-card-foreground border-border px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 resize-none shadow-sm transition-all"
                          rows={3}
                          placeholder="Please provide constructive feedback..."
                          required
                        />
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setIsRejecting(false)} disabled={isSubmitting} className="rounded-xl">
                          Cancel
                        </Button>
                        <Button variant="danger" className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm shadow-rose-200" onClick={() => handleAction('Reject')} disabled={isSubmitting}>
                          {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Confirm Rejection
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground font-medium hidden sm:block">Please review carefully before deciding.</p>
                      <div className="flex justify-end gap-3 w-full sm:w-auto">
                        {!isEditing ? (
    <Button variant="outline" className="text-foreground border-border hover:bg-muted hover:text-foreground rounded-xl" onClick={() => setIsEditing(true)} disabled={isSubmitting}>
      <Edit2 className="w-4 h-4 mr-2" /> Edit
    </Button>
  ) : (
    <>
      <Button variant="ghost" className="text-muted-foreground rounded-xl" onClick={() => setIsEditing(false)} disabled={isSubmitting}>
        <XIcon className="w-4 h-4 mr-2" /> Cancel
      </Button>
      <Button variant="primary" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm" onClick={handleSaveEdit} disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save
      </Button>
    </>
  )}
  {!isEditing && (
    <>
      <Button variant="outline" className="text-foreground border-border hover:bg-muted hover:text-foreground rounded-xl" onClick={() => handleAction('Reject')} disabled={isSubmitting}>
        <XCircle className="w-4 h-4 mr-2" /> Reject Report
      </Button>
      <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm shadow-emerald-200" onClick={() => handleAction('Approve')} disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />} Approve Report
      </Button>
    </>
  )}
                      </div>
                    </div>
                  )}
                </>
                )
              ) : (
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    {selectedEod.status === 'Approved' ? (
                      <><CheckCircle2 className="w-4 h-4 text-emerald-500" /> This report has been approved.</>
                    ) : (
                      <><XCircle className="w-4 h-4 text-rose-500" /> This report was rejected.</>
                    )}
                  </div>
                  <Button variant="ghost" className="rounded-xl" onClick={() => setSelectedEod(null)}>
                    Close window
                  </Button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}



