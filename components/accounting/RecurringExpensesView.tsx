'use client'

import { useState } from 'react'
import { RecurringExpenseRule } from '@/types/accounting'
import { AccountingNavTabs } from './AccountingNavTabs'
import { CreateRecurringExpenseModal } from './CreateRecurringExpenseModal'
import { toggleRecurringExpenseStatusAction, deleteRecurringExpenseAction } from '@/lib/actions/accounting'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Trash2,
  Calendar,
  Repeat,
  Pencil,
  Play,
  Pause,
} from 'lucide-react'
import { toast } from 'sonner'

interface RecurringExpensesViewProps {
  initialRules: RecurringExpenseRule[]
}

export function RecurringExpensesView({
  initialRules,
}: RecurringExpensesViewProps) {
  const [rules, setRules] = useState<RecurringExpenseRule[]>(initialRules)
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

  const formatOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }

  const handleToggleStatus = async (id: string) => {
    try {
      const res = await toggleRecurringExpenseStatusAction(id)
      if (res.success && res.data) {
        setRules((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: res.data!.status } : r))
        )
        toast.success(`Recurring rule status updated to ${res.data.status}`)
      } else {
        toast.error(res.error || 'Failed to update rule status')
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating status')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      const res = await deleteRecurringExpenseAction(deletingId)
      if (res.success) {
        setRules((prev) => prev.filter((r) => r.id !== deletingId))
        toast.success('Recurring expense rule deleted successfully')
        setIsDeleteOpen(false)
        setDeletingId(null)
      } else {
        toast.error(res.error || 'Failed to delete rule')
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting rule')
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
            Recurring Expenses
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage fixed monthly obligations (Rent, Hosting, salaries).
          </p>
        </div>

        {/* Square button, no orange */}
        <Button
          type="button"
          variant="default"
          onClick={() => setIsCreateOpen(true)}
          className="rounded-lg"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Add Recurring Rule</span>
        </Button>
      </div>

      {/* Recurring Expenses Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40">
                <th className="py-4 px-5">RULE NAME</th>
                <th className="py-4 px-5">AMOUNT</th>
                <th className="py-4 px-5">CATEGORY</th>
                <th className="py-4 px-5">SCHEDULE</th>
                <th className="py-4 px-5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-sm">
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-muted-foreground">
                    <p className="text-base font-medium">No recurring expense rules found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click &quot;+ Add Recurring Rule&quot; to automate recurring disbursements.
                    </p>
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr
                    key={rule.id}
                    className="hover:bg-muted/40 transition-colors group"
                  >
                    {/* Rule Name */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                          <Repeat className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{rule.internal_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{rule.vendor_name || rule.internal_name}</p>
                        </div>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-4 px-5 font-bold font-mono text-foreground whitespace-nowrap">
                      {formatCurrency(rule.monthly_amount)}
                    </td>

                    {/* Category */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <Badge variant="secondary" className="px-3 py-1 font-normal text-xs">
                        {rule.category}
                      </Badge>
                    </td>

                    {/* Schedule */}
                    <td className="py-4 px-5 whitespace-nowrap text-muted-foreground">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>Due on {formatOrdinal(rule.due_day_of_month || 1)}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(rule.id)}
                          className="cursor-pointer"
                          title="Click to toggle Active / Paused"
                        >
                          {rule.status === 'Active' ? (
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

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleToggleStatus(rule.id)}
                          title="Edit rule"
                          className="rounded-lg"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => {
                            setDeletingId(rule.id)
                            setIsDeleteOpen(true)
                          }}
                          className="rounded-lg text-muted-foreground hover:text-destructive"
                          title="Delete rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <CreateRecurringExpenseModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => window.location.reload()}
      />

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onCancel={() => {
          setIsDeleteOpen(false)
          setDeletingId(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Recurring Expense Rule"
        description="Are you sure you want to delete this recurring expense rule? Upcoming automated billings will be stopped."
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        variant="destructive"
      />
    </div>
  )
}
