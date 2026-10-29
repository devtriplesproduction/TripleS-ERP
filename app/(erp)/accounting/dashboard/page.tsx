import { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { getAccountingDashboardData } from '@/lib/actions/accounting'
import { getClients } from '@/lib/actions/clients'
import { AccountingDashboardView } from '@/components/accounting/AccountingDashboardView'

export const metadata: Metadata = {
  title: 'Accounting Dashboard | TripleS ERP',
  description: 'Financial intelligence, cash flows, and treasury overview',
}

export default async function AccountingDashboardPage() {
  await requireRole('/accounting')

  const [dashboardRes, clientsRes] = await Promise.all([
    getAccountingDashboardData(),
    getClients(),
  ])

  const dashboardData = dashboardRes.data || {
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    bankAccountBalance: 0,
    activeBankAccountsCount: 0,
    pendingIncomeCount: 0,
    pendingExpensesCount: 0,
    recentTransactions: [],
    monthlyBreakdown: [],
    topExpenseCategories: [],
    topIncomeCategories: [],
    bankAccounts: [],
  }

  const existingClients = (clientsRes.data || []).map((c) => ({
    id: c.id,
    name: c.name,
  }))

  return (
    <AccountingDashboardView
      data={dashboardData}
      existingClients={existingClients}
    />
  )
}
