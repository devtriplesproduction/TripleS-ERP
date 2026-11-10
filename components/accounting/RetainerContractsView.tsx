'use client'

import { useState } from 'react'
import { RetainerContract } from '@/types/accounting'
import { AccountingNavTabs } from './AccountingNavTabs'
import { CreateRetainerModal } from './CreateRetainerModal'
import { toggleRetainerStatusAction, deleteRetainerContractAction } from '@/lib/actions/accounting'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Plus,
  Trash2,
  FileText,
  Calendar,
  ChevronRight,
  Pause,
  Play,
} from 'lucide-react'
import { toast } from 'sonner'

interface RetainerContractsViewProps {
  initialRetainers: RetainerContract[]
  existingClients: { id: string; name: string }[]
}

export function RetainerContractsView({
  initialRetainers,
  existingClients,
}: RetainerContractsViewProps) {
  const [retainers, setRetainers] = useState<RetainerContract[]>(initialRetainers)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  const formatCreatedDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    const month = d.toLocaleString('en-US', { month: 'short' })
    const day = d.getDate()
    const year = d.getFullYear()
    return `Created ${month} ${day}, ${year}`
  }

  const handleToggleStatus = async (id: string) => {
    try {
      const res = await toggleRetainerStatusAction(id)
      if (res.success && res.data) {
        setRetainers((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: res.data!.status } : r))
        )
        toast.success(`Retainer status updated to ${res.data.status}`)
      } else {
        toast.error(res.error || 'Failed to update retainer status')
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating status')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      const res = await deleteRetainerContractAction(deletingId)
      if (res.success) {
        setRetainers((prev) => prev.filter((r) => r.id !== deletingId))
        toast.success('Retainer contract deleted successfully')
        setIsDeleteOpen(false)
        setDeletingId(null)
      } else {
        toast.error(res.error || 'Failed to delete contract')
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting contract')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Nav Tabs */}
      <AccountingNavTabs />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Recurring Income
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage long-term client engagements, recurring income streams, and billing.
          </p>
        </div>

        {/* Square button, no orange */}
        <Button
          type="button"
          variant="default"
          onClick={() => setIsCreateOpen(true)}
          className="rounded-lg text-xs font-semibold h-9 px-4 shadow-xs"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span>New Recurring Income</span>
        </Button>
      </div>

      {/* Retainer Contracts Grid (3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {retainers.length === 0 ? (
          <div className="col-span-full py-16 text-center text-muted-foreground bg-card border border-border rounded-xl">
            <p className="text-base font-medium">No recurring income contracts recorded</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click &quot;+ New Recurring Income&quot; to add recurring client revenue.
            </p>
          </div>
        ) : (
          retainers.map((contract) => (
            <Card
              key={contract.id}
              className="border-border hover:border-border/80 transition-all shadow-sm rounded-xl flex flex-col justify-between"
            >
              <CardContent className="p-5 space-y-4">
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-foreground truncate">
                      {contract.contract_name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {contract.client_name}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      setDeletingId(contract.id)
                      setIsDeleteOpen(true)
                    }}
                    className="rounded-lg text-muted-foreground hover:text-destructive shrink-0"
                    title="Delete contract"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(contract.id)}
                    className="cursor-pointer"
                    title="Click to toggle Active / Paused"
                  >
                    {contract.status === 'Active' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <Play className="w-2.5 h-2.5 fill-current" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-muted text-muted-foreground border border-border">
                        <Pause className="w-2.5 h-2.5 fill-current" />
                        Paused
                      </span>
                    )}
                  </button>

                  <span className="text-xs font-mono font-bold text-foreground ml-auto">
                    {formatCurrency(contract.monthly_price)} / mo
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{contract.service}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{formatCreatedDate(contract.start_date || contract.created_at)}</span>
                  </div>
                </div>

                {/* Card Footer Link */}
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(contract.id)}
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>MANAGE</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] text-muted-foreground">
                    {contract.status === 'Active' ? 'Billing On' : 'Billing Paused'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Modal */}
      <CreateRetainerModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => window.location.reload()}
        existingClients={existingClients}
      />

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onCancel={() => {
          setIsDeleteOpen(false)
          setDeletingId(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Retainer Contract"
        description="Are you sure you want to permanently delete this retainer contract? Active monthly automated billings will stop."
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        variant="destructive"
      />
    </div>
  )
}
