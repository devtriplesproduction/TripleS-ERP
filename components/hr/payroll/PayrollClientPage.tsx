'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  IndianRupee,
  Clock,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Download,
  CreditCard,
  Plus,
  Lock,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Calculator
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  getMonthlyPayrollAction,
  finalizeMonthlyPayrollAction
} from '@/lib/actions/payroll'
import { PayrollDetailModal } from './PayrollDetailModal'
import { AddDeductionModal } from './AddDeductionModal'
import { PayrollResult } from '@/lib/services/payroll.service'
import {
  getCalendarDaysInMonth,
  getSundaysCountInMonth,
  getStandardWorkingDaysInMonth
} from '@/lib/utils/time'
import { PageHeader } from '@/components/PageHeader'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface PayrollData extends PayrollResult {
  isLocked?: boolean
}

export function PayrollClientPage({ title, initialEmployees = [] }: { title: string, initialEmployees?: any[] }) {
  const [employees] = useState<any[]>(initialEmployees)
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [calculationError, setCalculationError] = useState<string | null>(null)
  const [calculationTime, setCalculationTime] = useState<number | null>(null)
  const [payrollResults, setPayrollResults] = useState<PayrollData[]>([])
  const [isFinalized, setIsFinalized] = useState(false)
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedPayroll, setSelectedPayroll] = useState<any | null>(null)
  const [isAddDeductionOpen, setIsAddDeductionOpen] = useState(false)
  const [preselectedEmpId, setPreselectedEmpId] = useState<string | undefined>(undefined)

  const { toast } = useToast()

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  // Dynamic calendar working days standard in Asia/Kolkata (Monday–Saturday standard)
  // Divisor = Total calendar days in selected month - Number of Sundays
  const calendarDays = getCalendarDaysInMonth(year, month);
  const sundaysCount = getSundaysCountInMonth(year, month);
  const dynamicDivisor = getStandardWorkingDaysInMonth(year, month);

  const loadPayroll = useCallback(async (showToast: boolean = false) => {
    setCalculating(true)
    const start = performance.now()
    try {
      const result = await getMonthlyPayrollAction(year, month);
      const duration = Math.round(performance.now() - start);
      setCalculationTime(duration);
      if (result.success && result.data) {
        setCalculationError(null);
        setIsFinalized(Boolean(result.isFinalized));
        setPayrollResults(result.data.map((d: any) => ({
          ...d,
          isLocked: Boolean(result.isFinalized || d.isLocked)
        })));

        if (selectedPayroll) {
          const updated = result.data.find((d: any) => d.employeeId === selectedPayroll.employeeId);
          if (updated) setSelectedPayroll(updated);
        }

        if (showToast) {
          if (result.data.length === 0) {
            toast({
              title: 'No Eligible Employees',
              description: `No eligible employees found for ${months[month - 1]} ${year}.`,
              variant: 'destructive'
            });
          } else {
            const warningCount = result.data.filter((r: any) => r.hasMissingSalary || r.calculationError).length;
            toast({
              title: result.isFinalized
                ? 'Snapshot Loaded'
                : warningCount > 0
                  ? 'Draft Calculated with Warnings'
                  : 'Calculation Completed',
              description: result.isFinalized
                ? `Loaded locked payroll snapshot for ${months[month - 1]} ${year}`
                : `Processed ${result.data.length} employees${warningCount > 0 ? ` (${warningCount} require attention)` : ''} in ${duration}ms for ${months[month - 1]} ${year}`
            });
          }
        }
      } else {
        throw new Error(result.error || 'Payroll calculation failed.');
      }
    } catch (error: any) {
      setCalculationError(error.message);
      toast({ title: 'Payroll Calculation Error', description: error.message, variant: 'destructive' })
    } finally {
      setCalculating(false)
    }
  }, [year, month, selectedPayroll, toast, months]);

  useEffect(() => {
    loadPayroll(false);
  }, [year, month]);

  const handleFinalizePayroll = async () => {
    setFinalizing(true);
    try {
      const res = await finalizeMonthlyPayrollAction(year, month);
      if (res.success) {
        toast({
          title: 'Payroll Finalized',
          description: `Successfully locked historical snapshot for ${months[month - 1]} ${year}.`
        });
        setIsFinalizeModalOpen(false);
        await loadPayroll(false);
      } else {
        toast({
          title: 'Finalization Failed',
          description: res.error || 'Could not finalize payroll.',
          variant: 'destructive'
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'An unexpected error occurred.',
        variant: 'destructive'
      });
    } finally {
      setFinalizing(false);
    }
  };

  const handleExportCSV = () => {
    if (payrollResults.length === 0) return;
    const headers = [
      'Employee Name', 'Department', 'Monthly Base (₹)', 'Divisor Policy', 'Divisor Days', 'Daily Rate (₹)',
      'Scheduled Days', 'Payable Days', 'Deducted Days', 'Standard Hrs',
      'Worked Hrs', 'Credited Leave Hrs', 'Paid Holiday Hrs', 'Full Days (8h+)', 'Half Days',
      'Unpaid Days (<4h)', 'Absent Days', 'Comp-Off Earned (mins)', 'Attendance Deduction (₹)',
      'Custom Deductions (₹)', 'Total Deductions (₹)', 'Gross Pay (₹)', 'Net Payable (₹)', 'Status'
    ];

    const currentDivisor = isFinalized && payrollResults[0]?.reconciliation?.divisorDays
      ? payrollResults[0].reconciliation.divisorDays
      : dynamicDivisor;

    const rows = payrollResults.map(r => [
      `"${r.name || ''}"`,
      `"${r.department || ''}"`,
      r.salary || 0,
      r.reconciliation?.divisorMode === 'fixed_26' ? 'Fixed (26 Days)' : 'Dynamic Mon–Sat',
      r.reconciliation?.divisorDays || currentDivisor,
      r.reconciliation?.dailyRate || (r.salary ? Number((r.salary / currentDivisor).toFixed(2)) : 0),
      r.reconciliation?.scheduledWorkingDays || 0,
      r.reconciliation?.payableDays || 0,
      r.reconciliation?.deductedDays || 0,
      r.standardHours || 0,
      r.actualWorkedHours || 0,
      r.creditedLeaveHours || 0,
      r.paidHolidayHours || 0,
      r.daysFullDay || 0,
      r.daysHalfDay || 0,
      r.daysUnpaidLeaveEod || 0,
      r.daysAbsent || 0,
      r.compOffMinutesEarned || 0,
      r.unpaidLeaveDeduction || r.attendanceDeduction || 0,
      r.manualDeductions || 0,
      r.totalDeductions || 0,
      r.grossPay || 0,
      r.netPayable || 0,
      isFinalized ? 'FINALIZED' : 'DRAFT'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payroll-report-${months[month - 1]}-${year}-${isFinalized ? 'finalized' : 'draft'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Report Exported', description: `Saved payroll-report-${months[month - 1]}-${year}.csv` });
  };

  const handlePrevMonth = () => {
    let newM = month - 1
    let newY = year
    if (newM < 1) { newM = 12; newY -= 1 }
    setMonth(newM)
    setYear(newY)
    setPayrollResults([])
  }

  const handleNextMonth = () => {
    let newM = month + 1
    let newY = year
    if (newM > 12) { newM = 1; newY += 1 }
    setMonth(newM)
    setYear(newY)
    setPayrollResults([])
  }

  // Ensure all employees have resolved names and departments
  const resolvedEmployees = React.useMemo(() => {
    const map = new Map<string, any>()
    for (const emp of employees) {
      map.set(emp.id, { ...emp })
    }
    for (const res of payrollResults) {
      if (!map.has(res.employeeId)) {
        map.set(res.employeeId, {
          id: res.employeeId,
          first_name: res.name?.split(' ')[0] || res.name,
          last_name: res.name?.split(' ').slice(1).join(' ') || '',
          department: res.department,
          name: res.name,
        })
      } else {
        const existing = map.get(res.employeeId)
        if (!existing.first_name && res.name) {
          existing.first_name = res.name.split(' ')[0]
          existing.last_name = res.name.split(' ').slice(1).join(' ')
          existing.name = res.name
        }
        if (!existing.department && res.department) {
          existing.department = res.department
        }
      }
    }
    return Array.from(map.values())
  }, [employees, payrollResults])

  const unresolvedWarnings = React.useMemo(() => {
    return payrollResults.filter(r => r.hasMissingSalary || r.calculationError);
  }, [payrollResults]);

  const hasUnresolvedErrors = unresolvedWarnings.length > 0;

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title={title}
        subtitle="Calculate, review, and finalize employee monthly payroll."
        icon={CreditCard}
        actions={
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Dynamic Divisor Badge */}
            <Badge
              variant="outline"
              className="px-2.5 py-1 text-xs border border-border bg-muted/40 flex items-center gap-1.5 font-medium"
              title={`Dynamic Divisor: ${isFinalized && payrollResults[0]?.reconciliation?.divisorDays ? payrollResults[0].reconciliation.divisorDays : dynamicDivisor} Days (${calendarDays} calendar days − ${sundaysCount} Sundays in Asia/Kolkata)`}
            >
              <Calculator className="h-3.5 w-3.5 text-primary" />
              <span className="text-muted-foreground">Divisor:</span>
              <span className="font-semibold text-foreground">
                {isFinalized && payrollResults[0]?.reconciliation?.divisorDays
                  ? payrollResults[0].reconciliation.divisorDays
                  : dynamicDivisor}{' '}
                Days
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                ({calendarDays}d − {sundaysCount} Sun)
              </span>
            </Badge>

            <Badge
              variant={isFinalized ? "default" : "secondary"}
              className={`px-3 py-1 font-semibold text-xs flex items-center gap-1.5 ${
                isFinalized
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
              }`}
            >
              {isFinalized ? (
                <>
                  <Lock className="h-3 w-3" />
                  FINALIZED
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3" />
                  DRAFT PREVIEW
                </>
              )}
            </Badge>

            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-full border border-border shadow-sm shrink-0 self-start sm:self-auto">
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-background hover:shadow-sm transition-all" onClick={handlePrevMonth} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="font-semibold text-xs sm:text-sm px-2 text-center flex items-center justify-center gap-2 text-foreground tracking-tight whitespace-nowrap">
                <Calendar className="h-4 w-4 text-muted-foreground/70" />
                {months[month - 1]} {year}
              </div>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-background hover:shadow-sm transition-all" onClick={handleNextMonth} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        }
      />

      {calculationError && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 p-4 text-rose-800 dark:text-rose-300 flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <div>
              <p className="font-semibold">Payroll Calculation Error</p>
              <p className="text-xs opacity-90">{calculationError}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-rose-400 text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900"
            onClick={() => loadPayroll(true)}
          >
            Retry Calculation
          </Button>
        </div>
      )}

      {unresolvedWarnings.length > 0 && !isFinalized && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-4 text-amber-800 dark:text-amber-300 space-y-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{unresolvedWarnings.length} Employee Calculation Warning{unresolvedWarnings.length > 1 ? 's' : ''} Require Attention</span>
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1 text-xs">
            {unresolvedWarnings.map((w, idx) => (
              <li key={idx}>
                <span className="font-semibold">{w.name} ({w.employeeIdNumber || 'No ID'})</span>: {w.validationWarning || w.calculationError || 'Missing salary structure'}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground pt-1">
            Finalize Payroll is disabled until compensation structures are configured.
          </p>
        </div>
      )}

      {isFinalized && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 text-emerald-800 dark:text-emerald-300 flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="font-semibold">This payroll cycle is finalized and locked.</p>
              <p className="text-xs opacity-90">Historical snapshot is immutable. All figures and payslips are locked to preserved records.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Eligible Employees</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold flex items-baseline gap-2">
              <span>{payrollResults.length > 0 ? payrollResults.filter(r => r.hasPayrollData).length : employees.length}</span>
              {unresolvedWarnings.length > 0 && (
                <span className="text-xs font-normal text-amber-600 dark:text-amber-400">
                  ({unresolvedWarnings.length} warning{unresolvedWarnings.length > 1 ? 's' : ''})
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Payout</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              ₹{payrollResults.filter((r: any) => r.hasPayrollData).reduce((sum, res) => sum + (res.netPayable || 0), 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Monthly Divisor</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold flex items-baseline gap-1.5">
              <span>
                {isFinalized && payrollResults[0]?.reconciliation?.divisorDays
                  ? payrollResults[0].reconciliation.divisorDays
                  : dynamicDivisor}{' '}
                Days
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                ({calendarDays} − {sundaysCount} Sundays)
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              Daily Rate = Base Salary / {isFinalized && payrollResults[0]?.reconciliation?.divisorDays ? payrollResults[0].reconciliation.divisorDays : dynamicDivisor} days
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col justify-center gap-2">
          {!isFinalized ? (
            <div className="flex items-center gap-2 h-full">
              <Button
                size="lg"
                variant="outline"
                className="flex-1 h-11 text-xs sm:text-sm font-semibold"
                onClick={() => loadPayroll(true)}
                disabled={loading || calculating}
                aria-label="Calculate Monthly Payroll"
                title="Calculate Monthly Payroll"
              >
                {calculating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-1.5 h-4 w-4" />}
                {calculating ? 'Calculating...' : 'Recalculate'}
              </Button>
              <Button
                size="lg"
                className="flex-1 h-11 text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setIsFinalizeModalOpen(true)}
                disabled={loading || calculating || payrollResults.length === 0 || hasUnresolvedErrors}
                title={hasUnresolvedErrors ? 'Resolve all employee calculation warnings before finalizing' : undefined}
              >
                <Lock className="mr-1.5 h-4 w-4" />
                Finalize
              </Button>
            </div>
          ) : (
            <div className="w-full h-11 rounded-md bg-muted/50 border border-border flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground font-medium">
              <Lock className="h-4 w-4 text-emerald-500" />
              Locked Historical Payroll
            </div>
          )}
        </div>
      </div>

      <Card className="w-full min-w-0 overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Payroll Overview</CardTitle>
            {calculationTime !== null && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {isFinalized ? 'Snapshot loaded in' : 'Batch calculated in'} {calculationTime}ms
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {!isFinalized && (
              <Button
                size="sm"
                onClick={() => {
                  setPreselectedEmpId(undefined)
                  setIsAddDeductionOpen(true)
                }}
                className="h-8 gap-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Deduction
              </Button>
            )}
            {payrollResults.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="h-8 gap-1.5 text-xs font-medium"
              >
                <Download className="h-3.5 w-3.5" />
                Export Report (Excel)
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {loading || calculating ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : payrollResults.length === 0 ? (
            <div className="text-center p-8 text-sm text-muted-foreground">
              Click &quot;Recalculate Draft&quot; to generate data for {months[month - 1]} {year}.
            </div>
          ) : (
            <>
              {/* Desktop Table View (>= 768px) */}
              <div className="hidden md:block relative overflow-x-auto min-w-0">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3">Employee Name</th>
                      <th className="px-4 py-3 text-right">Standard</th>
                      <th className="px-4 py-3 text-right">Worked</th>
                      <th className="px-4 py-3 text-right">Leaves</th>
                      <th className="px-4 py-3 text-right">Half Days</th>
                      <th className="px-4 py-3 text-right">Base Salary (₹)</th>
                      <th className="px-4 py-3 text-right">Deduction (₹)</th>
                      <th className="px-5 py-3 text-right">Net Payable (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollResults.map((res: any) => (
                      <tr
                        key={res.employeeId}
                        className="border-b border-border hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedPayroll(res)}
                      >
                        <td className="px-5 py-4 font-medium">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-foreground">{res.name}</span>
                            {res.isLocked && (
                              <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                            )}
                            {res.hasMissingSalary && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-rose-600 border-rose-400 bg-rose-50/50">
                                Missing Salary
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{res.department}</span>
                            {res.prorationDetail?.isProrated && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-amber-600 border-amber-400">
                                Prorated
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right text-muted-foreground">{res.standardHours}h</td>
                        <td className="px-4 py-4 text-right">{res.hasPayrollData ? `${res.actualWorkedHours}h` : '—'}</td>
                        <td className="px-4 py-4 text-right text-muted-foreground">
                          {res.hasPayrollData ? `${res.creditedLeaveHours}h` : '—'}
                        </td>
                        <td className="px-4 py-4 text-right font-medium">{res.hasPayrollData ? res.daysHalfDay : '—'}</td>
                        <td className="px-4 py-4 text-right font-medium text-foreground whitespace-nowrap">
                          {res.hasMissingSalary ? (
                            <span className="text-xs text-rose-500 font-normal">Not Set</span>
                          ) : (
                            `₹${Number(res.salary || 0).toFixed(2)}`
                          )}
                        </td>
                        <td className="px-4 py-4 text-right text-rose-500 font-medium whitespace-nowrap">
                          {res.totalDeductions > 0 ? (
                            <div className="flex flex-col items-end">
                              <span>-₹{Number(res.totalDeductions).toFixed(2)}</span>
                              {res.manualDeductions > 0 && (
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  (incl. ₹{Number(res.manualDeductions).toFixed(2)} custom)
                                </span>
                              )}
                            </div>
                          ) : res.hasPayrollData ? (
                            '₹0.00'
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-foreground whitespace-nowrap">
                          {res.hasMissingSalary ? (
                            <span className="text-xs text-rose-500 font-semibold">Setup Required</span>
                          ) : res.hasPayrollData ? (
                            `₹${Number(res.netPayable).toFixed(2)}`
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Employee Payroll Cards (< 768px) */}
              <div className="block md:hidden divide-y divide-border">
                {payrollResults.map((res: any) => (
                  <div
                    key={res.employeeId}
                    className="p-4 hover:bg-muted/30 transition-colors cursor-pointer space-y-3"
                    onClick={() => setSelectedPayroll(res)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-foreground text-base leading-tight">{res.name}</h4>
                          {res.isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                          {res.hasMissingSalary && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-rose-600 border-rose-400 bg-rose-50/50">
                              Missing Salary
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{res.department || 'Employee'}</p>
                      </div>
                      <span className="text-xs font-bold text-foreground bg-muted px-2.5 py-1 rounded-md shrink-0">
                        {res.hasMissingSalary ? (
                          <span className="text-rose-500">Setup Required</span>
                        ) : res.hasPayrollData ? (
                          `₹${Number(res.netPayable).toFixed(2)}`
                        ) : (
                          'No Data'
                        )}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 p-3 rounded-lg border border-border/50">
                      <div>
                        <span className="text-muted-foreground">Standard: </span>
                        <span className="font-medium text-foreground">{res.standardHours}h</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Worked: </span>
                        <span className="font-medium text-foreground">{res.hasPayrollData ? `${res.actualWorkedHours}h` : '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Half Days: </span>
                        <span className="font-medium text-foreground">{res.hasPayrollData ? res.daysHalfDay : '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Unpaid (&lt;4h): </span>
                        <span className="font-medium text-rose-500">{res.hasPayrollData ? res.daysUnpaidLeaveEod : '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Base Salary: </span>
                        <span className="font-medium text-foreground">
                          {res.hasMissingSalary ? 'Not Set' : `₹${Number(res.salary || 0).toFixed(2)}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Deductions: </span>
                        <span className="font-medium text-rose-500">
                          {res.totalDeductions > 0
                            ? `-₹${Number(res.totalDeductions).toFixed(2)}`
                            : res.hasPayrollData
                            ? '₹0.00'
                            : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-semibold text-foreground">Net Payable:</span>
                      <span className="text-sm font-bold text-foreground">
                        {res.hasMissingSalary ? (
                          <span className="text-xs text-rose-500 font-semibold">Setup Required</span>
                        ) : res.hasPayrollData ? (
                          `₹${Number(res.netPayable).toFixed(2)}`
                        ) : (
                          '—'
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <PayrollDetailModal
        isOpen={!!selectedPayroll}
        onClose={() => setSelectedPayroll(null)}
        payroll={selectedPayroll}
        isFinalizedCycle={isFinalized}
        onAddDeductionClick={(empId) => {
          setPreselectedEmpId(empId)
          setIsAddDeductionOpen(true)
        }}
        onDeductionsUpdated={() => loadPayroll(false)}
      />

      <AddDeductionModal
        isOpen={isAddDeductionOpen}
        onClose={() => {
          setIsAddDeductionOpen(false)
          setPreselectedEmpId(undefined)
        }}
        employees={resolvedEmployees}
        currentMonth={month}
        currentYear={year}
        preselectedEmployeeId={preselectedEmpId}
        onDeductionAdded={() => loadPayroll(false)}
      />

      {/* Confirmation modal for Finalizing Payroll */}
      <Dialog open={isFinalizeModalOpen} onOpenChange={setIsFinalizeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Finalize Payroll for {months[month - 1]} {year}?
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-muted-foreground">
              Finalizing will save an immutable snapshot for all {payrollResults.filter(r => r.hasPayrollData).length} employees.
              Subsequent views and payslips will read this snapshot. Recalculation will be disabled for this cycle.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/40 p-3 rounded-lg border border-border text-xs space-y-1.5 my-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cycle:</span>
              <span className="font-semibold text-foreground">{months[month - 1]} {year}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monthly Divisor:</span>
              <span className="font-semibold text-foreground">
                {dynamicDivisor} Days ({calendarDays} days − {sundaysCount} Sundays)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Payout:</span>
              <span className="font-bold text-foreground">
                ₹{payrollResults.filter(r => r.hasPayrollData).reduce((sum, r) => sum + r.netPayable, 0).toFixed(2)}
              </span>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsFinalizeModalOpen(false)} disabled={finalizing}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              onClick={handleFinalizePayroll}
              disabled={finalizing}
            >
              {finalizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
              {finalizing ? 'Finalizing...' : 'Confirm & Finalize'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
