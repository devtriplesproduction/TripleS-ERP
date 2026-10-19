'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Pencil,
  Pin,
  Trash2,
  Loader2,
} from 'lucide-react'
import type { PersonalNote } from '@/types/notes'
import {
  updatePersonalNoteAction,
} from '@/lib/actions/notes'
import { toast } from 'sonner'

interface EditPersonalNoteModalProps {
  note: PersonalNote | null
  isOpen: boolean
  onClose: () => void
  onNoteUpdated: (note: PersonalNote) => void
  onDeleteNote?: (note: PersonalNote) => void
}

export function EditPersonalNoteModal({
  note,
  isOpen,
  onClose,
  onNoteUpdated,
  onDeleteNote,
}: EditPersonalNoteModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)

  useEffect(() => {
    if (note) {
      setTitle(note.title || '')
      setContent(note.content || '')
      setIsPinned(note.is_pinned || false)
    }
  }, [note])

  if (!note) return null

  const handleClose = () => {
    if (isSubmitting) return
    onClose()
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (isSubmitting) return

    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()

    if (!trimmedTitle && !trimmedContent) {
      toast.error('Note cannot be completely empty')
      return
    }

    // If unchanged, just close
    if (
      trimmedTitle === (note.title || '').trim() &&
      trimmedContent === (note.content || '').trim() &&
      isPinned === note.is_pinned
    ) {
      onClose()
      return
    }

    setIsSubmitting(true)
    try {
      const res = await updatePersonalNoteAction(note.id, {
        title: trimmedTitle,
        content: trimmedContent,
        is_pinned: isPinned,
      })

      if (res.success && res.data) {
        toast.success('Note updated')
        onNoteUpdated(res.data)
        onClose()
      } else {
        toast.error(res.error || 'Failed to update note')
      }
    } catch {
      toast.error('Network error updating note')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[480px] p-5 gap-4 bg-card border-border shadow-2xl rounded-2xl select-none">
        <DialogHeader className="p-0 border-b border-border/50 pb-3">
          <DialogTitle className="text-base font-bold text-foreground flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-muted text-foreground">
                <Pencil className="w-4 h-4" />
              </span>
              <span>Edit Note</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsPinned(!isPinned)}
                title={isPinned ? 'Unpin note' : 'Pin note to top'}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isPinned
                    ? 'text-foreground bg-muted'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
              </button>
              {onDeleteNote && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onDeleteNote(note)
                  }}
                  title="Delete note"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Note Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Title</span>
              <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              className="text-xs bg-background h-9 rounded-lg border-border focus-visible:ring-1 focus-visible:ring-foreground"
            />
          </div>

          {/* Note Content */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Content</span>
              <span className="text-[10px] text-muted-foreground font-normal">Details / Checklists</span>
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Take a note..."
              rows={5}
              className="text-xs bg-background min-h-[110px] max-h-[220px] rounded-lg border-border resize-none leading-relaxed focus-visible:ring-1 focus-visible:ring-foreground"
            />
          </div>

          <DialogFooter className="p-0 pt-3 border-t border-border/40 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-xs h-8 rounded-lg cursor-pointer border-border"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || (!title.trim() && !content.trim())}
              className="text-xs h-8 font-medium rounded-lg bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
