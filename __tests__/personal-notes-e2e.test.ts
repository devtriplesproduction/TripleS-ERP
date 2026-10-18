import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getPersonalNotesAction,
  createPersonalNoteAction,
  updatePersonalNoteAction,
  togglePinNoteAction,
  toggleArchiveNoteAction,
  deletePersonalNoteAction,
  restorePersonalNoteAction,
} from '@/lib/actions/notes'
import fs from 'fs'
import path from 'path'

// Mock getCurrentUser
const mockCurrentUser = vi.fn()
vi.mock('@/lib/auth', () => ({
  getCurrentUser: () => mockCurrentUser(),
  requireAuth: () => {
    const user = mockCurrentUser()
    if (!user) throw new Error('Authentication required')
    return user
  },
}))

// Mock Supabase createClient
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          is: () => ({
            eq: () => ({
              order: () => ({
                order: () => Promise.resolve({ data: null, error: { code: 'PGRST205', message: 'Table missing' } })
              })
            }),
            order: () => ({
              order: () => Promise.resolve({ data: null, error: { code: 'PGRST205', message: 'Table missing' } })
            })
          })
        })
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: { code: 'PGRST205', message: 'Table missing' } })
        })
      }),
      update: () => ({
        eq: () => {
          const updateChain = Promise.resolve({ data: null, error: { code: 'PGRST205', message: 'Table missing' } }) as any
          updateChain.eq = () => {
            const inner = Promise.resolve({ data: null, error: { code: 'PGRST205', message: 'Table missing' } }) as any
            inner.select = () => ({
              single: () => Promise.resolve({ data: null, error: { code: 'PGRST205', message: 'Table missing' } }),
            })
            return inner
          }
          return updateChain
        },
      }),
      delete: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ error: { code: 'PGRST205', message: 'Table missing' } })
        })
      })
    })
  }))
}))

const E2E_STORE_PATH = path.join(process.cwd(), 'scratch', 'personal_notes_e2e_store.json')
process.env.PERSONAL_NOTES_STORE_PATH = E2E_STORE_PATH

