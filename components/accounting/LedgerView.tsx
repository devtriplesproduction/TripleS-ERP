'use client'

import { useState } from 'react'
import { LedgerTransaction, BankAccount } from '@/types/accounting'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dropdown } from '@/components/ui/Dropdown'
import { AccountingNavTabs } from './AccountingNavTabs'
import { ManualEntryModal } from './ManualEntryModal'
import {
  Receipt,
  Search,
  Plus,
  Scale,
  Calendar,
  Building2,
  FileText,
  Printer,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

interface LedgerViewProps {
  initialTransactions: LedgerTransaction[]
  bankAccounts: BankAccount[]
}

export function LedgerView({
  initialTransactions,
  bankAccounts,
}: LedgerViewProps) {
  const [transactions, setTransactions] = useState<LedgerTransaction[]>(initialTransactions)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [accountFilter, setAccountFilter] = useState<string>('ALL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Filtered transactions
  const filtered = transactions.filter((tx) => {
    const q = search.toLowerCase()
    const matchesSearch =
      tx.reference_number.toLowerCase().includes(q) ||
      tx.description.toLowerCase().includes(q) ||
      tx.account_name.toLowerCase().includes(q)

    const matchesType = typeFilter === 'ALL' || tx.transaction_type === typeFilter
    const matchesAccount = accountFilter === 'ALL' || tx.account_id === accountFilter || tx.account_name === accountFilter

    let matchesDate = true
    if (startDate) {
      matchesDate = matchesDate && tx.transaction_date >= startDate
    }
    if (endDate) {
      matchesDate = matchesDate && tx.transaction_date <= endDate
    }

    return matchesSearch && matchesType && matchesAccount && matchesDate
  })

  // Running balance computation for filtered subset in chronological order
  // When displayed, we can sort newest first, but ensure balances are preserved
  const totalDebits = filtered.reduce((sum, tx) => sum + (tx.debit || 0), 0)
  const totalCredits = filtered.reduce((sum, tx) => sum + (tx.credit || 0), 0)
  const netDifference = totalDebits - totalCredits

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleSuccess = () => {
    window.location.reload()
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <PageHeader
        title="General Ledger"
        subtitle="Complete chronological record of all debit and credit entries with running balances."
        icon={Receipt}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handlePrint}
              className="h-11 px-4 text-muted-foreground hover:text-foreground"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Ledger
            </Button>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="h-11 px-5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            >
              <Plus className="mr-2 h-4 w-4" />
              Journal Entry
            </Button>
          </div>
        }
      />

      <AccountingNavTabs />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Debits (+)</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(totalDebits)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Inflows & Asset Additions</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Credits (-)</p>
              <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                {formatCurrency(totalCredits)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Outflows & Disbursements</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
              <TrendingDown className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Net Position</p>
              <p
                className={`text-xl font-bold mt-0.5 ${
                  netDifference >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatCurrency(netDifference)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Filtered transactions net</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Scale className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Panel */}
      <Card className="border border-border/60 shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reference, description, account..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-card border-border h-10"
              />
            </div>

            {/* Transaction Type Filter */}
            <Dropdown
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'ALL', label: 'All Transaction Types' },
                { value: 'INCOME', label: 'Income Only' },
                { value: 'EXPENSE', label: 'Expense Only' },
                { value: 'ADJUSTMENT', label: 'Adjustments' },
                { value: 'TRANSFER', label: 'Transfers' },
              ]}
              buttonClassName="bg-card border-border h-10 w-full"
            />

            {/* Account Filter */}
            <Dropdown
              value={accountFilter}
              onChange={setAccountFilter}
              options={[
                { value: 'ALL', label: 'All Accounts' },
                ...bankAccounts.map((b) => ({ value: b.id, label: b.account_name })),
              ]}
              buttonClassName="bg-card border-border h-10 w-full"
            />

            {/* Reset Filters */}
            <Button
              variant="outline"
              onClick={() => {
                setSearch('')
                setTypeFilter('ALL')
                setAccountFilter('ALL')
                setStartDate('')
                setEndDate('')
              }}
              className="h-10 text-muted-foreground hover:text-foreground"
            >
              Reset Filters
            </Button>
          </div>

          {/* Date range filters */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50 text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Date Range:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">From:</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-xs w-[140px] bg-card border-border"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">To:</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 text-xs w-[140px] bg-card border-border"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ledger Table */}
      <Card className="border border-border/60 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[110px]">Date</TableHead>
                <TableHead className="w-[130px]">Reference</TableHead>
                <TableHead className="w-[110px]">Type</TableHead>
                <TableHead>Description / Particulars</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right w-[120px]">Debit (₹)</TableHead>
                <TableHead className="text-right w-[120px]">Credit (₹)</TableHead>
                <TableHead className="text-right w-[130px] font-semibold">Balance (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileText className="h-8 w-8 text-muted-foreground/40" />
                      <p className="text-base font-medium">No ledger transactions found</p>
                      <p className="text-xs text-muted-foreground">
                        {search || typeFilter !== 'ALL' || accountFilter !== 'ALL' || startDate || endDate
                          ? 'Try resetting the filters above'
                          : 'Transactions recorded in Income, Expenses, or Journal Entries will show here'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {tx.transaction_date}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                      {tx.reference_number}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          tx.transaction_type === 'INCOME'
                            ? 'text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                            : tx.transaction_type === 'EXPENSE'
                            ? 'text-rose-700 dark:text-rose-400 border-rose-500/30 bg-rose-500/10'
                            : 'text-primary border-primary/30 bg-primary/10'
                        }
                      >
                        {tx.transaction_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground">{tx.description}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {tx.account_name}
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400 text-sm whitespace-nowrap">
                      {tx.debit > 0 ? formatCurrency(tx.debit) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-rose-600 dark:text-rose-400 text-sm whitespace-nowrap">
                      {tx.credit > 0 ? formatCurrency(tx.credit) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-bold text-foreground text-sm whitespace-nowrap">
                      {formatCurrency(tx.balance)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Manual Entry Modal */}
      <ManualEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        bankAccounts={bankAccounts}
      />
    </div>
  )
}
