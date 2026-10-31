'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AccountingDashboardData, BankAccount } from '@/types/accounting'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AccountingNavTabs } from './AccountingNavTabs'
import { IncomeModal } from './IncomeModal'
import { ExpenseModal } from './ExpenseModal'
import {
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Building2,
  Wallet,
  TrendingUp,
  TrendingDown,
  Scale,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  PieChart,
  BarChart3,
} from 'lucide-react'

interface AccountingDashboardViewProps {
  data: AccountingDashboardData
  existingClients: { id: string; name: string }[]
}

export function AccountingDashboardView({
  data,
  existingClients,
}: AccountingDashboardViewProps) {
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Calculate max monthly value for bar scaling
  const maxMonthlyVal = Math.max(
    ...data.monthlyBreakdown.map((m) => Math.max(m.income, m.expenses)),
    100000
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <PageHeader
        title="Accounting Dashboard"
        subtitle="Financial intelligence, corporate cash flows, treasury balances, and transaction activity."
        icon={LayoutDashboard}
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsIncomeModalOpen(true)}
              className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              New Income
            </Button>
            <Button
              onClick={() => setIsExpenseModalOpen(true)}
              className="h-10 px-4 bg-rose-600 hover:bg-rose-700 text-white font-medium"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              New Expense
            </Button>
          </div>
        }
      />

      <AccountingNavTabs />

      {/* Top 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <Card className="border border-border/60 shadow-xs hover:border-emerald-500/40 transition-colors">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Income
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(data.totalIncome)}
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <TrendingUp className="w-3.5 h-3.5" /> Settled
                </span>
                <span>•</span>
                <span>{data.pendingIncomeCount} pending clearance</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="border border-border/60 shadow-xs hover:border-rose-500/40 transition-colors">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Expenses
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {formatCurrency(data.totalExpenses)}
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                  <TrendingDown className="w-3.5 h-3.5" /> Disbursed
                </span>
                <span>•</span>
                <span>{data.pendingExpensesCount} pending payment</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Balance / Surplus */}
        <Card className="border border-border/60 shadow-xs hover:border-primary/40 transition-colors">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Net Operating Balance
              </span>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Scale className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p
                className={`text-2xl font-bold ${
                  data.netBalance >= 0
                    ? 'text-foreground'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatCurrency(data.netBalance)}
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {data.netBalance >= 0 ? 'Operating Surplus' : 'Operating Deficit'}
                </span>
                <span>•</span>
                <span>Income minus Outlays</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liquid Bank Reserves */}
        <Card className="border border-border/60 shadow-xs hover:border-primary/40 transition-colors">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Liquid Bank Reserves
              </span>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(data.bankAccountBalance)}
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {data.activeBankAccountsCount} Active Bank Accounts
                </span>
                <span>•</span>
                <span>Real-time balance</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Comparison: Income vs Expenses Monthly Chart */}
      <Card className="border border-border/60 shadow-xs">
        <CardHeader className="pb-4 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Income vs Expenses Summary (Last 6 Months)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Monthly revenue inflow vs expenditure trajectory.
              </CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-xs bg-emerald-500" />
                <span className="text-muted-foreground font-medium">Income</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-xs bg-rose-500" />
                <span className="text-muted-foreground font-medium">Expenses</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          <div className="space-y-5">
            {data.monthlyBreakdown.map((item) => {
              const incomeWidth = Math.max(Math.round((item.income / maxMonthlyVal) * 100), 2)
              const expenseWidth = Math.max(Math.round((item.expenses / maxMonthlyVal) * 100), 2)

              return (
                <div key={item.month} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground w-20">{item.month}</span>
                    <div className="flex items-center gap-4 font-mono text-[11px]">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(item.income)}
                      </span>
                      <span className="text-rose-600 dark:text-rose-400">
                        -{formatCurrency(item.expenses)}
                      </span>
                      <span
                        className={`font-semibold ${
                          item.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        Net: {formatCurrency(item.net)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-1">
                    {/* Income Bar */}
                    <div className="h-3 w-full bg-muted/40 rounded-full overflow-hidden flex items-center">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${item.income > 0 ? incomeWidth : 0}%` }}
                      />
                    </div>
                    {/* Expense Bar */}
                    <div className="h-3 w-full bg-muted/40 rounded-full overflow-hidden flex items-center">
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all duration-500"
                        style={{ width: `${item.expenses > 0 ? expenseWidth : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Two Columns: Category Breakdown & Bank Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Expense Drivers */}
        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-rose-500" />
                  Top Expense Drivers
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Categories contributing highest operational spend.
                </CardDescription>
              </div>
              <Link href="/accounting/expenses" className="text-xs text-primary hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            {data.topExpenseCategories.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No expenses recorded yet.</p>
            ) : (
              data.topExpenseCategories.map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground truncate max-w-[200px]">{cat.category}</span>
                    <span className="font-mono text-muted-foreground">
                      {formatCurrency(cat.amount)} ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-500"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Bank & Cash Accounts Overview */}
        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Liquid Account Balances
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Current funds in checking and cash accounts.
                </CardDescription>
              </div>
              <Link href="/accounting/bank-accounts" className="text-xs text-primary hover:underline flex items-center gap-1">
                Manage <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3">
            {data.bankAccounts.map((acc) => (
              <div
                key={acc.id}
                className="p-3 rounded-lg border border-border/50 bg-muted/20 flex items-center justify-between hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{acc.account_name}</p>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${
                        acc.status === 'Active'
                          ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                          : 'border-muted text-muted-foreground'
                      }`}
                    >
                      {acc.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {acc.bank_name} • {acc.account_type}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-bold text-foreground">
                    {formatCurrency(acc.current_balance)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Opening: {formatCurrency(acc.opening_balance)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Ledger Transactions Table */}
      <Card className="border border-border/60 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                Recent Financial Ledger Activity
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Latest debit and credit entries with running balances.
              </CardDescription>
            </div>
            <Link href="/accounting/ledger" className="text-xs text-primary hover:underline flex items-center gap-1">
              View Full Ledger <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead className="w-[130px]">Reference</TableHead>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right w-[110px]">Debit (₹)</TableHead>
                <TableHead className="text-right w-[110px]">Credit (₹)</TableHead>
                <TableHead className="text-right w-[120px]">Balance (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                    No transactions recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                data.recentTransactions.map((tx) => (
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
                    <TableCell className="text-xs font-medium text-foreground">
                      {tx.description}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {tx.account_name}
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400 text-xs whitespace-nowrap">
                      {tx.debit > 0 ? formatCurrency(tx.debit) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-rose-600 dark:text-rose-400 text-xs whitespace-nowrap">
                      {tx.credit > 0 ? formatCurrency(tx.credit) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-bold text-foreground text-xs whitespace-nowrap">
                      {formatCurrency(tx.balance)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Quick Action Modals */}
      <IncomeModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        onSuccess={() => window.location.reload()}
        bankAccounts={data.bankAccounts}
        existingClients={existingClients}
      />

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={() => window.location.reload()}
        bankAccounts={data.bankAccounts}
      />
    </div>
  )
}
