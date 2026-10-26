"use client"

import { useState, useMemo } from "react"
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
  Briefcase,
  Search,
  TrendingUp,
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
import { reviewLeaveAction, cancelLeaveAction } from "@/actions/leave.actions"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/PageHeader"
import { Dropdown } from "@/components/ui/Dropdown"
import { Input } from "@/components/ui/input"
import { CompHoursView } from "./CompHoursView"
import { WorklogView } from "./WorklogView"

function SickLeaveIcon({ className = "w-5 h-5 text-foreground" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M12 8v8" strokeWidth="2.5" />
      <path d="M8 12h8" strokeWidth="2.5" />
    </svg>
  )
}

function getRequestTypeIcon(leave: any, iconClass = "w-4 h-4 text-foreground") {
  const reqType = (leave.request_type || '').toLowerCase()
  const leaveType = (leave.leave_type || '').toLowerCase()

  if (reqType.includes('wfh') || leaveType.includes('wfh') || leaveType.includes('home')) {
    return <Home className={iconClass} />
  }
  if (leaveType.includes('sick') || leaveType.includes('medical')) {
    return <SickLeaveIcon className={iconClass} />
  }
  if (leaveType.includes('casual') || leaveType.includes('vacation')) {
    return <Plane className={iconClass} />
  }
  if (leaveType.includes('comp') || leaveType.includes('off')) {
    return <Clock className={iconClass} />
  }
  return <Briefcase className={iconClass} />
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
      <div className="h-9 px-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-1.5 text-emerald-400 text-xs sm:text-sm font-medium shrink-0">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>Approved</span>
      </div>
    )
  }
  if (status === 'Rejected') {
    return (
      <div className="h-9 px-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-center gap-1.5 text-rose-400 text-xs sm:text-sm font-medium shrink-0">
        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
        <span>Rejected</span>
      </div>
    )
  }
  if (status === 'Cancelled') {
    return (
      <div className="h-9 px-3.5 rounded-xl border border-slate-500/30 bg-slate-500/10 flex items-center gap-1.5 text-slate-400 text-xs sm:text-sm font-medium shrink-0">
        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
        <span>Cancelled</span>
      </div>
    )
  }
  // Pending HR, Pending Admin, Pending Level, Pending
  return (
    <div className="h-9 px-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center gap-1.5 text-amber-400 text-xs sm:text-sm font-medium shrink-0">
      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
      <span>Pending</span>
    </div>
  )
}

