'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type {
  PersonalNote,
  CreateNoteInput,
  UpdateNoteInput,
  NoteFilterOptions,
  NotesActionResponse,
} from '@/types/notes'
import fs from 'fs'
import path from 'path'

function safeRevalidatePath(pathUrl: string) {
  try {
    revalidatePath(pathUrl)
  } catch {
    // In test runner or non-request contexts, ignore static generation store invariant
  }
}

const FALLBACK_DIR = path.join(process.cwd(), 'scratch')
const DEFAULT_STORE_FILE = 'personal_notes_store.json'

function getFallbackStoreFileName(): string {
  const customPath = process.env.PERSONAL_NOTES_STORE_PATH
  if (customPath) {
    return path.basename(customPath)
  }
  return DEFAULT_STORE_FILE
}

function getFallbackStorePath(): string {
  const fileName = getFallbackStoreFileName()
  return path.join(/*turbopackIgnore: true*/ FALLBACK_DIR, fileName)
}

function ensureStoreDir(): void {
  const dir = FALLBACK_DIR
  if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function readFallbackNotes(): PersonalNote[] {
  try {
    ensureStoreDir()
    const storePath = getFallbackStorePath()
    if (!fs.existsSync(/*turbopackIgnore: true*/ storePath)) {
      return []
    }
    const raw = fs.readFileSync(/*turbopackIgnore: true*/ storePath, 'utf-8')
    return JSON.parse(raw) as PersonalNote[]
  } catch (err) {
    console.error('[PersonalNotes] Failed to read fallback store:', err)
    return []
  }
}

function writeFallbackNotes(notes: PersonalNote[]): void {
  try {
    ensureStoreDir()
    const storePath = getFallbackStorePath()
    fs.writeFileSync(/*turbopackIgnore: true*/ storePath, JSON.stringify(notes, null, 2), 'utf-8')
  } catch (err) {
    console.error('[PersonalNotes] Failed to write fallback store:', err)
  }
}

/**
 * Fetch personal notes for the currently authenticated user.
 * Isolated strictly by auth user ID.
 */
export async function getPersonalNotesAction(
  options?: NoteFilterOptions
): Promise<NotesActionResponse<PersonalNote[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const supabase = await createClient()

    let query = supabase
      .from('personal_notes')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)

    if (!options?.includeArchived) {
      query = query.eq('is_archived', false)
    }

    const { data, error } = await query
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      // If table does not exist yet (PGRST205), use fallback persistence
      if (error.code === 'PGRST205') {
        const allNotes = readFallbackNotes()
        let userNotes = allNotes.filter(
          (n) => n.user_id === user.id && !n.deleted_at
        )

        if (!options?.includeArchived) {
          userNotes = userNotes.filter((n) => !n.is_archived)
        }

        if (options?.search && options.search.trim()) {
          const q = options.search.trim().toLowerCase()
          userNotes = userNotes.filter(
            (n) =>
              n.title?.toLowerCase().includes(q) ||
              n.content?.toLowerCase().includes(q)
          )
        }

        // Sort: pinned first, then updated_at descending
        userNotes.sort((a, b) => {
          if (a.is_pinned !== b.is_pinned) {
            return a.is_pinned ? -1 : 1
          }
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        })

        return { success: true, data: userNotes }
      }
      return { success: false, error: error.message }
    }

    let notes = (data || []) as PersonalNote[]

    if (options?.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase()
      notes = notes.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.content?.toLowerCase().includes(q)
      )
    }

    return { success: true, data: notes }
  } catch (err: any) {
    console.error('[getPersonalNotesAction] Unexpected error:', err)
    return { success: false, error: err.message || 'Failed to fetch personal notes' }
  }
}

/**
 * Create a new personal note for the authenticated user.
 */
export async function createPersonalNoteAction(
  data: CreateNoteInput
): Promise<NotesActionResponse<PersonalNote>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const title = (data.title || '').trim()
    const content = (data.content || '').trim()

    if (!title && !content) {
      return { success: false, error: 'Cannot create an empty note' }
    }

    const now = new Date().toISOString()
    const newNote: PersonalNote = {
      id: crypto.randomUUID(),
      user_id: user.id,
      title,
      content: data.content || '',
      is_pinned: !!data.is_pinned,
      is_archived: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    }

    const supabase = await createClient()
    const { data: inserted, error } = await supabase
      .from('personal_notes')
      .insert({
        id: newNote.id,
        user_id: newNote.user_id,
        title: newNote.title,
        content: newNote.content,
        is_pinned: newNote.is_pinned,
        is_archived: newNote.is_archived,
        created_at: newNote.created_at,
        updated_at: newNote.updated_at,
      })
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST205') {
        const notes = readFallbackNotes()
        notes.unshift(newNote)
        writeFallbackNotes(notes)
        safeRevalidatePath('/notes')
        return { success: true, data: newNote }
      }
      return { success: false, error: error.message }
    }

    safeRevalidatePath('/notes')
    return { success: true, data: inserted as PersonalNote }
  } catch (err: any) {
    console.error('[createPersonalNoteAction] Unexpected error:', err)
    return { success: false, error: err.message || 'Failed to create note' }
  }
}

