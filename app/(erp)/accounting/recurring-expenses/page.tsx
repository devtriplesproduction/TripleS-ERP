import { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { getRecurringExpenses } from '@/lib/actions/accounting'
import { RecurringExpensesView } from '@/components/accounting/RecurringExpensesView'

export const metadata: Metadata = {
  title: 'Recurring Expenses | TripleS ERP',
  description: 'Manage fixed monthly obligations (Rent, Hosting, salaries)',
}

export default async function RecurringExpensesPage() {
  await requireRole('/accounting')

  const res = await getRecurringExpenses()
  const initialRules = res.data || []

  return (
    <RecurringExpensesView
      initialRules={initialRules}
    />
  )
}

