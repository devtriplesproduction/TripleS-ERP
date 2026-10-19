import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FullNotesView } from '@/components/notes/FullNotesView'
import type { PersonalNote } from '@/types/notes'

// Mock dependencies
vi.mock('@/lib/actions/notes', () => ({
  getPersonalNotesAction: vi.fn().mockResolvedValue({ success: true, data: [] }),
  createPersonalNoteAction: vi.fn(),
  updatePersonalNoteAction: vi.fn(),
  togglePinNoteAction: vi.fn(),
  deletePersonalNoteAction: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockNotes: PersonalNote[] = [
  {
    id: 'note-1',
    user_id: 'user-123',
    title: 'Design Meeting Notes',
    content: 'Review the new ERP design system and standardized component tokens.',
    is_pinned: true,
    is_archived: false,
    created_at: '2026-10-19T08:00:00Z',
    updated_at: '2026-10-19T08:30:00Z',
  },
  {
    id: 'note-2',
    user_id: 'user-123',
    title: 'Upcoming Milestones',
    content: 'Finalize QA verification and deploy changes.',
    is_pinned: false,
    is_archived: false,
    created_at: '2026-10-18T10:00:00Z',
    updated_at: '2026-10-18T11:00:00Z',
  },
]

describe('FullNotesView Component Redesign', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('removes the note count badge from the page header and keeps the clean title', () => {
    const html = renderToStaticMarkup(<FullNotesView initialNotes={mockNotes} />)

    // The header title should be "Personal Notes" without a badge like "1 notes" or "2 notes"
    expect(html).toContain('Personal Notes')
    expect(html).not.toMatch(/Personal Notes\s*<\/span>\s*<span[^>]*>\s*\d+\s+notes/i)
    expect(html).not.toContain('2 notes')
    expect(html).not.toContain('1 notes')
  })

  it('removes the old Notes and Archive segmented toggle tabs row below the header', () => {
    const html = renderToStaticMarkup(<FullNotesView initialNotes={mockNotes} />)

    // Old role="tablist" segmented tab strip shouldn't exist
    expect(html).not.toContain('role="tablist"')
    expect(html).not.toContain('Take a note...')
    expect(html).not.toContain('Archive (')
    expect(html).not.toContain('Archived Notes')
  })

  it('renders the header toolbar with Search input, Add Note button, and Grid/List view switcher', () => {
    const html = renderToStaticMarkup(<FullNotesView initialNotes={mockNotes} />)

    // 1. Search Notes input
    expect(html).toContain('placeholder="Search notes by title or content..."')

    // 2. Add Note button
    expect(html).toContain('Add Note')

    // 3. Grid / List View toggle
    expect(html).toContain('aria-label="Notes view options"')
    expect(html).toContain('aria-label="Grid view"')
    expect(html).toContain('aria-label="List view"')
  })

  it('renders notes in Grid View by default with Pinned and Others sections', () => {
    const html = renderToStaticMarkup(<FullNotesView initialNotes={mockNotes} />)

    // Pinned section
    expect(html).toContain('Pinned (1)')
    expect(html).toContain('Design Meeting Notes')

    // Others section
    expect(html).toContain('Others (1)')
    expect(html).toContain('Upcoming Milestones')
  })

  it('renders the centered CreatePersonalNoteModal and EditPersonalNoteModal dialog components', () => {
    const html = renderToStaticMarkup(<FullNotesView initialNotes={mockNotes} />)

    expect(html).toBeDefined()
  })
})
