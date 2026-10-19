import { Metadata } from 'next'
import { requireRole } from '@/lib/auth'
import { FullNotesView } from '@/components/notes/FullNotesView'
import { getPersonalNotesAction } from '@/lib/actions/notes'

export const metadata: Metadata = {
  title: 'Personal Notes | TripleS ERP',
  description: 'Private Google Keep-inspired personal notes, ideas, and checklists.',
}

export default async function PersonalNotesPage() {
  await requireRole('/notes')
  const res = await getPersonalNotesAction({ includeArchived: false })

  return <FullNotesView initialNotes={res.success && res.data ? res.data : []} />
}
