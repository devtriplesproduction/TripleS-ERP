import { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { getLedgerAccounts } from '@/lib/actions/accounting'
import { PageHeader } from '@/components/PageHeader'
import { AccountingNavTabs } from '@/components/accounting/AccountingNavTabs'
import { LedgerAccountList } from '@/components/accounting/LedgerAccountList'
import { Layers } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Ledger Accounts | TripleS ERP',
  description: 'Manage Chart of Accounts, account types, opening balances, and double-entry general ledger accounts',
}

export default async function LedgerAccountsPage() {
  await requireRole('/accounting')

  const accountsRes = await getLedgerAccounts()
  const initialAccounts = accountsRes.data || []

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <PageHeader
        title="Ledger Accounts"
        subtitle="Manage agency Chart of Accounts, assets, liabilities, equity, revenue, and expense accounts."
        icon={Layers}
      />

      <AccountingNavTabs />

      <LedgerAccountList initialAccounts={initialAccounts} />
    </div>
  )
}
