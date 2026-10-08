'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2, IndianRupee, Clock, FileSpreadsheet, ChevronLeft, ChevronRight, Calendar, User } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getMonthlyPayrollAction } from '@/lib/actions/payroll'
import { PayrollDetailModal } from './PayrollDetailModal'
import { PayrollResult } from '@/lib/services/payroll.service'
import { PageHeader } from '@/components/PageHeader'

interface PayrollData extends PayrollResult {
  isLocked?: boolean
}

export function PayrollClientPage({ title, initialEmployees = [] }: { title: string, initialEmployees?: any[] }) {
  const [employees, setEmployees] = useState<any[]>(initialEmployees)
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [payrollResults, setPayrollResults] = useState<PayrollData[]>([])
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedPayroll, setSelectedPayroll] = useState<any | null>(null)
  
  const { toast } = useToast()

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const calculatePayroll = async () => {
    setCalculating(true)
    try {
      const result = await getMonthlyPayrollAction(year, month);
      if (result.success && result.data) {
        setPayrollResults(result.data.map((d: any) => ({ ...d, isLocked: false })));
        toast({ title: 'Success', description: `Calculated payroll for ${months[month-1]} ${year}` });
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error: any) {
      toast({ title: 'Calculation Error', description: error.message, variant: 'destructive' })
    } finally {
      setCalculating(false)
    }
  }

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

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title={title}
        subtitle="Calculate and review employee monthly payroll."
        actions={
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
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Employees</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Estimated Payout</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              ₹{payrollResults.filter((r: any) => r.hasPayrollData).reduce((sum, res) => sum + res.netPayable, 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <div className="sm:col-span-2 lg:col-span-1 flex items-center">
          <Button size="lg" className="w-full h-11 sm:h-full min-h-[44px] text-sm sm:text-base font-semibold" onClick={calculatePayroll} disabled={loading || calculating}>
            {calculating ? <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />}
            {calculating ? 'Calculating...' : 'Calculate Monthly Payroll'}
          </Button>
        </div>
      </div>

      <Card className="w-full min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg">Payroll Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : payrollResults.length === 0 ? (
            <div className="text-center p-8 text-sm text-muted-foreground">
              Click &quot;Calculate Monthly Payroll&quot; to generate data for {months[month-1]} {year}.
            </div>
          ) : (
            <>
              {/* Desktop Table View (>= 768px) */}
              <div className="hidden md:block relative overflow-x-auto min-w-0">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-6 py-3">Employee Name</th>
                      <th className="px-6 py-3 text-right">Standard Hrs</th>
                      <th className="px-6 py-3 text-right">Worked Hrs</th>
                      <th className="px-6 py-3 text-right">Half Days</th>
                      <th className="px-6 py-3 text-right">Unpaid (&lt;4h)</th>
                      <th className="px-6 py-3 text-right">Overtime (₹)</th>
                      <th className="px-6 py-3 text-right">Deduction (₹)</th>
                      <th className="px-6 py-3 text-right">Net Payable (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollResults.map((res: any) => (
                      <tr key={res.employeeId} className="border-b border-border hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSelectedPayroll(res)}>
                        <td className="px-6 py-4 font-medium">
                          <div className="font-semibold text-foreground">{res.name}</div>
                          <div className="text-xs text-muted-foreground">{res.department}</div>
                        </td>
                        <td className="px-6 py-4 text-right">{res.standardHours}</td>
                        <td className="px-6 py-4 text-right">{res.hasPayrollData ? res.actualWorkedHours : '—'}</td>
                        <td className="px-6 py-4 text-right font-medium">{res.hasPayrollData ? res.daysHalfDay : '—'}</td>
                        <td className="px-6 py-4 text-right text-rose-500 font-medium">{res.hasPayrollData ? res.daysUnpaidLeaveEod : '—'}</td>
                        <td className="px-6 py-4 text-right text-emerald-500 font-medium whitespace-nowrap">
                          ₹0.00
                        </td>
                        <td className="px-6 py-4 text-right text-rose-500 font-medium whitespace-nowrap">
                          {res.hasPayrollData ? (res.totalDeductions > 0 ? `-₹${res.totalDeductions.toFixed(2)}` : '₹0.00') : '—'}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-foreground whitespace-nowrap">
                          {res.hasPayrollData ? `₹${res.netPayable.toFixed(2)}` : '—'}
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
                        <h4 className="font-bold text-foreground text-base leading-tight">{res.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{res.department || 'Employee'}</p>
                      </div>
                      <span className="text-xs font-bold text-foreground bg-muted px-2.5 py-1 rounded-md shrink-0">
                        {res.hasPayrollData ? `₹${res.netPayable.toFixed(2)}` : 'No Data'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 p-3 rounded-lg border border-border/50">
                      <div>
                        <span className="text-muted-foreground">Standard Hours: </span>
                        <span className="font-medium text-foreground">{res.standardHours}h</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Worked Hours: </span>
                        <span className="font-medium text-foreground">{res.hasPayrollData ? `${res.actualWorkedHours}h` : '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Half Days: </span>
                        <span className="font-medium text-foreground">{res.hasPayrollData ? res.daysHalfDay : '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Unpaid: </span>
                        <span className="font-medium text-rose-500">{res.hasPayrollData ? res.daysUnpaidLeaveEod : '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Overtime: </span>
                        <span className="font-medium text-emerald-500">₹0.00</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Deduction: </span>
                        <span className="font-medium text-rose-500">
                          {res.hasPayrollData ? (res.totalDeductions > 0 ? `₹${res.totalDeductions.toFixed(2)}` : '₹0.00') : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-semibold text-foreground">Net Payable:</span>
                      <span className="text-sm font-bold text-foreground">
                        {res.hasPayrollData ? `₹${res.netPayable.toFixed(2)}` : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <PayrollDetailModal isOpen={!!selectedPayroll} onClose={() => setSelectedPayroll(null)} payroll={selectedPayroll} />
    </div>
  )
}
