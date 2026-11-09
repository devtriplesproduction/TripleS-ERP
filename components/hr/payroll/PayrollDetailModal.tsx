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
import { ConfirmModal } from '@/components/ui/confirm-modal'
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
  SlidersHorizontal,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Calendar
} from 'lucide-react'
import { PayrollResult } from '@/lib/services/payroll.service'
import { formatDate, formatDateReadable } from '@/lib/utils/date'
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
  const [cancelTarget, setCancelTarget] = useState<{ id: string; type: string; amt: number } | null>(null)
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

    setCancelTarget({ id: deductionId, type, amt })
  }

  const confirmCancelDeduction = async () => {
    if (!cancelTarget) return
    const { id: deductionId, type } = cancelTarget
    setCancelTarget(null)
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
                  <Badge variant="outline" className="text-xs rounded-md border-border text-foreground gap-1 font-semibold">
                    <Lock className="h-3 w-3 text-muted-foreground" />
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
                  className="self-start sm:self-auto gap-1.5 text-xs rounded-md"
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
                  className="gap-1.5 text-xs rounded-md"
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
          <div className="bg-muted/40 border border-border rounded-lg p-3.5 text-xs text-foreground space-y-2 mt-2">
            <div className="flex items-center gap-2 font-semibold">
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
              <span>Prorated Payroll Period</span>
              <Badge variant="outline" className="text-[10px] rounded-sm text-muted-foreground border-border">
                {proration.eligibleWorkingDays} / {proration.scheduledWorkingDays} Working Days
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {proration.reason || `Active employment period: ${formatDate(proration.effectiveStartDate)} to ${formatDate(proration.effectiveEndDate)}. Absence deductions are only calculated within this window.`}
            </p>

            {proration.hikeSplits && proration.hikeSplits.length > 0 && (
              <div className="mt-2 space-y-1">
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                  Salary Revision Split Breakdown:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {proration.hikeSplits.map((split, i) => (
                    <div key={i} className="p-2 bg-background/80 rounded border border-border text-[11px] space-y-0.5">
                      <div className="flex justify-between font-medium">
                        <span>{formatDate(split.startDate)} → {formatDate(split.endDate)}</span>
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
                valueClass="font-semibold text-foreground"
              />
              <StatItem
                label="Employee Deductions (-)"
                value={`₹${(payroll.manualDeductions || 0).toFixed(2)}`}
                valueClass={`font-semibold ${(payroll.manualDeductions || 0) > 0 ? 'text-foreground' : 'text-muted-foreground'}`}
              />
              <StatItem label="Total Deductions (-)" value={`₹${payroll.totalDeductions.toFixed(2)}`} valueClass="font-bold text-foreground" />

              <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                <span className="font-bold text-sm sm:text-base text-foreground">Net Payable</span>
                <span className="text-base sm:text-lg font-bold text-foreground">₹{payroll.netPayable.toFixed(2)}</span>
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
              <StatItem label="Unpaid Leave Hrs" value={`${payroll.unpaidLeaveHours.toFixed(1)}h`} valueClass="text-muted-foreground" />
              <StatItem label="Paid Holidays Hrs" value={`${payroll.paidHolidayHours.toFixed(1)}h`} />
              <StatItem label="WFH Hours" value={`${payroll.wfhHours.toFixed(1)}h`} />

              <div className="mt-4 pt-4 border-t border-border space-y-1">
                {payroll.daysFullDay !== undefined && (
                  <StatItem label="Full Working Days (8h+)" value={payroll.daysFullDay.toString()} valueClass="text-foreground font-semibold" />
                )}
                <StatItem label="Half Days (4h-7h59m)" value={payroll.daysHalfDay.toString()} />
                <StatItem label="Unpaid Days (<4h)" value={payroll.daysUnpaidLeaveEod.toString()} valueClass="text-muted-foreground" />
                {payroll.daysAbsent !== undefined && payroll.daysAbsent > 0 && (
                  <StatItem label="Absent Days (Unexcused)" value={payroll.daysAbsent.toString()} valueClass="text-foreground font-semibold" />
                )}
                <StatItem
                  label="Comp Off Earned (Informational)"
                  value={`${(payroll.compOffMinutesEarned / 60).toFixed(1)} hrs (${payroll.compOffMinutesEarned} mins)`}
                  valueClass="text-foreground font-semibold"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Automated Reconciliation Audit Card */}
        {payroll.reconciliation && (
          <Card className="mt-4 bg-card/50 border-border">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-2 text-foreground">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                Automated Reconciliation Audit
              </CardTitle>
              <Badge
                variant="outline"
                className="text-xs rounded-md gap-1 font-semibold border-border text-foreground bg-muted/40"
              >
                {payroll.reconciliation.status === 'RECONCILED' ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    100% Reconciled
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3" />
                    Discrepancy Detected
                  </>
                )}
              </Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-border bg-background/50 space-y-1">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  Scheduled Working Days Baseline
                </span>
                <div className="flex justify-between text-muted-foreground">
                  <span>Payable Days:</span>
                  <span className="font-medium text-foreground">{payroll.reconciliation.payableDays} days</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Deducted Days:</span>
                  <span className="font-medium text-foreground">{payroll.reconciliation.deductedDays} days</span>
                </div>
                <div className="pt-1 border-t border-border/50 flex justify-between font-semibold">
                  <span>Total Accounted:</span>
                  <span className="text-foreground">{payroll.reconciliation.payableDays + payroll.reconciliation.deductedDays} / {payroll.reconciliation.scheduledWorkingDays} scheduled days</span>
                </div>
                <div className="pt-1 text-[10px] text-muted-foreground flex justify-between">
                  <span>Divisor Policy:</span>
                  <span className="font-mono text-foreground">
                    {payroll.reconciliation.divisorMode === 'fixed_26' ? 'Fixed (26 Days)' : `Mon–Sat (${payroll.reconciliation.scheduledWorkingDays} Days)`}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-background/50 space-y-1">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                  Financial Baseline Reconciliation
                </span>
                <div className="flex justify-between text-muted-foreground">
                  <span>Net Payable:</span>
                  <span className="font-medium text-foreground">₹{payroll.reconciliation.netPayable.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Deductions:</span>
                  <span className="font-medium text-foreground">₹{payroll.reconciliation.totalDeductions.toFixed(2)}</span>
                </div>
                <div className="pt-1 border-t border-border/50 flex justify-between font-semibold">
                  <span>Reconciled Sum:</span>
                  <span className="text-foreground">₹{(payroll.reconciliation.netPayable + payroll.reconciliation.totalDeductions).toFixed(2)} / ₹{payroll.reconciliation.baseSalary.toFixed(2)}</span>
                </div>
                <div className="pt-1 text-[10px] text-muted-foreground flex justify-between">
                  <span>Daily Rate:</span>
                  <span className="font-mono text-foreground">
                    ₹{(payroll.reconciliation.dailyRate || (payroll.salary / (payroll.reconciliation.scheduledWorkingDays || 26))).toFixed(2)}/day
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Date-wise Payroll Calculation Breakdown (31 Days) */}
        {payroll.dailyBreakdown && payroll.dailyBreakdown.length > 0 && (
          <Card className="mt-4 bg-card/50 border-border">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-2 text-foreground">
                <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                Date-wise Calculation Breakdown ({payroll.dailyBreakdown.length} Days)
              </CardTitle>
              <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground rounded-sm">
                {payroll.dailyBreakdown.filter(d => d.payableFraction > 0).length} Payable Days · {payroll.dailyBreakdown.filter(d => d.deductionDays > 0).length} Deducted Days
              </Badge>
            </CardHeader>
            <CardContent className="p-0 sm:p-4">
              <div className="overflow-x-auto max-h-[340px] overflow-y-auto border-t sm:border border-border rounded-none sm:rounded-lg">
                <table className="w-full text-[11px] sm:text-xs">
                  <thead className="bg-muted/70 sticky top-0 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2 px-3 text-left">Date</th>
                      <th className="py-2 px-2 text-left">Day</th>
                      <th className="py-2 px-3 text-left">Activity / Classification</th>
                      <th className="py-2 px-2 text-right">Logged</th>
                      <th className="py-2 px-2 text-right">Payable</th>
                      <th className="py-2 px-2 text-right">Pay Frac</th>
                      <th className="py-2 px-2 text-right">Credit (₹)</th>
                      <th className="py-2 px-2 text-right">Deduct (₹)</th>
                      <th className="py-2 px-2 text-right">Comp-Off</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {payroll.dailyBreakdown.map(d => (
                      <tr key={d.date} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap">{formatDate(d.date)}</td>
                        <td className="py-2 px-2 text-muted-foreground">{d.dayOfWeek}</td>
                        <td className="py-2 px-3 max-w-[220px] truncate" title={d.activity + (d.notes ? ` - ${d.notes}` : '')}>
                          <span className="font-medium text-foreground">{d.activity}</span>
                          {d.notes && <span className="text-[10px] text-muted-foreground block truncate">{d.notes}</span>}
                        </td>
                        <td className="py-2 px-2 text-right font-mono">{d.officeHoursLogged > 0 ? `${d.officeHoursLogged}h` : '-'}</td>
                        <td className="py-2 px-2 text-right font-mono">{d.payableWorkedHours > 0 ? `${d.payableWorkedHours}h` : '-'}</td>
                        <td className="py-2 px-2 text-right font-mono font-medium">
                          {d.payableFraction > 0 ? (
                            <span className="text-foreground">{d.payableFraction}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-medium text-foreground">
                          {d.salaryCredit > 0 ? `₹${d.salaryCredit.toFixed(2)}` : '-'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-medium text-muted-foreground">
                          {d.deductionAmount > 0 ? `-₹${d.deductionAmount.toFixed(2)}` : '-'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono">
                          {d.compOffMinutesEarned > 0 ? (
                            <span className="text-foreground font-semibold">{d.compOffMinutesEarned}m ({(d.compOffMinutesEarned / 60).toFixed(1)}h)</span>
                          ) : '-'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Badge
                            variant="outline"
                            className="text-[10px] rounded-sm px-1.5 py-0 font-medium border-border text-muted-foreground bg-muted/40"
                          >
                            {d.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Employee Specific Deductions Breakdown */}
        <Card className="mt-4 bg-card/50 border-border">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-2 text-foreground">
              <MinusCircle className="h-4 w-4 text-muted-foreground" />
              Employee-Specific Deductions ({activeDeductions.length})
            </CardTitle>
            {activeDeductions.length > 0 && (
              <span className="text-xs font-semibold text-foreground">
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
                        <span className="font-bold text-foreground text-sm">
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
                        className="self-end sm:self-center h-8 text-muted-foreground hover:text-foreground hover:bg-muted px-2 text-xs gap-1 rounded-md"
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
              <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90 font-medium shadow-xs rounded-md" onClick={handleApplyAdjustment} disabled={adjusting}>
                {adjusting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Save Audited Adjustment
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
      <ConfirmModal
        open={!!cancelTarget}
        title="Cancel Payroll Deduction"
        description={`Are you sure you want to cancel the ${cancelTarget?.type} deduction of ₹${cancelTarget?.amt.toFixed(2)}?`}
        confirmText="Cancel Deduction"
        cancelText="Keep"
        variant="destructive"
        onConfirm={confirmCancelDeduction}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      />
    </Dialog>
  )
}
