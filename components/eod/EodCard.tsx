import { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, AlertTriangle, Edit2, XCircle, CheckCircle2, Loader2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatWorkedTime } from '@/lib/utils/time';
import { Dropdown } from '@/components/ui/Dropdown';

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
    tasks_accomplished: '',
    blockers: '',
    tomorrows_plan: '',
    office_hours: 0,
    admin_note: ''
  });

  const eodDate = new Date(eod.report_date);
  // Get Day of week (e.g. Monday)
  const dayStr = eodDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' });

  // Count non-empty task lines
  const tasks = (eod.tasks_accomplished || '').split('\n').filter((t: string) => t.trim().length > 0);
  const taskCount = tasks.length;
  const hoursFormatted = formatWorkedTime(Math.round(Number(eod.office_hours) * 60));

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
      tasks_accomplished: eod.tasks_accomplished || '',
      blockers: eod.blockers || '',
      tomorrows_plan: eod.tomorrows_plan || '',
      office_hours: Number(eod.office_hours) || 0,
      admin_note: eod.rejection_reason || ''
    });
    setIsEditing(true);
    setExpanded(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (onSaveEdit) {
      await onSaveEdit(eod.id, editForm);
      setIsEditing(false);
    }
  };

  const statusColor =
    eod.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
    eod.status === 'Rejected' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
    'bg-amber-500/10 text-amber-500 border-amber-500/20';

  return (
    <div className="bg-card text-card-foreground border border-border rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
      {/* Header - Always visible */}
      <div 
        className="p-4 sm:p-5 flex items-start sm:items-center justify-between cursor-pointer hover:bg-muted/30"
        onClick={() => !rejectMode && !isEditing && setExpanded(!expanded)}
      >
        <div className="flex gap-4 sm:gap-6 w-full items-center">
          {/* Details Column */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
              <h3 className="font-bold text-foreground uppercase tracking-widest text-sm leading-tight">
                {dayStr}
              </h3>
              {eod.profiles && (
                <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block ml-4">
                  {eod.profiles.first_name} {eod.profiles.last_name} • {eod.profiles.employee_id || 'Employee'}
                </span>
              )}
            </div>
            
            {/* Mobile Employee Info */}
            {eod.profiles && (
              <div className="text-xs font-medium text-muted-foreground sm:hidden mb-1">
                {eod.profiles.first_name} {eod.profiles.last_name} • {eod.profiles.employee_id || 'Employee'}
              </div>
            )}

            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
              <span>{taskCount} tasks completed</span>
              <span>•</span>
              <span>{hoursFormatted} logged</span>
            </div>
          </div>

          {/* Status and Expand Icon */}
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 shrink-0">
            <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border">
              {eod.status}
            </span>
            <button 
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            >
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-border bg-muted/5">
          <div className="p-4 sm:p-5 space-y-6">
            
            {isEditing ? (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tasks Completed</label>
                    <textarea 
                      value={editForm.tasks_accomplished} 
                      onChange={e => setEditForm(prev => ({ ...prev, tasks_accomplished: e.target.value }))}
                      className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm min-h-[120px]" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Blockers</label>
                    <textarea 
                      value={editForm.blockers} 
                      onChange={e => setEditForm(prev => ({ ...prev, blockers: e.target.value }))}
                      className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm min-h-[120px]" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tomorrow's Plan</label>
                  <textarea 
                    value={editForm.tomorrows_plan} 
                    onChange={e => setEditForm(prev => ({ ...prev, tomorrows_plan: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm min-h-[80px]" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Office Hours</label>
                    <div className="flex gap-2">
                      <Dropdown
                        value={Math.floor(Math.round(editForm.office_hours * 60) / 60).toString()}
                        onChange={(val) => {
                          const m = Math.round(editForm.office_hours * 60) % 60;
                          setEditForm(prev => ({ ...prev, office_hours: parseFloat(((parseInt(val) * 60 + m) / 60).toFixed(2)) }));
                        }}
                        options={Array.from({ length: 25 }, (_, i) => ({ label: `${i}h`, value: i.toString() }))}
                        placeholder="Hours"
                        buttonClassName="w-full h-11 bg-card border border-border rounded-xl"
                      />
                      <Dropdown
                        value={(Math.round(editForm.office_hours * 60) % 60).toString()}
                        onChange={(val) => {
                          const h = Math.floor(Math.round(editForm.office_hours * 60) / 60);
                          setEditForm(prev => ({ ...prev, office_hours: parseFloat(((h * 60 + parseInt(val)) / 60).toFixed(2)) }));
                        }}
                        options={[
                          { label: '00m', value: '0' },
                          { label: '15m', value: '15' },
                          { label: '30m', value: '30' },
                          { label: '45m', value: '45' }
                        ]}
                        placeholder="Minutes"
                        buttonClassName="w-full h-11 bg-card border border-border rounded-xl"
                      />
                    </div>
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
                      <Button variant="destructive" className="h-10 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex-1 sm:flex-none" onClick={handleReject} disabled={isSubmitting || !rejectReason.trim()}>
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Reject'}
                      </Button>
                    </div>
                  </div>
                ) : isEditing ? (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="ghost" className="h-10 px-6 rounded-lg flex-1 sm:flex-none" onClick={cancelEditing} disabled={isSubmitting}>
                      Cancel
                    </Button>
                    <Button className="h-10 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none shadow-sm" onClick={handleSave} disabled={isSubmitting}>
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
                        <Button className="h-10 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-none shadow-sm" onClick={handleApprove} disabled={isSubmitting}>
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
