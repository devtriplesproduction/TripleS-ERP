'use client'

import { useState } from 'react'
import { X, Calendar } from 'lucide-react'
import { ReceivableRecord, ReceivableStatus } from '@/types/accounting'
import { createReceivableAction } from '@/lib/actions/accounting'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface CreateReceivableModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateReceivableModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateReceivableModalProps) {
  const [clientName, setClientName] = useState('')
  const [projectPlan, setProjectPlan] = useState('')
  const [expectedDate, setExpectedDate] = useState('2026-11-10')
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState<ReceivableStatus>('Overdue')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!clientName.trim()) {
      toast.error('Please enter a client name.')
      return
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount greater than 0.')
      return
    }

    if (!expectedDate) {
      toast.error('Please select an expected payment date.')
      return
    }

    setLoading(true)
    try {
      const res = await createReceivableAction({
        client_name: clientName.trim(),
        project_plan: projectPlan.trim() || 'Retainer',
        expected_date: expectedDate,
        amount: parsedAmount,
        status,
        notes: notes.trim() || undefined,
      })

      if (res.success) {
        toast.success('Receivable record created successfully!')
        onSuccess()
        onClose()
      } else {
        toast.error(res.error || 'Failed to create receivable.')
      }
    } catch {
      toast.error('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl p-6 sm:p-7 overflow-hidden text-card-foreground">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">Add Receivable</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Record an upcoming or overdue client payment for collection tracking.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-lg h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Client Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. RX Hiring Agency, Bolbo Global"
              className="rounded-lg h-9 text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Project / Plan <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              value={projectPlan}
              onChange={(e) => setProjectPlan(e.target.value)}
              placeholder="e.g. Retainer, Digital Marketing, Milestone 2"
              className="rounded-lg h-9 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Amount (₹) <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                step="any"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="₹ 0.00"
                className="rounded-lg h-9 text-sm font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Expected Date <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="rounded-lg h-9 text-sm pl-9"
                  required
                />
                <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Collection Status</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('Overdue')}
                className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all text-center ${status === 'Overdue'
                  ? 'bg-red-500/15 border-red-500/40 text-red-400 font-semibold shadow-xs'
                  : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted/70'
                  }`}
              >
                Overdue
              </button>
              <button
                type="button"
                onClick={() => setStatus('On Hold')}
                className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all text-center ${status === 'On Hold'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 font-semibold shadow-xs'
                  : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted/70'
                  }`}
              >
                On Hold
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Notes <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Promised payment after invoice revision"
              className="rounded-lg h-9 text-sm"
            />
          </div>

          {/* Action Buttons - CENTERED SQUARE BUTTONS, NO COLOR HOVER SHIFT */}
          <div className="flex items-center justify-center gap-3 pt-4 border-t border-border mt-5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg text-xs h-9 px-5 font-semibold hover:bg-transparent hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-lg text-xs h-9 px-6 font-semibold shadow-xs hover:bg-primary"
            >
              {loading ? 'Saving...' : 'Save Receivable'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

