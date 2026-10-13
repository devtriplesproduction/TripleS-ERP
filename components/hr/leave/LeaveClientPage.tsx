"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  FileText,
  Trash2,
  Paperclip,
  Check,
  X,
  Loader2,
  Home,
  Plane,
  MoreVertical,
  Briefcase
} from "lucide-react"
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { LeaveForm } from "./LeaveForm"
import { toast } from "sonner"
import { formatCompOffBalance } from "@/lib/utils/time"
import { createClient } from "@/lib/supabase/client"
import { reviewLeaveAction } from "@/actions/leave.actions"
import { cn } from "@/lib/utils"

function SickLeaveIcon({ className = "w-5 h-5 text-foreground" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M12 8v8" strokeWidth="2.5" />
      <path d="M8 12h8" strokeWidth="2.5" />
    </svg>
  )
}

function getRequestTypeIcon(leave: any) {
  const reqType = (leave.request_type || '').toLowerCase()
  const leaveType = (leave.leave_type || '').toLowerCase()

  if (reqType.includes('wfh') || leaveType.includes('wfh') || leaveType.includes('home')) {
    return <Home className="w-5 h-5 text-foreground" />
  }
  if (leaveType.includes('sick') || leaveType.includes('medical')) {
    return <SickLeaveIcon className="w-5 h-5 text-foreground" />
  }
  if (leaveType.includes('casual') || leaveType.includes('vacation')) {
    return <Plane className="w-5 h-5 text-foreground" />
  }
  if (leaveType.includes('comp') || leaveType.includes('off')) {
    return <Clock className="w-5 h-5 text-foreground" />
  }
  return <Briefcase className="w-5 h-5 text-foreground" />
}

function calculateDuration(startDate: string, endDate: string, isHalfDay?: boolean): string {
  if (isHalfDay) return "0.5 day"
  try {
    const s = new Date(startDate)
    const e = new Date(endDate)
    const diffTime = Math.abs(e.getTime() - s.getTime())
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays === 1 ? "1 day" : `${diffDays} days`
  } catch {
    return "1 day"
  }
}

function formatDateRange(startDate: string, endDate: string): string {
  try {
    const s = format(new Date(startDate), 'MMM d, yyyy')
    const e = format(new Date(endDate), 'MMM d, yyyy')
    return `${s} — ${e}`
  } catch {
    return `${startDate} — ${endDate}`
  }
}

function getStatusBadge(status: string) {
  if (status === 'Approved') {
    return (
      <div className="h-10 px-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 flex items-center gap-2 text-emerald-400 text-xs sm:text-sm font-medium shrink-0">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>Approved</span>
      </div>
    )
  }
  if (status === 'Rejected') {
    return (
      <div className="h-10 px-4 rounded-xl border border-rose-500/40 bg-rose-500/10 flex items-center gap-2 text-rose-400 text-xs sm:text-sm font-medium shrink-0">
        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
        <span>Rejected</span>
      </div>
    )
  }
  if (status === 'Cancelled') {
    return (
      <div className="h-10 px-4 rounded-xl border border-slate-500/40 bg-slate-500/10 flex items-center gap-2 text-slate-400 text-xs sm:text-sm font-medium shrink-0">
        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
        <span>Cancelled</span>
      </div>
    )
  }
  // Pending HR, Pending Admin, Pending Level, Pending
  return (
    <div className="h-10 px-4 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-center gap-2 text-amber-400 text-xs sm:text-sm font-medium shrink-0">
      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
      <span>Pending</span>
    </div>
  )
}