describe('Personal Notes Complete Lifecycle & Persistence E2E', () => {
  const user1 = {
    id: 'user-uuid-1111',
    email: 'user1@triples.com',
    role: 'Employee' as const,
    employee_id: 'EMP-001',
    employee_name: 'Employee One',
  }

  const user2 = {
    id: 'user-uuid-2222',
    email: 'user2@triples.com',
    role: 'Employee' as const,
    employee_id: 'EMP-002',
    employee_name: 'Employee Two',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCurrentUser.mockResolvedValue(user1)
    if (fs.existsSync(E2E_STORE_PATH)) {
      try {
        fs.writeFileSync(E2E_STORE_PATH, '[]', 'utf8')
      } catch {
        // ignore
      }
    }
  })

  it('Step 1 & 2: Create a note, persist it, and confirm it remains visible across re-fetches (refresh)', async () => {
    const created = await createPersonalNoteAction({
      title: 'Persistent Architecture Note',
      content: 'Core principles of ERP stability and RLS user isolation.',
      is_pinned: false,
    })

    expect(created.success).toBe(true)
    expect(created.data?.id).toBeDefined()
    expect(created.data?.title).toBe('Persistent Architecture Note')

    // Simulate page refresh / re-fetching notes
    const refreshFetch = await getPersonalNotesAction({ includeArchived: false })
    expect(refreshFetch.success).toBe(true)
    expect(refreshFetch.data?.length).toBe(1)
    expect(refreshFetch.data![0].id).toBe(created.data!.id)
    expect(refreshFetch.data![0].content).toBe('Core principles of ERP stability and RLS user isolation.')
  })

  it('Step 3 & 4: Simulate navigating away, returning, and logout/login as same user', async () => {
    // Create note
    const created = await createPersonalNoteAction({
      title: 'Sprint Backlog Reminder',
      content: 'Follow up on invoices.',
    })

    // Simulate logout: session cleared
    mockCurrentUser.mockResolvedValue(null)
    const loggedOutFetch = await getPersonalNotesAction()
    expect(loggedOutFetch.success).toBe(false)
    expect(loggedOutFetch.error).toBe('Authentication required')

    // Simulate login: session restored as User 1
    mockCurrentUser.mockResolvedValue(user1)
    const loggedInFetch = await getPersonalNotesAction()
    expect(loggedInFetch.success).toBe(true)
    expect(loggedInFetch.data?.some(n => n.id === created.data!.id)).toBe(true)
  })

  it('Step 5: Edit, pin, archive, restore, and delete notes, confirming persistence after refresh', async () => {
    const created = await createPersonalNoteAction({
      title: 'Initial Title',
      content: 'Initial Content',
      is_pinned: false,
    })
    const noteId = created.data!.id

    // Edit
    const edited = await updatePersonalNoteAction(noteId, {
      title: 'Updated Title',
      content: 'Updated Content',
    })
    expect(edited.success).toBe(true)

    // Pin
    const pinned = await togglePinNoteAction(noteId, true)
    expect(pinned.success).toBe(true)
    expect(pinned.data?.is_pinned).toBe(true)

    // Refresh simulation
    let refresh = await getPersonalNotesAction({ includeArchived: false })
    expect(refresh.data?.find(n => n.id === noteId)?.title).toBe('Updated Title')
    expect(refresh.data?.find(n => n.id === noteId)?.is_pinned).toBe(true)

    // Archive
    const archived = await toggleArchiveNoteAction(noteId, true)
    expect(archived.success).toBe(true)
    expect(archived.data?.is_archived).toBe(true)
    expect(archived.data?.is_pinned).toBe(false) // Automatically unpins on archive

    // Excluded from active notes refresh
    refresh = await getPersonalNotesAction({ includeArchived: false })
    expect(refresh.data?.some(n => n.id === noteId)).toBe(false)

    // Included in all notes (archive view)
    const archiveView = await getPersonalNotesAction({ includeArchived: true })
    expect(archiveView.data?.some(n => n.id === noteId)).toBe(true)

    // Soft delete
    const softDeleted = await deletePersonalNoteAction(noteId, false)
    expect(softDeleted.success).toBe(true)

    // Excluded from all regular queries
    const afterDelete = await getPersonalNotesAction({ includeArchived: true })
    expect(afterDelete.data?.some(n => n.id === noteId)).toBe(false)

    // Restore
    const restored = await restorePersonalNoteAction(noteId)
    expect(restored.success).toBe(true)

    const afterRestore = await getPersonalNotesAction({ includeArchived: true })
    expect(afterRestore.data?.some(n => n.id === noteId)).toBe(true)

    // Permanent delete
    const permDeleted = await deletePersonalNoteAction(noteId, true)
    expect(permDeleted.success).toBe(true)

    const afterPerm = await getPersonalNotesAction({ includeArchived: true })
    expect(afterPerm.data?.some(n => n.id === noteId)).toBe(false)
  })

  it('Step 6: Log in as another user and verify the first user notes are completely hidden', async () => {
    // User 1 creates confidential personal notes
    mockCurrentUser.mockResolvedValue(user1)
    const note1 = await createPersonalNoteAction({
      title: 'User 1 Diary',
      content: 'Personal reflections and private notes.',
    })

    // User 2 logs in
    mockCurrentUser.mockResolvedValue(user2)

    // User 2 cannot see User 1 notes
    const user2Notes = await getPersonalNotesAction({ includeArchived: true })
    expect(user2Notes.data?.some(n => n.id === note1.data!.id)).toBe(false)

    // User 2 creates their own note
    const note2 = await createPersonalNoteAction({
      title: 'User 2 Task',
      content: 'User 2 independent content.',
    })

    // User 2 only sees their own note
    const user2Refreshed = await getPersonalNotesAction()
    expect(user2Refreshed.data?.length).toBe(1)
    expect(user2Refreshed.data![0].id).toBe(note2.data!.id)

    // User 2 tries to update User 1's note -> REJECTED
    const hackAttempt = await updatePersonalNoteAction(note1.data!.id, {
      title: 'Hacked Title',
    })
    expect(hackAttempt.success).toBe(false)
    expect(hackAttempt.error).toBe('Note not found or unauthorized')

    // Switch back to User 1 -> User 1 note untouched and intact!
    mockCurrentUser.mockResolvedValue(user1)
    const user1Notes = await getPersonalNotesAction()
    expect(user1Notes.data?.length).toBe(1)
    expect(user1Notes.data![0].title).toBe('User 1 Diary')
  })

  it('Step 7: Validates errors and edge cases without crashing', async () => {
    // Blank note validation
    const emptyNote = await createPersonalNoteAction({ title: '', content: '' })
    expect(emptyNote.success).toBe(false)
    expect(emptyNote.error).toBe('Cannot create an empty note')

    // Whitespace note validation
    const wsNote = await createPersonalNoteAction({ title: '   ', content: '   ' })
    expect(wsNote.success).toBe(false)
    expect(wsNote.error).toBe('Cannot create an empty note')
  })
})
