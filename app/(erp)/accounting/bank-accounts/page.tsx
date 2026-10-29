import { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { getBankAccounts } from '@/lib/actions/accounting'
import { BankAccountList } from '@/components/accounting/BankAccountList'

export const metadata: Metadata = {
  title: 'Bank & Cash Accounts | TripleS ERP',
  description: 'Manage corporate bank accounts, cash accounts, and liquid reserves',
}

export default async function BankAccountsPage() {
  await requireRole('/accounting')

  const banksRes = await getBankAccounts()
  const initialAccounts = banksRes.data || []

  return <BankAccountList initialAccounts={initialAccounts} />
}
