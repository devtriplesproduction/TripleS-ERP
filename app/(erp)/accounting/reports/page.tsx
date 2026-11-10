import { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { getAccountingReportsData } from '@/lib/actions/accounting'
import { ReportsView } from '@/components/accounting/ReportsView'

export const metadata: Metadata = {
  title: 'Reports & Analytics | TripleS ERP',
  description: 'Financial statements, P&L breakdown, and deep-dive insights.',
}

export default async function ReportsPage() {
  await requireRole('/accounting')

  const res = await getAccountingReportsData('Last 12 Months')
  const metrics = res.data!

  return <ReportsView metrics={metrics} />
}