/**
 * Update an existing personal note.
 * Verifies that the note belongs to the authenticated user.
 */
export async function updatePersonalNoteAction(
  id: string,
  data: UpdateNoteInput
): Promise<NotesActionResponse<PersonalNote>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const now = new Date().toISOString()
    const updates: Partial<PersonalNote> = {
      updated_at: now,
    }

    if (data.title !== undefined && data.content !== undefined) {
      if (!data.title.trim() && !data.content.trim()) {
        return { success: false, error: 'Note cannot be empty' }
      }
    }

    if (data.title !== undefined) updates.title = data.title.trim()
    if (data.content !== undefined) updates.content = data.content
    if (data.is_pinned !== undefined) updates.is_pinned = data.is_pinned
    if (data.is_archived !== undefined) {
      updates.is_archived = data.is_archived
      // When archiving, automatically unpin matching Google Keep behavior
      if (data.is_archived) {
        updates.is_pinned = false
      }
    }

    const supabase = await createClient()
    const { data: updated, error } = await supabase
      .from('personal_notes')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST205') {
        const notes = readFallbackNotes()
        const idx = notes.findIndex((n) => n.id === id && n.user_id === user.id)
        if (idx === -1) {
          return { success: false, error: 'Note not found or unauthorized' }
        }
        notes[idx] = { ...notes[idx], ...updates }
        writeFallbackNotes(notes)
        safeRevalidatePath('/notes')
        return { success: true, data: notes[idx] }
      }
      return { success: false, error: error.message }
    }

    safeRevalidatePath('/notes')
    return { success: true, data: updated as PersonalNote }
  } catch (err: any) {
    console.error('[updatePersonalNoteAction] Unexpected error:', err)
    return { success: false, error: err.message || 'Failed to update note' }
  }
}

/**
 * Toggle pin state of a note.
 */
export async function togglePinNoteAction(
  id: string,
  is_pinned: boolean
): Promise<NotesActionResponse<PersonalNote>> {
  return updatePersonalNoteAction(id, { is_pinned })
}

/**
 * Toggle archive state of a note.
 */
export async function toggleArchiveNoteAction(
  id: string,
  is_archived: boolean
): Promise<NotesActionResponse<PersonalNote>> {
  return updatePersonalNoteAction(id, { is_archived })
}

/**
 * Delete a note (supports permanent delete or soft delete).
 */
export async function deletePersonalNoteAction(
  id: string,
  permanent: boolean = false
): Promise<NotesActionResponse<void>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const supabase = await createClient()

    if (permanent) {
      const { error } = await supabase
        .from('personal_notes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        if (error.code === 'PGRST205') {
          const notes = readFallbackNotes()
          const filtered = notes.filter(
            (n) => !(n.id === id && n.user_id === user.id)
          )
          writeFallbackNotes(filtered)
          safeRevalidatePath('/notes')
          return { success: true }
        }
        return { success: false, error: error.message }
      }
    } else {
      // Soft delete: sets deleted_at timestamp
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('personal_notes')
        .update({ deleted_at: now, updated_at: now })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        if (error.code === 'PGRST205') {
          const notes = readFallbackNotes()
          const idx = notes.findIndex((n) => n.id === id && n.user_id === user.id)
          if (idx !== -1) {
            notes[idx].deleted_at = now
            notes[idx].updated_at = now
            writeFallbackNotes(notes)
          }
          safeRevalidatePath('/notes')
          return { success: true }
        }
        return { success: false, error: error.message }
      }
    }

    safeRevalidatePath('/notes')
    return { success: true }
  } catch (err: any) {
    console.error('[deletePersonalNoteAction] Unexpected error:', err)
    return { success: false, error: err.message || 'Failed to delete note' }
  }
}

/**
 * Restore a soft-deleted note.
 */
export async function restorePersonalNoteAction(
  id: string
): Promise<NotesActionResponse<void>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const now = new Date().toISOString()
    const supabase = await createClient()
    const { error } = await supabase
      .from('personal_notes')
      .update({ deleted_at: null, updated_at: now })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      if (error.code === 'PGRST205') {
        const notes = readFallbackNotes()
        const idx = notes.findIndex((n) => n.id === id && n.user_id === user.id)
        if (idx !== -1) {
          notes[idx].deleted_at = null
          notes[idx].updated_at = now
          writeFallbackNotes(notes)
        }
        safeRevalidatePath('/notes')
        return { success: true }
      }
      return { success: false, error: error.message }
    }

    safeRevalidatePath('/notes')
    return { success: true }
  } catch (err: any) {
    console.error('[restorePersonalNoteAction] Unexpected error:', err)
    return { success: false, error: err.message || 'Failed to restore note' }
  }
}