export function LeaveClientPage({ myLeaves, leavesToApprove, compOffBalance, canApprove, isSuperAdmin = false, currentEmployeeId, isHR = false }: any) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<"mine" | "approve">(canApprove ? "approve" : "mine")
  const [statusFilter, setStatusFilter] = useState<string>("All Statuses")
  const [showForm, setShowForm] = useState(false)
  const [selectedLeave, setSelectedLeave] = useState<any | null>(null)
  const [approvalLeaves, setApprovalLeaves] = useState<any[]>(leavesToApprove || [])
  const [myLeavesList, setMyLeavesList] = useState<any[]>(myLeaves || [])
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (submittingId) return // Prevent duplicate submissions while in-flight
    setSubmittingId(id)

    const previousLeaves = [...approvalLeaves]

    // Optimistic update
    setApprovalLeaves(prev =>
      prev.map(leave => (leave.id === id ? { ...leave, status: newStatus } : leave))
    )

    try {
      const result = await reviewLeaveAction(id, newStatus)
      if (!result.success) {
        toast.error(result.error || `Failed to update status to ${newStatus}`)
        setApprovalLeaves(previousLeaves)
      } else {
        toast.success(`Leave request ${newStatus}`)
      }
    } catch {
      toast.error(`Failed to update status to ${newStatus}`)
      setApprovalLeaves(previousLeaves)
    } finally {
      setSubmittingId(null)
    }
  }

  const handleCancelMyLeave = async (id: string) => {
    if (submittingId) return
    setSubmittingId(id)

    const previousMyLeaves = [...myLeavesList]

    // Optimistic update
    setMyLeavesList(prev =>
      prev.map(leave => (leave.id === id ? { ...leave, status: 'Cancelled' } : leave))
    )

    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: 'Cancelled' })
        .eq('id', id)

      if (error) {
        toast.error("Failed to cancel leave")
        setMyLeavesList(previousMyLeaves)
      } else {
        toast.success("Leave cancelled successfully")
      }
    } catch {
      toast.error("Failed to cancel leave")
      setMyLeavesList(previousMyLeaves)
    } finally {
      setSubmittingId(null)
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

  return (
    <div className="space-y-4 sm:space-y-5 w-full min-w-0">
      {/* Apply Leave / WFH Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-3xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto p-0 border-none bg-transparent shadow-none" showCloseButton={false}>
          <LeaveForm
            onCancel={() => setShowForm(false)}
            currentEmployeeId={currentEmployeeId}
            compOffBalance={compOffBalance}
            initialStatus={isHR ? "Pending Admin" : "Pending HR"}
            onSuccess={(newLeave) => {
              setMyLeavesList(prev => [newLeave, ...prev])
              setShowForm(false)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Leave Details Modal */}
      <Dialog open={!!selectedLeave} onOpenChange={(open) => !open && setSelectedLeave(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              {selectedLeave && getRequestTypeIcon(selectedLeave)}
              <span>{selectedLeave?.request_type === 'WFH' ? 'Work From Home' : selectedLeave?.leave_type}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Detailed request information and status
            </DialogDescription>
          </DialogHeader>
          {selectedLeave && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-secondary/30 border border-border text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Dates</span>
                  <span className="font-semibold text-foreground">
                    {formatDateRange(selectedLeave.start_date, selectedLeave.end_date)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Duration</span>
                  <span className="font-semibold text-foreground">
                    {calculateDuration(selectedLeave.start_date, selectedLeave.end_date, selectedLeave.is_half_day)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Status</span>
                  <span className="font-semibold text-foreground">{selectedLeave.status}</span>
                </div>
                {selectedLeave.employee && (
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Employee</span>
                    <span className="font-semibold text-foreground">
                      {selectedLeave.employee.first_name} {selectedLeave.employee.last_name}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <span className="text-xs font-semibold text-foreground block mb-1.5">Reason</span>
                <div className="p-3.5 rounded-xl bg-secondary/20 border border-border text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {selectedLeave.reason || 'No reason provided.'}
                </div>
              </div>

              {selectedLeave.medical_certificate_url && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-secondary/20">
                  <div className="flex items-center gap-2 text-xs text-foreground font-medium">
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                    <span>Medical Certificate</span>
                  </div>
                  <a
                    href={selectedLeave.medical_certificate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View Document ↗
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Header Panel */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Calendar Icon, Title, Subtitle */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-secondary/50 dark:bg-zinc-900/80 border border-border flex items-center justify-center shrink-0 shadow-xs">
              <Calendar className="w-5 h-5 text-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Leave & WFH Request
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Manage your leaves and approvals from one place.
              </p>
            </div>
          </div>

          {/* Right: Controls aligned in row */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
              <SelectTrigger className="w-[140px] h-10 px-3.5 rounded-xl bg-background border border-border text-foreground text-xs sm:text-sm font-medium gap-2 hover:bg-secondary/40 transition-colors">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border text-popover-foreground">
                <SelectItem value="All Statuses">All Statuses</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Tab Switcher for Admins/HR */}
            {canApprove && (
              <div className="flex p-1 bg-secondary/40 dark:bg-zinc-900/60 rounded-xl border border-border shrink-0">
                {!isSuperAdmin && (
                  <button
                    className={cn(
                      "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all",
                      activeTab === 'mine'
                        ? "bg-foreground text-background shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setActiveTab('mine')}
                  >
                    My Leaves
                  </button>
                )}
                <button
                  className={cn(
                    "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center gap-1.5",
                    activeTab === 'approve'
                      ? "bg-foreground text-background shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setActiveTab('approve')}
                >
                  <span>Approvals</span>
                  {pendingCount > 0 && (
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                        activeTab === 'approve'
                          ? "bg-background text-foreground"
                          : "bg-foreground text-background"
                      )}
                    >
                      {pendingCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Comp-Off Balance Pill */}
            {!isSuperAdmin && activeTab === 'mine' && (
              <div className="h-10 px-3.5 sm:px-4 rounded-xl border border-border bg-card flex items-center gap-2 text-xs sm:text-sm text-muted-foreground shrink-0 shadow-xs">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>
                  Comp-Off: <strong className="font-semibold text-foreground">{formatCompOffBalance(compOffBalance * 60)}</strong>
                </span>
              </div>
            )}

            {/* Apply Leave / WFH Button */}
            {activeTab === 'mine' && !isSuperAdmin && (
              <Button
                className="h-10 px-4 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-medium text-xs sm:text-sm gap-2 shrink-0 shadow-xs transition-colors"
                onClick={() => setShowForm(true)}
              >
                <Plus className="w-4 h-4" /> Apply Leave / WFH
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Requests List */}
      {activeTab === 'mine' ? (
        <div className="space-y-3 sm:space-y-3.5">
          {filteredMyLeaves.length === 0 ? (
            <div className="text-center py-16 px-4 border border-dashed border-border rounded-2xl bg-card">
              <Calendar className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
              <h3 className="text-base font-bold text-foreground mb-1">No Leave History</h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                {statusFilter !== "All Statuses"
                  ? `No requests match the "${statusFilter}" filter.`
                  : "You haven't applied for any leaves yet. Click Apply Leave / WFH to create your first request."}
              </p>
            </div>
          ) : (
            filteredMyLeaves.map((leave: any) => {
              const isApproved = leave.status === 'Approved'
              const isPending = leave.status?.includes('Pending')
              const canCancel = isPending || isApproved

              return (
                <div
                  key={leave.id}
                  className="rounded-2xl border border-border bg-card hover:border-border/80 transition-all p-4 sm:p-5 shadow-xs"
                >
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    {/* ZONE 1: Left - Request Type & Dates */}
                    <div className="flex items-center gap-3.5 min-w-0 xl:w-[320px] 2xl:w-[360px] shrink-0">
                      {/* Icon Box */}
                      <div className="w-12 h-12 rounded-xl bg-secondary/50 dark:bg-zinc-900/80 border border-border flex items-center justify-center shrink-0">
                        {getRequestTypeIcon(leave)}
                      </div>
                      {/* Details */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight truncate">
                            {leave.request_type === "WFH" ? "Work From Home" : leave.leave_type}
                          </h3>
                          {leave.is_half_day && (
                            <span className="px-1.5 py-0.5 rounded-md bg-secondary text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 border border-border">
                              Half Day
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{formatDateRange(leave.start_date, leave.end_date)}</span>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-secondary/60 dark:bg-zinc-800/80 border border-border text-foreground shrink-0">
                            {calculateDuration(leave.start_date, leave.end_date, leave.is_half_day)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Vertical Divider 1 */}
                    <div className="hidden xl:block w-px h-10 bg-border/60 shrink-0" />

                    {/* ZONE 2: Center - Reason */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-secondary/30 dark:bg-zinc-900/40 border border-border/80 flex items-center justify-center shrink-0 text-muted-foreground">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] text-muted-foreground font-medium">Reason</div>
                        <div className="text-xs sm:text-sm font-normal text-foreground/90 truncate">
                          {leave.reason || <span className="italic text-muted-foreground">No reason provided</span>}
                        </div>
                      </div>
                      {leave.medical_certificate_url && (
                        <a
                          href={leave.medical_certificate_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary/50 hover:bg-secondary border border-border text-xs font-medium text-foreground transition-colors shrink-0"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>Doc</span>
                        </a>
                      )}
                    </div>

                    {/* Vertical Divider 2 */}
                    <div className="hidden xl:block w-px h-10 bg-border/60 shrink-0" />

                    {/* ZONE 3: Right - Duration, Status Badge, Cancel & 3-dots */}
                    <div className="flex items-center justify-between xl:justify-end gap-3 sm:gap-4 shrink-0 pt-3 xl:pt-0 border-t xl:border-t-0 border-border/50">
                      {/* Duration Column (hidden when pending) */}
                      {!isPending && (
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-8 h-8 rounded-full border border-border/80 flex items-center justify-center text-muted-foreground shrink-0">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div className="leading-tight">
                            <div className="text-[10px] text-muted-foreground font-medium">Duration</div>
                            <div className="text-xs sm:text-sm font-bold text-foreground">
                              {calculateDuration(leave.start_date, leave.end_date, leave.is_half_day)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Status Badge */}
                      {getStatusBadge(leave.status)}

                      {/* Cancel Button (when pending) */}
                      {isPending && (
                        <button
                          onClick={() => handleCancelMyLeave(leave.id)}
                          disabled={submittingId === leave.id}
                          className="h-10 px-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-50"
                        >
                          {submittingId === leave.id ? (
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                          ) : (
                            <Trash2 className="w-4 h-4 shrink-0" />
                          )}
                          <span>Cancel</span>
                        </button>
                      )}

                      {/* 3-dots Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-xl transition-colors shrink-0"
                          aria-label="More options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 bg-popover border border-border text-popover-foreground rounded-xl shadow-lg p-1.5">
                          <DropdownMenuItem
                            onClick={() => setSelectedLeave(leave)}
                            className="flex items-center gap-2 cursor-pointer rounded-lg text-xs sm:text-sm py-2"
                          >
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span>View Details</span>
                          </DropdownMenuItem>
                          {leave.medical_certificate_url && (
                            <DropdownMenuItem
                              onClick={() => window.open(leave.medical_certificate_url, '_blank')}
                              className="flex items-center gap-2 cursor-pointer rounded-lg text-xs sm:text-sm py-2"
                            >
                              <Paperclip className="w-4 h-4 text-muted-foreground" />
                              <span>Medical Doc</span>
                            </DropdownMenuItem>
                          )}
                          {canCancel && !isPending && (
                            <DropdownMenuItem
                              onClick={() => handleCancelMyLeave(leave.id)}
                              disabled={submittingId === leave.id}
                              variant="destructive"
                              className="flex items-center gap-2 cursor-pointer rounded-lg text-xs sm:text-sm py-2 text-rose-500 focus:text-rose-400"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Cancel Request</span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      ) : (
        /* Approvals List */
        <div className="space-y-3 sm:space-y-3.5">
          {filteredLeavesToApprove.length === 0 ? (
            <div className="text-center py-16 px-4 border border-dashed border-border rounded-2xl bg-card">
              <Calendar className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
              <h3 className="text-base font-bold text-foreground mb-1">No Approvals Pending</h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                You are all caught up! There are no leave or WFH requests waiting for your approval.
              </p>
            </div>
          ) : (
            filteredLeavesToApprove.map((leave: any) => {
              const firstName = leave.employee?.first_name || "Employee"
              const lastName = leave.employee?.last_name || ""
              const department = leave.employee?.department || ""
              const isPending = leave.status?.includes('Pending')

              return (
                <div
                  key={leave.id}
                  className="rounded-2xl border border-border bg-card hover:border-border/80 transition-all p-4 sm:p-5 shadow-xs"
                >
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    {/* ZONE 1: Left - Employee & Request Info */}
                    <div className="flex items-center gap-3.5 min-w-0 xl:w-[320px] 2xl:w-[360px] shrink-0">
                      {/* Icon Box */}
                      <div className="w-12 h-12 rounded-xl bg-secondary/50 dark:bg-zinc-900/80 border border-border flex items-center justify-center shrink-0">
                        {getRequestTypeIcon(leave)}
                      </div>
                      {/* Details */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight truncate">
                            {firstName} {lastName}
                          </h3>
                          {leave.is_half_day && (
                            <span className="px-1.5 py-0.5 rounded-md bg-secondary text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 border border-border">
                              Half Day
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {department ? `${department} • ` : ""}{leave.request_type === 'WFH' ? 'Work From Home' : leave.leave_type}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{formatDateRange(leave.start_date, leave.end_date)}</span>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-secondary/60 dark:bg-zinc-800/80 border border-border text-foreground shrink-0">
                            {calculateDuration(leave.start_date, leave.end_date, leave.is_half_day)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Vertical Divider 1 */}
                    <div className="hidden xl:block w-px h-10 bg-border/60 shrink-0" />

                    {/* ZONE 2: Center - Reason */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-secondary/30 dark:bg-zinc-900/40 border border-border/80 flex items-center justify-center shrink-0 text-muted-foreground">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] text-muted-foreground font-medium">Reason</div>
                        <div className="text-xs sm:text-sm font-normal text-foreground/90 truncate">
                          {leave.reason || <span className="italic text-muted-foreground">No reason provided</span>}
                        </div>
                      </div>
                      {leave.medical_certificate_url && (
                        <a
                          href={leave.medical_certificate_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary/50 hover:bg-secondary border border-border text-xs font-medium text-foreground transition-colors shrink-0"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>Doc</span>
                        </a>
                      )}
                    </div>

                    {/* Vertical Divider 2 */}
                    <div className="hidden xl:block w-px h-10 bg-border/60 shrink-0" />

                    {/* ZONE 3: Right - Duration, Status Badge, Approve/Reject & 3-dots */}
                    <div className="flex items-center justify-between xl:justify-end gap-3 sm:gap-4 shrink-0 pt-3 xl:pt-0 border-t xl:border-t-0 border-border/50">
                      {/* Duration Column (hidden when pending) */}
                      {!isPending && (
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-8 h-8 rounded-full border border-border/80 flex items-center justify-center text-muted-foreground shrink-0">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div className="leading-tight">
                            <div className="text-[10px] text-muted-foreground font-medium">Duration</div>
                            <div className="text-xs sm:text-sm font-bold text-foreground">
                              {calculateDuration(leave.start_date, leave.end_date, leave.is_half_day)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Status Badge */}
                      {getStatusBadge(leave.status)}

                      {/* Approval Action Buttons (when pending) */}
                      {isPending && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleUpdateStatus(leave.id, 'Approved')}
                            disabled={submittingId === leave.id}
                            className="h-10 px-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            {submittingId === leave.id ? (
                              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            ) : (
                              <Check className="w-4 h-4 shrink-0" />
                            )}
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(leave.id, 'Rejected')}
                            disabled={submittingId === leave.id}
                            className="h-10 px-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            {submittingId === leave.id ? (
                              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            ) : (
                              <X className="w-4 h-4 shrink-0" />
                            )}
                            <span>Reject</span>
                          </button>
                        </div>
                      )}

                      {/* 3-dots Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-xl transition-colors shrink-0"
                          aria-label="More options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 bg-popover border border-border text-popover-foreground rounded-xl shadow-lg p-1.5">
                          <DropdownMenuItem
                            onClick={() => setSelectedLeave(leave)}
                            className="flex items-center gap-2 cursor-pointer rounded-lg text-xs sm:text-sm py-2"
                          >
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span>View Details</span>
                          </DropdownMenuItem>
                          {leave.medical_certificate_url && (
                            <DropdownMenuItem
                              onClick={() => window.open(leave.medical_certificate_url, '_blank')}
                              className="flex items-center gap-2 cursor-pointer rounded-lg text-xs sm:text-sm py-2"
                            >
                              <Paperclip className="w-4 h-4 text-muted-foreground" />
                              <span>Medical Doc</span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
