'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search,
  LayoutGrid,
  List,
  Pin,
  Trash2,
  Plus,
  X,
  Loader2,
  StickyNote,
  RefreshCw,
  Pencil,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import type { PersonalNote } from '@/types/notes'
import {
  getPersonalNotesAction,
  togglePinNoteAction,
  deletePersonalNoteAction,
} from '@/lib/actions/notes'
import { NoteCard } from './NoteCard'
import { CreatePersonalNoteModal } from './CreatePersonalNoteModal'
import { EditPersonalNoteModal } from './EditPersonalNoteModal'
import { toast } from 'sonner'
import dayjs from 'dayjs'

interface FullNotesViewProps {
  initialNotes?: PersonalNote[]
}

export function FullNotesView({ initialNotes = [] }: FullNotesViewProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [notes, setNotes] = useState<PersonalNote[]>(initialNotes)
  const [isLoading, setIsLoading] = useState(initialNotes.length === 0)

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<PersonalNote | null>(null)
  const [inlineEditingNoteId, setInlineEditingNoteId] = useState<string | null>(null)
  const [noteToDelete, setNoteToDelete] = useState<PersonalNote | null>(null)

  // Load notes
  const loadNotes = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getPersonalNotesAction({
        includeArchived: false,
      })
      if (res.success && res.data) {
        setNotes(res.data)
      } else if (!res.success) {
        toast.error(res.error || 'Failed to load notes')
      }
    } catch (err) {
      console.error('[FullNotesView] Error loading notes:', err)
      toast.error('Network error loading notes')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  // Toggle Pin
  const handleTogglePin = async (e: React.MouseEvent, note: PersonalNote) => {
    e.stopPropagation()
    const nextPin = !note.is_pinned
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, is_pinned: nextPin } : n))
    )
    try {
      const res = await togglePinNoteAction(note.id, nextPin)
      if (res.success && res.data) {
        setNotes((prev) =>
          prev.map((n) => (n.id === note.id ? res.data! : n))
        )
        toast.success(nextPin ? 'Note pinned' : 'Note unpinned')
      } else {
        setNotes((prev) =>
          prev.map((n) => (n.id === note.id ? { ...n, is_pinned: !nextPin } : n))
        )
        toast.error(res.error || 'Failed to toggle pin')
      }
    } catch {
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, is_pinned: !nextPin } : n))
      )
      toast.error('Failed to toggle pin')
    }
  }

  // Confirm Permanent Deletion
  const handleConfirmPermanentDelete = async (noteId: string) => {
    const previousNotes = notes
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
    try {
      const res = await deletePersonalNoteAction(noteId, true)
      if (res.success) {
        toast.success('Note permanently deleted')
      } else {
        setNotes(previousNotes)
        toast.error(res.error || 'Failed to delete note')
      }
    } catch {
      setNotes(previousNotes)
      toast.error('Error deleting note')
    }
  }

  // Soft Delete (move to trash)
  const handleSoftDelete = async (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation()
    const previousNotes = notes
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
    try {
      const res = await deletePersonalNoteAction(noteId, false)
      if (res.success) {
        toast.success('Note moved to trash')
      } else {
        setNotes(previousNotes)
        toast.error(res.error || 'Failed to delete note')
      }
    } catch {
      setNotes(previousNotes)
      toast.error('Failed to delete note')
    }
  }

  // Filter notes based on search query
  const filteredNotes = useMemo(() => {
    let result = notes

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.content?.toLowerCase().includes(q)
      )
    }

    // Sort: Pinned first, then newest updated
    return [...result].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) {
        return a.is_pinned ? -1 : 1
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }, [notes, searchQuery])

  const pinnedNotes = useMemo(
    () => filteredNotes.filter((n) => n.is_pinned),
    [filteredNotes]
  )
  const otherNotes = useMemo(
    () => filteredNotes.filter((n) => !n.is_pinned),
    [filteredNotes]
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6 select-none">
      {/* Page Header (No count badge, standard icon container, title & subtitle) */}
      <PageHeader
        title="Personal Notes"
        subtitle="Private personal notes, ideas, and checklists"
        icon={StickyNote}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadNotes}
            className="h-9 px-3.5 text-xs font-medium rounded-lg gap-1.5 border-border/80 bg-card hover:bg-muted text-foreground cursor-pointer shadow-xs"
            title="Refresh notes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        }
      />

      {/* Standardized Header Toolbar:
          Required order from left to right:
          1. Search Notes input
          2. Add Note button
          3. Grid View / List View toggle
      */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        {/* 1. Search Notes input */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes by title or content..."
            className="!h-9 !min-h-[36px] !max-h-[36px] !pl-9 !pr-8 !text-xs rounded-lg border-border/80 bg-card font-normal shadow-xs focus-visible:ring-1 focus-visible:ring-foreground/20 text-foreground w-full placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right cluster: 2. Add Note button, 3. Grid / List View toggle */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
          {/* 2. Add Note Button */}
          <Button
            type="button"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="h-9 px-3.5 text-xs font-semibold rounded-lg bg-foreground text-background hover:bg-foreground/90 cursor-pointer gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Note</span>
          </Button>

          {/* 3. Standardized Grid/List View Switcher */}
          <div
            role="radiogroup"
            aria-label="Notes view options"
            className="flex items-center h-9 p-0.5 rounded-lg border border-border/80 bg-card shadow-xs shrink-0"
          >
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'grid'}
              aria-label="Grid view"
              title="Grid View"
              onClick={() => setViewMode('grid')}
              className={`h-7.5 w-8 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-foreground text-background shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <div className="w-px h-4 bg-border/60 mx-0.5 shrink-0" aria-hidden="true" />
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'list'}
              aria-label="List view"
              title="List View"
              onClick={() => setViewMode('list')}
              className={`h-7.5 w-8 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-foreground text-background shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Notes Content (Starts immediately below the toolbar) */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-muted-foreground" />
          <p className="text-sm font-medium">Loading your personal notes...</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card rounded-2xl border border-border">
          <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center mb-3">
            <StickyNote className="w-6 h-6 text-muted-foreground/70" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            {searchQuery ? 'No notes found' : 'No personal notes yet'}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm">
            {searchQuery
              ? 'No notes match your current search query.'
              : 'Capture personal ideas, task checklists, and reminders completely private to you.'}
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-5 text-xs h-9 rounded-lg gap-1.5 bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Note</span>
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        /* ================= GRID VIEW ================= */
        <div className="space-y-6">
          {/* Pinned Notes Section */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Pin className="w-3.5 h-3.5 text-foreground fill-current" />
                <span>Pinned ({pinnedNotes.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {pinnedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    viewMode="grid"
                    isEditing={inlineEditingNoteId === note.id}
                    onStartEdit={() => setInlineEditingNoteId(note.id)}
                    onCancelEdit={() => setInlineEditingNoteId(null)}
                    onSave={(updated) => {
                      setNotes((prev) =>
                        prev.map((n) => (n.id === updated.id ? updated : n))
                      )
                    }}
                    onTogglePin={(e) => handleTogglePin(e, note)}
                    onDelete={(e) => handleSoftDelete(e, note.id)}
                    onPermanentDelete={() => setNoteToDelete(note)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other Notes Section */}
          {otherNotes.length > 0 && (
            <div className="space-y-2.5">
              {pinnedNotes.length > 0 && (
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Others ({otherNotes.length})
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {otherNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    viewMode="grid"
                    isEditing={inlineEditingNoteId === note.id}
                    onStartEdit={() => setInlineEditingNoteId(note.id)}
                    onCancelEdit={() => setInlineEditingNoteId(null)}
                    onSave={(updated) => {
                      setNotes((prev) =>
                        prev.map((n) => (n.id === updated.id ? updated : n))
                      )
                    }}
                    onTogglePin={(e) => handleTogglePin(e, note)}
                    onDelete={(e) => handleSoftDelete(e, note.id)}
                    onPermanentDelete={() => setNoteToDelete(note)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ================= LIST VIEW (Clean structured table) ================= */
        <div className="w-full overflow-x-auto rounded-xl border border-border/80 bg-card shadow-xs">
          <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
            <thead className="bg-secondary/40 border-b border-border/70 text-[11px] text-muted-foreground uppercase font-semibold tracking-wider select-none">
              <tr>
                <th className="px-3.5 py-3 min-w-[200px]">Note Title</th>
                <th className="px-3.5 py-3 min-w-[320px]">Content Preview</th>
                <th className="px-3.5 py-3">Updated Date</th>
                <th className="px-3.5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredNotes.map((note) => (
                <tr
                  key={note.id}
                  onClick={() => setEditingNote(note)}
                  className="hover:bg-accent/10 transition-colors cursor-pointer group"
                >
                  {/* Note Title */}
                  <td className="px-3.5 py-3 font-medium text-foreground">
                    <div className="flex items-center gap-2 max-w-[260px]">
                      {note.is_pinned && (
                        <Pin className="w-3.5 h-3.5 text-foreground fill-current shrink-0" />
                      )}
                      <span className="truncate font-semibold text-xs sm:text-sm">
                        {note.title || 'Untitled Note'}
                      </span>
                    </div>
                  </td>

                  {/* Content Preview */}
                  <td className="px-3.5 py-3 text-xs text-muted-foreground">
                    <span className="max-w-[420px] truncate block font-normal">
                      {note.content || <span className="italic text-muted-foreground/60">No content</span>}
                    </span>
                  </td>

                  {/* Updated Date */}
                  <td className="px-3.5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {dayjs(note.updated_at).format('DD MMM YYYY, h:mm A')}
                  </td>

                  {/* Actions */}
                  <td className="px-3.5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {/* Pin toggle */}
                      <button
                        type="button"
                        onClick={(e) => handleTogglePin(e, note)}
                        title={note.is_pinned ? 'Unpin note' : 'Pin note'}
                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                          note.is_pinned
                            ? 'text-foreground bg-muted'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        <Pin className={`w-3.5 h-3.5 ${note.is_pinned ? 'fill-current' : ''}`} />
                      </button>

                      {/* Edit button */}
                      <button
                        type="button"
                        onClick={() => setEditingNote(note)}
                        title="Edit note"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={(e) => handleSoftDelete(e, note.id)}
                        title="Delete note"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Note Centered Modal */}
      <CreatePersonalNoteModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onNoteCreated={(newNote) => {
          setNotes((prev) => [newNote, ...prev.filter((n) => n.id !== newNote.id)])
        }}
      />

      {/* Edit Note Centered Modal */}
      <EditPersonalNoteModal
        note={editingNote}
        isOpen={Boolean(editingNote)}
        onClose={() => setEditingNote(null)}
        onNoteUpdated={(updated) => {
          setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))}
        }
        onDeleteNote={(note) => {
          setNoteToDelete(note)
        }}
      />

      {/* Permanent Delete Confirmation Dialog */}
      {noteToDelete && (
        <ConfirmModal
          open={Boolean(noteToDelete)}
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
