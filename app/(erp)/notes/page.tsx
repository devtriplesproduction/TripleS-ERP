import { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import { FullNotesView } from '@/components/notes/FullNotesView'

export const metadata: Metadata = {
  title: 'Personal Notes | TripleS ERP',
  description: 'Private Google Keep-inspired personal notes, ideas, and checklists.',
}

export default async function PersonalNotesPage() {
  await requireAuth()

  return <FullNotesView />
}
