import { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { getRetainerContracts } from '@/lib/actions/accounting'
import { getClients } from '@/lib/actions/clients'
import { RetainerContractsView } from '@/components/accounting/RetainerContractsView'

export const metadata: Metadata = {
  title: 'Recurring Income | TripleS ERP',
  description: 'Manage long-term client engagements, recurring income streams, and billing versions',
}

export default async function RetainersPage() {
  await requireRole('/accounting')

  const [retainersRes, clientsRes] = await Promise.all([
    getRetainerContracts(),
    getClients(),
  ])

  const initialRetainers = retainersRes.data || []
  const existingClients = (clientsRes.data || []).map((c) => ({
    id: c.id,
    name: c.name,
  }))

  return (
    <RetainerContractsView
      initialRetainers={initialRetainers}
      existingClients={existingClients}
    />
  )
}

