'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Clock,
  Wallet,
  LayoutList,
  MinusCircle,
  Plus,
  Trash2,
  Loader2,
  Tag,
  Lock,
  CalendarCheck,
  TrendingUp,
  SlidersHorizontal
} from 'lucide-react'
import { PayrollResult } from '@/lib/services/payroll.service'
import { cancelPayrollDeductionAction, adjustMonthlyPayrollAction } from '@/lib/actions/payroll'
import { useToast } from '@/hooks/use-toast'

interface PayrollDetailModalProps {
  isOpen: boolean
  onClose: () => void
  payroll: PayrollResult | null
  isFinalizedCycle?: boolean
  onAddDeductionClick?: (employeeId: string) => void
  onDeductionsUpdated?: () => void
}

export function PayrollDetailModal({
  isOpen,
  onClose,
  payroll,
  isFinalizedCycle = false,
  onAddDeductionClick,
  onDeductionsUpdated,
}: PayrollDetailModalProps) {
  const { toast } = useToast()
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [isAdjustOpen, setIsAdjustOpen] = useState(false)
  const [adjustAmount, setAdjustAmount] = useState<string>('')
  const [adjustReason, setAdjustReason] = useState<string>('')
  const [adjusting, setAdjusting] = useState(false)

  if (!payroll) return null

  const isLocked = isFinalizedCycle || Boolean(payroll.isLocked)

  const handleCancelDeduction = async (deductionId: string, type: string, amt: number) => {
    if (isLocked) {
      toast({
        title: 'Cycle Locked',
        description: 'Cannot cancel deduction on a finalized payroll cycle. Use an audited adjustment instead.',
        variant: 'destructive'
      })
      return
    }

    if (!confirm(`Are you sure you want to cancel the ${type} deduction of ₹${amt.toFixed(2)}?`)) {
      return
    }

    setCancellingId(deductionId)
    try {
      const res = await cancelPayrollDeductionAction(deductionId)
      if (res.success) {
        toast({
          title: 'Deduction Cancelled',
          description: `Successfully removed ${type} deduction.`,
        })
        if (onDeductionsUpdated) {
          onDeductionsUpdated()
        }
      } else {
        toast({
          title: 'Error',
          description: res.error || 'Failed to cancel deduction.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'An error occurred.',
        variant: 'destructive',
      })
    } finally {
      setCancellingId(null)
    }
  }

  const handleApplyAdjustment = async () => {
    const numAmt = Number(adjustAmount)
    if (!Number.isFinite(numAmt) || numAmt === 0) {
      toast({ title: 'Validation Error', description: 'Enter a valid non-zero adjustment amount (positive or negative).', variant: 'destructive' })
      return
    }
    if (!adjustReason || adjustReason.trim().length < 3) {
      toast({ title: 'Validation Error', description: 'Adjustment reason must be at least 3 characters.', variant: 'destructive' })
      return
    }

    setAdjusting(true)
    try {
      const currentYear = new Date().getFullYear()
      const currentMonth = new Date().getMonth() + 1
      const res = await adjustMonthlyPayrollAction(
        currentYear,
        currentMonth,
        payroll.employeeId,
        numAmt,
        adjustReason.trim()
      )

      if (res.success) {
        toast({ title: 'Adjustment Applied', description: `Adjusted net payable by ₹${numAmt.toFixed(2)}` })
        setIsAdjustOpen(false)
        setAdjustAmount('')
        setAdjustReason('')
        if (onDeductionsUpdated) onDeductionsUpdated()
      } else {
        toast({ title: 'Adjustment Failed', description: res.error || 'Failed to apply adjustment', variant: 'destructive' })
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setAdjusting(false)
    }
  }

  const StatItem = ({ label, value, valueClass = "font-semibold" }: { label: string, value: React.ReactNode, valueClass?: string }) => (
    <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-0 gap-2">
      <span className="text-xs sm:text-sm text-muted-foreground">{label}</span>
      <span className={`text-xs sm:text-sm ${valueClass}`}>{value}</span>
    </div>
  )

  const activeDeductions = (payroll.deductionsList || []).filter(d => d.status === 'ACTIVE')
  const proration = payroll.prorationDetail

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-4xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto p-4 sm:p-6 bg-card border-border">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
                <LayoutList className="h-5 w-5 shrink-0 text-foreground" />
                <span className="truncate">Payroll Detail: {payroll.name}</span>
                {isLocked && (
                  <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-600 dark:text-emerald-400 gap-1 font-semibold">
                    <Lock className="h-3 w-3" />
                    Locked Snapshot
                  </Badge>
                )}
              </DialogTitle>
              <div className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                {payroll.department} | ID: {payroll.employeeId.slice(0, 8).toUpperCase()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isLocked && onAddDeductionClick && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onClose()
                    onAddDeductionClick(payroll.employeeId)
                  }}
                  className="self-start sm:self-auto gap-1.5 text-xs text-rose-500 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Deduction
                </Button>
              )}
              {isLocked && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAdjustOpen(true)}
                  className="gap-1.5 text-xs"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Audited Adjustment
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Proration Detail Card (if employee joined/left mid-month or had a hike) */}
        {proration && proration.isProrated && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3.5 text-xs text-amber-900 dark:text-amber-200 space-y-2 mt-2">
            <div className="flex items-center gap-2 font-semibold">
              <CalendarCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>Prorated Payroll Period</span>
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500">
                {proration.eligibleWorkingDays} / {proration.scheduledWorkingDays} Working Days
              </Badge>
            </div>
            <p className="text-muted-foreground dark:text-amber-300/80">
              {proration.reason || `Active employment period: ${proration.effectiveStartDate} to ${proration.effectiveEndDate}. Absence deductions are only calculated within this window.`}
            </p>

            {proration.hikeSplits && proration.hikeSplits.length > 0 && (
              <div className="mt-2 space-y-1">
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  Salary Revision Split Breakdown:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {proration.hikeSplits.map((split, i) => (
                    <div key={i} className="p-2 bg-background/80 rounded border border-border text-[11px] space-y-0.5">
                      <div className="flex justify-between font-medium">
                        <span>{split.startDate} → {split.endDate}</span>
                        <span className="font-bold text-foreground">₹{split.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="text-muted-foreground flex justify-between">
                        <span>Rate: ₹{split.rate.toLocaleString('en-IN')}/mo</span>
                        <span>{split.workingDays} working days</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-2">
          {/* Salary Breakdown */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-2 text-foreground">
                <Wallet className="h-4 w-4" />
                Financial Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <StatItem label="Applicable Base Pay" value={`₹${payroll.salary.toFixed(2)}`} />
              <StatItem label="Cash Overtime" value="₹0.00 (All OT → Comp-Off)" valueClass="font-medium text-muted-foreground" />
              <StatItem
                label="Attendance Deduction (-)"
                value={`₹${(payroll.attendanceDeduction ?? payroll.unpaidLeaveDeduction).toFixed(2)}`}
                valueClass="font-semibold text-rose-500"
              />
              <StatItem
                label="Employee Deductions (-)"
                value={`₹${(payroll.manualDeductions || 0).toFixed(2)}`}
                valueClass={`font-semibold ${(payroll.manualDeductions || 0) > 0 ? 'text-rose-500' : 'text-muted-foreground'}`}
              />
              <StatItem label="Total Deductions (-)" value={`₹${payroll.totalDeductions.toFixed(2)}`} valueClass="font-bold text-rose-500" />

              <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                <span className="font-bold text-sm sm:text-base text-foreground">Net Payable</span>
                <span className="text-base sm:text-lg font-bold text-emerald-400">₹{payroll.netPayable.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Time & Attendance */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-2 text-foreground">
                <Clock className="h-4 w-4" />
                Time & Attendance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <StatItem label="Standard Expected Hrs" value={`${payroll.standardHours.toFixed(1)}h`} />
              <StatItem label="Actual Worked Hrs" value={`${payroll.actualWorkedHours.toFixed(1)}h`} />
              <StatItem label="Paid Leave Credited Hrs" value={`${payroll.creditedLeaveHours.toFixed(1)}h`} />
              <StatItem label="Unpaid Leave Hrs" value={`${payroll.unpaidLeaveHours.toFixed(1)}h`} valueClass="text-rose-500" />
              <StatItem label="Paid Holidays Hrs" value={`${payroll.paidHolidayHours.toFixed(1)}h`} />
              <StatItem label="WFH Hours" value={`${payroll.wfhHours.toFixed(1)}h`} />

              <div className="mt-4 pt-4 border-t border-border space-y-1">
                <StatItem label="Half Days (4h-7h59m)" value={payroll.daysHalfDay.toString()} />
                <StatItem label="Unpaid Days (<4h)" value={payroll.daysUnpaidLeaveEod.toString()} valueClass="text-rose-500" />
                <StatItem
                  label="Comp Off Earned (Informational)"
                  value={`${(payroll.compOffMinutesEarned / 60).toFixed(1)} hrs (${payroll.compOffMinutesEarned} mins)`}
                  valueClass="text-emerald-500 font-semibold"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employee Specific Deductions Breakdown */}
        <Card className="mt-4 bg-card/50 border-border">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-2 text-foreground">
              <MinusCircle className="h-4 w-4 text-rose-500" />
              Employee-Specific Deductions ({activeDeductions.length})
            </CardTitle>
            {activeDeductions.length > 0 && (
              <span className="text-xs font-semibold text-rose-500">
                Total: -₹{(payroll.manualDeductions || 0).toFixed(2)}
              </span>
            )}
          </CardHeader>
          <CardContent>
            {activeDeductions.length === 0 ? (
              <div className="text-center py-6 text-xs sm:text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                No custom deductions recorded for this employee this month.
              </div>
            ) : (
              <div className="space-y-2">
                {activeDeductions.map(d => (
                  <div
                    key={d.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border bg-background/50 gap-2 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          {d.deduction_type}
                        </span>
                        <span className="font-bold text-rose-500 text-sm">
                          -₹{Number(d.amount).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground/80">Reason:</span> {d.reason}
                      </p>
                      {d.notes && (
                        <p className="text-muted-foreground/80 italic text-[11px]">
                          Note: {d.notes}
                        </p>
                      )}
                    </div>
                    {!isLocked && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCancelDeduction(d.id, d.deduction_type, Number(d.amount))}
                        disabled={cancellingId === d.id}
                        className="self-end sm:self-center h-8 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 px-2 text-xs gap-1"
                      >
                        {cancellingId === d.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Cancel
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audited Adjustment Sub-Modal */}
        {isAdjustOpen && (
          <div className="mt-4 p-4 border border-border rounded-lg bg-muted/40 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Audited Payroll Adjustment (Finalized Snapshot)
            </h4>
            <p className="text-xs text-muted-foreground">
              Direct edits to finalized snapshots are prohibited. Adjustments create an auditable transaction trace on this record.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Adjustment Amount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="+500 or -500"
                  value={adjustAmount}
                  onChange={e => setAdjustAmount(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Audit Reason</Label>
                <Input
                  type="text"
                  placeholder="e.g. Retroactive bonus or missing reimbursement"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={() => setIsAdjustOpen(false)} disabled={adjusting}>
                Cancel
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleApplyAdjustment} disabled={adjusting}>
                {adjusting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Save Audited Adjustment
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
