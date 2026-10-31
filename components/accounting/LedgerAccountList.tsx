'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Layers,
  Plus,
  Search,
  ArrowRight,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Building2,
  Receipt,
  Scale,
  Power,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dropdown } from '@/components/ui/Dropdown'
import { toast } from 'sonner'
import { LedgerAccount, AccountType } from '@/types/accounting'
import { deleteLedgerAccountAction, toggleLedgerAccountStatusAction } from '@/lib/actions/accounting'
import { LedgerAccountModal } from './LedgerAccountModal'

interface LedgerAccountListProps {
  initialAccounts: LedgerAccount[]
}

export function LedgerAccountList({
  initialAccounts,
}: LedgerAccountListProps) {
  const [accounts, setAccounts] = useState<LedgerAccount[]>(initialAccounts)
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('ALL')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<LedgerAccount | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const typeOptions = [
    { value: 'ALL', label: 'All Account Types' },
    { value: 'Asset', label: 'Assets' },
    { value: 'Liability', label: 'Liabilities' },
    { value: 'Equity', label: 'Equity' },
    { value: 'Income', label: 'Income / Revenue' },
    { value: 'Expense', label: 'Expenses' },
  ]

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const q = search.toLowerCase()
      const matchesSearch =
        !search ||
        acc.account_name.toLowerCase().includes(q) ||
        acc.account_code.toLowerCase().includes(q) ||
        (acc.description && acc.description.toLowerCase().includes(q))

      const matchesType = selectedType === 'ALL' || acc.account_type === selectedType

      return matchesSearch && matchesType
    })
  }, [accounts, search, selectedType])

  // Count summaries
  const typeCounts = useMemo(() => {
    return {
      Asset: accounts.filter((a) => a.account_type === 'Asset').length,
      Liability: accounts.filter((a) => a.account_type === 'Liability').length,
      Equity: accounts.filter((a) => a.account_type === 'Equity').length,
      Income: accounts.filter((a) => a.account_type === 'Income').length,
      Expense: accounts.filter((a) => a.account_type === 'Expense').length,
    }
  }, [accounts])

  const refreshAccounts = async () => {
    try {
      const { getLedgerAccounts } = await import('@/lib/actions/accounting')
      const res = await getLedgerAccounts()
      if (res.success && res.data) {
        setAccounts(res.data)
      }
    } catch {
      // Ignore
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ledger account '${name}'?`)) {
      return
    }

    setActionLoadingId(id)
    try {
      const res = await deleteLedgerAccountAction(id)
      if (!res.success) {
        toast.error(res.error || 'Failed to delete account.')
      } else {
        toast.success(`Account '${name}' deleted successfully.`)
        setAccounts((prev) => prev.filter((a) => a.id !== id))
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting account.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleToggleStatus = async (id: string, name: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active'
    setActionLoadingId(id)
    try {
      const res = await toggleLedgerAccountStatusAction(id, newStatus)
      if (!res.success) {
        toast.error(res.error || 'Failed to update account status.')
      } else {
        toast.success(`Account '${name}' is now ${newStatus}.`)
        setAccounts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
        )
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating account status.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const getTypeBadgeClass = (type: AccountType) => {
    switch (type) {
      case 'Asset':
        return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
      case 'Liability':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
      case 'Equity':
        return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
      case 'Income':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
      case 'Expense':
        return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="space-y-6">
      {/* Category summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setSelectedType('Asset')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedType === 'Asset'
              ? 'border-blue-500/50 bg-blue-500/10 shadow-xs'
              : 'border-border bg-card hover:bg-muted/30'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Assets
          </div>
          <div className="text-xl font-bold font-mono text-foreground mt-1">
            {typeCounts.Asset}
          </div>
          <div className="text-[10px] text-muted-foreground">Cash, Banks, Receivables</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedType('Liability')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedType === 'Liability'
              ? 'border-amber-500/50 bg-amber-500/10 shadow-xs'
              : 'border-border bg-card hover:bg-muted/30'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Liabilities
          </div>
          <div className="text-xl font-bold font-mono text-foreground mt-1">
            {typeCounts.Liability}
          </div>
          <div className="text-[10px] text-muted-foreground">Payables, GST Output</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedType('Equity')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedType === 'Equity'
              ? 'border-purple-500/50 bg-purple-500/10 shadow-xs'
              : 'border-border bg-card hover:bg-muted/30'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Equity
          </div>
          <div className="text-xl font-bold font-mono text-foreground mt-1">
            {typeCounts.Equity}
          </div>
          <div className="text-[10px] text-muted-foreground">Capital & Retained Earnings</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedType('Income')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedType === 'Income'
              ? 'border-emerald-500/50 bg-emerald-500/10 shadow-xs'
              : 'border-border bg-card hover:bg-muted/30'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Income
          </div>
          <div className="text-xl font-bold font-mono text-foreground mt-1">
            {typeCounts.Income}
          </div>
          <div className="text-[10px] text-muted-foreground">SEO, Meta, Google Ads</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedType('Expense')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedType === 'Expense'
              ? 'border-rose-500/50 bg-rose-500/10 shadow-xs'
              : 'border-border bg-card hover:bg-muted/30'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Expenses
          </div>
          <div className="text-xl font-bold font-mono text-foreground mt-1">
            {typeCounts.Expense}
          </div>
          <div className="text-[10px] text-muted-foreground">Salaries, Rent, Ads Media</div>
        </button>
      </div>

      {/* Control bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-xs">
        <div className="flex flex-1 items-center gap-2.5 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search account name, code, or description..."
              className="text-xs pl-9 bg-background h-9"
            />
          </div>

          <div className="w-40">
            <Dropdown
              options={typeOptions}
              value={selectedType}
              onChange={(val) => setSelectedType(val)}
              className="text-xs h-9 bg-background"
            />
          </div>

          {(search || selectedType !== 'ALL') && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('')
                setSelectedType('ALL')
              }}
              className="text-xs h-9 text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          )}
        </div>

        <Button
          type="button"
          onClick={() => {
            setEditingAccount(null)
            setIsModalOpen(true)
          }}
          className="text-xs h-9 gap-1.5 shrink-0 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Ledger Account</span>
        </Button>
      </div>

      {/* Accounts Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 border-b border-border font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 w-28">Code</th>
                <th className="py-3 px-4 min-w-[220px]">Account Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Opening Balance</th>
                <th className="py-3 px-4 text-right">Current Balance</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="w-8 h-8 text-muted-foreground/50" />
                      <div className="text-sm font-semibold text-foreground">No Ledger Accounts Found</div>
                      <p className="text-xs text-muted-foreground">
                        {search || selectedType !== 'ALL'
                          ? 'Try adjusting your search criteria.'
                          : 'Create an account to build your Chart of Accounts.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr
                    key={acc.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    {/* Code */}
                    <td className="py-3 px-4 font-mono font-semibold text-foreground whitespace-nowrap">
                      <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
                        {acc.account_code}
                      </Badge>
                    </td>

                    {/* Name & Description */}
                    <td className="py-3 px-4">
                      <Link
                        href={`/accounting/ledger-accounts/${acc.id}`}
                        className="font-semibold text-foreground hover:text-primary hover:underline transition-colors block"
                      >
                        {acc.account_name}
                      </Link>
                      {acc.description && (
                        <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {acc.description}
                        </div>
                      )}
                    </td>

                    {/* Type */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-medium border ${getTypeBadgeClass(acc.account_type)}`}
                      >
                        {acc.account_type}
                      </Badge>
                    </td>

                    {/* Opening Balance */}
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground whitespace-nowrap">
                      ₹{acc.opening_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      <span className="text-[10px] ml-1 text-muted-foreground/80 font-sans">
                        ({acc.opening_balance_type})
                      </span>
                    </td>

                    {/* Current Balance */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-foreground whitespace-nowrap">
                      ₹{acc.current_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      <span className="text-[10px] ml-1 font-sans text-muted-foreground">
                        {acc.account_type === 'Asset' || acc.account_type === 'Expense' ? 'Dr' : 'Cr'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <Badge
                        variant={acc.status === 'Active' ? 'default' : 'secondary'}
                        className={
                          acc.status === 'Active'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {acc.status}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Ledger Details */}
                        <Link href={`/accounting/ledger-accounts/${acc.id}`}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs gap-1 text-primary hover:bg-primary/10"
                            title="View Transaction History"
                          >
                            <span>Ledger</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>

                        {/* Edit */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingAccount(acc)
                            setIsModalOpen(true)
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Edit Account"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>

                        {/* Activate / Deactivate Toggle */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(acc.id, acc.account_name, acc.status)}
                          disabled={actionLoadingId === acc.id}
                          className={`h-8 w-8 ${
                            acc.status === 'Active'
                              ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-500/10'
                              : 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10'
                          }`}
                          title={acc.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </Button>

                        {/* Delete */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(acc.id, acc.account_name)}
                          disabled={actionLoadingId === acc.id}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Delete Account"
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

      {/* Modal */}
      <LedgerAccountModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingAccount(null)
        }}
        onSuccess={async () => {
          await refreshAccounts()
        }}
        accountToEdit={editingAccount}
        existingAccounts={accounts}
      />
    </div>
  )
}
