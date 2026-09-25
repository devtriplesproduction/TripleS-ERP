"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, CheckCircle2, XCircle, Plus, Eye, Check, X, FileText, User, Trash2, Paperclip } from "lucide-react"
import { format } from "date-fns"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { LeaveForm } from "./LeaveForm"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export function LeaveClientPage({ myLeaves, leavesToApprove, compOffBalance, canApprove, isSuperAdmin = false, currentEmployeeId, isHR = false }: any) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<"mine" | "approve">(canApprove ? "approve" : "mine")
  const [statusFilter, setStatusFilter] = useState<string>("All Statuses")
  const [showForm, setShowForm] = useState(false)
  const [approvalLeaves, setApprovalLeaves] = useState<any[]>(leavesToApprove || [])
  const [myLeavesList, setMyLeavesList] = useState<any[]>(myLeaves || [])

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    // Optimistic update
    setApprovalLeaves(prev =>
      prev.map(leave => (leave.id === id ? { ...leave, status: newStatus } : leave))
    )
    
    const { error } = await supabase
      .from('leave_requests')
      .update({ status: newStatus })
      .eq('id', id)
      
    if (error) {
      toast.error(`Failed to update status to ${newStatus}`)
      // Revert optimistic update (simplistic approach)
      setApprovalLeaves(leavesToApprove || [])
    } else {
      toast.success(`Leave request ${newStatus}`)
    }
  }

  const handleCancelMyLeave = async (id: string) => {
    // Optimistic update
    setMyLeavesList(prev =>
      prev.map(leave => (leave.id === id ? { ...leave, status: 'Cancelled' } : leave))
    )
    
    const { error } = await supabase
      .from('leave_requests')
      .update({ status: 'Cancelled' })
      .eq('id', id)
      
    if (error) {
      toast.error("Failed to cancel leave")
      setMyLeavesList(myLeaves || [])
    } else {
      toast.success("Leave cancelled successfully")
    }
  }

  const filteredMyLeaves = myLeavesList.filter((leave: any) => {
    if (statusFilter === "All Statuses") return true
    if (statusFilter === "Pending") return leave.status?.includes("Pending")
    return leave.status === statusFilter
  })

  const filteredLeavesToApprove = approvalLeaves.filter((leave: any) => {
    if (statusFilter === "All Statuses") return true
    if (statusFilter === "Pending") return leave.status?.includes("Pending")
    return leave.status === statusFilter
  })

  const pendingCount = approvalLeaves.filter((l: any) => l.status?.includes("Pending")).length

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      case 'Rejected':
      case 'Cancelled': return <XCircle className="w-4 h-4 text-rose-500" />
      default: return <Clock className="w-4 h-4 text-amber-500" />
    }
  }

  return (
    <div className="space-y-6">
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 border-none bg-transparent shadow-none" showCloseButton={false}>
          <LeaveForm 
            onCancel={() => setShowForm(false)} 
            currentEmployeeId={currentEmployeeId}
            initialStatus={isHR ? "Pending Admin" : "Pending HR"}
            onSuccess={(newLeave) => {
              setMyLeavesList(prev => [newLeave, ...prev])
              setShowForm(false)
            }}
          />
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Leave Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your leaves and approvals from one place.</p>
          </div>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto pb-2">
          <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
            <SelectTrigger className="h-10 border-border bg-transparent min-w-[140px] text-foreground">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Statuses">All Statuses</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {canApprove && (
            <div className="flex p-1 space-x-1 bg-background rounded-lg border border-border shrink-0">
              {!isSuperAdmin && (
                <button
                  className={`py-1.5 px-4 text-sm font-medium rounded-md transition-all ${activeTab === 'mine' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setActiveTab('mine')}
                >
                  My Leaves
                </button>
              )}
              <button
                className={`py-1.5 px-4 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'approve' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActiveTab('approve')}
              >
                Approvals
                {pendingCount > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center font-bold ${activeTab === 'approve' ? 'bg-background text-foreground' : 'bg-foreground text-background'}`}>
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {!isSuperAdmin && (
            <div className="bg-transparent text-muted-foreground border border-border px-4 h-10 flex items-center rounded-lg text-sm shrink-0 gap-2">
              <Clock className="w-4 h-4" />
              <span>Comp-Off Balance: <span className="font-medium text-foreground">{compOffBalance} hours</span></span>
            </div>
          )}

          {activeTab === 'mine' && !isSuperAdmin && (
            <Button 
              className="h-10 rounded-lg bg-foreground text-background hover:bg-foreground/90 font-medium gap-2 shrink-0"
              onClick={() => setShowForm(true)}
            >
              <Plus className="w-4 h-4" /> Apply Leave
            </Button>
          )}
        </div>
      </div>

      {activeTab === 'mine' ? (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden min-h-[400px] flex flex-col">
          {filteredMyLeaves.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
              <div className="w-16 h-16 rounded-full border border-border bg-background/50 flex items-center justify-center mb-6">
                <FileText className="w-8 h-8 text-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">No Leave History</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                You haven't applied for any leaves yet. Click the Apply Leave button to create your first request.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5">
              {filteredMyLeaves.map((leave: any) => {
                const isApproved = leave.status === 'Approved'
                const isRejected = leave.status === 'Rejected' || leave.status === 'Cancelled'
                const canCancel = leave.status === 'Pending HR' || leave.status === 'Pending Admin' || leave.status === 'Pending Level' || leave.status === 'Approved'

                return (
                  <div 
                    key={leave.id} 
                    className="bg-card border border-border/80 hover:border-foreground/20 rounded-xl p-4 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Card Header: Status Badge & Type */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex flex-col gap-0.5">
                          <h3 className="font-bold text-foreground text-sm leading-tight flex items-center gap-1.5 group-hover:text-primary transition-colors">
                            {leave.leave_type} 
                            {leave.is_half_day && (
                              <span className="px-1.5 py-0.5 rounded-md bg-muted text-[9px] font-semibold tracking-wider uppercase text-muted-foreground">Half Day</span>
                            )}
                          </h3>
                        </div>

                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium shrink-0 ${
                          isApproved 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : isRejected 
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {getStatusIcon(leave.status)}
                          <span>{leave.status}</span>
                        </div>
                      </div>

                      {/* Date Details Box */}
                      <div className="bg-muted/30 border border-border/60 rounded-lg p-2.5 mb-3">
                        <div className="flex items-center gap-1.5 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          <Calendar className="w-3 h-3" /> Duration
                        </div>
                        <div className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <span className="bg-background px-1.5 py-0.5 rounded-md border border-border/80">
                            {format(new Date(leave.start_date), 'MMM d, yyyy')}
                          </span>
                          <span className="text-muted-foreground/50">—</span>
                          <span className="bg-background px-1.5 py-0.5 rounded-md border border-border/80">
                            {format(new Date(leave.end_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>

                      {/* Reason Section */}
                      <div className="mb-4">
                        <div className="flex items-center gap-1.5 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          <FileText className="w-3 h-3" /> Reason
                        </div>
                        <div className="text-xs text-muted-foreground leading-relaxed bg-muted/20 border border-border/40 rounded-lg p-2.5 min-h-[40px]">
                          {leave.reason || <span className="italic opacity-50">No reason provided</span>}
                        </div>
                      </div>
                    </div>

                    {/* Card Action Buttons at the Bottom */}
                    {canCancel && (
                      <div className="pt-2.5 border-t border-border/60 flex items-center gap-2 mt-auto">
                        <Button 
                          variant="outline" 
                          className="w-full border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 font-medium h-8 rounded-md gap-1.5 text-xs transition-colors"
                          onClick={() => handleCancelMyLeave(leave.id)}
                        >
                          <Trash2 className="w-3 h-3" /> Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : filteredLeavesToApprove.length === 0 ? (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden min-h-[400px] flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-full border border-border bg-background/50 flex items-center justify-center mb-6">
              <FileText className="w-8 h-8 text-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No Approvals Pending</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              You are all caught up! There are no leave requests waiting for your approval at this time.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredLeavesToApprove.map((leave: any) => {
            const firstName = leave.employee?.first_name || "Employee"
            const lastName = leave.employee?.last_name || ""
            const initials = `${firstName[0] || ""}${lastName[0] || ""}` || "EM"
            const isApproved = leave.status === 'Approved'
            const isRejected = leave.status === 'Rejected' || leave.status === 'Cancelled'

            return (
              <div 
                key={leave.id} 
                className="bg-card border border-border/80 hover:border-foreground/20 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row group overflow-hidden"
              >
                {/* Left Column - Details */}
                <div className="flex-1 p-5 md:p-6 flex flex-col justify-between relative">
                  {/* Vertical Divider for Desktop */}
                  <div className="hidden sm:block absolute right-0 top-6 bottom-6 w-px bg-border/60" />

                  <div>
                    {/* Card Header: Avatar, Name, Department & Status Badge */}
                    <div className="flex items-start justify-between gap-3 mb-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-muted/50 border border-border/60 flex items-center justify-center text-muted-foreground shrink-0 shadow-2xs">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="font-bold text-foreground text-lg leading-none group-hover:text-primary transition-colors">
                              {firstName} {lastName}
                            </h3>
                            <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium shrink-0 ${
                              isApproved 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : isRejected 
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {getStatusIcon(leave.status)}
                              <span>{leave.status}</span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2 font-medium">
                            {leave.employee?.department ? `${leave.employee.department} • ` : ""}{leave.leave_type}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Date & Type Details Box */}
                    <div className="flex flex-row bg-muted/20 border border-border/60 rounded-xl p-4 my-5 gap-4 relative">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                          <Calendar className="w-3.5 h-3.5" /> Date
                        </div>
                        <div className="text-sm font-medium text-foreground">
                          <div className="whitespace-nowrap">{format(new Date(leave.start_date), 'MMM d, yyyy')} -</div>
                          <div className="whitespace-nowrap">{format(new Date(leave.end_date), 'MMM d, yyyy')}</div>
                        </div>
                      </div>
                      
                      {/* Inner Vertical Divider */}
                      <div className="w-px bg-border/60 my-1" />
                      
                      <div className="flex-1 pl-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                          <FileText className="w-3.5 h-3.5" /> Type
                        </div>
                        <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-muted/50 border border-border/80 text-xs font-semibold text-foreground shadow-xs">
                          {leave.leave_type}
                        </div>
                      </div>
                    </div>

                    {/* Reason Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5" /> Reason
                        </div>
                        {leave.medical_certificate_url && (
                          <a 
                            href={leave.medical_certificate_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/40 hover:bg-muted border border-border/60 text-[11px] font-bold text-foreground transition-all shadow-xs hover:shadow-sm"
                          >
                            <Paperclip className="w-3.5 h-3.5" /> View Document
                          </a>
                        )}
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                        {leave.reason || <span className="italic opacity-50">No reason provided</span>}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column - Actions */}
                <div className="sm:w-[200px] md:w-[220px] p-5 md:p-6 flex flex-col justify-center gap-3 shrink-0 bg-muted/5 sm:bg-transparent border-t sm:border-t-0 border-border/60">
                  {isApproved || isRejected || leave.status === 'Cancelled' ? (
                    <div className="flex flex-col items-center text-center justify-center text-muted-foreground opacity-80 py-4">
                      <div className="w-10 h-10 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center mb-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                      </div>
                      <span className="text-[11px] font-extrabold uppercase tracking-widest mb-1.5 text-foreground/60">No Actions</span>
                      <p className="text-xs font-medium px-2 leading-relaxed">
                        This leave request has been {isApproved ? 'approved' : 'rejected'}.
                      </p>
                    </div>
                  ) : (
                    <>
                      <Button 
                        className="w-full bg-foreground hover:bg-foreground/90 text-background font-bold h-11 rounded-xl gap-2 text-sm shadow-sm transition-all"
                        onClick={() => handleUpdateStatus(leave.id, 'Approved')}
                      >
                        <Check className="w-4 h-4" /> Approve
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full border-border/80 text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 font-bold h-11 rounded-xl gap-2 text-sm transition-all bg-transparent"
                        onClick={() => handleUpdateStatus(leave.id, 'Rejected')}
                      >
                        <X className="w-4 h-4" /> Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
