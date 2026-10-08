import { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, AlertTriangle, Edit2, XCircle, CheckCircle2, Loader2, Save, X, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatOfficeHoursAsHHMM, parseHHMM, validateHHMM, formatHoursMinutes } from '@/lib/utils/time';

export function EodCard({
  eod,
  isReview = false,
  isSubmitting = false,
  onAction,
  onSaveEdit,
  currentUserId
}: {
  eod: any;
  isReview?: boolean;
  isSubmitting?: boolean;
  onAction?: (eodId: string, action: 'Approve' | 'Reject', reason?: string) => void;
  onSaveEdit?: (eodId: string, formData: any) => Promise<void>;
  currentUserId?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    workedHours: '',
    admin_note: ''
  });

  const eodDate = new Date(eod.report_date);
  // Get Day of week (e.g. Monday)
  const dayStr = eodDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' });

  // Count non-empty task lines
  const tasks = (eod.tasks_accomplished || '').split('\n').filter((t: string) => t.trim().length > 0);
  const taskCount = tasks.length;
  const hoursFormatted = formatOfficeHoursAsHHMM(Number(eod.office_hours));

  const isOwnEod = currentUserId && eod.employee_id === currentUserId;

  const handleApprove = () => {
    if (onAction) onAction(eod.id, 'Approve');
  };

  const handleReject = () => {
    if (!rejectMode) {
      setRejectMode(true);
      return;
    }
    if (onAction && rejectReason.trim()) {
      onAction(eod.id, 'Reject', rejectReason);
      setRejectMode(false);
      setRejectReason('');
    }
  };

  const startEditing = () => {
    setEditForm({
      workedHours: formatOfficeHoursAsHHMM(Number(eod.office_hours || 0)),
      admin_note: eod.rejection_reason || ''
    });
    setIsEditing(true);
    setExpanded(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const workedHoursError = editForm.workedHours ? validateHHMM(editForm.workedHours) : null;
  const isValid = editForm.workedHours !== '' && workedHoursError === null;

  const handleSave = async () => {
    if (!isValid) return;

    const totalMinutes = parseHHMM(editForm.workedHours);
    if (totalMinutes === null) return;
    const office_hours = totalMinutes / 60;

    if (onSaveEdit) {
      await onSaveEdit(eod.id, { office_hours, admin_note: editForm.admin_note });
      setIsEditing(false);
    }
  };

  const statusColor =
    eod.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
      eod.status === 'Rejected' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
        'bg-amber-500/10 text-amber-500 border-amber-500/20';

  return (
    <div className="bg-card text-card-foreground border border-border rounded-xl shadow-sm overflow-hidden transition-all duration-200">
      {/* Header - Always visible */}
      <div
        className="px-4 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer hover:bg-muted/30"
        onClick={() => !rejectMode && !isEditing && setExpanded(!expanded)}
      >
        <div className="flex-1 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground font-semibold shrink-0 uppercase">
            {eod.profiles?.first_name?.[0] || '?'}{eod.profiles?.last_name?.[0] || ''}
          </div>
          <div className="flex flex-col">
            <span className="text-foreground font-semibold">{eod.profiles?.first_name || 'Unknown'} {eod.profiles?.last_name || 'Employee'}</span>
            <span className="text-xs text-muted-foreground">{eod.profiles?.department || 'Department not assigned'}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 shrink-0 mt-3 sm:mt-0 ml-14 sm:ml-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{taskCount} completed</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{formatHoursMinutes(Number(eod.office_hours))} logged</span>
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${eod.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
              eod.status === 'Rejected' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' :
                'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
            }`}>
            {eod.status === 'Approved' && <Smile className="w-3 h-3" />}
            {eod.status === 'Approved' ? 'GOOD' : eod.status}
          </div>

          <button
            className="p-1 text-muted-foreground hover:text-foreground transition-colors ml-2"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-border bg-muted/5">
          <div className="p-4 sm:p-5 space-y-6">

            {isEditing ? (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* View Mode equivalent for read-only fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Tasks Completed</div>
                    <div className="space-y-2">
                      {tasks.map((task: string, i: number) => {
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

                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Blockers</div>
                    <div className="text-sm text-foreground whitespace-pre-wrap">
                      {eod.blockers && eod.blockers.toLowerCase() !== 'no' && eod.blockers.toLowerCase() !== 'none' ? eod.blockers : 'none'}
                    </div>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Worked Hours</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="8.19"
                      value={editForm.workedHours}
                      onChange={(e) => setEditForm(prev => ({ ...prev, workedHours: e.target.value }))}
                      className="w-full h-11 bg-background text-foreground border border-border rounded-[10px] px-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground"
                    />
                    {editForm.workedHours !== '' && workedHoursError && (
                      <p className="text-xs text-rose-500 mt-1">{workedHoursError}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Admin / HR Note</label>
                    <textarea
                      value={editForm.admin_note}
                      onChange={e => setEditForm(prev => ({ ...prev, admin_note: e.target.value }))}
                      placeholder="Add review comment..."
                      className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm min-h-[44px]"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* View Mode: Tasks and Blockers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Tasks Completed</div>
                    <div className="space-y-2">
                      {tasks.map((task: string, i: number) => {
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

                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Blockers</div>
                    <div className="text-sm text-foreground whitespace-pre-wrap">
                      {eod.blockers && eod.blockers.toLowerCase() !== 'no' && eod.blockers.toLowerCase() !== 'none' ? eod.blockers : 'none'}
                    </div>
                  </div>
                </div>

                {/* Tomorrow's Plan */}
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

                {/* Office Hours and Note Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Office Hours</div>
                    <div className="text-sm font-medium text-foreground">{hoursFormatted}</div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Admin / HR Note</div>
                    <div className="text-sm text-foreground whitespace-pre-wrap">{eod.rejection_reason || '[................]'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Actions */}
            {isReview && !isOwnEod && (
              <div className="pt-6 border-t border-border flex justify-end">
                {rejectMode ? (
                  <div className="w-full flex flex-col sm:flex-row items-end gap-3 animate-in slide-in-from-top-2 duration-200">
                    <input
                      type="text"
                      placeholder="Please provide more details..."
                      className="w-full h-10 px-3 text-sm bg-card border border-border rounded-lg focus:outline-none focus:border-rose-500"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button variant="ghost" className="h-10 px-4 rounded-lg flex-1 sm:flex-none" onClick={() => setRejectMode(false)} disabled={isSubmitting}>
                        Cancel
                      </Button>
                      <Button variant="destructive" className="h-10 px-4 rounded-lg flex-1 sm:flex-none" onClick={handleReject} disabled={isSubmitting || !rejectReason.trim()}>
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Reject'}
                      </Button>
                    </div>
                  </div>
                ) : isEditing ? (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="ghost" className="h-10 px-6 rounded-lg flex-1 sm:flex-none" onClick={cancelEditing} disabled={isSubmitting}>
                      Cancel
                    </Button>
                    <Button className="h-10 px-6 rounded-lg flex-1 sm:flex-none shadow-sm bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSave} disabled={isSubmitting || !isValid}>
                      {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Update
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" className="h-10 px-6 rounded-lg flex-1 sm:flex-none border-border" onClick={startEditing} disabled={isSubmitting}>
                      <Edit2 className="w-4 h-4 mr-2" /> Edit / Update
                    </Button>
                    {eod.status === 'Pending' && (
                      <>
                        <Button variant="outline" className="h-10 px-6 rounded-lg flex-1 sm:flex-none border-border hover:text-rose-500" onClick={handleReject} disabled={isSubmitting}>
                          Reject
                        </Button>
                        <Button className="h-10 px-6 rounded-lg flex-1 sm:flex-none shadow-sm bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleApprove} disabled={isSubmitting}>
                          {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Approve
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Display message if it's their own pending EOD */}
            {isReview && eod.status === 'Pending' && isOwnEod && (
              <div className="pt-4 border-t border-border flex justify-end">
                <span className="text-xs text-muted-foreground italic">You cannot review your own EOD report.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
