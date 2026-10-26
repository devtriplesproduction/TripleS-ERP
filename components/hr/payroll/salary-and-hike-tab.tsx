'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { IndianRupee, TrendingUp, Calendar, X, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { addSalaryIncrementAction, getSalaryHistoryAction } from '@/lib/actions/payroll'
import { calculateMonthlyBasicSalary } from '@/lib/utils/salary'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export function SalaryAndHikeTab({ employee }: { employee: any }) {
  const { toast } = useToast()
  const router = useRouter()
  
  const [salaryHistory, setSalaryHistory] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [showInlineHikeForm, setShowInlineHikeForm] = useState(false)
  
  const [incrementInput, setIncrementInput] = useState('')
  const [incrementEffectiveDate, setIncrementEffectiveDate] = useState('')
  const [isApplyingHike, setIsApplyingHike] = useState(false)

  const fetchSalaryHistory = async () => {
    setIsLoadingHistory(true)
    const res = await getSalaryHistoryAction(employee.id)
    if (res.success && res.data) {
      setSalaryHistory(res.data)
    }
    setIsLoadingHistory(false)
  }

  useEffect(() => {
    if (employee.id) {
      fetchSalaryHistory()
    }
  }, [employee.id])

  const currentPackage = employee.salary || 0
  const currentSalary = calculateMonthlyBasicSalary(currentPackage)
  const lastIncrement = salaryHistory[0]

  const baseDate = lastIncrement ? new Date(lastIncrement.effective_date) : (employee.joining_date ? new Date(employee.joining_date) : null)
  const nextHikeDate = baseDate ? new Date(new Date(baseDate).setFullYear(new Date(baseDate).getFullYear() + 1)) : null
  const isOverdue = nextHikeDate && new Date() > nextHikeDate
  const daysLeft = nextHikeDate ? Math.ceil((nextHikeDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null

  const handleApplyHike = async () => {
    const newSalaryInput = parseFloat(incrementInput)
    if (isNaN(newSalaryInput) || newSalaryInput <= currentSalary) {
      toast({ title: 'Error', description: 'New salary must be higher than current salary.', variant: 'destructive' })
      return
    }
    
    setIsApplyingHike(true)
    const incrementPercentage = ((newSalaryInput - currentSalary) / currentSalary) * 100
    const newPackage = newSalaryInput * 12
    
    const res = await addSalaryIncrementAction(employee.id, currentSalary, newSalaryInput, incrementPercentage, incrementEffectiveDate, newPackage)
    setIsApplyingHike(false)
    
    if (res.success) {
      toast({ title: 'Success', description: `Salary increment applied. New Package: ₹${newPackage.toLocaleString('en-IN')}` })
      setShowInlineHikeForm(false)
      setIncrementInput('')
      setIncrementEffectiveDate('')
      employee.salary = newPackage // Optimistic update
      fetchSalaryHistory()
      router.refresh() // Refreshes server data so parent components update
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-foreground">Salary & Hike Management</h4>
          <p className="text-xs text-muted-foreground mt-1">Current compensation and timeline of salary increments</p>
        </div>
        <Button
          onClick={() => {
            if (!showInlineHikeForm) {
              setIncrementInput('')
              setIncrementEffectiveDate('')
            }
            setShowInlineHikeForm(!showInlineHikeForm)
          }}
          className={cn(
            "h-9 px-4 rounded-xl text-xs font-bold tracking-wider flex items-center gap-2 transition-all shadow-sm",
            showInlineHikeForm
              ? "bg-destructive/10 text-destructive hover:bg-destructive/20 shadow-none"
              : "bg-foreground text-background hover:bg-foreground/90"
          )}
        >
          {showInlineHikeForm ? <X className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
          {showInlineHikeForm ? "Cancel Hike" : "Give Hike"}
        </Button>
      </div>

      {showInlineHikeForm ? (
        <div className="p-6 bg-card border border-border rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <h4 className="text-sm font-bold text-foreground mb-6">Apply Salary Increment</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Previous Salary (₹)</label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={currentSalary.toLocaleString('en-IN')}
                  disabled
                  className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-xl text-sm font-bold text-muted-foreground cursor-not-allowed outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">New Total Salary (₹) *</label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="number"
                  value={incrementInput}
                  onChange={(e) => setIncrementInput(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:border-foreground focus:ring-1 focus:ring-foreground/20 outline-none transition-all shadow-sm"
                  autoFocus
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Effective From</label>
              <DatePicker
                value={incrementEffectiveDate}
                onChange={(val) => setIncrementEffectiveDate(val)}
                className="h-[46px] w-full bg-background border-border"
                placeholder="Select Date"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Leave blank to default to today</p>
            </div>

            <Button
              onClick={handleApplyHike}
              disabled={isApplyingHike || !incrementInput || parseFloat(incrementInput) <= currentSalary}
              className="w-full h-[46px] rounded-xl bg-foreground hover:bg-foreground/90 text-background text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 mb-[18px]"
            >
              {isApplyingHike ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
              Confirm Hike
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5 flex flex-col justify-center items-center relative overflow-hidden group">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-3 text-foreground relative z-10">
              <IndianRupee className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 relative z-10">Current Salary</p>
            <h3 className="text-2xl font-bold text-foreground relative z-10">₹{currentSalary.toLocaleString('en-IN')}</h3>
          </div>

          <div className={`rounded-2xl p-5 flex flex-col justify-center items-center border relative overflow-hidden group ${isOverdue ? 'bg-destructive/5 border-destructive/20' : 'bg-card border-border'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 relative z-10 ${isOverdue ? 'bg-destructive/20 text-destructive' : 'bg-secondary text-foreground'}`}>
              <Calendar className="w-5 h-5" />
            </div>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
              {isOverdue ? 'Hike Overdue' : 'Next Hike'}
            </p>
            {nextHikeDate ? (
              <>
                <h3 className={`text-lg font-bold relative z-10 ${isOverdue ? 'text-destructive' : 'text-foreground'}`}>
                  {nextHikeDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </h3>
                <p className={`text-[11px] font-semibold mt-1 relative z-10 ${isOverdue ? 'text-destructive/80' : 'text-muted-foreground'}`}>
                  {isOverdue ? `${Math.abs(daysLeft!)} days overdue` : `in ${daysLeft} days`}
                </p>
              </>
            ) : (
              <p className="text-sm font-semibold text-muted-foreground relative z-10">Not set</p>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 flex flex-col justify-center items-center relative overflow-hidden group">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-3 text-foreground relative z-10">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 relative z-10">Last Hike</p>
            {lastIncrement ? (
              <>
                <h3 className="text-2xl font-bold text-foreground relative z-10">+₹{(lastIncrement.new_salary - lastIncrement.previous_salary).toLocaleString('en-IN')}</h3>
                <p className="text-[11px] font-semibold text-muted-foreground mt-1 relative z-10">
                  {new Date(lastIncrement.effective_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </p>
              </>
            ) : (
              <p className="text-sm font-semibold text-muted-foreground relative z-10">No history yet</p>
            )}
          </div>
        </div>
      )}

      <div className="pt-2">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Salary Increment History</h4>

        {isLoadingHistory ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : salaryHistory.length > 0 ? (
          <div className="space-y-3">
            {salaryHistory.map((hist: any) => (
              <div key={hist.id} className="p-5 bg-card border border-border rounded-2xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-foreground">₹{parseFloat(hist.new_salary).toLocaleString('en-IN')}</span>
                      <Badge variant="outline" className="text-[10px] font-bold text-foreground border-border bg-secondary">
                        +{parseFloat(hist.increment_percentage).toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground mt-1">
                      Increased from ₹{parseFloat(hist.previous_salary).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-foreground">
                    {new Date(hist.effective_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Effective Date</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-border rounded-xl bg-background/50">
            <IndianRupee className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <h4 className="text-sm font-medium text-foreground mb-1">No Salary History</h4>
            <p className="text-xs text-muted-foreground">Salary increments will appear here</p>
          </div>
        )}
      </div>
    </div>
  )
}
