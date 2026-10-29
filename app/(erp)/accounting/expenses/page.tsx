import { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { getExpenseRecords, getBankAccounts } from '@/lib/actions/accounting'
import { ExpenseList } from '@/components/accounting/ExpenseList'

export const metadata: Metadata = {
  title: 'Expense Management | TripleS ERP',
  description: 'Manage business outlays, vendor disbursements, and operational costs',
}

export default async function ExpensesPage() {
  await requireRole('/accounting')

  const [expensesRes, banksRes] = await Promise.all([
    getExpenseRecords(),
    getBankAccounts(),
  ])

  const initialExpenses = expensesRes.data || []
  const bankAccounts = banksRes.data || []

  return (
    <ExpenseList
      initialExpenses={initialExpenses}
      bankAccounts={bankAccounts}
    />
  )
}
