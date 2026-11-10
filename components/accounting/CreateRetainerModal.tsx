'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Calendar,
  ChevronsUpDown,
  Check,
  Plus,
} from 'lucide-react'
import { RetainerContract } from '@/types/accounting'
import { createRetainerContractAction } from '@/lib/actions/accounting'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export const RETAINER_SERVICES = [
  'Hosting & Website Maintaince',
  'Software Development',
  'Digital Marketing',
  'SEO Services',
  'General Service',
  'Social Media Marketing',
  'Google Ads / PPC',
  'Meta Ads Management',
  'Consulting',
] as const

interface CreateRetainerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  existingClients?: { id: string; name: string }[]
}

export function CreateRetainerModal({
  isOpen,
  onClose,
  onSuccess,
  existingClients = [],
}: CreateRetainerModalProps) {
  const [contractName, setContractName] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientId, setClientId] = useState<string | null>(null)
  const [service, setService] = useState('')
  const [monthlyPrice, setMonthlyPrice] = useState('')
  const [startDate, setStartDate] = useState('2026-11-10')

  const [isClientOpen, setIsClientOpen] = useState(false)
  const [isServiceOpen, setIsServiceOpen] = useState(false)
  const [customClientInput, setCustomClientInput] = useState('')
  const [loading, setLoading] = useState(false)

  const defaultClients = [
    { id: 'c1', name: 'Aromastra' },
    { id: 'c2', name: 'SkinFix Clinic' },
    { id: 'c3', name: 'BuysaleIndia' },
    { id: 'c4', name: 'Mukta Global Associates' },
    { id: 'c5', name: 'Nature Leaf' },
    { id: 'c6', name: 'Earthly Flavours' },
    ...existingClients,
  ]

  useEffect(() => {
    if (isOpen) {
      setContractName('')
      setClientName('')
      setClientId(null)
      setService('')
      setMonthlyPrice('')
      setStartDate('2026-11-10')
      setCustomClientInput('')
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

    if (!contractName.trim()) {
      toast.error('Please enter contract name.')
      return
    }

    if (!clientName.trim()) {
      toast.error('Please select or enter client name.')
      return
    }

    if (!service.trim()) {
      toast.error('Please select a service.')
      return
    }

    const price = parseFloat(monthlyPrice)
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid monthly price.')
      return
    }

    setLoading(true)

    try {
      const res = await createRetainerContractAction({
        contract_name: contractName.trim(),
        client_name: clientName.trim(),
        client_id: clientId || undefined,
        service: service.trim(),
        monthly_price: price,
        start_date: startDate,
        status: 'Active',
      })

      if (res.success) {
        toast.success('Retainer contract created successfully!')
        onSuccess()
        onClose()
      } else {
        toast.error(res.error || 'Failed to create retainer contract.')
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
          setIsClientOpen(false)
          setIsServiceOpen(false)
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Create Recurring Income
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
          {/* Contract Name */}
          <div>
            <Label className="block text-sm font-medium mb-1.5">
              Contract Name
            </Label>
            <Input
              type="text"
              placeholder="e.g. Monthly SEO Retainer"
              value={contractName}
              onChange={(e) => setContractName(e.target.value)}
              className="text-sm rounded-lg"
              required
            />
          </div>

          {/* Client */}
          <div className="relative">
            <Label className="block text-sm font-medium mb-1.5">
              Client
            </Label>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsServiceOpen(false)
                setIsClientOpen(!isClientOpen)
              }}
              className="w-full bg-input-bg border border-input hover:border-input-hover focus:border-ring focus:ring-1 focus:ring-ring rounded-lg px-3.5 py-2.5 text-left text-sm flex items-center justify-between transition-all"
            >
              <span className={clientName ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                {clientName || 'Select client...'}
              </span>
              <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>

            {isClientOpen && (
              <div
                className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-popover border border-border rounded-lg shadow-xl overflow-hidden py-1 max-h-52 overflow-y-auto"
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
                        setIsClientOpen(false)
                      }
                    }}
                    className="h-8 text-xs rounded-md"
                    autoFocus
                  />
                  {customClientInput.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setClientName(customClientInput.trim())
                        setClientId(null)
                        setIsClientOpen(false)
                      }}
                      className="w-full mt-1.5 text-left px-2 py-1 text-xs text-primary hover:bg-muted rounded flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Use &quot;{customClientInput.trim()}&quot;
                    </button>
                  )}
                </div>

                {defaultClients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setClientName(c.name)
                      setClientId(c.id)
                      setIsClientOpen(false)
                    }}
                    className="w-full text-left px-3.5 py-2 text-sm text-foreground hover:bg-muted flex items-center justify-between"
                  >
                    <span>{c.name}</span>
                    {clientName === c.name && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Service */}
          <div className="relative">
            <Label className="block text-sm font-medium mb-1.5">
              Service
            </Label>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsClientOpen(false)
                setIsServiceOpen(!isServiceOpen)
              }}
              className="w-full bg-input-bg border border-input hover:border-input-hover focus:border-ring focus:ring-1 focus:ring-ring rounded-lg px-3.5 py-2.5 text-left text-sm flex items-center justify-between transition-all"
            >
              <span className={service ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                {service || 'Select service...'}
              </span>
              <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>

            {isServiceOpen && (
              <div
                className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-popover border border-border rounded-lg shadow-xl overflow-hidden py-1 max-h-52 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {RETAINER_SERVICES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setService(s)
                      setIsServiceOpen(false)
                    }}
                    className="w-full text-left px-3.5 py-2 text-sm text-foreground hover:bg-muted flex items-center justify-between"
                  >
                    <span>{s}</span>
                    {service === s && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Monthly Price and Start Date */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <Label className="block text-sm font-medium mb-1.5">
                Monthly Price
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
                  value={monthlyPrice}
                  onChange={(e) => setMonthlyPrice(e.target.value)}
                  className="pl-8 font-mono text-sm rounded-lg"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="block text-sm font-medium mb-1.5">
                Start Date
              </Label>
              <div className="relative flex items-center bg-input-bg border border-input hover:border-input-hover focus-within:border-ring focus-within:ring-1 focus-within:ring-ring rounded-lg px-3 py-2.5 transition-all">
                <Calendar className="w-4 h-4 text-muted-foreground mr-2 shrink-0 select-none" />
                <span className="text-sm text-foreground truncate select-none">
                  {formatDisplayDate(startDate)}
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  required
                />
              </div>
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
              Create Recurring Income
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

