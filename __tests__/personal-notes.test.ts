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
import { hasRouteAccess, ROLE_ROUTE_MAP } from '@/config/rbac'
import fs from 'fs'
import path from 'path'

// Mock getCurrentUser from @/lib/auth
const mockCurrentUser = vi.fn()
vi.mock('@/lib/auth', () => ({
  getCurrentUser: () => mockCurrentUser(),
  requireAuth: () => {
    const user = mockCurrentUser()
    if (!user) throw new Error('Authentication required')
    return user
  },
}))

// Mock Supabase createClient to simulate PGRST205 or custom responses
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

const STORE_PATH = path.join(process.cwd(), 'scratch', 'personal_notes_store.json')

describe('Personal Notes Feature (Google Keep Style)', () => {
  const userA = {
    id: 'user-aaa-1111',
    email: 'userA@test.com',
    role: 'Employee' as const,
    employee_id: 'EMP-001',
    employee_name: 'User A',
  }

  const userB = {
    id: 'user-bbb-2222',
    email: 'userB@test.com',
    role: 'Admin' as const,
    employee_id: 'EMP-002',
    employee_name: 'User B',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCurrentUser.mockResolvedValue(userA)
    // Clean test store safely on Windows without EBUSY file unlinking lock
    if (fs.existsSync(STORE_PATH)) {
      try {
        fs.writeFileSync(STORE_PATH, '[]', 'utf8')
      } catch {
        // ignore locked handle
      }
    }
  })

  it('1. Rejects unauthenticated note creation and retrieval', async () => {
    mockCurrentUser.mockResolvedValue(null)

    const getRes = await getPersonalNotesAction()
    expect(getRes.success).toBe(false)
    expect(getRes.error).toBe('Authentication required')

    const createRes = await createPersonalNoteAction({ content: 'Test note' })
    expect(createRes.success).toBe(false)
    expect(createRes.error).toBe('Authentication required')
  })

  it('2. Prevents creating completely empty notes', async () => {
    const res = await createPersonalNoteAction({ title: '   ', content: '   ' })
    expect(res.success).toBe(false)
    expect(res.error).toBe('Cannot create an empty note')
  })

  it('3. Successfully creates a note with title, content and default active state', async () => {
    const res = await createPersonalNoteAction({
      title: 'ERP Meeting Notes',
      content: 'Review Q4 deliverables and payroll calculations.',
      is_pinned: true,
    })

    expect(res.success).toBe(true)
    expect(res.data).toBeDefined()
    expect(res.data?.user_id).toBe(userA.id)
    expect(res.data?.title).toBe('ERP Meeting Notes')
    expect(res.data?.content).toBe('Review Q4 deliverables and payroll calculations.')
    expect(res.data?.is_pinned).toBe(true)
    expect(res.data?.is_archived).toBe(false)
    expect(res.data?.created_at).toBeDefined()
    expect(res.data?.updated_at).toBeDefined()
  })

  it('4. Successfully creates a note with content only (no title)', async () => {
    const res = await createPersonalNoteAction({
      content: 'Quick thought: check server logs tomorrow morning.',
    })

    expect(res.success).toBe(true)
    expect(res.data?.title).toBe('')
    expect(res.data?.content).toBe('Quick thought: check server logs tomorrow morning.')
    expect(res.data?.is_pinned).toBe(false)
  })

  it('5. Updates note content and updates timestamp', async () => {
    const created = await createPersonalNoteAction({
      title: 'Draft Spec',
      content: 'Initial thoughts',
    })
    const noteId = created.data!.id

    const updated = await updatePersonalNoteAction(noteId, {
      title: 'Final Spec',
      content: 'Updated finalized requirements.',
    })

    expect(updated.success).toBe(true)
    expect(updated.data?.title).toBe('Final Spec')
    expect(updated.data?.content).toBe('Updated finalized requirements.')
    expect(new Date(updated.data!.updated_at).getTime()).toBeGreaterThanOrEqual(
      new Date(created.data!.created_at).getTime()
    )
  })

  it('6. Pins and unpins notes properly', async () => {
    const created = await createPersonalNoteAction({
      title: 'Important Todo',
      content: 'Finish security review',
      is_pinned: false,
    })
    const noteId = created.data!.id

    const pinned = await togglePinNoteAction(noteId, true)
    expect(pinned.success).toBe(true)
    expect(pinned.data?.is_pinned).toBe(true)

    const unpinned = await togglePinNoteAction(noteId, false)
    expect(unpinned.success).toBe(true)
    expect(unpinned.data?.is_pinned).toBe(false)
  })

  it('7. Archives and unarchives notes, unpinning on archive', async () => {
    const created = await createPersonalNoteAction({
      title: 'Sprint 1 Plan',
      content: 'Sprint 1 details',
      is_pinned: true,
    })
    const noteId = created.data!.id

    // Archiving should also unpin matching Google Keep behavior
    const archived = await toggleArchiveNoteAction(noteId, true)
    expect(archived.success).toBe(true)
    expect(archived.data?.is_archived).toBe(true)
    expect(archived.data?.is_pinned).toBe(false)

    // Verify it is excluded from default active list
    const activeList = await getPersonalNotesAction({ includeArchived: false })
    expect(activeList.data?.some((n) => n.id === noteId)).toBe(false)

    // Verify it is present when including archived
    const allList = await getPersonalNotesAction({ includeArchived: true })
    expect(allList.data?.some((n) => n.id === noteId)).toBe(true)

    // Restore note
    const restored = await toggleArchiveNoteAction(noteId, false)
    expect(restored.success).toBe(true)
    expect(restored.data?.is_archived).toBe(false)
  })

  it('8. Soft-deletes and restores notes', async () => {
    const created = await createPersonalNoteAction({
      title: 'Temporary Idea',
      content: 'Maybe build an offline mode',
    })
    const noteId = created.data!.id

    // Soft delete
    const delRes = await deletePersonalNoteAction(noteId, false)
    expect(delRes.success).toBe(true)

    // Should no longer appear in active notes
    const active = await getPersonalNotesAction()
    expect(active.data?.some((n) => n.id === noteId)).toBe(false)

    // Restore note
    const restoreRes = await restorePersonalNoteAction(noteId)
    expect(restoreRes.success).toBe(true)

    const activeAfterRestore = await getPersonalNotesAction()
    expect(activeAfterRestore.data?.some((n) => n.id === noteId)).toBe(true)
  })

  it('9. Permanent deletion permanently removes note', async () => {
    const created = await createPersonalNoteAction({
      title: 'Delete me forever',
      content: 'Good bye',
    })
    const noteId = created.data!.id

    const delRes = await deletePersonalNoteAction(noteId, true)
    expect(delRes.success).toBe(true)

    const all = await getPersonalNotesAction({ includeArchived: true })
    expect(all.data?.some((n) => n.id === noteId)).toBe(false)
  })

  it('10. Strict User Isolation: User B cannot view or modify User A notes', async () => {
    // User A creates notes
    mockCurrentUser.mockResolvedValue(userA)
    const noteA = await createPersonalNoteAction({
      title: 'User A Confidential Note',
      content: 'Private salary thoughts and personal reminders.',
    })

    // User B (Admin) queries their notes
    mockCurrentUser.mockResolvedValue(userB)
    const notesForB = await getPersonalNotesAction({ includeArchived: true })
    // User B should NOT see User A's note
    expect(notesForB.data?.some((n) => n.id === noteA.data!.id)).toBe(false)

    // User B attempts to edit User A's note
    const maliciousUpdate = await updatePersonalNoteAction(noteA.data!.id, {
      title: 'Hacked by Admin',
    })
    expect(maliciousUpdate.success).toBe(false)
    expect(maliciousUpdate.error).toContain('not found or unauthorized')

    // User B attempts to delete User A's note
    await deletePersonalNoteAction(noteA.data!.id, true)

    // Switch back to User A: Note should still exist unharmed!
    mockCurrentUser.mockResolvedValue(userA)
    const notesForA = await getPersonalNotesAction()
    expect(notesForA.data?.some((n) => n.id === noteA.data!.id)).toBe(true)
    expect(notesForA.data?.find((n) => n.id === noteA.data!.id)?.title).toBe(
      'User A Confidential Note'
    )
  })

  it('11. Search filters notes by title and content', async () => {
    mockCurrentUser.mockResolvedValue(userA)
    await createPersonalNoteAction({
      title: 'Grocery List',
      content: 'Apples, Milk, Bread',
    })
    await createPersonalNoteAction({
      title: 'Kubernetes Cluster',
      content: 'Check ingress controllers and pods',
    })

    const titleSearch = await getPersonalNotesAction({ search: 'Grocery' })
    expect(titleSearch.data?.length).toBe(1)
    expect(titleSearch.data?.[0].title).toBe('Grocery List')

    const contentSearch = await getPersonalNotesAction({ search: 'ingress' })
    expect(contentSearch.data?.length).toBe(1)
    expect(contentSearch.data?.[0].title).toBe('Kubernetes Cluster')
  })

  it('12. RBAC Permissions: Admin, HR, Employee, and Manager can access /notes', () => {
    expect(hasRouteAccess('Admin', '/notes')).toBe(true)
    expect(hasRouteAccess('HR', '/notes')).toBe(true)
    expect(hasRouteAccess('Employee', '/notes')).toBe(true)
    expect(hasRouteAccess('Manager', '/notes')).toBe(true)

    expect(ROLE_ROUTE_MAP.Admin).toContain('/notes')
    expect(ROLE_ROUTE_MAP.HR).toContain('/notes')
    expect(ROLE_ROUTE_MAP.Employee).toContain('/notes')
    expect(ROLE_ROUTE_MAP.Manager).toContain('/notes')
  })

  it('13. Inline edit updates title, content, and preserves existing pin and archive status', async () => {
    mockCurrentUser.mockResolvedValue(userA)
    const initial = await createPersonalNoteAction({
      title: 'Sprint Planning',
      content: 'Define backlog items',
      is_pinned: true,
    })
    const noteId = initial.data!.id

    const updated = await updatePersonalNoteAction(noteId, {
      title: 'Sprint Planning (Revised)',
      content: 'Added 3 more story points to backlog',
    })

    expect(updated.success).toBe(true)
    expect(updated.data?.title).toBe('Sprint Planning (Revised)')
    expect(updated.data?.content).toBe('Added 3 more story points to backlog')
    expect(updated.data?.is_pinned).toBe(true)
    expect(updated.data?.is_archived).toBe(false)
  })

  it('14. Prevents updating note with both empty title and empty content', async () => {
    mockCurrentUser.mockResolvedValue(userA)
    const initial = await createPersonalNoteAction({
      title: 'Draft',
      content: 'Valid content',
    })
    const noteId = initial.data!.id

    const blankUpdate = await updatePersonalNoteAction(noteId, {
      title: '   ',
      content: '   ',
    })

    expect(blankUpdate.success).toBe(false)
    expect(blankUpdate.error).toContain('cannot be empty')
  })
})
