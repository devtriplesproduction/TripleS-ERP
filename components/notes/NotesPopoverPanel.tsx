'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  ExternalLink,
  X,
  Plus,
  Pin,
  MoreVertical,
  Archive,
  Trash2,
  CheckSquare,
  Lightbulb,
  Check,
  Loader2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import type { PersonalNote } from '@/types/notes'
import {
  getPersonalNotesAction,
  createPersonalNoteAction,
  togglePinNoteAction,
  toggleArchiveNoteAction,
  deletePersonalNoteAction,
} from '@/lib/actions/notes'
import { NoteCard } from './NoteCard'
import { toast } from 'sonner'
import dayjs from 'dayjs'

interface NotesPopoverPanelProps {
  onClose: () => void
}

export function NotesPopoverPanel({ onClose }: NotesPopoverPanelProps) {
  const router = useRouter()
  const [notes, setNotes] = useState<PersonalNote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Creation State
  const [isExpanded, setIsExpanded] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [isNewPinned, setIsNewPinned] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Active inline editing note id
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const creatorRef = useRef<HTMLDivElement>(null)

  // Fetch notes
  const loadNotes = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getPersonalNotesAction({ includeArchived: false })
      if (res.success && res.data) {
        setNotes(res.data)
      }
    } catch (err) {
      console.error('[NotesPopoverPanel] Error loading notes:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  // Focus search input when toggled
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchOpen])

  // Click outside creator to auto-save/collapse
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (creatorRef.current && !creatorRef.current.contains(e.target as Node)) {
        if (isExpanded) {
          handleSaveNewNote()
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isExpanded, newTitle, newContent, isNewPinned])

  // Create new note
  const handleSaveNewNote = async () => {
    const titleTrim = newTitle.trim()
    const contentTrim = newContent.trim()

    // If completely empty, just collapse
    if (!titleTrim && !contentTrim) {
      setIsExpanded(false)
      setIsNewPinned(false)
      return
    }

    setIsCreating(true)
    try {
      const res = await createPersonalNoteAction({
        title: titleTrim,
        content: newContent,
        is_pinned: isNewPinned,
      })

      if (res.success && res.data) {
        setNotes((prev) => [res.data!, ...prev])
        setNewTitle('')
        setNewContent('')
        setIsNewPinned(false)
        setIsExpanded(false)
        toast.success('Note saved')
      } else {
        toast.error(res.error || 'Failed to save note')
      }
    } catch {
      toast.error('Network error saving note')
    } finally {
      setIsCreating(false)
    }
  }

  // Toggle Pin on existing note
  const handleTogglePin = async (e: React.MouseEvent, note: PersonalNote) => {
    e.stopPropagation()
    const nextPin = !note.is_pinned
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, is_pinned: nextPin } : n))
    )
    try {
      await togglePinNoteAction(note.id, nextPin)
    } catch {
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, is_pinned: !nextPin } : n))
      )
      toast.error('Failed to pin note')
    }
  }

  // Archive existing note
  const handleArchiveNote = async (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation()
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
    toast.success('Note archived')
    try {
      await toggleArchiveNoteAction(noteId, true)
    } catch {
      loadNotes()
      toast.error('Failed to archive note')
    }
  }

  // Delete existing note
  const handleDeleteNote = async (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation()
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
    toast.success('Note deleted')
    try {
      await deletePersonalNoteAction(noteId, false)
    } catch {
      loadNotes()
      toast.error('Failed to delete note')
    }
  }


  // Navigate to full notes page
  const handleOpenFullPage = () => {
    onClose()
    router.push('/notes')
  }

  // Filter notes by search query
  const filteredNotes = notes.filter((n) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      n.title?.toLowerCase().includes(q) ||
      n.content?.toLowerCase().includes(q)
    )
  })

  const pinnedNotes = filteredNotes.filter((n) => n.is_pinned)
  const otherNotes = filteredNotes.filter((n) => !n.is_pinned)

  return (
    <>
      <div className="flex flex-col h-[540px] max-h-[85vh] w-full select-none bg-card text-card-foreground">
        {/* Top Header matching Google Keep style */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-foreground tracking-tight">
              Notes
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Search Toggle */}
            <button
              type="button"
              onClick={() => setIsSearchOpen((prev) => !prev)}
              title="Search notes"
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isSearchOpen
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Open Full Page */}
            <button
              type="button"
              onClick={handleOpenFullPage}
              title="Open full page view"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            {/* Close Panel */}
            <button
              type="button"
              onClick={onClose}
              title="Close"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expandable Search Input Bar */}
        {isSearchOpen && (
          <div className="p-2.5 px-3 border-b border-border/40 bg-muted/20 animate-in fade-in-0 duration-150">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-3 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-background border border-border/60 rounded-lg outline-none focus:border-foreground/40 transition-colors text-foreground placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
          {/* Creator Box: "+ Take a note..." */}
          <div ref={creatorRef}>
            {!isExpanded ? (
              <div
                onClick={() => setIsExpanded(true)}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-full bg-muted/50 hover:bg-muted border border-border/50 text-muted-foreground hover:text-foreground cursor-pointer transition-all shadow-xs group"
              >
                <div className="flex items-center gap-2 text-xs font-medium">
                  <Plus className="w-4 h-4 text-foreground transition-transform group-hover:rotate-90 duration-200" />
                  <span>Take a note...</span>
                </div>
                <CheckSquare className="w-4 h-4 text-muted-foreground/70" />
              </div>
            ) : (
              <div className="p-3 bg-card border border-border rounded-xl shadow-md transition-all space-y-2">
                {/* Title & Pin */}
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Title"
                    autoFocus
                    className="w-full text-sm font-semibold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/60"
                  />
                  <button
                    type="button"
                    onClick={() => setIsNewPinned((prev) => !prev)}
                    title={isNewPinned ? 'Unpin' : 'Pin note'}
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      isNewPinned
                        ? 'text-foreground bg-muted'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Pin className={`w-3.5 h-3.5 ${isNewPinned ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Content */}
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Take a note..."
                  rows={3}
                  className="w-full text-xs leading-relaxed bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground/60"
                />

                {/* Toolbar */}
                <div className="flex items-center justify-between pt-1 border-t border-border/30 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setNewTitle('')
                      setNewContent('')
                      setIsExpanded(false)
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <Button
                    type="button"
                    size="sm"
                    disabled={isCreating}
                    onClick={handleSaveNewNote}
                    className="h-7 px-3 text-xs font-medium rounded-lg bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
                  >
                    {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Done'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Notes List or Empty State */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <span className="text-xs">Loading notes...</span>
            </div>
          ) : notes.length === 0 ? (
            /* Empty State matching Image 1 */
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-20 h-20 rounded-full bg-muted/60 border border-border/60 flex items-center justify-center mb-4 text-foreground shadow-xs">
                <Lightbulb className="w-10 h-10 stroke-[1.6] text-muted-foreground" />
              </div>
              <h4 className="text-base font-semibold text-foreground tracking-tight">
                No notes yet
              </h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px] leading-relaxed">
                Notes you add will show up here.
              </p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No notes match &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pinned Notes Section */}
              {pinnedNotes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Pin className="w-3 h-3 text-foreground fill-current" />
                    <span>PINNED</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {pinnedNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        isEditing={editingNoteId === note.id}
                        onStartEdit={() => setEditingNoteId(note.id)}
                        onCancelEdit={() => setEditingNoteId(null)}
                        onSave={(updated) => {
                          setNotes((prev) =>
                            prev.map((n) => (n.id === updated.id ? updated : n))
                          )
                        }}
                        onTogglePin={(e) => handleTogglePin(e, note)}
                        onArchive={(e) => handleArchiveNote(e, note.id)}
                        onDelete={(e) => handleDeleteNote(e, note.id)}
                        onOpenFullPage={handleOpenFullPage}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Other Notes Section */}
              {otherNotes.length > 0 && (
                <div className="space-y-2">
                  {pinnedNotes.length > 0 && (
                    <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      OTHERS
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-2">
                    {otherNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        isEditing={editingNoteId === note.id}
                        onStartEdit={() => setEditingNoteId(note.id)}
                        onCancelEdit={() => setEditingNoteId(null)}
                        onSave={(updated) => {
                          setNotes((prev) =>
                            prev.map((n) => (n.id === updated.id ? updated : n))
                          )
                        }}
                        onTogglePin={(e) => handleTogglePin(e, note)}
                        onArchive={(e) => handleArchiveNote(e, note.id)}
                        onDelete={(e) => handleDeleteNote(e, note.id)}
                        onOpenFullPage={handleOpenFullPage}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
