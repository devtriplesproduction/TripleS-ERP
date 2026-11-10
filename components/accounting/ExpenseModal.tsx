'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Calendar,
  ChevronDown,
  Check,
} from 'lucide-react'
import { ExpenseRecord, BankAccount } from '@/types/accounting'
import { createExpenseAction, updateExpenseAction } from '@/lib/actions/accounting'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export const EXPENSE_CATEGORIES_LIST = [
  'Variable Cost',
  'Fixed Cost',
  'Office Rent',
  'Employee Salaries',
  'Software & Subscriptions',
  'Advertising & Marketing',
  'Google Ads',
  'Meta Ads',
  'Hosting & Domain',
  'Internet & Telephone',
  'Travel & Transportation',
  'Office Supplies',
  'Professional Services',
  'Equipment',
  'Utilities',
  'Other Expenses',
] as const

interface ExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  expenseToEdit?: ExpenseRecord | null
  bankAccounts?: BankAccount[]
}

export function ExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  expenseToEdit,
}: ExpenseModalProps) {
  const isEditing = !!expenseToEdit

  // Form State
  const [category, setCategory] = useState<string>('Variable Cost')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [merchant, setMerchant] = useState('')
  const [projectDetails, setProjectDetails] = useState('')

  // UI State
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Default date to today formatted as YYYY-MM-DD
  const getTodayISO = () => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  useEffect(() => {
    if (expenseToEdit) {
      setCategory(expenseToEdit.category || 'Variable Cost')
      setAmount(expenseToEdit.amount ? String(expenseToEdit.amount) : '')
      setExpenseDate(expenseToEdit.expense_date ? expenseToEdit.expense_date.substring(0, 10) : getTodayISO())
      setMerchant(expenseToEdit.vendor_payee || '')
      setProjectDetails(expenseToEdit.campaign_project || expenseToEdit.description || '')
    } else {
      setCategory('Variable Cost')
      setAmount('')
      setExpenseDate(getTodayISO())
      setMerchant('')
      setProjectDetails('')
    }
  }, [expenseToEdit, isOpen])

  if (!isOpen) return null

  // Date formatter for display: "November 10th, 2026"
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

    if (!category.trim()) {
      toast.error('Please select an expense category.')
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount greater than 0.')
      return
    }

    if (!merchant.trim()) {
      toast.error('Please enter a merchant or payee name.')
      return
    }

    if (!expenseDate) {
      toast.error('Please select an expense date.')
      return
    }

    setLoading(true)

    try {
      if (isEditing && expenseToEdit) {
        const res = await updateExpenseAction({
          id: expenseToEdit.id,
          vendor_payee: merchant.trim(),
          amount: numAmount,
          expense_date: expenseDate,
          category,
          campaign_project: projectDetails.trim() || undefined,
          description: projectDetails.trim() || undefined,
          status: expenseToEdit.status || 'Paid',
          payment_method: expenseToEdit.payment_method || 'Cash',
        })

        if (res.success) {
          toast.success('Expense entry updated successfully!')
          onSuccess()
          onClose()
        } else {
          toast.error(res.error || 'Failed to update expense entry.')
        }
      } else {
        const res = await createExpenseAction({
          vendor_payee: merchant.trim(),
          amount: numAmount,
          expense_date: expenseDate,
          category,
          campaign_project: projectDetails.trim() || undefined,
          description: projectDetails.trim() || undefined,
          status: 'Paid',
          payment_method: 'Cash',
          tax_type: 'No Tax',
          paid_amount: numAmount,
        })

        if (res.success) {
          toast.success('Expense entry saved successfully!')
          onSuccess()
          onClose()
        } else {
          toast.error(res.error || 'Failed to record expense.')
        }
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
        className="w-full max-w-[480px] bg-card border border-border text-card-foreground rounded-2xl shadow-2xl p-6 sm:p-7 relative animate-in fade-in zoom-in-95 duration-150"
        onClick={() => setIsCategoryDropdownOpen(false)}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {isEditing ? 'Edit Expense' : 'Record Expense'}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="rounded-lg text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Field - Standard border */}
          <div className="relative">
            <Label className="block text-sm font-medium mb-1.5">
              Category
            </Label>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsCategoryDropdownOpen(!isCategoryDropdownOpen)
              }}
              className="w-full bg-input-bg border border-input hover:border-input-hover focus:border-ring focus:ring-1 focus:ring-ring rounded-xl px-4 py-2.5 text-left text-sm flex items-center justify-between transition-all"
            >
              <span className="text-foreground font-medium">
                {category}
              </span>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>

            {isCategoryDropdownOpen && (
              <div
                className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-popover border border-border rounded-xl shadow-xl overflow-hidden py-1 max-h-56 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {EXPENSE_CATEGORIES_LIST.map((cat) => {
                  const isSelected = category === cat
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategory(cat)
                        setIsCategoryDropdownOpen(false)
                      }}
                      className="w-full text-left px-3.5 py-2 text-sm text-foreground hover:bg-muted flex items-center justify-between transition-colors"
                    >
                      <span>{cat}</span>
                      {isSelected && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Amount and Date 2-Column Grid */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <Label className="block text-sm font-medium mb-1.5">
                Amount
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
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 font-mono text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="block text-sm font-medium mb-1.5">
                Date
              </Label>
              <div className="relative flex items-center bg-input-bg border border-input hover:border-input-hover focus-within:border-ring focus-within:ring-1 focus-within:ring-ring rounded-xl px-3 py-2.5 transition-all">
                <Calendar className="w-4 h-4 text-muted-foreground mr-2 shrink-0 select-none" />
                <span className="text-sm text-foreground truncate select-none">
                  {formatDisplayDate(expenseDate)}
                </span>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  required
                />
              </div>
            </div>
          </div>

          {/* Merchant */}
          <div>
            <Label className="block text-sm font-medium mb-1.5">
              Merchant
            </Label>
            <Input
              type="text"
              placeholder="E.g. AWS, Office Rent"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="text-sm"
              required
            />
          </div>

          {/* Project Details (Optional) */}
          <div>
            <Label className="block text-sm font-medium mb-1.5">
              Project / Memo <span className="text-muted-foreground font-normal text-xs">(Optional)</span>
            </Label>
            <Input
              type="text"
              maxLength={50}
              placeholder="E.g. Monthly server invoice"
              value={projectDetails}
              onChange={(e) => setProjectDetails(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Modal Footer Actions - CENTERED SQUARE BUTTONS, NO COLOR HOVER SHIFT */}
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
              Save Expense
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
