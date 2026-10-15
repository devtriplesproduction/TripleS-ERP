'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Lightbulb,
  Search,
  LayoutGrid,
  List,
  Pin,
  Archive,
  ArchiveRestore,
  Trash2,
  Plus,
  X,
  Loader2,
  MoreVertical,
  Clock,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmModal } from '@/components/ui/confirm-modal'
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

export function FullNotesView() {
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [notes, setNotes] = useState<PersonalNote[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Creation box state
  const [isCreatorExpanded, setIsCreatorExpanded] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [isNewPinned, setIsNewPinned] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Active inline editing note id
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)

  // Permanent Delete Modal State
  const [noteToDelete, setNoteToDelete] = useState<PersonalNote | null>(null)

  const creatorRef = useRef<HTMLDivElement>(null)

  // Load notes
  const loadNotes = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getPersonalNotesAction({
        includeArchived: true,
      })
      if (res.success && res.data) {
        setNotes(res.data)
      }
    } catch (err) {
      console.error('[FullNotesView] Error loading notes:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  // Handle outside click on creation card
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (creatorRef.current && !creatorRef.current.contains(e.target as Node)) {
        if (isCreatorExpanded) {
          handleSaveNewNote()
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isCreatorExpanded, newTitle, newContent, isNewPinned])

  // Create new note
  const handleSaveNewNote = async () => {
    const titleTrim = newTitle.trim()
    const contentTrim = newContent.trim()

    if (!titleTrim && !contentTrim) {
      setIsCreatorExpanded(false)
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
        setIsCreatorExpanded(false)
        toast.success('Note created')
      } else {
        toast.error(res.error || 'Failed to create note')
      }
    } catch {
      toast.error('Network error creating note')
    } finally {
      setIsCreating(false)
    }
  }

  // Toggle Pin
  const handleTogglePin = async (e: React.MouseEvent, note: PersonalNote) => {
    e.stopPropagation()
    const nextPin = !note.is_pinned
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, is_pinned: nextPin } : n))
    )
    try {
      await togglePinNoteAction(note.id, nextPin)
      toast.success(nextPin ? 'Note pinned' : 'Note unpinned')
    } catch {
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, is_pinned: !nextPin } : n))
      )
      toast.error('Failed to toggle pin')
    }
  }

  // Toggle Archive
  const handleToggleArchive = async (e: React.MouseEvent, note: PersonalNote) => {
    e.stopPropagation()
    const nextArchived = !note.is_archived
    setNotes((prev) =>
      prev.map((n) =>
        n.id === note.id
          ? { ...n, is_archived: nextArchived, is_pinned: nextArchived ? false : n.is_pinned }
          : n
      )
    )
    try {
      await toggleArchiveNoteAction(note.id, nextArchived)
      toast.success(nextArchived ? 'Note archived' : 'Note restored to active')
    } catch {
      loadNotes()
      toast.error('Failed to update note')
    }
  }

  // Confirm Permanent Deletion
  const handleConfirmPermanentDelete = async (noteId: string) => {
    try {
      const res = await deletePersonalNoteAction(noteId, true)
      if (res.success) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId))
        toast.success('Note permanently deleted')
      } else {
        toast.error(res.error || 'Failed to delete note')
      }
    } catch {
      toast.error('Error deleting note')
    }
  }

  // Soft Delete
  const handleSoftDelete = async (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation()
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
    try {
      const res = await deletePersonalNoteAction(noteId, false)
      if (res.success) {
        toast.success('Note moved to trash')
      }
    } catch {
      loadNotes()
      toast.error('Failed to delete note')
    }
  }

  // Filter notes based on active tab & search query
  const tabNotes = notes.filter((n) => {
    if (activeTab === 'active') return !n.is_archived
    return n.is_archived
  })

  const filteredNotes = tabNotes.filter((n) => {
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
    <div className="max-w-7xl mx-auto space-y-6 pb-12 select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted border border-border/60 flex items-center justify-center text-foreground shadow-xs">
            <Lightbulb className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Personal Notes
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-medium text-muted-foreground">
                {notes.filter((n) => !n.is_archived).length} notes
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Private personal notes, ideas, and checklists
            </p>
          </div>
        </div>

        {/* Search & View Controls */}
        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-card border border-border/70 rounded-xl outline-none focus:border-foreground/50 transition-colors text-foreground placeholder:text-muted-foreground shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Grid/List switch */}
          <div className="flex items-center bg-card border border-border/70 rounded-xl p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Grid View"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-foreground text-background shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title="List View"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-foreground text-background shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs: Active Notes vs Archive */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'active'
              ? 'bg-foreground text-background shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>Notes</span>
          <span className="opacity-70 text-[11px]">
            ({notes.filter((n) => !n.is_archived).length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('archive')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'archive'
              ? 'bg-foreground text-background shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          <span>Archive</span>
          <span className="opacity-70 text-[11px]">
            ({notes.filter((n) => n.is_archived).length})
          </span>
        </button>
      </div>

      {/* Top Creation Widget (shown in Active Notes tab) */}
      {activeTab === 'active' && (
        <div className="flex justify-center pt-2">
          <div ref={creatorRef} className="w-full max-w-xl">
            {!isCreatorExpanded ? (
              <div
                onClick={() => setIsCreatorExpanded(true)}
                className="flex items-center justify-between px-4 py-3 rounded-2xl bg-card hover:bg-card/90 border border-border/80 hover:border-foreground/30 text-muted-foreground hover:text-foreground cursor-pointer transition-all shadow-sm hover:shadow-md group"
              >
                <div className="flex items-center gap-2.5 text-sm font-medium">
                  <Plus className="w-4 h-4 text-foreground transition-transform group-hover:rotate-90 duration-200" />
                  <span>Take a note...</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-muted-foreground/60" />
                </div>
              </div>
            ) : (
              <div className="p-4 bg-card border border-border rounded-2xl shadow-xl transition-all space-y-3 animate-in fade-in-0 duration-150">
                {/* Title & Pin */}
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Title"
                    autoFocus
                    className="w-full text-base font-semibold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/60"
                  />
                  <button
                    type="button"
                    onClick={() => setIsNewPinned((prev) => !prev)}
                    title={isNewPinned ? 'Unpin' : 'Pin note'}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isNewPinned
                        ? 'text-foreground bg-muted'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Pin className={`w-4 h-4 ${isNewPinned ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Content */}
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Take a note..."
                  rows={4}
                  className="w-full text-sm leading-relaxed bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground/60"
                />

                {/* Toolbar */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setNewTitle('')
                      setNewContent('')
                      setIsCreatorExpanded(false)
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded"
                  >
                    Cancel
                  </button>

                  <Button
                    type="button"
                    size="sm"
                    disabled={isCreating}
                    onClick={handleSaveNewNote}
                    className="h-8 px-4 font-medium text-xs rounded-lg bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
                  >
                    {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Done'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Notes Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-muted-foreground" />
          <p className="text-sm font-medium">Loading your personal notes...</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-muted/60 border border-border/60 flex items-center justify-center mb-4 text-muted-foreground shadow-xs">
            {activeTab === 'active' ? (
              <Lightbulb className="w-10 h-10 stroke-[1.6]" />
            ) : (
              <Archive className="w-10 h-10 stroke-[1.6]" />
            )}
          </div>
          <h3 className="text-lg font-bold text-foreground">
            {activeTab === 'active' ? 'No notes yet' : 'No archived notes'}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
            {activeTab === 'active'
              ? 'Capture quick ideas, task checklists, and reminders that are completely private to you.'
              : 'Notes you archive appear here, keeping your main workspace clean.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pinned Notes Section */}
          {pinnedNotes.length > 0 && activeTab === 'active' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Pin className="w-3.5 h-3.5 text-foreground fill-current" />
                <span>PINNED ({pinnedNotes.length})</span>
              </div>
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
                    : 'flex flex-col gap-3 max-w-2xl mx-auto'
                }
              >
                {pinnedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    viewMode={viewMode}
                    isEditing={editingNoteId === note.id}
                    onStartEdit={() => setEditingNoteId(note.id)}
                    onCancelEdit={() => setEditingNoteId(null)}
                    onSave={(updated) => {
                      setNotes((prev) =>
                        prev.map((n) => (n.id === updated.id ? updated : n))
                      )
                    }}
                    onTogglePin={(e) => handleTogglePin(e, note)}
                    onArchive={(e) => handleToggleArchive(e, note)}
                    onDelete={(e) => handleSoftDelete(e, note.id)}
                    onPermanentDelete={() => setNoteToDelete(note)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other / Active Notes Section */}
          {otherNotes.length > 0 && (
            <div className="space-y-3">
              {pinnedNotes.length > 0 && activeTab === 'active' && (
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  OTHERS ({otherNotes.length})
                </div>
              )}
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
                    : 'flex flex-col gap-3 max-w-2xl mx-auto'
                }
              >
                {otherNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    viewMode={viewMode}
                    isEditing={editingNoteId === note.id}
                    onStartEdit={() => setEditingNoteId(note.id)}
                    onCancelEdit={() => setEditingNoteId(null)}
                    onSave={(updated) => {
                      setNotes((prev) =>
                        prev.map((n) => (n.id === updated.id ? updated : n))
                      )
                    }}
                    onTogglePin={(e) => handleTogglePin(e, note)}
                    onArchive={(e) => handleToggleArchive(e, note)}
                    onDelete={(e) => handleSoftDelete(e, note.id)}
                    onPermanentDelete={() => setNoteToDelete(note)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Permanent Delete Confirmation Dialog */}
      {noteToDelete && (
        <ConfirmModal
          open={!!noteToDelete}
          onOpenChange={(isOpen) => {
            if (!isOpen) setNoteToDelete(null)
          }}
          title="Delete Note Permanently?"
          description={`Are you sure you want to permanently delete "${
            noteToDelete.title || 'this note'
          }"? This action cannot be undone.`}
          confirmText="Delete Permanently"
          variant="destructive"
          onConfirm={async () => {
            await handleConfirmPermanentDelete(noteToDelete.id)
            setNoteToDelete(null)
          }}
        />
      )}
    </div>
  )
}
