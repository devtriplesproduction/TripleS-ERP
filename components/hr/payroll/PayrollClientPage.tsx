'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, IndianRupee, Clock, FileSpreadsheet, Lock, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Profile {
  id: string
  first_name: string
  last_name: string
  department: string | null
  salary: number | null // assumed to be hourly rate for this logic, or monthly. We will treat as hourly.
}

interface PayrollData {
  employeeId: string
  name: string
  department: string
  hourlyRate: number
  standardHours: number
  extraHours: number
  overtimeAmount: number
  grossSalary: number
  netPayable: number
  isLocked: boolean
}

export function PayrollClientPage({ title, initialEmployees = [] }: { title: string, initialEmployees?: any[] }) {
  const [employees, setEmployees] = useState<any[]>(initialEmployees)
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [payrollResults, setPayrollResults] = useState<PayrollData[]>([])
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  
  const supabase = createClient()
  const { toast } = useToast()

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  // Server-side props handle initial load, but we can keep the effect empty or remove it.

  const calculatePayroll = async () => {
    setCalculating(true)
    
    // Determine month start and end dates
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`

    // Calculate working days in the month (excluding weekends)
    let workingDays = 0
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month - 1, d)
      if (date.getDay() !== 0 && date.getDay() !== 6) { // 0 is Sunday, 6 is Saturday
        workingDays++
      }
    }
    const standardHours = workingDays * 8

    try {
      // Fetch EOD reports for the month
      const { data: eodData, error: eodError } = await supabase
        .from('eod_reports')
        .select('employee_id, office_hours, report_date')
        .eq('status', 'Approved')
        .gte('report_date', startDate)
        .lte('report_date', endDate)

      if (eodError) throw new Error('Failed to fetch EOD reports')

      // Fetch Leave requests for the month
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_requests')
        .select('employee_id, start_date, end_date, is_half_day')
        .eq('status', 'Approved')
        .gte('start_date', startDate)
        .lte('start_date', endDate) // Simplified boundary check

      if (leaveError) throw new Error('Failed to fetch leave requests')

      const results: PayrollData[] = employees.map(emp => {
        // Calculate total hours from EOD reports
        const employeeEods = eodData?.filter(e => e.employee_id === emp.id) || []
        const actualWorkedHours = employeeEods.reduce((sum, e) => sum + (Number(e.office_hours) || 0), 0)

        // Calculate credited hours from approved leaves
        const employeeLeaves = leaveData?.filter(l => l.employee_id === emp.id) || []
        let creditedLeaveHours = 0
        employeeLeaves.forEach(leave => {
          if (leave.is_half_day) {
            creditedLeaveHours += 4
          } else {
            // Simplified calculation: assuming 1 day leave if start and end are same
            // For multi-day, calculate weekdays between start and end
            let leaveDays = 0
            const lStart = new Date(leave.start_date)
            const lEnd = new Date(leave.end_date)
            for (let d = new Date(lStart); d <= lEnd; d.setDate(d.getDate() + 1)) {
              if (d.getDay() !== 0 && d.getDay() !== 6) leaveDays++
            }
            creditedLeaveHours += (leaveDays * 8)
          }
        })

        const totalEffectiveHours = actualWorkedHours + creditedLeaveHours
        
        // Assume emp.salary is Annual Salary based on the large numbers (e.g. 720,000 or 2.4M)
        const annualSalary = emp.salary && emp.salary > 0 ? Number(emp.salary) : 60000 // Default 60k/year if undefined
        const monthlySalary = annualSalary / 12
        const hourlyRate = monthlySalary / standardHours
        const baseSalary = monthlySalary
        
        let extraHours = 0
        let overtimeAmount = 0
        let deductionAmount = 0

        if (totalEffectiveHours > standardHours) {
          extraHours = totalEffectiveHours - standardHours
          overtimeAmount = extraHours * (hourlyRate * 1.5)
        } else if (totalEffectiveHours < standardHours) {
          // Unpaid leave deduction
          const deficitHours = standardHours - totalEffectiveHours
          deductionAmount = deficitHours * hourlyRate
        }

        const grossSalary = baseSalary + overtimeAmount - deductionAmount
        
        return {
          employeeId: emp.id,
          name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
          department: emp.department || 'N/A',
          hourlyRate,
          standardHours,
          actualWorkedHours,
          creditedLeaveHours,
          extraHours,
          overtimeAmount,
          deductionAmount,
          grossSalary,
          netPayable: grossSalary,
          isLocked: false
        }
      })

      setPayrollResults(results)
      toast({ title: 'Success', description: `Calculated payroll based on EOD & Leaves for ${months[month-1]} ${year}` })
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
                    <th className="px-6 py-3 text-right">Leave Hrs</th>
                    <th className="px-6 py-3 text-right">Extra Hrs</th>
                    <th className="px-6 py-3 text-right">Overtime (₹)</th>
                    <th className="px-6 py-3 text-right">Deduction (₹)</th>
                    <th className="px-6 py-3 text-right">Net Payable (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollResults.map((res) => (
                    <tr key={res.employeeId} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-medium">
                        <div>{res.name}</div>
                        <div className="text-xs text-muted-foreground">{res.department}</div>
                      </td>
                      <td className="px-6 py-4 text-right">{res.standardHours}</td>
                      <td className="px-6 py-4 text-right">{res.actualWorkedHours}</td>
                      <td className="px-6 py-4 text-right">{res.creditedLeaveHours}</td>
                      <td className="px-6 py-4 text-right text-emerald-500 font-medium">{res.extraHours > 0 ? res.extraHours : 0}</td>
                      <td className="px-6 py-4 text-right text-emerald-500 font-medium whitespace-nowrap">
                        {res.overtimeAmount > 0 ? `+₹${res.overtimeAmount.toFixed(2)}` : '0.00'}
                      </td>
                      <td className="px-6 py-4 text-right text-rose-500 font-medium whitespace-nowrap">
                        {res.deductionAmount > 0 ? `-₹${res.deductionAmount.toFixed(2)}` : '0.00'}
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
    </div>
  )
}
