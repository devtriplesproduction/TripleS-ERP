'use client'

import { useState } from 'react'
import { X, Calendar } from 'lucide-react'
import { ReceivableRecord } from '@/types/accounting'
import { extendReceivableDateAction } from '@/lib/actions/accounting'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface ExtendReceivableModalProps {
  isOpen: boolean
  receivable: ReceivableRecord | null
  onClose: () => void
  onSuccess: () => void
}

export function ExtendReceivableModal({
  isOpen,
  receivable,
  onClose,
  onSuccess,
}: ExtendReceivableModalProps) {
  const [newDate, setNewDate] = useState(receivable?.expected_date || '')
  const [loading, setLoading] = useState(false)

  if (!isOpen || !receivable) return null

  const handleExtend = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newDate) {
      toast.error('Please choose a valid extended date.')
      return
    }

    setLoading(true)
    try {
      const res = await extendReceivableDateAction(receivable.id, newDate)
      if (res.success) {
        toast.success(`Due date updated for ${receivable.client_name}`)
        onSuccess()
        onClose()
      } else {
        toast.error(res.error || 'Failed to update due date.')
      }
    } catch {
      toast.error('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-6 text-card-foreground">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h3 className="text-base font-bold text-foreground">Extend Due Date</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {receivable.client_name} · {receivable.project_plan}
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

        <form onSubmit={handleExtend} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              New Expected Payment Date
            </Label>
            <div className="relative">
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="rounded-lg h-9 text-sm pl-9"
                required
              />
              <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Current expected date was: {receivable.expected_date} ({receivable.overdue_days} days overdue)
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-4 border-t border-border mt-4">
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
              {loading ? 'Updating...' : 'Update Date'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

