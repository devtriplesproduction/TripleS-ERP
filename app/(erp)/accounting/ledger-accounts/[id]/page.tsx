import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { getLedgerAccountTransactionsAction } from '@/lib/actions/accounting'
import { PageHeader } from '@/components/PageHeader'
import { AccountingNavTabs } from '@/components/accounting/AccountingNavTabs'
import { LedgerAccountDetailView } from '@/components/accounting/LedgerAccountDetailView'
import { Layers } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Ledger Account Details | TripleS ERP',
  description: 'Transaction history, debit/credit entries, and running account balances',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function LedgerAccountDetailPage({ params }: PageProps) {
  await requireRole('/accounting')

  const { id } = await params
  const res = await getLedgerAccountTransactionsAction(id)

  if (!res.success || !res.data) {
    notFound()
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <PageHeader
        title={`Ledger: ${res.data.account.account_name}`}
        subtitle={`Account Code ${res.data.account.account_code} • ${res.data.account.account_type} Account Statement`}
        icon={Layers}
      />

      <AccountingNavTabs />

      <LedgerAccountDetailView initialData={res.data} />
    </div>
  )
}
