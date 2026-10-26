'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { addPayrollDeductionAction } from '@/lib/actions/payroll'
import { PREDEFINED_DEDUCTION_TYPES } from '@/types/payroll'
import { Loader2, IndianRupee, MinusCircle, AlertCircle, Calendar, User, FileText } from 'lucide-react'

interface AddDeductionModalProps {
  isOpen: boolean
  onClose: () => void
  employees: Array<{
    id: string
    first_name: string
    last_name: string
    department?: string | null
    employee_id_number?: string | null
    name?: string
  }>
  currentMonth: number
  currentYear: number
  preselectedEmployeeId?: string
  onDeductionAdded: () => void
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function AddDeductionModal({
  isOpen,
  onClose,
  employees,
  currentMonth,
  currentYear,
  preselectedEmployeeId,
  onDeductionAdded,
}: AddDeductionModalProps) {
  const { toast } = useToast()

  const [employeeId, setEmployeeId] = useState<string>('')
  const [month, setMonth] = useState<number>(currentMonth)
  const [year, setYear] = useState<number>(currentYear)
  const [deductionType, setDeductionType] = useState<string>(PREDEFINED_DEDUCTION_TYPES[0])
  const [customType, setCustomType] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setEmployeeId(preselectedEmployeeId || (employees.length > 0 ? employees[0].id : ''))
      setMonth(currentMonth)
      setYear(currentYear)
      setDeductionType(PREDEFINED_DEDUCTION_TYPES[0])
      setCustomType('')
      setAmount('')
      setReason('')
      setNotes('')
      setFormError(null)
    }
  }, [isOpen, preselectedEmployeeId, currentMonth, currentYear, employees])

  // Resolve human-readable employee display name
  const selectedEmp = employees.find(
    e => e.id === employeeId || (e as any).employeeId === employeeId
  )
  const selectedEmpName = selectedEmp
    ? (selectedEmp.first_name
        ? `${selectedEmp.first_name} ${selectedEmp.last_name || ''}${selectedEmp.department ? ` (${selectedEmp.department})` : ''}`.trim()
        : selectedEmp.name || employeeId)
    : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!employeeId) {
      setFormError('Please select an employee.')
      return
    }

    const finalType = deductionType === 'Other Deduction' && customType.trim() ? customType.trim() : deductionType
    if (!finalType.trim()) {
      setFormError('Please choose or enter a deduction type.')
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Deduction amount must be a positive number greater than ₹0.')
      return
    }

    if (!reason.trim() || reason.trim().length < 2) {
      setFormError('Reason is required (at least 2 characters).')
      return
    }

    setLoading(true)
    try {
      const res = await addPayrollDeductionAction({
        employee_id: employeeId,
        payroll_year: year,
        payroll_month: month,
        deduction_type: finalType,
        amount: Math.round(numAmount * 100) / 100,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      })

      if (res.success) {
        toast({
          title: 'Deduction Added',
          description: `Successfully added ${finalType} of ₹${numAmount.toFixed(2)} for ${MONTHS[month - 1]} ${year}.`,
        })
        onDeductionAdded()
        onClose()
      } else {
        setFormError(res.error || 'Failed to add deduction.')
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !loading && !open && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl flex items-center gap-2 text-foreground">
            <MinusCircle className="h-5 w-5 text-rose-500 shrink-0" />
            <span>Add Employee Deduction</span>
          </DialogTitle>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Record a fixed payroll deduction for a specific employee and cycle.
          </p>
        </DialogHeader>

        {formError && (
          <div className="flex items-center gap-2 p-3 text-xs sm:text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Employee Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="deduction-employee" className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Employee <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={employeeId}
              onValueChange={v => setEmployeeId(v || '')}
              disabled={loading || !!preselectedEmployeeId}
            >
              <SelectTrigger id="deduction-employee" className="w-full h-10 text-xs sm:text-sm bg-background border-border">
                <SelectValue placeholder="Select an employee">
                  {selectedEmpName || 'Select an employee'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-56 bg-popover border-border">
                {employees.map(emp => {
                  const displayName = emp.first_name
                    ? `${emp.first_name} ${emp.last_name || ''}${emp.department ? ` (${emp.department})` : ''}`.trim()
                    : emp.name || emp.id
                  return (
                    <SelectItem key={emp.id} value={emp.id} className="text-xs sm:text-sm cursor-pointer">
                      {displayName}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Payroll Period (Month & Year) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="deduction-month" className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Payroll Month <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={String(month)}
                onValueChange={v => setMonth(Number(v))}
                disabled={loading}
              >
                <SelectTrigger id="deduction-month" className="w-full h-10 text-xs sm:text-sm bg-background border-border">
                  <SelectValue placeholder="Select Month">
                    {MONTHS[month - 1]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-56 bg-popover border-border">
                  {MONTHS.map((mName, idx) => (
                    <SelectItem key={idx + 1} value={String(idx + 1)} className="text-xs sm:text-sm">
                      {mName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deduction-year" className="text-xs sm:text-sm font-medium">
                Year <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={String(year)}
                onValueChange={v => setYear(Number(v))}
                disabled={loading}
              >
                <SelectTrigger id="deduction-year" className="w-full h-10 text-xs sm:text-sm bg-background border-border">
                  <SelectValue placeholder="Year">
                    {year}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                    <SelectItem key={y} value={String(y)} className="text-xs sm:text-sm">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Deduction Type */}
          <div className="space-y-1.5">
            <Label htmlFor="deduction-type" className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Deduction Type <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={deductionType}
              onValueChange={v => setDeductionType(v || PREDEFINED_DEDUCTION_TYPES[0])}
              disabled={loading}
            >
              <SelectTrigger id="deduction-type" className="w-full h-10 text-xs sm:text-sm bg-background border-border">
                <SelectValue placeholder="Select deduction type">
                  {deductionType}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {PREDEFINED_DEDUCTION_TYPES.map(t => (
                  <SelectItem key={t} value={t} className="text-xs sm:text-sm">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {deductionType === 'Other Deduction' && (
              <Input
                placeholder="Specify deduction name/type"
                value={customType}
                onChange={e => setCustomType(e.target.value)}
                disabled={loading}
                className="mt-2 text-xs sm:text-sm bg-background border-border"
              />
            )}
          </div>

          {/* Amount (₹) */}
          <div className="space-y-1.5">
            <Label htmlFor="deduction-amount" className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
              Amount (₹) <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">₹</span>
              <Input
                id="deduction-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                disabled={loading}
                className="pl-8 text-xs sm:text-sm bg-background border-border font-medium"
                required
              />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="deduction-reason" className="text-xs sm:text-sm font-medium">
              Reason <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="deduction-reason"
              placeholder="e.g. Asset damage recovery, Salary advance tranche"
              value={reason}
              onChange={e => setReason(e.target.value)}
              disabled={loading}
              className="text-xs sm:text-sm bg-background border-border"
              required
            />
          </div>

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="deduction-notes" className="text-xs sm:text-sm font-medium text-muted-foreground">
              Notes (Optional)
            </Label>
            <Textarea
              id="deduction-notes"
              placeholder="Add any internal remarks, voucher number, or approval references..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={loading}
              rows={2}
              className="text-xs sm:text-sm bg-background border-border resize-none"
            />
          </div>

          {/* Action Buttons - Clean bottom footer with border separator */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="text-xs sm:text-sm h-9 px-4 rounded-lg cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs sm:text-sm h-9 px-5 rounded-lg cursor-pointer shadow-sm transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Deduction'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
