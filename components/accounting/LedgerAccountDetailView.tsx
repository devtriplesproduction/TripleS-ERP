'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Layers,
  ArrowLeft,
  Search,
  Calendar,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  Building2,
  FileText,
  Printer,
  Scale,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dropdown } from '@/components/ui/Dropdown'
import { toast } from 'sonner'
import {
  LedgerAccount,
  AccountType,
} from '@/types/accounting'
import {
  LedgerAccountDetailsResponse,
  LedgerAccountTransactionHistoryItem,
} from '@/lib/actions/accounting'

interface LedgerAccountDetailViewProps {
  initialData: LedgerAccountDetailsResponse
}

export function LedgerAccountDetailView({
  initialData,
}: LedgerAccountDetailViewProps) {
  const { account } = initialData
  const [transactions, setTransactions] = useState<LedgerAccountTransactionHistoryItem[]>(
    initialData.transactions
  )
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [campaignFilter, setCampaignFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const isDebitNormal = account.account_type === 'Asset' || account.account_type === 'Expense'

  const typeOptions = [
    { value: 'ALL', label: 'All Transaction Types' },
    { value: 'Journal Entry', label: 'Journal Entries' },
    { value: 'Income', label: 'Income Records' },
    { value: 'Expense', label: 'Expense Records' },
  ]

  // Filtered rows
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const q = search.toLowerCase()
      const matchesSearch =
        !search ||
        tx.description.toLowerCase().includes(q) ||
        tx.reference_number.toLowerCase().includes(q) ||
        (tx.journal_entry_number && tx.journal_entry_number.toLowerCase().includes(q))

      const matchesType = typeFilter === 'ALL' || tx.transaction_type.toLowerCase().includes(typeFilter.toLowerCase())

      const matchesCampaign =
        !campaignFilter ||
        (tx.campaign_project && tx.campaign_project.toLowerCase().includes(campaignFilter.toLowerCase()))

      let matchesDate = true
      if (startDate) matchesDate = matchesDate && tx.transaction_date >= startDate
      if (endDate) matchesDate = matchesDate && tx.transaction_date <= endDate

      return matchesSearch && matchesType && matchesCampaign && matchesDate
    })
  }, [transactions, search, typeFilter, campaignFilter, startDate, endDate])

  // Aggregate debits & credits
  const totals = useMemo(() => {
    let deb = 0
    let cred = 0
    filtered.forEach((tx) => {
      deb += tx.debit
      cred += tx.credit
    })
    return {
      totalDebit: deb,
      totalCredit: cred,
    }
  }, [filtered])

  // Export to CSV
  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast.info('No transactions to export.')
      return
    }

    const headers = [
      'Date',
      'JE Number',
      'Reference',
      'Transaction Type',
      'Description',
      'Debit (INR)',
      'Credit (INR)',
      'Running Balance (INR)',
    ]

    const rows = filtered.map((tx) => [
      `"${tx.transaction_date}"`,
      `"${tx.journal_entry_number || ''}"`,
      `"${tx.reference_number}"`,
      `"${tx.transaction_type}"`,
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.debit.toFixed(2),
      tx.credit.toFixed(2),
      tx.running_balance.toFixed(2),
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Ledger_${account.account_code}_${account.account_name.replace(/\s+/g, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Ledger transaction history exported to CSV.')
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
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="flex items-center gap-3">
          <Link href="/accounting/ledger-accounts">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {account.account_name}
              </h1>
              <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
                {account.account_code}
              </Badge>
              <Badge variant="outline" className={`text-xs ${getTypeBadgeClass(account.account_type)}`}>
                {account.account_type}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {account.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {account.description || 'General ledger accounting record and transaction statement'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs h-9 gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="text-xs h-9 gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Statement</span>
          </Button>
        </div>
      </div>

      {/* KPI Balances */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Opening Balance */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
            Opening Balance
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">
            ₹{initialData.opening_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span>Type:</span>
            <Badge variant="outline" className="text-[10px] px-1 py-0 font-sans">
              {account.opening_balance_type}
            </Badge>
          </div>
        </div>

        {/* Total Debits */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
            Total Debits (+)
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">
            ₹{initialData.total_debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Debit side transactions</div>
        </div>

        {/* Total Credits */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
            Total Credits (-)
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">
            ₹{initialData.total_credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Credit side transactions</div>
        </div>

        {/* Closing Balance */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
            Closing Balance
          </div>
          <div className="text-2xl font-bold font-mono text-primary">
            ₹{initialData.closing_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {isDebitNormal
              ? 'Opening (Dr) + Debits − Credits'
              : 'Opening (Cr) + Credits − Debits'}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-xs">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, reference, or JE number..."
              className="text-xs pl-9 bg-background h-9"
            />
          </div>

          <div className="w-40">
            <Dropdown
              options={typeOptions}
              value={typeFilter}
              onChange={(val) => setTypeFilter(val)}
              className="text-xs h-9 bg-background"
            />
          </div>

          <div className="w-44">
            <Input
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              placeholder="Filter by Campaign / Project..."
              className="text-xs h-9 bg-background"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs h-9 w-32 bg-background"
              title="From date"
            />
            <span className="text-muted-foreground text-xs font-bold">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs h-9 w-32 bg-background"
              title="To date"
            />
          </div>

          {(search || typeFilter !== 'ALL' || campaignFilter || startDate || endDate) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('')
                setTypeFilter('ALL')
                setCampaignFilter('')
                setStartDate('')
                setEndDate('')
              }}
              className="text-xs h-9 text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground font-mono self-center">
          Showing {filtered.length} of {transactions.length} transactions
        </div>
      </div>

      {/* Transaction History Statement Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 border-b border-border font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Journal Entry</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4 min-w-[260px]">Description</th>
                <th className="py-3 px-4 text-right">Debit (₹)</th>
                <th className="py-3 px-4 text-right">Credit (₹)</th>
                <th className="py-3 px-4 text-right">Balance (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Scale className="w-8 h-8 text-muted-foreground/50" />
                      <div className="text-sm font-semibold text-foreground">No Transactions Found</div>
                      <p className="text-xs text-muted-foreground">
                        {search || typeFilter !== 'ALL' || campaignFilter || startDate || endDate
                          ? 'Try resetting your filter options.'
                          : 'Transactions posted via Journal Entries, Income, or Expenses will appear here.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">
                      {tx.transaction_date}
                    </td>

                    <td className="py-2.5 px-4 font-mono font-medium whitespace-nowrap">
                      {tx.journal_entry_number ? (
                        <span className="text-primary font-semibold">{tx.journal_entry_number}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 font-mono text-foreground whitespace-nowrap">
                      {tx.reference_number || '—'}
                    </td>

                    <td className="py-2.5 px-4 text-foreground">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{tx.description}</span>
                        {tx.campaign_project && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/60 text-muted-foreground font-normal">
                            {tx.campaign_project}
                          </Badge>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono font-medium text-foreground whitespace-nowrap">
                      {tx.debit > 0
                        ? `₹${tx.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono font-medium text-foreground whitespace-nowrap">
                      {tx.credit > 0
                        ? `₹${tx.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground whitespace-nowrap">
                      ₹{tx.running_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-muted/40 font-bold border-t border-border">
                <tr>
                  <td colSpan={4} className="py-2.5 px-4 text-right uppercase tracking-wider text-[11px] text-muted-foreground">
                    Filtered Period Total
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-sm text-foreground">
                    ₹{totals.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-sm text-foreground">
                    ₹{totals.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-sm text-primary">
                    ₹{filtered[filtered.length - 1].running_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