export function LeaveClientPage({
  myLeaves,
  leavesToApprove,
  compOffBalance,
  canApprove,
  isSuperAdmin = false,
  currentEmployeeId,
  isHR = false,
  initialCompOffOverview = null,
}: any) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<"mine" | "approve" | "comphours" | "worklog">(canApprove ? "approve" : "mine")
  const [statusFilter, setStatusFilter] = useState<string>("All Statuses")
  const [typeFilter, setTypeFilter] = useState<string>("ALL")
  const [search, setSearch] = useState<string>("")
  const [showForm, setShowForm] = useState(false)
  const [selectedLeave, setSelectedLeave] = useState<any | null>(null)
  const [approvalLeaves, setApprovalLeaves] = useState<any[]>(leavesToApprove || [])
  const [myLeavesList, setMyLeavesList] = useState<any[]>(myLeaves || [])
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  // Dynamic header based on selected tab
  const headerInfo = useMemo(() => {
    switch (activeTab) {
      case "comphours":
        return {
          title: "Comp-Off Credits",
          subtitle: "Track employee compensatory hours earned, used, and available.",
          icon: Clock,
        }
      case "worklog":
        return {
          title: "Worklog",
          subtitle: "View approved EOD hours and employee contributions.",
          icon: TrendingUp,
        }
      case "approve":
      case "mine":
      default:
        return {
          title: "Leave & WFH Request",
          subtitle: "Manage your leaves and approvals from one place.",
          icon: Calendar,
        }
    }
  }, [activeTab])

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
      const res = await cancelLeaveAction(id)

      if (!res.success) {
        toast.error(res.error || "Failed to cancel leave")
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

  const matchesFilter = (leave: any) => {
    // Status filter
    if (statusFilter !== "All Statuses") {
      if (statusFilter === "Pending") {
        if (!leave.status?.includes("Pending")) return false
      } else if (leave.status !== statusFilter) {
        return false
      }
    }

    // Type filter
    if (typeFilter && typeFilter !== 'ALL') {
      if (typeFilter === 'WFH') {
        if (leave.request_type !== 'WFH') return false
      } else {
        if (leave.leave_type !== typeFilter) return false
      }
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      const empName = leave.employee
        ? `${leave.employee.first_name || ''} ${leave.employee.last_name || ''}`.toLowerCase()
        : ''
      const empDept = leave.employee?.department?.toLowerCase() || ''
      const reason = leave.reason?.toLowerCase() || ''
      const leaveType = leave.leave_type?.toLowerCase() || ''
      const requestType = leave.request_type?.toLowerCase() || ''

      const matches =
        empName.includes(q) ||
        empDept.includes(q) ||
        reason.includes(q) ||
        leaveType.includes(q) ||
        requestType.includes(q)

      if (!matches) return false
    }

    return true
  }

  const filteredMyLeaves = myLeavesList.filter(matchesFilter)
  const filteredLeavesToApprove = approvalLeaves.filter(matchesFilter)

  const pendingCount = approvalLeaves.filter((l: any) => l.status?.includes("Pending")).length

  return (
    <div className="space-y-6 w-full min-w-0">
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
                      {selectedLeave.employee.department ? ` (${selectedLeave.employee.department})` : ''}
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

              {selectedLeave.rejection_reason && (
                <div>
                  <span className="text-xs font-semibold text-rose-500 block mb-1.5">Rejection Reason</span>
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs sm:text-sm text-rose-300 whitespace-pre-wrap leading-relaxed">
                    {selectedLeave.rejection_reason}
                  </div>
                </div>
              )}

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

              {/* Quick Actions in popup */}
              {canApprove && selectedLeave.status?.includes('Pending') && (
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setSelectedLeave(null)}
                    className="h-9 px-3.5 rounded-xl border border-border bg-secondary/40 hover:bg-secondary text-xs sm:text-sm font-medium transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const id = selectedLeave.id
                      await handleUpdateStatus(id, 'Rejected')
                      setSelectedLeave((prev: any) => prev && prev.id === id ? { ...prev, status: 'Rejected' } : null)
                    }}
                    disabled={submittingId === selectedLeave.id}
                    className="h-9 px-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {submittingId === selectedLeave.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>Reject</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const id = selectedLeave.id
                      await handleUpdateStatus(id, 'Approved')
                      setSelectedLeave((prev: any) => prev && prev.id === id ? { ...prev, status: 'Approved' } : null)
                    }}
                    disabled={submittingId === selectedLeave.id}
                    className="h-9 px-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {submittingId === selectedLeave.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    ) : (
                      <Check className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>Approve</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Shared Page Header matching ERP standard */}
      <PageHeader
        title={headerInfo.title}
        subtitle={headerInfo.subtitle}
        icon={headerInfo.icon}
        actions={
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Tab Switcher for Admins/HR */}
            {canApprove && (
              <div className="flex p-0.5 sm:p-1 bg-muted/40 dark:bg-[#141416] rounded-xl border border-border/80 shrink-0 h-10 items-center">
                {!isSuperAdmin && (
                  <button
                    type="button"
                    className={cn(
                      "px-2 sm:px-2.5 py-1 text-xs font-medium rounded-lg transition-all h-8 flex items-center",
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
                  type="button"
                  className={cn(
                    "px-2 sm:px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 h-8",
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

                <button
                  type="button"
                  className={cn(
                    "px-2 sm:px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1 h-8",
                    activeTab === 'comphours'
                      ? "bg-foreground text-background shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setActiveTab('comphours')}
                >
                  <Clock className="w-3.5 h-3.5 hidden 2xl:inline-block" />
                  <span>Credits</span>
                </button>

                <button
                  type="button"
                  className={cn(
                    "px-2 sm:px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1 h-8",
                    activeTab === 'worklog'
                      ? "bg-foreground text-background shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setActiveTab('worklog')}
                >
                  <TrendingUp className="w-3.5 h-3.5 hidden 2xl:inline-block" />
                  <span>Worklog</span>
                </button>
              </div>
            )}

            {/* Comp-Off Balance Pill */}
            {!isSuperAdmin && activeTab === 'mine' && compOffBalance > 0 && (
              <div className="h-10 px-2.5 sm:px-3 rounded-xl border border-border/80 bg-muted/40 dark:bg-[#141416] flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 shadow-xs">
                <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>
                  Comp-Off: <strong className="font-semibold text-foreground">{formatCompOffBalance(compOffBalance * 60)}</strong>
                </span>
              </div>
            )}

            {/* Primary Action Button (Employees & HR only; removed for admin) */}
            {!isSuperAdmin && (
              <Button
                className="h-10 px-3 sm:px-3.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition-colors shrink-0 whitespace-nowrap"
                onClick={() => setShowForm(true)}
              >
                <Plus className="w-4 h-4 mr-0.5 sm:mr-1" />
                Apply Leave / WFH
              </Button>
            )}
          </div>
        }
      />

      {/* Filter and Search Bar directly below header without grey container */}
      {activeTab !== 'comphours' && activeTab !== 'worklog' && (
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          {/* Search */}
          <div className="relative flex-1 w-full min-w-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by employee name, type, or reason..."
              className="!h-11 w-full !bg-muted/40 dark:!bg-[#141416] hover:!bg-muted/60 dark:hover:!bg-[#1a1a1d] !border !border-border/80 hover:!border-border dark:hover:!border-border focus-visible:!border-neutral-500 !rounded-xl !pl-10 !pr-4 !text-sm !text-foreground placeholder:!text-muted-foreground !shadow-none transition-colors"
            />
          </div>

          {/* Request Type Filter */}
          <div className="w-full sm:w-[170px] lg:w-[190px] shrink-0">
            <Dropdown
              className="!space-y-0 !w-full"
              buttonClassName="!h-11 !w-full !rounded-xl !bg-muted/40 dark:!bg-[#141416] hover:!bg-muted/60 dark:hover:!bg-[#1a1a1d] !border !border-border/80 hover:!border-border focus:!border-neutral-500 !text-sm !text-foreground !px-3.5 !shadow-none !justify-between transition-colors"
              value={typeFilter}
              onChange={(val) => setTypeFilter(val as string)}
              placeholder="All Types"
              options={[
                { label: 'All Types', value: 'ALL' },
                { label: 'Work From Home', value: 'WFH' },
                { label: 'Sick Leave', value: 'Sick Leave' },
                { label: 'Casual Leave', value: 'Casual Leave' },
                { label: 'Compensatory Off', value: 'Compensatory Off' },
                { label: 'Paid Leave', value: 'Paid Leave' },
              ]}
            />
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-[160px] lg:w-[180px] shrink-0">
            <Dropdown
              className="!space-y-0 !w-full"
              buttonClassName="!h-11 !w-full !rounded-xl !bg-muted/40 dark:!bg-[#141416] hover:!bg-muted/60 dark:hover:!bg-[#1a1a1d] !border !border-border/80 hover:!border-border focus:!border-neutral-500 !text-sm !text-foreground !px-3.5 !shadow-none !justify-between transition-colors"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as string)}
              placeholder="All Statuses"
              options={[
                { label: 'All Statuses', value: 'All Statuses' },
                { label: 'Approved', value: 'Approved' },
                { label: 'Pending', value: 'Pending' },
                { label: 'Rejected', value: 'Rejected' },
                { label: 'Cancelled', value: 'Cancelled' },
              ]}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'comphours' ? (
        <CompHoursView initialData={initialCompOffOverview} />
      ) : activeTab === 'worklog' ? (
        <WorklogView />
      ) : activeTab === 'mine' ? (
        <div className="space-y-2 sm:space-y-2.5">
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
                  className="rounded-2xl border border-border/60 bg-card hover:border-border transition-all px-3.5 sm:px-4 py-2.5 sm:py-3 shadow-xs"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-4">
                    {/* Left - Request Type & Dates (Clickable to view details popup) */}
                    <div
                      onClick={() => setSelectedLeave(leave)}
                      title="Click to view details"
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
                    >
                      {/* Icon Box */}
                      <div className="w-10 h-10 rounded-xl bg-secondary/50 dark:bg-zinc-900/80 border border-border/70 flex items-center justify-center shrink-0 group-hover:border-border transition-colors">
                        {getRequestTypeIcon(leave, "w-4 h-4 text-foreground")}
                      </div>
                      {/* Details */}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          <h3 className="text-xs sm:text-sm font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors truncate">
                            {leave.request_type === "WFH" ? "Work From Home" : leave.leave_type}
                          </h3>
                          {leave.is_half_day && (
                            <span className="px-1.5 py-0.2 rounded-md bg-secondary text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 border border-border">
                              Half Day
                            </span>
                          )}
                          {leave.medical_certificate_url && (
                            <a
                              href={leave.medical_certificate_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/60 hover:bg-secondary border border-border text-[11px] font-medium text-foreground transition-colors shrink-0"
                              title="View Medical Certificate"
                            >
                              <Paperclip className="w-3 h-3 text-muted-foreground" />
                              <span>Doc</span>
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground flex-wrap sm:flex-nowrap">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{formatDateRange(leave.start_date, leave.end_date)}</span>
                        </div>
                      </div>
                    </div>

                    {/* ZONE 3: Right - Duration, Status Badge, Cancel & 3-dots */}
                    <div className="flex items-center justify-between lg:justify-end gap-2.5 sm:gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/40">
                      {/* Duration Column (always visible matching reference image) */}
                      <div className="flex items-center gap-2 shrink-0 min-w-[80px]">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-border/70 flex items-center justify-center text-muted-foreground shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                        <div className="leading-tight">
                          <div className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">Duration</div>
                          <div className="text-xs sm:text-sm font-bold text-foreground">
                            {calculateDuration(leave.start_date, leave.end_date, leave.is_half_day)}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      {getStatusBadge(leave.status)}

                      {/* Cancel Button (when pending) */}
                      {isPending && (
                        <button
                          onClick={() => handleCancelMyLeave(leave.id)}
                          disabled={submittingId === leave.id}
                          className="h-9 px-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-50"
                        >
                          {submittingId === leave.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>Cancel</span>
                        </button>
                      )}

                      {/* 3-dots Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-xl transition-colors shrink-0"
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
        <div className="space-y-2 sm:space-y-2.5">
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
                  className="rounded-2xl border border-border/60 bg-card hover:border-border transition-all px-3.5 sm:px-4 py-2.5 sm:py-3 shadow-xs"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-4">
                    {/* Left - Employee & Request Info (Clickable to view details popup) */}
                    <div
                      onClick={() => setSelectedLeave(leave)}
                      title="Click to view details"
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
                    >
                      {/* Icon Box */}
                      <div className="w-10 h-10 rounded-xl bg-secondary/50 dark:bg-zinc-900/80 border border-border/70 flex items-center justify-center shrink-0 group-hover:border-border transition-colors">
                        {getRequestTypeIcon(leave, "w-4 h-4 text-foreground")}
                      </div>
                      {/* Details */}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          <h3 className="text-xs sm:text-sm font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors truncate">
                            {firstName} {lastName}
                          </h3>
                          <span className="text-[11px] text-muted-foreground truncate">
                            • {leave.request_type === 'WFH' ? 'Work From Home' : leave.leave_type}
                            {department ? ` (${department})` : ''}
                          </span>
                          {leave.is_half_day && (
                            <span className="px-1.5 py-0.2 rounded-md bg-secondary text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 border border-border">
                              Half Day
                            </span>
                          )}
                          {leave.medical_certificate_url && (
                            <a
                              href={leave.medical_certificate_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/60 hover:bg-secondary border border-border text-[11px] font-medium text-foreground transition-colors shrink-0"
                              title="View Medical Certificate"
                            >
                              <Paperclip className="w-3 h-3 text-muted-foreground" />
                              <span>Doc</span>
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground flex-wrap sm:flex-nowrap">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{formatDateRange(leave.start_date, leave.end_date)}</span>
                        </div>
                      </div>
                    </div>

                    {/* ZONE 3: Right - Duration, Status Badge, Approve/Reject & 3-dots */}
                    <div className="flex items-center justify-between lg:justify-end gap-2.5 sm:gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/40">
                      {/* Duration Column (always visible matching reference image) */}
                      <div className="flex items-center gap-2 shrink-0 min-w-[80px]">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-border/70 flex items-center justify-center text-muted-foreground shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                        <div className="leading-tight">
                          <div className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">Duration</div>
                          <div className="text-xs sm:text-sm font-bold text-foreground">
                            {calculateDuration(leave.start_date, leave.end_date, leave.is_half_day)}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      {getStatusBadge(leave.status)}

                      {/* Approval Action Buttons (when pending) */}
                      {isPending && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleUpdateStatus(leave.id, 'Approved')}
                            disabled={submittingId === leave.id}
                            className="h-9 px-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            {submittingId === leave.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                            ) : (
                              <Check className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(leave.id, 'Rejected')}
                            disabled={submittingId === leave.id}
                            className="h-9 px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            {submittingId === leave.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                            ) : (
                              <X className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span>Reject</span>
                          </button>
                        </div>
                      )}

                      {/* 3-dots Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-xl transition-colors shrink-0"
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
