import { requireRole } from '@/lib/auth'
import { getClients } from '@/lib/actions/clients'
import { canManageClients, canViewRestrictedClientInfo } from '@/lib/permissions/project-management'
import { ClientList } from '@/components/clients/ClientList'

export const metadata = {
  title: 'Clients | TripleS ERP',
  description: 'Manage corporate accounts and client organizations in TripleS ERP.',
}

export default async function ClientsPage() {
  const user = await requireRole('/clients')
  const { data: clients } = await getClients()

  const canManage = canManageClients(user)
  const canViewContact = canViewRestrictedClientInfo(user)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <ClientList
        initialClients={clients || []}
        canManage={canManage}
        canViewContact={canViewContact}
      />
    </div>
  )
}
