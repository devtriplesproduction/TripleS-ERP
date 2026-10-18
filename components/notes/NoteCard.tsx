'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Pencil,
  Save,
  Trash2,
  Pin,
  Loader2,
} from 'lucide-react'
import type { PersonalNote } from '@/types/notes'
import { updatePersonalNoteAction } from '@/lib/actions/notes'
import { toast } from 'sonner'
import dayjs from 'dayjs'

interface NoteCardProps {
  note: PersonalNote
  isEditing: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: (updatedNote: PersonalNote) => void
  onTogglePin: (e: React.MouseEvent) => void
  onArchive: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
  onPermanentDelete?: () => void
  onOpenFullPage?: () => void
  viewMode?: 'grid' | 'list'
}

export function NoteCard({
  note,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onTogglePin,
  onArchive,
  onDelete,
  onPermanentDelete,
  onOpenFullPage,
  viewMode = 'grid',
}: NoteCardProps) {
  const [editTitle, setEditTitle] = useState(note.title || '')
  const [editContent, setEditContent] = useState(note.content || '')
  const [isSaving, setIsSaving] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync edits when note prop changes
  useEffect(() => {
    setEditTitle(note.title || '')
    setEditContent(note.content || '')
  }, [note.title, note.content])

  // Auto-adjust textarea height to fit content smoothly
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.max(64, textareaRef.current.scrollHeight)}px`
    }
  }, [isEditing, editContent])

  // Handle Save
  const handleSave = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (isSaving) return

    const trimmedTitle = editTitle.trim()
    const trimmedContent = editContent.trim()

    // If both empty, don't allow blank note
    if (!trimmedTitle && !trimmedContent) {
      toast.error('Note cannot be completely empty')
      return
    }

    // If content has not changed, just close editor without network call
    if (trimmedTitle === (note.title || '').trim() && editContent === (note.content || '')) {
      onCancelEdit()
      return
    }

    setIsSaving(true)
    try {
      const res = await updatePersonalNoteAction(note.id, {
        title: trimmedTitle,
        content: editContent,
      })

      if (res.success && res.data) {
        onSave(res.data)
        onCancelEdit()
        toast.success('Note updated')
      } else {
        toast.error(res.error || 'Failed to update note')
      }
    } catch {
      toast.error('Network error updating note')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle Cancel
  const handleCancel = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setEditTitle(note.title || '')
    setEditContent(note.content || '')
    onCancelEdit()
  }

  // Prevent accidental data loss: auto-save on outside click if dirty, else close
  useEffect(() => {
    if (!isEditing) return

    function handleClickOutside(e: MouseEvent) {
      if (!cardRef.current || cardRef.current.contains(e.target as Node)) {
        return
      }

      // Ignore if clicking dropdown / dialog / popper
      const target = e.target as HTMLElement | null
      if (
        target?.closest('[data-radix-popper-content-wrapper]') ||
        target?.closest('[role="dialog"]') ||
        target?.closest('[role="menu"]')
      ) {
        return
      }

      const trimmedTitle = editTitle.trim()
      const trimmedContent = editContent.trim()

      if (!trimmedTitle && !trimmedContent) {
        onCancelEdit()
        return
      }

      if (trimmedTitle === (note.title || '').trim() && editContent === (note.content || '')) {
        onCancelEdit()
        return
      }

      handleSave()
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isEditing, editTitle, editContent, note.title, note.content])

  // Keyboard accessibility: Ctrl/Cmd+Enter to save, Escape to cancel
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  // ==========================================
  // INLINE EDIT MODE
  // ==========================================
  if (isEditing) {
    return (
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        className={`relative p-3 rounded-xl border border-foreground/40 bg-card shadow-md transition-all ${
          viewMode === 'list' ? 'w-full' : ''
        }`}
      >
        {/* Header: Title input & Pin toggle */}
        <div className="flex items-center justify-between gap-2">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Title"
            autoFocus
            className="w-full text-xs sm:text-sm font-semibold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/60 tracking-tight"
          />
          <button
            type="button"
            onClick={onTogglePin}
            title={note.is_pinned ? 'Unpin note' : 'Pin note'}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              note.is_pinned
                ? 'text-foreground bg-muted'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Pin className={`w-3.5 h-3.5 ${note.is_pinned ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Content Textarea */}
        <textarea
          ref={textareaRef}
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Take a note..."
          rows={3}
          className="w-full text-xs leading-relaxed bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground/60 mt-1 font-normal overflow-hidden"
        />

        {/* Footer toolbar: Cancel on left, Save & actions on right */}
        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/40 text-[10px] text-muted-foreground">
          <button
            type="button"
            onClick={handleCancel}
            className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-1">
            {/* Dynamic Save Icon (replaces Pencil in exact same position) */}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              title="Save changes (Ctrl+Enter)"
              className="p-1 rounded bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Delete button */}
            <button
              type="button"
              onClick={onDelete}
              title="Delete note"
              className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // VIEW MODE
  // ==========================================
  return (
    <div
      onClick={onStartEdit}
      className={`group relative p-3 rounded-xl border border-border/70 hover:border-foreground/30 bg-card hover:bg-muted/30 transition-all cursor-pointer shadow-xs hover:shadow-sm flex flex-col justify-between ${
        viewMode === 'list' ? 'w-full' : 'min-h-[100px]'
      }`}
    >
      <div>
        {/* Header: Title & Pin action */}
        <div className="flex items-start justify-between gap-2">
          <h5 className="font-semibold text-xs sm:text-sm text-foreground line-clamp-1 leading-snug">
            {note.title || 'Untitled Note'}
          </h5>
          <button
            type="button"
            onClick={onTogglePin}
            title={note.is_pinned ? 'Unpin note' : 'Pin note'}
            className={`p-1 rounded-md transition-opacity cursor-pointer ${
              note.is_pinned
                ? 'text-foreground opacity-100'
                : 'text-muted-foreground opacity-60 group-hover:opacity-100 hover:text-foreground'
            }`}
          >
            <Pin className={`w-3.5 h-3.5 ${note.is_pinned ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Note Body */}
        {note.content && (
          <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-4 mt-1 leading-relaxed whitespace-pre-wrap font-normal">
            {note.content}
          </p>
        )}
      </div>

      {/* Footer: Date on left, Pencil/Delete/More on right */}
      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/40 text-[10px] text-muted-foreground">
        <span>{dayjs(note.updated_at).format('MMM D')}</span>

        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
          {/* Edit (Pencil) Icon replacing Archive */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onStartEdit()
            }}
            title="Edit note"
            className="p-1 rounded hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* Delete button */}
          <button
            type="button"
            onClick={onDelete}
            title="Delete note"
            className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
