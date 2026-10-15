'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Pin,
  Archive,
  ArchiveRestore,
  Trash2,
  Check,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import type { PersonalNote } from '@/types/notes'
import {
  updatePersonalNoteAction,
  deletePersonalNoteAction,
  toggleArchiveNoteAction,
  togglePinNoteAction,
} from '@/lib/actions/notes'
import { toast } from 'sonner'
import dayjs from 'dayjs'

interface NoteEditModalProps {
  note: PersonalNote | null
  isOpen: boolean
  onClose: () => void
  onNoteUpdated: (updatedNote: PersonalNote) => void
  onNoteDeleted: (noteId: string) => void
}

export function NoteEditModal({
  note,
  isOpen,
  onClose,
  onNoteUpdated,
  onNoteDeleted,
}: NoteEditModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [isArchived, setIsArchived] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [isDeleting, setIsDeleting] = useState(false)

  // Track initial state to avoid unnecessary saves
  const initialRef = useRef<{ title: string; content: string }>({ title: '', content: '' })
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const activeNoteIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (note) {
      setTitle(note.title || '')
      setContent(note.content || '')
      setIsPinned(!!note.is_pinned)
      setIsArchived(!!note.is_archived)
      initialRef.current = { title: note.title || '', content: note.content || '' }
      activeNoteIdRef.current = note.id
      setSaveStatus('idle')
    }
  }, [note])

  // Save changes to server
  const saveNote = useCallback(
    async (newTitle: string, newContent: string) => {
      if (!activeNoteIdRef.current) return
      if (
        newTitle === initialRef.current.title &&
        newContent === initialRef.current.content
      ) {
        return
      }

      setSaveStatus('saving')
      try {
        const res = await updatePersonalNoteAction(activeNoteIdRef.current, {
          title: newTitle,
          content: newContent,
        })

        if (res.success && res.data) {
          initialRef.current = { title: newTitle, content: newContent }
          setSaveStatus('saved')
          onNoteUpdated(res.data)
          // Hide saved indicator after 2s
          setTimeout(() => {
            setSaveStatus((curr) => (curr === 'saved' ? 'idle' : curr))
          }, 2000)
        } else {
          setSaveStatus('error')
          toast.error(res.error || 'Failed to save note')
        }
      } catch (err: any) {
        setSaveStatus('error')
        toast.error('Network error saving note')
      }
    },
    [onNoteUpdated]
  )

  // Debounced autosave on title/content changes
  const handleTitleChange = (val: string) => {
    setTitle(val)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      saveNote(val, content)
    }, 600)
  }

  const handleContentChange = (val: string) => {
    setContent(val)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      saveNote(title, val)
    }, 600)
  }

  // Toggle Pin
  const handleTogglePin = async () => {
    if (!note) return
    const nextPinned = !isPinned
    setIsPinned(nextPinned)
    try {
      const res = await togglePinNoteAction(note.id, nextPinned)
      if (res.success && res.data) {
        onNoteUpdated(res.data)
        toast.success(nextPinned ? 'Note pinned' : 'Note unpinned')
      }
    } catch {
      setIsPinned(!nextPinned)
      toast.error('Failed to toggle pin')
    }
  }

  // Toggle Archive
  const handleToggleArchive = async () => {
    if (!note) return
    const nextArchived = !isArchived
    setIsArchived(nextArchived)
    if (nextArchived) setIsPinned(false)
    try {
      const res = await toggleArchiveNoteAction(note.id, nextArchived)
      if (res.success && res.data) {
        onNoteUpdated(res.data)
        toast.success(nextArchived ? 'Note archived' : 'Note restored')
        onClose()
      }
    } catch {
      setIsArchived(!nextArchived)
      toast.error('Failed to update note')
    }
  }

  // Delete Note
  const handleDelete = async () => {
    if (!note) return
    setIsDeleting(true)
    try {
      const res = await deletePersonalNoteAction(note.id, false)
      if (res.success) {
        toast.success('Note deleted')
        onNoteDeleted(note.id)
        onClose()
      } else {
        toast.error(res.error || 'Failed to delete note')
      }
    } catch {
      toast.error('Error deleting note')
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle explicit Done / Close
  const handleDone = async () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    // If pending unsaved changes, save immediately
    if (
      title !== initialRef.current.title ||
      content !== initialRef.current.content
    ) {
      await saveNote(title, content)
    }
    onClose()
  }

  if (!note) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDone()}>
      <DialogContent className="sm:max-w-xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden bg-card border-border shadow-2xl">
        <DialogHeader className="p-4 pb-2 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
            <DialogTitle className="sr-only">Edit Note</DialogTitle>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Title"
              className="w-full text-base sm:text-lg font-semibold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/60 tracking-tight"
            />
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Pin Toggle */}
            <button
              type="button"
              onClick={handleTogglePin}
              title={isPinned ? 'Unpin note' : 'Pin note'}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isPinned
                  ? 'text-foreground bg-muted'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
            </button>
          </div>
        </DialogHeader>

        {/* Content Textarea */}
        <div className="flex-1 p-4 overflow-y-auto min-h-[160px] max-h-[55vh]">
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Note content..."
            rows={8}
            className="w-full text-sm leading-relaxed bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground/60 focus:ring-0 font-normal"
          />
        </div>

        {/* Footer Toolbar */}
        <div className="flex items-center justify-between p-3 px-4 border-t border-border/40 bg-muted/20 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {/* Archive / Restore Button */}
            <button
              type="button"
              onClick={handleToggleArchive}
              title={isArchived ? 'Restore note' : 'Archive note'}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              {isArchived ? (
                <ArchiveRestore className="w-4 h-4" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
            </button>

            {/* Delete Button */}
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              title="Delete note"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Autosave status indicator */}
            <div className="ml-2 flex items-center gap-1.5 text-[11px]">
              {saveStatus === 'saving' && (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  <span>Saving...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Saved</span>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertCircle className="w-3 h-3 text-destructive" />
                  <span className="text-destructive">Failed to save</span>
                </>
              )}
              {saveStatus === 'idle' && note.updated_at && (
                <span className="hidden sm:inline text-muted-foreground/70">
                  Edited {dayjs(note.updated_at).format('MMM D, h:mm A')}
                </span>
              )}
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleDone}
            className="h-8 px-4 font-medium text-xs rounded-lg cursor-pointer bg-foreground text-background hover:bg-foreground/90 transition-colors"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
