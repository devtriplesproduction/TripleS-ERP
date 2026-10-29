import { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { getJournalEntries, getLedgerAccounts } from '@/lib/actions/accounting'
import { PageHeader } from '@/components/PageHeader'
import { AccountingNavTabs } from '@/components/accounting/AccountingNavTabs'
import { JournalEntryList } from '@/components/accounting/JournalEntryList'
import { BookOpen } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Journal Entries | TripleS ERP',
  description: 'Double-entry accounting journal entries and financial transaction records',
}

export default async function JournalEntriesPage() {
  await requireRole('/accounting')

  const [jeRes, accountsRes] = await Promise.all([
    getJournalEntries(),
    getLedgerAccounts(),
  ])

  const initialEntries = jeRes.data || []
  const ledgerAccounts = accountsRes.data || []

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <PageHeader
        title="Journal Entries"
        subtitle="Record balanced double-entry accounting transactions and post directly to general ledger accounts."
        icon={BookOpen}
      />

      <AccountingNavTabs />

      <JournalEntryList
        initialEntries={initialEntries}
        ledgerAccounts={ledgerAccounts}
      />
    </div>
  )
}
