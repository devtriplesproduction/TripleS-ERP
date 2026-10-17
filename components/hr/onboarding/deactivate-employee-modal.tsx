'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  UserX,
  UserCheck,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  FolderGit2,
  CheckSquare,
  Calendar,
  FileText,
  Building2,
  Briefcase,
  Star,
  Info,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { Employee } from '@/lib/supabase/types'
import {
  getEmployeeDeactivationImpact,
  deactivateEmployee,
  reactivateEmployee,
  DeactivationImpact,
} from '@/lib/actions/deactivation'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface DeactivateEmployeeModalProps {
  employee: Employee
  isOpen: boolean
  onClose: () => void
  currentStatus?: string
  onStatusChange?: (newStatus: string) => void
}

export function DeactivateEmployeeModal({
  employee,
  isOpen,
  onClose,
  currentStatus = 'Active',
  onStatusChange,
}: DeactivateEmployeeModalProps) {
  const router = useRouter()
  const { toast } = useToast()

  const isCurrentlyInactive =
    currentStatus === 'Inactive' ||
    currentStatus === 'Terminated' ||
    employee.employment_status === 'Inactive' ||
    employee.employment_status === 'Terminated'

  const [isLoadingImpact, setIsLoadingImpact] = useState(true)
  const [impact, setImpact] = useState<DeactivationImpact | null>(null)
  const [reason, setReason] = useState('')
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Employee'
  const employeeId = employee.employee_id_number || 'Not assigned'
  const department = employee.department || 'Not assigned'

  // Fetch pre-flight impact when modal opens
  useEffect(() => {
    if (isOpen) {
      setReason('')
      setIsConfirmed(false)
      setActionError(null)
      setIsLoadingImpact(true)

      getEmployeeDeactivationImpact(employee.id)
        .then((res) => {
          setImpact(res)
          if (!res.success && res.errorMessage) {
            setActionError(res.errorMessage)
          }
        })
        .catch((err) => {
          setActionError(err.message || 'Failed to analyze employee dependencies.')
        })
        .finally(() => {
          setIsLoadingImpact(false)
        })
    }
  }, [isOpen, employee.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConfirmed && !isCurrentlyInactive) {
      setActionError('Please confirm the deactivation acknowledgment checkbox.')
      return
    }

    setIsSubmitting(true)
    setActionError(null)

    try {
      if (isCurrentlyInactive) {
        // Reactivate workflow
        const result = await reactivateEmployee({
          employeeId: employee.id,
          reason: reason.trim(),
        })

        if (!result.success) {
          setActionError(result.error || 'Failed to reactivate employee.')
          toast({
            title: 'Reactivation Failed',
            description: result.error || 'Could not reactivate employee.',
            variant: 'destructive',
          })
          return
        }

        toast({
          title: 'Employee Reactivated',
          description: result.message || `${fullName} has been reactivated.`,
        })

        if (onStatusChange) {
          onStatusChange('Active')
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('employee-status-changed', {
            detail: { employeeId: employee.id, status: 'Active' }
          }))
        }
        router.refresh()
        onClose()
      } else {
        // Deactivate workflow
        const result = await deactivateEmployee({
          employeeId: employee.id,
          reason: reason.trim(),
        })

        if (!result.success) {
          setActionError(result.error || 'Failed to deactivate employee.')
          toast({
            title: 'Deactivation Failed',
            description: result.error || 'Could not deactivate employee.',
            variant: 'destructive',
          })
          return
        }

        toast({
          title: 'Employee Deactivated',
          description: result.message || `${fullName} has been deactivated.`,
        })

        if (onStatusChange) {
          onStatusChange('Inactive')
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('employee-status-changed', {
            detail: { employeeId: employee.id, status: 'Inactive' }
          }))
        }
        router.refresh()
        onClose()
      }
    } catch (err: any) {
      const msg = err.message || 'An unexpected error occurred.'
      setActionError(msg)
      toast({
        title: 'Error',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSubmitting) onClose() }}>
      <DialogContent className="sm:max-w-xl w-[calc(100vw-1.5rem)] max-h-[85vh] bg-[#0F0F10] border-[#2A2A2A] text-foreground p-0 gap-0 overflow-hidden shadow-2xl flex flex-col">
        {/* Header Banner */}
        <div className={cn(
          "px-6 py-5 border-b flex items-start gap-3.5 shrink-0 pr-12",
          isCurrentlyInactive
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-rose-500/20 bg-rose-500/5"
        )}>
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border",
            isCurrentlyInactive
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/25 text-rose-400"
          )}>
            {isCurrentlyInactive ? (
              <UserCheck className="w-5 h-5" />
            ) : (
              <UserX className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              {isCurrentlyInactive ? 'Reactivate Employee Account' : 'Deactivate Employee'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#A1A1AA] mt-1">
              {isCurrentlyInactive
                ? 'Restore ERP access and lift authentication restrictions for this employee.'
                : 'Safely revoke ERP access and active sessions while preserving all historical records.'}
            </DialogDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 min-h-0">
          {/* Employee Identity Card */}
          <div className="bg-[#151516] border border-[#2A2A2A] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#18181B] border border-[#2A2A2A] text-white flex items-center justify-center text-xs font-bold shrink-0">
                {employee.first_name?.[0] || 'E'}{employee.last_name?.[0] || 'M'}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-white truncate flex items-center gap-2">
                  <span>{fullName}</span>
                  {impact?.isHod && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
                      <Star className="w-3 h-3 fill-amber-400" /> HOD
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#A1A1AA] flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[11px] text-[#A1A1AA]">{employeeId}</span>
                  <span>•</span>
                  <span className="truncate">{department}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              <span className="text-[11px] text-[#A1A1AA]">Status:</span>
              <Badge className={cn(
                "text-[10px] px-2 py-0.5 h-5 font-semibold",
                isCurrentlyInactive
                  ? "bg-rose-500/15 text-rose-400 border-rose-500/25"
                  : "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
              )}>
                {currentStatus}
                <span className={cn(
                  "inline-block w-1.5 h-1.5 rounded-full ml-1",
                  isCurrentlyInactive ? "bg-rose-400" : "bg-emerald-400"
                )} />
              </Badge>
            </div>
          </div>

          {/* Impact Analysis Loading Skeleton */}
          {isLoadingImpact && (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-[#A1A1AA] bg-[#151516]/50 rounded-xl border border-[#2A2A2A]/50">
              <Loader2 className="w-5 h-5 animate-spin text-white/70" />
              <span>Analyzing employee responsibilities and dependencies...</span>
            </div>
          )}

          {/* Pre-flight Checks / Blocking Warnings */}
          {!isLoadingImpact && impact && (
            <>
              {/* 1. HOD Blocking Alert */}
              {impact.isHod && !isCurrentlyInactive && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Active Head of Department (HOD) — Action Blocked</span>
                  </div>
                  <p className="leading-relaxed text-amber-200/90">
                    This employee is currently the active Head of Department for{' '}
                    <strong className="text-white font-semibold">{impact.hodDepartment || department}</strong>.
                    TripleS policy requires HOD responsibilities to be reassigned to another active employee before deactivation can proceed.
                  </p>
                  <p className="text-[11px] text-amber-300/80">
                    Please use the <strong>Assign HOD</strong> action to transfer department leadership before deactivating this account.
                  </p>
                </div>
              )}

              {/* 2. Self-Deactivation Warning */}
              {impact.isSelf && !isCurrentlyInactive && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-rose-400 text-sm">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Self-Deactivation Not Permitted</span>
                  </div>
                  <p className="leading-relaxed">
                    You cannot deactivate your own administrative account. Another authorized administrator must perform this action.
                  </p>
                </div>
              )}

              {/* 3. Admin Account Protection */}
              {impact.isTargetAdmin && !impact.isSelf && !isCurrentlyInactive && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-rose-400 text-sm">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Privileged Administrator Account</span>
                  </div>
                  <p className="leading-relaxed">
                    This employee holds an active Administrator role. To safeguard system operations, revoke their administrative permissions before deactivating their account.
                  </p>
                </div>
              )}

              {/* Active Responsibilities Summary (Non-blocking warning) */}
              {!isCurrentlyInactive && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">Active Responsibilities & Workload</span>
                    <span className="text-[11px] text-[#A1A1AA]">Historical records preserved</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {/* Projects */}
                    <div className="bg-[#151516] border border-[#2A2A2A] rounded-lg p-2.5 flex flex-col">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-1">
                        <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Projects</span>
                      </div>
                      <span className="text-base font-bold text-white">
                        {impact.activeProjectsCount}
                      </span>
                      <span className="text-[10px] text-[#A1A1AA] truncate">Managed</span>
                    </div>

                    {/* Tasks */}
                    <div className="bg-[#151516] border border-[#2A2A2A] rounded-lg p-2.5 flex flex-col">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-1">
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Tasks</span>
                      </div>
                      <span className="text-base font-bold text-white">
                        {impact.activeTasksCount}
                      </span>
                      <span className="text-[10px] text-[#A1A1AA] truncate">Assigned</span>
                    </div>

                    {/* Pending Leaves */}
                    <div className="bg-[#151516] border border-[#2A2A2A] rounded-lg p-2.5 flex flex-col">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <span>Leaves</span>
                      </div>
                      <span className="text-base font-bold text-white">
                        {impact.pendingLeaveCount}
                      </span>
                      <span className="text-[10px] text-[#A1A1AA] truncate">Pending</span>
                    </div>

                    {/* Pending EOD */}
                    <div className="bg-[#151516] border border-[#2A2A2A] rounded-lg p-2.5 flex flex-col">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-1">
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        <span>EODs</span>
                      </div>
                      <span className="text-base font-bold text-white">
                        {impact.pendingEodCount}
                      </span>
                      <span className="text-[10px] text-[#A1A1AA] truncate">Pending review</span>
                    </div>
                  </div>

                  {/* Historical Preservation Assurance */}
                  <div className="flex items-start gap-2 bg-[#18181B] border border-[#2A2A2A] rounded-xl p-3 text-xs text-[#A1A1AA]">
                    <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <strong className="text-zinc-200">Data Preservation:</strong> Deactivation never deletes past records. EOD submissions, attendance, payroll history, and comments remain safely linked to employee ID <span className="text-white font-mono">{employeeId}</span>. Active tasks and projects should be reassigned manually.
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Reactivation Details Note */}
          {isCurrentlyInactive && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-300 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Reactivating ERP Access</span>
              </div>
              <p className="leading-relaxed text-emerald-200/90">
                Reactivating <strong className="text-white">{fullName}</strong> will restore their access to the ERP. Their Supabase authentication ban will be lifted immediately.
              </p>
              <p className="text-[11px] text-emerald-300/80">
                <strong>Note:</strong> Previous revoked sessions are not restored. The employee will be required to authenticate anew.
              </p>
            </div>
          )}

          {/* Reason Field */}
          <div className="space-y-1.5">
            <label htmlFor="deactivation-reason" className="text-xs font-semibold text-white">
              {isCurrentlyInactive ? 'Reactivation Note / Reason' : 'Deactivation Reason'}
              <span className="text-muted-foreground font-normal ml-1">(Optional)</span>
            </label>
            <textarea
              id="deactivation-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting || (!isCurrentlyInactive && !impact?.canDeactivate)}
              placeholder={
                isCurrentlyInactive
                  ? 'e.g. Return from leave, contract renewal, reinstatement...'
                  : 'e.g. Resignation, end of contract, sabbatical...'
              }
              className="w-full rounded-xl bg-[#0B0B0C] border border-[#2A2A2A] text-sm text-foreground p-3 focus:outline-none focus:border-zinc-500 placeholder:text-muted-foreground/50 transition-colors disabled:opacity-50"
            />
          </div>

          {/* Explicit Confirmation Checkbox (Required for Deactivation) */}
          {!isCurrentlyInactive && (
            <label className={cn(
              "flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-colors",
              isConfirmed
                ? "bg-rose-500/10 border-rose-500/35 text-white"
                : "bg-[#151516] border-[#2A2A2A] text-[#A1A1AA] hover:border-zinc-700",
              (!impact?.canDeactivate || isLoadingImpact) && "opacity-50 pointer-events-none"
            )}>
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                disabled={!impact?.canDeactivate || isSubmitting || isLoadingImpact}
                className="mt-0.5 h-4 w-4 rounded border-[#2A2A2A] text-rose-500 focus:ring-0 cursor-pointer accent-rose-600"
              />
              <span className="text-xs leading-relaxed text-zinc-300">
                I understand that deactivating <strong className="text-white font-semibold">{fullName}</strong> will revoke all active sessions immediately and prevent further ERP access until reactivated.
              </span>
            </label>
          )}

          {/* Action Error Message */}
          {actionError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/25 text-xs text-destructive flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{actionError}</span>
            </div>
          )}
        </div>

        {/* Footer Actions (Solid background, completely separate from scroll body) */}
        <div className="shrink-0 px-6 py-4 bg-[#0F0F10] border-t border-[#2A2A2A] flex flex-row items-center justify-end gap-3 z-10">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="bg-[#18181B] border-[#2A2A2A] text-[#A1A1AA] hover:text-white hover:bg-[#27272A] text-xs h-9 px-4 rounded-xl cursor-pointer transition-colors"
          >
            Cancel
          </Button>

          {isCurrentlyInactive ? (
            <Button
              type="submit"
              disabled={isSubmitting || isLoadingImpact}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-9 px-4 rounded-xl gap-2 shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Reactivating...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Reactivate Employee</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                isLoadingImpact ||
                !impact?.canDeactivate ||
                !isConfirmed
              }
              className={cn(
                "bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs h-9 px-5 rounded-xl gap-2 shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors",
                (!impact?.canDeactivate || !isConfirmed) && "hover:bg-rose-600"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deactivating...</span>
                </>
              ) : (
                <>
                  <UserX className="w-3.5 h-3.5" />
                  <span>Deactivate Employee</span>
                </>
              )}
            </Button>
          )}
        </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
