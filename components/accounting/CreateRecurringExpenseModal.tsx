'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Calendar,
  ChevronsUpDown,
  Check,
} from 'lucide-react'
import { RecurringExpenseRule } from '@/types/accounting'
import { createRecurringExpenseAction } from '@/lib/actions/accounting'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export const EXPENSE_CATEGORIES = [
  'Salary',
  'Software',
  'EMI',
  'Rent',
  'Hosting',
  'Utilities',
  'Marketing',
  'Other',
] as const

interface CreateRecurringExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateRecurringExpenseModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateRecurringExpenseModalProps) {
  const [internalName, setInternalName] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [monthlyAmount, setMonthlyAmount] = useState('')
  const [category, setCategory] = useState('Software')
  const [firstPaymentDate, setFirstPaymentDate] = useState('2026-11-10')
  const [dueDayOfMonth, setDueDayOfMonth] = useState('1')

  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setInternalName('')
      setVendorName('')
      setMonthlyAmount('')
      setCategory('Software')
      setFirstPaymentDate('2026-11-10')
      setDueDayOfMonth('1')
    }
  }, [isOpen])

  if (!isOpen) return null

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'Select date...'
    const [year, monthStr, dayStr] = dateStr.split('-')
    const day = parseInt(dayStr, 10)
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ]
    const month = monthNames[parseInt(monthStr, 10) - 1] || ''
    const suffix = (d: number) => {
      if (d > 3 && d < 21) return 'th'
      switch (d % 10) {
        case 1: return 'st'
        case 2: return 'nd'
        case 3: return 'rd'
        default: return 'th'
      }
    }
    return `${month} ${day}${suffix(day)}, ${year}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!internalName.trim()) {
      toast.error('Please enter an internal name.')
      return
    }

    const amount = parseFloat(monthlyAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid monthly amount.')
      return
    }

    const day = parseInt(dueDayOfMonth, 10)
    if (isNaN(day) || day < 1 || day > 31) {
      toast.error('Due day of month must be between 1 and 31.')
      return
    }

    setLoading(true)

    try {
      const res = await createRecurringExpenseAction({
        internal_name: internalName.trim(),
        vendor_name: vendorName.trim() || undefined,
        monthly_amount: amount,
        category: category.trim(),
        first_payment_date: firstPaymentDate,
        due_day_of_month: day,
        status: 'Active',
      })

      if (res.success) {
        toast.success('Recurring expense rule created successfully!')
        onSuccess()
        onClose()
      } else {
        toast.error(res.error || 'Failed to create recurring rule.')
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-[500px] bg-card border border-border text-card-foreground rounded-2xl shadow-2xl p-6 sm:p-7 relative animate-in fade-in zoom-in-95 duration-150"
        onClick={() => setIsCategoryOpen(false)}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            New Recurring Expense Rule
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="rounded-lg text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Internal Name & Vendor */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <Label className="block text-sm font-medium mb-1.5">
                Internal Name
              </Label>
              <Input
                type="text"
                placeholder="e.g. AWS Bill"
                value={internalName}
                onChange={(e) => setInternalName(e.target.value)}
                className="text-sm rounded-lg"
                required
              />
            </div>

            <div>
              <Label className="block text-sm font-medium mb-1.5">
                Vendor <span className="text-muted-foreground font-normal text-xs">(Optional)</span>
              </Label>
              <Input
                type="text"
                placeholder="Specific Vendor Name"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className="text-sm rounded-lg"
              />
            </div>
          </div>

          {/* Row 2: Monthly Amount & Category */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <Label className="block text-sm font-medium mb-1.5">
                Monthly Amount
              </Label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-muted-foreground font-medium text-sm select-none">
                  ₹
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={monthlyAmount}
                  onChange={(e) => setMonthlyAmount(e.target.value)}
                  className="pl-8 font-mono text-sm rounded-lg"
                  required
                />
              </div>
            </div>

            <div className="relative">
              <Label className="block text-sm font-medium mb-1.5">
                Category
              </Label>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsCategoryOpen(!isCategoryOpen)
                }}
                className="w-full bg-input-bg border border-input hover:border-input-hover focus:border-ring focus:ring-1 focus:ring-ring rounded-lg px-3.5 py-2.5 text-left text-sm flex items-center justify-between transition-all"
              >
                <span className="text-foreground font-medium">
                  {category}
                </span>
                <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>

              {isCategoryOpen && (
                <div
                  className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-popover border border-border rounded-lg shadow-xl overflow-hidden py-1 max-h-52 overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategory(cat)
                        setIsCategoryOpen(false)
                      }}
                      className="w-full text-left px-3.5 py-2 text-sm text-foreground hover:bg-muted flex items-center justify-between"
                    >
                      <span>{cat}</span>
                      {category === cat && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 3: First Payment Date & Due Day */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <Label className="block text-sm font-medium mb-1.5">
                First Payment Date
              </Label>
              <div className="relative flex items-center bg-input-bg border border-input hover:border-input-hover focus-within:border-ring focus-within:ring-1 focus-within:ring-ring rounded-lg px-3 py-2.5 transition-all">
                <Calendar className="w-4 h-4 text-muted-foreground mr-2 shrink-0 select-none" />
                <span className="text-sm text-foreground truncate select-none">
                  {formatDisplayDate(firstPaymentDate)}
                </span>
                <input
                  type="date"
                  value={firstPaymentDate}
                  onChange={(e) => setFirstPaymentDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="block text-sm font-medium mb-1.5">
                Due Day of Month
              </Label>
              <Input
                type="number"
                min="1"
                max="31"
                placeholder="1"
                value={dueDayOfMonth}
                onChange={(e) => setDueDayOfMonth(e.target.value)}
                className="text-sm rounded-lg"
                required
              />
            </div>
          </div>

          {/* Footer - CENTERED SQUARE BUTTONS, NO COLOR HOVER SHIFT */}
          <div className="flex items-center justify-center gap-3 pt-4 border-t border-border mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg px-5 py-2 text-xs font-semibold hover:bg-transparent hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={loading}
              isLoading={loading}
              className="rounded-lg px-6 py-2 text-xs font-semibold hover:bg-primary shadow-xs"
            >
              Create Recurring Expense
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

