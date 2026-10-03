'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, IndianRupee, Clock, FileSpreadsheet, Lock, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getMonthlyPayrollAction } from '@/lib/actions/payroll'
import { PayrollDetailModal } from './PayrollDetailModal'

interface Profile {
  id: string
  first_name: string
  last_name: string
  department: string | null
  salary: number | null // assumed to be hourly rate for this logic, or monthly. We will treat as hourly.
}

import { PayrollResult } from '@/lib/services/payroll.service'

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
  
  const supabase = createClient()
  const { toast } = useToast()

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  // Server-side props handle initial load, but we can keep the effect empty or remove it.

  
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
    setPayrollResults([]) // Reset results when month changes
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-6 h-6 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Calculate and review employee monthly payroll.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-full border border-border shadow-sm shrink-0">
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-background hover:shadow-sm transition-all" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-semibold text-sm px-2 text-center flex items-center justify-center gap-2 text-foreground tracking-tight">
            <Calendar className="h-4 w-4 text-muted-foreground/70" />
            {months[month - 1]} {year}
          </div>
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-background hover:shadow-sm transition-all" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Employees</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Estimated Payout</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{payrollResults.reduce((sum, res) => sum + res.netPayable, 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center justify-end">
          <Button size="lg" className="w-full h-full text-lg" onClick={calculatePayroll} disabled={loading || calculating}>
            {calculating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <FileSpreadsheet className="mr-2 h-5 w-5" />}
            {calculating ? 'Calculating...' : 'Calculate Monthly Payroll'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : payrollResults.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              Click "Calculate Monthly Payroll" to generate data for {months[month-1]} {year}.
            </div>
          ) : (
            <div className="relative overflow-x-auto">
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
                        <div>{res.name}</div>
                        <div className="text-xs text-muted-foreground">{res.department}</div>
                      </td>
                      <td className="px-6 py-4 text-right">{res.standardHours}</td>
                      <td className="px-6 py-4 text-right">{res.actualWorkedHours}</td>
                      <td className="px-6 py-4 text-right font-medium">{res.daysHalfDay}</td>
                      <td className="px-6 py-4 text-right text-rose-500 font-medium">{res.daysUnpaidLeaveEod}</td>
                      <td className="px-6 py-4 text-right text-emerald-500 font-medium whitespace-nowrap">
                        {res.overtimePay > 0 ? `+₹${res.overtimePay.toFixed(2)}` : '0.00'}
                      </td>
                      <td className="px-6 py-4 text-right text-rose-500 font-medium whitespace-nowrap">
                        {res.totalDeductions > 0 ? `-₹${res.totalDeductions.toFixed(2)}` : '0.00'}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-foreground whitespace-nowrap">
                        ₹{res.netPayable.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <PayrollDetailModal isOpen={!!selectedPayroll} onClose={() => setSelectedPayroll(null)} payroll={selectedPayroll} />
    </div>
  )
}
