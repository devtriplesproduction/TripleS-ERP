import { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { getReceivables } from '@/lib/actions/accounting'
import { ReceivablesView } from '@/components/accounting/ReceivablesView'

export const metadata: Metadata = {
  title: 'Receivables | TripleS ERP',
  description: 'Manage overdue payments and paused collections.',
}

export default async function ReceivablesPage() {
  await requireRole('/accounting')

  const res = await getReceivables()
  const initialReceivables = res.data || []

  return <ReceivablesView initialReceivables={initialReceivables} />
}

