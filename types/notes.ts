/**
 * TripleS ERP — Personal Notes Types
 * Google Keep-inspired personal notes data structures.
 */

export interface PersonalNote {
  id: string
  user_id: string
  title: string
  content: string
  is_pinned: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface CreateNoteInput {
  title?: string
  content: string
  is_pinned?: boolean
}

export interface UpdateNoteInput {
  title?: string
  content?: string
  is_pinned?: boolean
  is_archived?: boolean
}

export interface NoteFilterOptions {
  includeArchived?: boolean
  search?: string
}

export interface NotesActionResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}
