'use client'

import { useState } from 'react'
import { BankAccount, BankAccountStatus } from '@/types/accounting'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { BankAccountModal } from './BankAccountModal'
import { AccountingNavTabs } from './AccountingNavTabs'
import { toggleBankAccountStatusAction, deleteBankAccountAction } from '@/lib/actions/accounting'
import { toast } from 'sonner'
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Power,
  Eye,
  EyeOff,
  CreditCard,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Copy,
} from 'lucide-react'

interface BankAccountListProps {
  initialAccounts: BankAccount[]
}

export function BankAccountList({ initialAccounts }: BankAccountListProps) {
  const [accounts, setAccounts] = useState<BankAccount[]>(initialAccounts)
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({})

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [accountToEdit, setAccountToEdit] = useState<BankAccount | null>(null)

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const totalBalance = accounts
    .filter((a) => a.status === 'Active')
    .reduce((sum, a) => sum + (a.current_balance || 0), 0)

  const activeAccountsCount = accounts.filter((a) => a.status === 'Active').length

  const toggleMask = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const maskAccountNumber = (accNum: string, isRevealed?: boolean) => {
    if (isRevealed) return accNum
    if (!accNum) return '••••'
    if (accNum.length <= 4) return accNum
    const last4 = accNum.slice(-4)
    return `•••• •••• •••• ${last4}`
  }

  const handleCopy = (accNum: string) => {
    navigator.clipboard.writeText(accNum)
    toast.success('Account number copied to clipboard.')
  }

  const handleOpenCreate = () => {
    setAccountToEdit(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (acc: BankAccount) => {
    setAccountToEdit(acc)
    setIsModalOpen(true)
  }

  const handleToggleStatus = async (acc: BankAccount) => {
    const newStatus: BankAccountStatus = acc.status === 'Active' ? 'Inactive' : 'Active'
    try {
      const res = await toggleBankAccountStatusAction(acc.id, newStatus)
      if (res.success && res.data) {
        toast.success(`Account marked as ${newStatus}.`)
        setAccounts((prev) =>
          prev.map((a) => (a.id === acc.id ? { ...a, status: newStatus } : a))
        )
      } else {
        toast.error(res.error || 'Failed to update status.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating status.')
    }
  }

  const handleOpenDelete = (id: string) => {
    setDeletingId(id)
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      const res = await deleteBankAccountAction(deletingId)
      if (res.success) {
        toast.success('Bank account deleted.')
        setAccounts((prev) => prev.filter((a) => a.id !== deletingId))
        setIsDeleteModalOpen(false)
        setDeletingId(null)
      } else {
        toast.error(res.error || 'Failed to delete account.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting account.')
    } finally {
      setIsDeleting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <PageHeader
        title="Bank & Cash Accounts"
        subtitle="Manage corporate checking accounts, petty cash reserves, and banking integrations."
        icon={Building2}
        actions={
          <Button
            onClick={handleOpenCreate}
            className="w-full sm:w-auto h-11 px-5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Bank Account
          </Button>
        }
      />

      <AccountingNavTabs />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Liquid Reserves</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{formatCurrency(totalBalance)}</p>
              <p className="text-xs text-muted-foreground mt-1">Across all active accounts</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Wallet className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Accounts</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {activeAccountsCount} Accounts
              </p>
              <p className="text-xs text-muted-foreground mt-1">Ready for transaction posting</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Security Protection</p>
              <p className="text-xl font-bold text-primary mt-0.5">Masked Numbers</p>
              <p className="text-xs text-muted-foreground mt-1">Sensitive identifiers masked by default</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <CreditCard className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {accounts.map((acc) => {
          const isRevealed = !!revealedIds[acc.id]

          return (
            <Card
              key={acc.id}
              className={`border transition-all duration-200 shadow-xs ${
                acc.status === 'Active'
                  ? 'border-border/80 hover:border-primary/40'
                  : 'border-border/40 opacity-75 bg-muted/20'
              }`}
            >
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold truncate flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate">{acc.account_name}</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground truncate mt-0.5">
                      {acc.bank_name} {acc.branch ? `• ${acc.branch}` : ''}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={acc.status === 'Active' ? 'default' : 'secondary'}
                    className={
                      acc.status === 'Active'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-muted text-muted-foreground'
                    }
                  >
                    {acc.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Account Number with Mask / Reveal */}
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                      Account Number
                    </p>
                    <p className="font-mono text-xs sm:text-sm font-medium text-foreground tracking-wide mt-0.5 truncate">
                      {maskAccountNumber(acc.account_number, isRevealed)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleMask(acc.id)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title={isRevealed ? 'Mask number' : 'Reveal number'}
                    >
                      {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(acc.account_number)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy account number"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p className="font-medium text-foreground">{acc.account_type}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">IFSC / Code:</span>
                    <p className="font-mono font-medium text-foreground">{acc.ifsc_code || '—'}</p>
                  </div>
                </div>

                {/* Balance display */}
                <div className="pt-2 border-t border-border/40 flex items-end justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground">Current Balance</span>
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(acc.current_balance)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-muted-foreground">Opening Balance</span>
                    <p className="text-xs font-medium text-muted-foreground">
                      {formatCurrency(acc.opening_balance)}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleStatus(acc)}
                    className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <Power className={`w-3.5 h-3.5 mr-1 ${acc.status === 'Active' ? 'text-amber-500' : 'text-emerald-500'}`} />
                    {acc.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(acc)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="Edit Account"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDelete(acc.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Delete Account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Bank Account Modal */}
      <BankAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => window.location.reload()}
        accountToEdit={accountToEdit}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={isDeleteModalOpen}
        onOpenChange={(op) => !op && setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Bank Account"
        description="Are you sure you want to delete this bank account? All associated transaction histories and ledger records will be orphaned if deleted."
        confirmText="Delete Account"
        variant="destructive"
      />
    </div>
  )
}
