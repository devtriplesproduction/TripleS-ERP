import { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { getIncomeRecords, getBankAccounts } from '@/lib/actions/accounting'
import { getClients } from '@/lib/actions/clients'
import { IncomeList } from '@/components/accounting/IncomeList'

export const metadata: Metadata = {
  title: 'Income Records | TripleS ERP',
  description: 'Manage incoming payments, customer billings, and revenue records',
}

export default async function IncomePage() {
  await requireRole('/accounting')

  const [incomeRes, banksRes, clientsRes] = await Promise.all([
    getIncomeRecords(),
    getBankAccounts(),
    getClients(),
  ])

  const initialIncome = incomeRes.data || []
  const bankAccounts = banksRes.data || []
  const existingClients = (clientsRes.data || []).map((c) => ({
    id: c.id,
    name: c.name,
  }))

  return (
    <IncomeList
      initialIncome={initialIncome}
      bankAccounts={bankAccounts}
      existingClients={existingClients}
    />
  )
}
