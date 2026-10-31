'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CreditCard,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Wallet,
  Clock,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageHeader } from '@/components/PageHeader'
import { getMyMonthlyPayrollAction, getMySalaryHistoryAction } from '@/lib/actions/payroll'
import { PayrollResult } from '@/lib/services/payroll.service'
import { jsPDF } from 'jspdf'

interface EmployeePayrollClientPageProps {
  user: {
    id: string
    email: string
    role: string
    employee_id: string | null
    employee_name: string | null
    department?: string | null
    designation?: string | null
  }
}

interface EmployeeInfo {
  id: string
  employee_id_number: string | null
  name: string | null
  department: string | null
  designation: string | null
  joining_date: string | null
  annualPackage: number
  monthlyBasic: number
}

interface SalaryHistoryItem {
  id: string
  previous_salary: number | null
  new_salary: number | null
  increment_percentage: number | null
  effective_date: string | null
  created_at?: string
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function EmployeePayrollClientPage({ user }: EmployeePayrollClientPageProps) {
  const currentDate = new Date()
  const [month, setMonth] = useState(currentDate.getMonth() + 1)
  const [year, setYear] = useState(currentDate.getFullYear())
  const [loading, setLoading] = useState(true)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  
  const [payroll, setPayroll] = useState<PayrollResult | null>(null)
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo | null>(null)
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { toast } = useToast()

  const fetchPayroll = useCallback(async (targetYear: number, targetMonth: number) => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const res = await getMyMonthlyPayrollAction(targetYear, targetMonth)
      if (res.success) {
        setPayroll(res.data ?? null)
        if (res.employee) {
          setEmployeeInfo(res.employee)
        }
      } else {
        setErrorMessage(res.error || 'Failed to load payroll details')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await getMySalaryHistoryAction()
      if (res.success && res.data) {
        setSalaryHistory(res.data)
      }
    } catch (err: any) {
      console.error('Error loading salary history:', err)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPayroll(year, month)
  }, [fetchPayroll, year, month])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handlePrevMonth = () => {
    let newM = month - 1
    let newY = year
    if (newM < 1) {
      newM = 12
      newY -= 1
    }
    setMonth(newM)
    setYear(newY)
  }

  const handleNextMonth = () => {
    let newM = month + 1
    let newY = year
    if (newM > 12) {
      newM = 1
      newY += 1
    }
    setMonth(newM)
    setYear(newY)
  }

  // Official PDF Payslip Generator (Vector-based, high-fidelity, crisp text)
  const handleDownloadPayslip = () => {
    if (!payroll && !employeeInfo) {
      toast({ title: 'Error', description: 'No payroll data available to export.', variant: 'destructive' })
      return
    }

    setIsGeneratingPdf(true)
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const primaryColor = [24, 24, 27] // Zinc 900
      const accentColor = [16, 185, 129] // Emerald 500
      const mutedColor = [113, 113, 122] // Zinc 500
      const cardBg = [248, 250, 252] // Slate 50

      const empName = employeeInfo?.name || user.employee_name || 'Employee'
      const empId = employeeInfo?.employee_id_number || user.employee_id || 'N/A'
      const dept = employeeInfo?.department || user.department || 'N/A'
      const designation = employeeInfo?.designation || user.designation || 'N/A'
      const monthName = MONTHS[month - 1]

      // Header Banner
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
      doc.rect(0, 0, 210, 32, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.text('TRIPLE S PRODUCTION', 14, 15)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(200, 200, 200)
      doc.text('ENTERPRISE RESOURCE PLANNING (ERP) - PAYSLIP', 14, 22)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(255, 255, 255)
      doc.text(`PAYSLIP: ${monthName.toUpperCase()} ${year}`, 196, 18, { align: 'right' })

      // Employee Information Box
      doc.setFillColor(cardBg[0], cardBg[1], cardBg[2])
      doc.roundedRect(14, 38, 182, 30, 2, 2, 'F')
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(14, 38, 182, 30, 2, 2, 'S')

      doc.setFontSize(9)
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2])
      doc.setFont('helvetica', 'normal')
      doc.text('Employee Name:', 18, 46)
      doc.text('Employee ID:', 18, 54)
      doc.text('Department:', 18, 62)

      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      doc.setFont('helvetica', 'bold')
      doc.text(empName, 52, 46)
      doc.text(empId, 52, 54)
      doc.text(dept, 52, 62)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2])
      doc.text('Designation:', 110, 46)
      doc.text('Pay Period:', 110, 54)
      doc.text('Status:', 110, 62)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      doc.text(designation, 140, 46)
      doc.text(`${monthName} 1 to ${new Date(year, month, 0).getDate()}, ${year}`, 140, 54)
      doc.text('Calculated', 140, 62)

      // Tables: Earnings & Deductions
      const startY = 76
      const boxWidth = 88

      // --- Earnings Box ---
      doc.setFillColor(241, 245, 249)
      doc.rect(14, startY, boxWidth, 8, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      doc.text('EARNINGS', 18, startY + 5.5)
      doc.text('AMOUNT (INR)', 14 + boxWidth - 4, startY + 5.5, { align: 'right' })

      let ey = startY + 16
      const earningsItems = [
        ['Monthly Base Salary', (payroll?.salary || employeeInfo?.monthlyBasic || 0).toFixed(2)],
        ['Overtime Earnings', (payroll?.overtimePay || 0).toFixed(2)]
      ]

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      earningsItems.forEach(([label, val]) => {
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
        doc.text(label, 18, ey)
        doc.text(`₹${val}`, 14 + boxWidth - 4, ey, { align: 'right' })
        ey += 8
      })

      // Earnings subtotal line
      doc.setDrawColor(226, 232, 240)
      doc.line(14, startY + 44, 14 + boxWidth, startY + 44)
      doc.setFont('helvetica', 'bold')
      doc.text('Gross Earnings', 18, startY + 50)
      const grossVal = (payroll?.grossPay || payroll?.salary || employeeInfo?.monthlyBasic || 0).toFixed(2)
      doc.text(`₹${grossVal}`, 14 + boxWidth - 4, startY + 50, { align: 'right' })

      // --- Deductions Box ---
      const dx = 108
      doc.setFillColor(241, 245, 249)
      doc.rect(dx, startY, boxWidth, 8, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      doc.text('DEDUCTIONS', dx + 4, startY + 5.5)
      doc.text('AMOUNT (INR)', dx + boxWidth - 4, startY + 5.5, { align: 'right' })

      let dy = startY + 16
      const deductionItems = [
        ['Unpaid Days / Absent', (payroll?.unpaidLeaveDeduction || 0).toFixed(2)],
        ['Short Hours Deduction', (payroll?.shortHoursDeduction || 0).toFixed(2)]
      ]

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      deductionItems.forEach(([label, val]) => {
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
        doc.text(label, dx + 4, dy)
        doc.text(`₹${val}`, dx + boxWidth - 4, dy, { align: 'right' })
        dy += 8
      })

      // Deductions subtotal line
      doc.setDrawColor(226, 232, 240)
      doc.line(dx, startY + 44, dx + boxWidth, startY + 44)
      doc.setFont('helvetica', 'bold')
      doc.text('Total Deductions', dx + 4, startY + 50)
      const dedVal = (payroll?.totalDeductions || 0).toFixed(2)
      doc.text(`₹${dedVal}`, dx + boxWidth - 4, startY + 50, { align: 'right' })

      // Outer borders for both boxes
      doc.setDrawColor(203, 213, 225)
      doc.rect(14, startY, boxWidth, 56, 'S')
      doc.rect(dx, startY, boxWidth, 56, 'S')

      // Net Salary Banner
      const netY = startY + 64
      doc.setFillColor(cardBg[0], cardBg[1], cardBg[2])
      doc.roundedRect(14, netY, 182, 22, 2, 2, 'F')
      doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
      doc.setLineWidth(0.8)
      doc.roundedRect(14, netY, 182, 22, 2, 2, 'S')
      doc.setLineWidth(0.2)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      doc.text('NET SALARY PAYABLE:', 20, netY + 13)

      const netVal = (payroll?.netPayable ?? (employeeInfo?.monthlyBasic || 0)).toFixed(2)
      doc.setFontSize(14)
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
      doc.text(`INR ₹${netVal}`, 192, netY + 14, { align: 'right' })

      // Attendance & Work Hours Summary Box
      const attY = netY + 30
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      doc.text('TIME & ATTENDANCE SUMMARY', 14, attY)

      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(14, attY + 4, 182, 34, 2, 2, 'S')

      const attCols = [
        ['Standard Hrs', `${payroll?.standardHours || 208} hrs`],
        ['Worked Hrs', `${payroll?.actualWorkedHours || 0} hrs`],
        ['Paid Leaves', `${payroll?.creditedLeaveHours || 0} hrs`],
        ['Paid Holidays', `${payroll?.paidHolidayHours || 0} hrs`],
        ['Half Days', `${payroll?.daysHalfDay || 0}`],
        ['Unpaid Days (<4h)', `${payroll?.daysUnpaidLeaveEod || 0}`],
        ['Comp-Off Earned', `${((payroll?.compOffMinutesEarned || 0) / 60).toFixed(1)} hrs`],
      ]

      doc.setFontSize(8.5)
      let ax = 20
      let ay = attY + 14
      attCols.forEach(([lbl, val], idx) => {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2])
        doc.text(lbl, ax, ay)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
        doc.text(val, ax, ay + 6)
        ax += 44
        if (idx === 3) {
          ax = 20
          ay += 14
        }
      })

      // Footer Notes
      const footerY = 265
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2])
      doc.text('Note: This is a system-generated document from Triple S Production ERP.', 14, footerY)
      doc.text('No signature is required. For discrepancies, contact HR Department.', 14, footerY + 5)
      doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 196, footerY + 5, { align: 'right' })

      doc.save(`Payslip-${empId}-${monthName}-${year}.pdf`)
      toast({ title: 'Payslip Downloaded', description: `Saved Payslip-${empId}-${monthName}-${year}.pdf` })
    } catch (err: any) {
      toast({ title: 'Download Failed', description: err.message || 'Could not generate PDF', variant: 'destructive' })
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const basePackage = employeeInfo?.annualPackage || (payroll ? payroll.salary * 12 : 0)
  const monthlySalary = payroll ? payroll.salary : (employeeInfo?.monthlyBasic || 0)
  const netPayable = payroll?.hasPayrollData ? payroll.netPayable : monthlySalary
  const totalDeductions = payroll?.hasPayrollData ? payroll.totalDeductions : 0
  const grossPay = payroll?.hasPayrollData ? payroll.grossPay : monthlySalary

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Page Header with Month Navigator */}
      <PageHeader
        title="My Payroll"
        subtitle="Review your monthly compensation, attendance breakdown, deductions, and payslip."
        icon={CreditCard}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-full border border-border shadow-xs shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-8 w-8 hover:bg-background hover:shadow-xs transition-all cursor-pointer"
                onClick={handlePrevMonth}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="font-semibold text-xs sm:text-sm px-2 text-center flex items-center justify-center gap-2 text-foreground tracking-tight whitespace-nowrap min-w-[130px]">
                <Calendar className="h-4 w-4 text-muted-foreground/70" />
                {MONTHS[month - 1]} {year}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-8 w-8 hover:bg-background hover:shadow-xs transition-all cursor-pointer"
                onClick={handleNextMonth}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button
              onClick={handleDownloadPayslip}
              disabled={loading || isGeneratingPdf}
              variant="outline"
              size="sm"
              className="h-9 px-3 gap-1.5 text-xs font-medium cursor-pointer shadow-xs"
            >
              {isGeneratingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Download</span> Payslip
            </Button>
          </div>
        }
      />

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive flex items-center gap-3 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Payable */}
        <Card className="bg-card border-border/70 shadow-xs relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Net Payable
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-28 bg-muted animate-pulse rounded-md" />
            ) : (
              <div>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  ₹{netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-500 bg-emerald-500/5">
                    {payroll?.hasPayrollData ? 'Calculated' : 'Standard Base'}
                  </Badge>
                  <span>for {MONTHS[month - 1]}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Base */}
        <Card className="bg-card border-border/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Monthly Base
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <CreditCard className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded-md" />
            ) : (
              <div>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  ₹{monthlySalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  CTC: ₹{Number(basePackage).toLocaleString('en-IN')}/yr
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deductions */}
        <Card className="bg-card border-border/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Deductions
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <TrendingDown className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded-md" />
            ) : (
              <div>
                <div className={`text-2xl font-bold tracking-tight ${totalDeductions > 0 ? 'text-rose-500' : 'text-foreground'}`}>
                  {totalDeductions > 0 ? `-₹${totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0.00'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {payroll?.daysUnpaidLeaveEod || 0} unpaid day(s)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Worked Hours */}
        <Card className="bg-card border-border/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Work Hours
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded-md" />
            ) : (
              <div>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {payroll?.actualWorkedHours || 0} <span className="text-sm font-normal text-muted-foreground">/ {payroll?.standardHours || 208} hrs</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {payroll?.daysHalfDay || 0} half-day(s) logged
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="breakdown" className="w-full">
        <TabsList className="bg-card border border-border/60 p-1 rounded-xl">
          <TabsTrigger value="breakdown" className="gap-2 text-xs font-medium cursor-pointer">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Monthly Breakdown</span>
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2 text-xs font-medium cursor-pointer">
            <Clock className="w-3.5 h-3.5" />
            <span>Attendance & Time</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 text-xs font-medium cursor-pointer">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Salary & Hike History</span>
          </TabsTrigger>
        </TabsList>

        {/* ============ TAB 1: BREAKDOWN & PAYSLIP ============ */}
        <TabsContent value="breakdown" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Earnings Card */}
            <Card className="border-border/70 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Earnings Breakdown
                  </CardTitle>
                  <Badge variant="outline" className="text-xs font-normal">
                    Credited
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-between items-center py-1.5 border-b border-border/30 text-sm">
                  <span className="text-muted-foreground">Monthly Base Salary</span>
                  <span className="font-semibold text-foreground">
                    ₹{monthlySalary.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/30 text-sm">
                  <span className="text-muted-foreground">Overtime Compensation</span>
                  <span className="font-semibold text-emerald-500">
                    ₹{(payroll?.overtimePay || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 text-sm font-bold">
                  <span className="text-foreground">Total Gross Pay</span>
                  <span className="text-foreground">
                    ₹{grossPay.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Deductions Card */}
            <Card className="border-border/70 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-rose-500" />
                    Deductions Breakdown
                  </CardTitle>
                  <Badge variant="outline" className="text-xs font-normal">
                    Subtracted
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-between items-center py-1.5 border-b border-border/30 text-sm">
                  <span className="text-muted-foreground">Unpaid Leaves / Days (&lt;4h)</span>
                  <span className={`font-semibold ${(payroll?.unpaidLeaveDeduction || 0) > 0 ? 'text-rose-500' : 'text-foreground'}`}>
                    ₹{(payroll?.unpaidLeaveDeduction || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/30 text-sm">
                  <span className="text-muted-foreground">Short Hours Deduction</span>
                  <span className="font-semibold text-foreground">
                    ₹{(payroll?.shortHoursDeduction || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 text-sm font-bold">
                  <span className="text-foreground">Total Deductions</span>
                  <span className={`${totalDeductions > 0 ? 'text-rose-500' : 'text-foreground'}`}>
                    ₹{totalDeductions.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Net Pay Callout */}
          <div className="p-5 rounded-2xl border border-border/70 bg-card/60 dark:bg-zinc-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Summary Calculation
              </div>
              <div className="text-sm text-foreground mt-0.5">
                Gross Pay (₹{grossPay.toFixed(2)}) − Deductions (₹{totalDeductions.toFixed(2)}) =
                <span className="font-bold text-emerald-500 ml-1.5">
                  ₹{netPayable.toFixed(2)} Net Disbursable
                </span>
              </div>
            </div>
            <Button
              onClick={handleDownloadPayslip}
              disabled={loading || isGeneratingPdf}
              className="bg-foreground text-background hover:bg-foreground/90 font-medium text-xs rounded-xl h-9 px-4 gap-2 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download Official Payslip (PDF)
            </Button>
          </div>
        </TabsContent>

        {/* ============ TAB 2: TIME & ATTENDANCE ============ */}
        <TabsContent value="attendance" className="space-y-6 pt-4">
          <Card className="border-border/70 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Time & Attendance Accounting for {MONTHS[month - 1]} {year}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-xl border border-border/40 bg-card/40">
                  <div className="text-xs text-muted-foreground">Standard Expected Hours</div>
                  <div className="text-lg font-bold text-foreground mt-1">{payroll?.standardHours || 208} hrs</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">26 days × 8 hours basis</div>
                </div>

                <div className="p-3.5 rounded-xl border border-border/40 bg-card/40">
                  <div className="text-xs text-muted-foreground">Actual Worked Hours</div>
                  <div className="text-lg font-bold text-foreground mt-1">{payroll?.actualWorkedHours || 0} hrs</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">From approved EOD reports</div>
                </div>

                <div className="p-3.5 rounded-xl border border-border/40 bg-card/40">
                  <div className="text-xs text-muted-foreground">Comp-Off Hours Earned</div>
                  <div className="text-lg font-bold text-emerald-500 mt-1">
                    {((payroll?.compOffMinutesEarned || 0) / 60).toFixed(1)} hrs
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Sunday / Holiday / Extra work</div>
                </div>

                <div className="p-3.5 rounded-xl border border-border/40 bg-card/40">
                  <div className="text-xs text-muted-foreground">Paid Leaves Credited</div>
                  <div className="text-lg font-bold text-foreground mt-1">{payroll?.creditedLeaveHours || 0} hrs</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Approved paid leave quota</div>
                </div>

                <div className="p-3.5 rounded-xl border border-border/40 bg-card/40">
                  <div className="text-xs text-muted-foreground">Paid Company Holidays</div>
                  <div className="text-lg font-bold text-foreground mt-1">{payroll?.paidHolidayHours || 0} hrs</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Official declared holidays</div>
                </div>

                <div className="p-3.5 rounded-xl border border-border/40 bg-card/40">
                  <div className="text-xs text-muted-foreground">WFH Approved Hours</div>
                  <div className="text-lg font-bold text-foreground mt-1">{payroll?.wfhHours || 0} hrs</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Remote work hours logged</div>
                </div>

                <div className="p-3.5 rounded-xl border border-border/40 bg-card/40">
                  <div className="text-xs text-muted-foreground">Half Days (4h – 7h59m)</div>
                  <div className="text-lg font-bold text-amber-500 mt-1">{payroll?.daysHalfDay || 0} days</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">50% daily pay proration</div>
                </div>

                <div className="p-3.5 rounded-xl border border-border/40 bg-card/40">
                  <div className="text-xs text-muted-foreground">Unpaid Leaves / Days (&lt;4h)</div>
                  <div className="text-lg font-bold text-rose-500 mt-1">{payroll?.daysUnpaidLeaveEod || 0} days</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Subtracted from payroll</div>
                </div>

                <div className="p-3.5 rounded-xl border border-border/40 bg-card/40">
                  <div className="text-xs text-muted-foreground">Unpaid Leave Hours</div>
                  <div className="text-lg font-bold text-rose-500 mt-1">{payroll?.unpaidLeaveHours || 0} hrs</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Non-payable time</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ TAB 3: SALARY & HIKE HISTORY ============ */}
        <TabsContent value="history" className="space-y-6 pt-4">
          <Card className="border-border/70 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-foreground" />
                    Salary Structure & Revisions Timeline
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Read-only record of compensation history and salary increments
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-normal">
                  Read Only
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-6">
              {/* Current Package Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl border border-border/40 bg-card/50">
                <div>
                  <div className="text-xs text-muted-foreground">Current Annual Package (CTC)</div>
                  <div className="text-xl font-bold text-foreground mt-1">
                    ₹{Number(basePackage).toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Monthly Basic Compensation</div>
                  <div className="text-xl font-bold text-foreground mt-1">
                    ₹{Number(monthlySalary).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Date of Joining</div>
                  <div className="text-xl font-bold text-foreground mt-1">
                    {employeeInfo?.joining_date
                      ? new Date(employeeInfo.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </div>
                </div>
              </div>

              {/* History Table */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Historical Increment Log
                </h4>
                {historyLoading ? (
                  <div className="py-8 flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : salaryHistory.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground border border-dashed border-border/50 rounded-xl bg-card/20">
                    No past salary increments recorded yet. Initial joining package is active.
                  </div>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs uppercase bg-muted/60 text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3">Effective Date</th>
                          <th className="px-4 py-3 text-right">Previous Monthly (₹)</th>
                          <th className="px-4 py-3 text-right">New Monthly (₹)</th>
                          <th className="px-4 py-3 text-right">Hike (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {salaryHistory.map((item: any) => (
                          <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-foreground">
                              {item.effective_date
                                ? new Date(item.effective_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                : '—'}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              ₹{Number(item.previous_salary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-foreground">
                              ₹{Number(item.new_salary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-500">
                              +{Number(item.increment_percentage || 0).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
