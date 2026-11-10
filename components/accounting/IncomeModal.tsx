'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Calendar,
  ChevronsUpDown,
  Check,
  Plus,
} from 'lucide-react'
import { IncomeRecord, BankAccount } from '@/types/accounting'
import { createIncomeAction, updateIncomeAction } from '@/lib/actions/accounting'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export const SERVICE_CATEGORIES = [
  'Software Development',
  'Digital Marketing',
  'Hosting & Website Maintaince',
  'SEO Services',
  'Social Media Marketing',
  'Google Ads / PPC',
  'Meta Ads Management',
  'Content Marketing',
  'Graphic Design',
  'Video / Creative Services',
  'Consulting',
  'Retainer Services',
  'Other Income',
] as const

interface IncomeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  incomeToEdit?: IncomeRecord | null
  bankAccounts?: BankAccount[]
  existingClients?: { id: string; name: string }[]
}

export function IncomeModal({
  isOpen,
  onClose,
  onSuccess,
  incomeToEdit,
  existingClients = [],
}: IncomeModalProps) {
  const isEditing = !!incomeToEdit

  // Form State
  const [clientName, setClientName] = useState('')
  const [clientId, setClientId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [incomeDate, setIncomeDate] = useState('')
  const [projectDetails, setProjectDetails] = useState('')
  const [serviceCategory, setServiceCategory] = useState('')

  // UI State
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false)
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)
  const [customClientInput, setCustomClientInput] = useState('')
  const [loading, setLoading] = useState(false)

  // Default date to today formatted as YYYY-MM-DD
  const getTodayISO = () => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Populate or reset form
  useEffect(() => {
    if (incomeToEdit) {
      setClientName(incomeToEdit.customer_name || '')
      setClientId(incomeToEdit.client_id || null)
      setAmount(incomeToEdit.amount ? String(incomeToEdit.amount) : '')
      setIncomeDate(incomeToEdit.income_date ? incomeToEdit.income_date.substring(0, 10) : getTodayISO())
      setProjectDetails(incomeToEdit.campaign_project || incomeToEdit.description || '')
      setServiceCategory(incomeToEdit.category || 'Software Development')
    } else {
      setClientName('')
      setClientId(null)
      setAmount('')
      setIncomeDate(getTodayISO())
      setProjectDetails('')
      setServiceCategory('')
      setCustomClientInput('')
    }
  }, [incomeToEdit, isOpen])

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

  const defaultClients = [
    { id: 'c1', name: 'Malee House' },
    { id: 'c2', name: 'Constrotrait' },
    { id: 'c3', name: 'Indictrans' },
    { id: 'c4', name: 'Mukta Global Associates' },
  ]

  const mergedClients = [
    ...defaultClients,
    ...existingClients.filter((ec) => !defaultClients.some((dc) => dc.name.toLowerCase() === ec.name.toLowerCase())),
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!clientName.trim()) {
      toast.error('Please enter or select a client name.')
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount greater than 0.')
      return
    }

    if (!serviceCategory.trim()) {
      toast.error('Please select a service category.')
      return
    }

    if (!incomeDate) {
      toast.error('Please select an income date.')
      return
    }

    setLoading(true)

    try {
      if (isEditing && incomeToEdit) {
        const res = await updateIncomeAction({
          id: incomeToEdit.id,
          customer_name: clientName.trim(),
          client_id: clientId || undefined,
          amount: numAmount,
          income_date: incomeDate,
          campaign_project: projectDetails.trim() || undefined,
          description: projectDetails.trim() || undefined,
          category: serviceCategory,
          status: incomeToEdit.status || 'Received',
          payment_method: incomeToEdit.payment_method || 'Cash',
        })

        if (res.success) {
          toast.success('Income entry updated successfully!')
          onSuccess()
          onClose()
        } else {
          toast.error(res.error || 'Failed to update income entry.')
        }
      } else {
        const res = await createIncomeAction({
          customer_name: clientName.trim(),
          client_id: clientId || undefined,
          amount: numAmount,
          income_date: incomeDate,
          campaign_project: projectDetails.trim() || undefined,
          description: projectDetails.trim() || undefined,
          category: serviceCategory,
          status: 'Received',
          payment_method: 'Cash',
          tax_type: 'No Tax',
          received_amount: numAmount,
        })

        if (res.success) {
          toast.success('Income entry saved successfully!')
          onSuccess()
          onClose()
        } else {
          toast.error(res.error || 'Failed to record income.')
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
        onClick={() => {
          setIsClientDropdownOpen(false)
          setIsCategoryDropdownOpen(false)
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {isEditing ? 'Edit Income' : 'Add Income'}
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
          {/* Client Name Field */}
          <div className="relative">
            <Label className="block text-sm font-medium mb-1.5">
              Client Name
            </Label>
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsCategoryDropdownOpen(false)
                  setIsClientDropdownOpen(!isClientDropdownOpen)
                }}
                className="w-full bg-input-bg border border-input hover:border-input-hover focus:border-ring focus:ring-1 focus:ring-ring rounded-xl px-3.5 py-2.5 text-left text-sm flex items-center justify-between transition-all"
              >
                <span className={clientName ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                  {clientName || 'Select client...'}
                </span>
                <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>

              {isClientDropdownOpen && (
                <div
                  className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-popover border border-border rounded-xl shadow-xl overflow-hidden py-1 max-h-56 overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-2 border-b border-border">
                    <Input
                      type="text"
                      placeholder="Type client name..."
                      value={customClientInput}
                      onChange={(e) => setCustomClientInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customClientInput.trim()) {
                          e.preventDefault()
                          setClientName(customClientInput.trim())
                          setClientId(null)
                          setIsClientDropdownOpen(false)
                        }
                      }}
                      className="h-8 text-xs"
                      autoFocus
                    />
                    {customClientInput.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          setClientName(customClientInput.trim())
                          setClientId(null)
                          setIsClientDropdownOpen(false)
                        }}
                        className="w-full mt-1.5 text-left px-2 py-1 text-xs text-primary hover:bg-muted rounded flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Use &quot;{customClientInput.trim()}&quot;
                      </button>
                    )}
                  </div>

                  {mergedClients.map((client) => {
                    const isSelected = clientName === client.name
                    return (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => {
                          setClientName(client.name)
                          setClientId(client.id)
                          setIsClientDropdownOpen(false)
                        }}
                        className="w-full text-left px-3.5 py-2 text-sm text-foreground hover:bg-muted flex items-center justify-between transition-colors"
                      >
                        <span>{client.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
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
                  {formatDisplayDate(incomeDate)}
                </span>
                <input
                  type="date"
                  value={incomeDate}
                  onChange={(e) => setIncomeDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  required
                />
              </div>
            </div>
          </div>

          {/* Project Details (Optional) */}
          <div>
            <Label className="block text-sm font-medium mb-1.5">
              Project Details <span className="text-muted-foreground font-normal text-xs">(Optional)</span>
            </Label>
            <Input
              type="text"
              maxLength={50}
              placeholder="E.g. Website Redesign - Milestone 1"
              value={projectDetails}
              onChange={(e) => setProjectDetails(e.target.value)}
              className="text-sm"
            />
            <div className="text-right text-[11px] text-muted-foreground mt-1 font-mono">
              {projectDetails.length}/50
            </div>
          </div>

          {/* Service Category */}
          <div className="relative">
            <Label className="block text-sm font-medium mb-1.5">
              Service Category <span className="text-destructive">*</span>
            </Label>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsClientDropdownOpen(false)
                setIsCategoryDropdownOpen(!isCategoryDropdownOpen)
              }}
              className="w-full bg-input-bg border border-input hover:border-input-hover focus:border-ring focus:ring-1 focus:ring-ring rounded-xl px-3.5 py-2.5 text-left text-sm flex items-center justify-between transition-all"
            >
              <span className={serviceCategory ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                {serviceCategory || 'Select service...'}
              </span>
              <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>

            {isCategoryDropdownOpen && (
              <div
                className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-popover border border-border rounded-xl shadow-xl overflow-hidden py-1 max-h-56 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {SERVICE_CATEGORIES.map((cat) => {
                  const isSelected = serviceCategory === cat
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setServiceCategory(cat)
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
              Save Entry
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
