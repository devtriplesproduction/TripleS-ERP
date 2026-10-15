import { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import { FullQuickTasksView } from '@/components/quick-tasks/FullQuickTasksView'

export const metadata: Metadata = {
  title: 'Quick Tasks | TripleS ERP',
  description: 'Casual, ad-hoc task assignment and tracking for TripleS ERP.',
}

export default async function QuickTasksPage() {
  const user = await requireAuth()

  return <FullQuickTasksView user={user} />
}
