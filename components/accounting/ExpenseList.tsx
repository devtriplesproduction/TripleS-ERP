'use client'

import { useState } from 'react'
import { ExpenseRecord, BankAccount } from '@/types/accounting'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dropdown } from '@/components/ui/Dropdown'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { ExpenseModal } from './ExpenseModal'
import { AccountingNavTabs } from './AccountingNavTabs'
import { deleteExpenseAction } from '@/lib/actions/accounting'
import { toast } from 'sonner'
import {
  ArrowUpRight,
  Plus,
  Search,
  Edit2,
  Trash2,
  Receipt,
  CheckCircle2,
  Clock,
  FileText,
  Paperclip,
} from 'lucide-react'

interface ExpenseListProps {
  initialExpenses: ExpenseRecord[]
  bankAccounts: BankAccount[]
}

export function ExpenseList({
  initialExpenses,
  bankAccounts,
}: ExpenseListProps) {
  const [expenseList, setExpenseList] = useState<ExpenseRecord[]>(initialExpenses)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [bankFilter, setBankFilter] = useState<string>('ALL')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expenseToEdit, setExpenseToEdit] = useState<ExpenseRecord | null>(null)

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Calculations
  const totalRecorded = expenseList.reduce((sum, item) => sum + (item.total_amount || item.amount || 0), 0)
  const totalPaid = expenseList.reduce((sum, item) => {
    const paid = item.paid_amount !== undefined
      ? item.paid_amount
      : (item.status === 'Paid' ? (item.total_amount || item.amount || 0) : 0)
    return sum + paid
  }, 0)
  const totalPending = expenseList.reduce((sum, item) => {
    const pend = item.pending_amount !== undefined
      ? item.pending_amount
      : (item.status === 'Pending' ? (item.total_amount || item.amount || 0) : 0)
    return sum + pend
  }, 0)

  // Filtered list
  const filteredList = expenseList.filter((item) => {
    const q = search.toLowerCase()
    const matchesSearch =
      item.expense_number.toLowerCase().includes(q) ||
      item.vendor_payee.toLowerCase().includes(q) ||
      (item.campaign_project && item.campaign_project.toLowerCase().includes(q)) ||
      (item.invoice_number && item.invoice_number.toLowerCase().includes(q)) ||
      (item.payment_reference && item.payment_reference.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter
    const matchesBank = bankFilter === 'ALL' || item.bank_account_id === bankFilter

    return matchesSearch && matchesStatus && matchesCategory && matchesBank
  })

  const handleOpenCreate = () => {
    setExpenseToEdit(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: ExpenseRecord) => {
    setExpenseToEdit(item)
    setIsModalOpen(true)
  }

  const handleOpenDelete = (id: string) => {
    setDeletingId(id)
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      const res = await deleteExpenseAction(deletingId)
      if (res.success) {
        toast.success('Expense record deleted successfully.')
        setExpenseList((prev) => prev.filter((e) => e.id !== deletingId))
        setIsDeleteModalOpen(false)
        setDeletingId(null)
      } else {
        toast.error(res.error || 'Failed to delete expense record.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting expense record.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSuccess = () => {
    window.location.reload()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const distinctCategories = Array.from(new Set(expenseList.map((e) => e.category)))

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <PageHeader
        title="Expense Management"
        subtitle="Manage business outlays, vendor disbursements, utility payments, and operational costs."
        icon={ArrowUpRight}
        actions={
          <Button
            onClick={handleOpenCreate}
            className="w-full sm:w-auto h-11 px-5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
          >
            <Plus className="mr-2 h-4 w-4" />
            Record Expense
          </Button>
        }
      />

      <AccountingNavTabs />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Recorded</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{formatCurrency(totalRecorded)}</p>
              <p className="text-xs text-muted-foreground mt-1">{expenseList.length} expenses logged</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Receipt className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Paid & Settled</p>
              <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                {formatCurrency(totalPaid)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Disbursed from accounts</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Pending Due</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {formatCurrency(totalPending)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Payables awaiting settlement</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search Bar */}
      <Card className="border border-border/60 shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reference, vendor, details..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-card border-border h-10"
              />
            </div>

            {/* Status Filter */}
            <Dropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'Paid', label: 'Paid (Fully Settled)' },
                { value: 'Partially Paid', label: 'Partially Paid' },
                { value: 'Pending', label: 'Pending (Unpaid Bill)' },
                { value: 'Cancelled', label: 'Cancelled' },
              ]}
              buttonClassName="bg-card border-border h-10 w-full"
            />

            {/* Category Filter */}
            <Dropdown
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: 'ALL', label: 'All Categories' },
                ...distinctCategories.map((c) => ({ value: c, label: c })),
              ]}
              buttonClassName="bg-card border-border h-10 w-full"
            />

            {/* Bank Filter */}
            <Dropdown
              value={bankFilter}
              onChange={setBankFilter}
              options={[
                { value: 'ALL', label: 'All Bank Accounts' },
                ...bankAccounts.map((b) => ({ value: b.id, label: b.account_name })),
              ]}
              buttonClassName="bg-card border-border h-10 w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card className="border border-border/60 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[120px]">Reference</TableHead>
                <TableHead className="w-[110px]">Date</TableHead>
                <TableHead>Vendor & Campaign</TableHead>
                <TableHead>Expense Category</TableHead>
                <TableHead>Method & Account</TableHead>
                <TableHead className="text-right">Total Amount (GST)</TableHead>
                <TableHead className="text-center w-[130px]">Status</TableHead>
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileText className="h-8 w-8 text-muted-foreground/40" />
                      <p className="text-base font-medium">No expense records found</p>
                      <p className="text-xs text-muted-foreground">
                        {search || statusFilter !== 'ALL' || categoryFilter !== 'ALL'
                          ? 'Try resetting the active search or filters'
                          : 'Click "Record Expense" to add your first expense entry'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredList.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs font-semibold text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span>{item.expense_number}</span>
                        {item.attachment_url && (
                          <a
                            href={item.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-rose-500 hover:text-rose-600 inline-flex items-center"
                            title="View Attached Bill Proof"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      {item.invoice_number && (
                        <span className="text-[10px] text-muted-foreground font-mono block">
                          {item.invoice_number}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {item.expense_date}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground text-sm">{item.vendor_payee}</p>
                        {item.campaign_project && (
                          <p className="text-xs text-rose-500 font-medium truncate max-w-[260px]">
                            {item.campaign_project}
                          </p>
                        )}
                        {item.description && !item.campaign_project && (
                          <p className="text-xs text-muted-foreground truncate max-w-[260px]">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {item.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <p className="font-medium text-foreground">
                          {item.bank_name || item.bank_account_name || (item.payment_method === 'Cash' ? 'Cash' : item.payment_method)}
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          {item.payment_method}
                          {item.upi_id ? ` • ${item.upi_id}` : ''}
                          {item.card_last4 ? ` • *${item.card_last4}` : ''}
                          {item.cheque_number ? ` • #${item.cheque_number} (${item.cheque_status || 'Pending'})` : ''}
                          {item.payment_reference && !item.cheque_number ? ` • ${item.payment_reference}` : ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                        -{formatCurrency(item.total_amount || item.amount)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {item.tax_rate && item.tax_rate > 0 ? (
                          <span>Sub: {formatCurrency(item.amount)} (+{item.tax_rate}% GST)</span>
                        ) : (
                          <span>No Tax</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          item.status === 'Paid'
                            ? 'default'
                            : item.status === 'Partially Paid'
                            ? 'outline'
                            : item.status === 'Pending'
                            ? 'secondary'
                            : 'destructive'
                        }
                        className={
                          item.status === 'Paid'
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 border-rose-500/30'
                            : item.status === 'Partially Paid'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/30'
                            : item.status === 'Pending'
                            ? 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20 border-yellow-500/30'
                            : ''
                        }
                      >
                        {item.status}
                      </Badge>
                      {item.status === 'Partially Paid' && item.paid_amount !== undefined && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                          Paid: {formatCurrency(item.paid_amount)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(item)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Edit Expense"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete(item.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Delete Expense"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create / Edit Modal */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        expenseToEdit={expenseToEdit}
        bankAccounts={bankAccounts}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={isDeleteModalOpen}
        onOpenChange={(op) => !op && setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Expense Record"
        description="Are you sure you want to delete this expense record? The corresponding ledger entry and bank balance will be adjusted accordingly."
        confirmText="Delete Expense"
        variant="destructive"
      />
    </div>
  )
}
