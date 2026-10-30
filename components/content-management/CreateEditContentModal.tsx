'use client'

import React, { useState, useEffect } from 'react'
import {
  FileText,
  Calendar,
  Save,
  Send,
  Eye,
  Edit3,
  X,
  Tag,
  Loader2,
  FolderKanban,
  User,
  UserCheck,
  Columns,
  Sparkles,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ContentItem,
  ContentType,
  ContentPriority,
  AssignedRole,
  CreateContentInput,
  UpdateContentInput,
} from '@/types/content-management'
import { Project } from '@/types/project-management'
import { AssignableEmployee } from '@/lib/actions/team'

interface CreateEditContentModalProps {
  isOpen: boolean
  onClose: () => void
  item?: ContentItem | null
  contentTypes: ContentType[]
  projects: Project[]
  employees: AssignableEmployee[]
  currentUserId?: string
  currentUserName?: string
  onSubmit: (input: CreateContentInput | UpdateContentInput, statusToSave: 'Draft' | 'In Review') => Promise<void>
}

export function CreateEditContentModal({
  isOpen,
  onClose,
  item,
  contentTypes,
  projects,
  employees,
  currentUserId,
  currentUserName,
  onSubmit,
}: CreateEditContentModalProps) {
  const isEditing = Boolean(item)
  const [activeTab, setActiveTab] = useState<'EDIT' | 'SPLIT' | 'PREVIEW'>('EDIT')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form State
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [body, setBody] = useState('')
  const [contentType, setContentType] = useState('')
  const [projectId, setProjectId] = useState('NONE')
  const [ownerId, setOwnerId] = useState(currentUserId || '')
  const [assignedToId, setAssignedToId] = useState('UNASSIGNED')
  const [assignedRole, setAssignedRole] = useState<AssignedRole>('Developer')
  const [priority, setPriority] = useState<ContentPriority>('Medium')
  const [tagsInput, setTagsInput] = useState('')
  const [dueDate, setDueDate] = useState('')

  // Active content types for selection
  const selectableTypes = contentTypes.filter(
    (t) => t.is_active || (item && item.content_type === t.name)
  )

  useEffect(() => {
    if (item) {
      setTitle(item.title || '')
      setSummary(item.summary || '')
      setBody(item.body || '')
      setContentType(item.content_type || '')
      setProjectId(item.project_id || 'NONE')
      setOwnerId(item.owner_id || currentUserId || '')
      setAssignedToId(item.assigned_to_id || 'UNASSIGNED')
      setAssignedRole(item.assigned_role || 'Developer')
      setPriority(item.priority || 'Medium')
      setTagsInput(item.tags ? item.tags.join(', ') : '')
      setDueDate(item.due_date || '')
    } else {
      setTitle('')
      setSummary('')
      setBody('')
      const defaultType = selectableTypes.find((t) => t.is_active)?.name || ''
      setContentType(defaultType)
      setProjectId('NONE')
      setOwnerId(currentUserId || '')
      setAssignedToId('UNASSIGNED')
      setAssignedRole('Developer')
      setPriority('Medium')
      setTagsInput('')
      setDueDate('')
    }
    setActiveTab('EDIT')
    setError('')
  }, [item, isOpen, currentUserId])

  const parseTags = () => {
    return tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  }

  // Word count & stats
  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0
  const readingTime = Math.max(1, Math.ceil(wordCount / 200))

  const handleFormSubmit = async (status: 'Draft' | 'In Review') => {
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    if (!contentType.trim()) {
      setError('Content Type is required.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const selectedProject = projects.find((p) => p.id === projectId)
      const selectedOwner = employees.find((e) => e.id === ownerId)
      const selectedAssignee = employees.find((e) => e.id === assignedToId)

      const payload: CreateContentInput = {
        title: title.trim(),
        summary: summary.trim(),
        body: body.trim(),
        content_type: contentType,
        project_id: projectId === 'NONE' ? null : projectId,
        project_name: selectedProject ? selectedProject.name : 'General Operations',
        owner_id: ownerId || currentUserId,
        owner_name: selectedOwner ? selectedOwner.name : (currentUserName || 'Content Author'),
        status,
        tags: parseTags(),
        due_date: dueDate || null,
        assigned_to_id: assignedToId === 'UNASSIGNED' ? null : assignedToId,
        assigned_to_name: selectedAssignee ? selectedAssignee.name : null,
        assigned_role: assignedRole,
        priority,
      }

      await onSubmit(payload, status)
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to save content item.')
    } finally {
      setLoading(false)
    }
  }

  // Helper for rendering preview card
  const renderPreviewContent = () => (
    <div className="space-y-4">
      <div className="p-5 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
            {contentType || 'Technical Documentation'}
          </Badge>
          <Badge variant="outline" className="text-zinc-400 border-zinc-700">
            {projects.find((p) => p.id === projectId)?.name || 'General Operations'}
          </Badge>
          {priority && (
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              {priority} Priority
            </Badge>
          )}
          {dueDate && (
            <Badge variant="outline" className="text-zinc-400 border-zinc-700 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Due: {dueDate}
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold text-zinc-100">{title || 'Untitled Document'}</h1>
        {summary ? (
          <p className="text-sm text-zinc-300 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80 italic leading-relaxed">
            {summary}
          </p>
        ) : (
          <p className="text-xs text-zinc-500 italic">No executive summary entered.</p>
        )}

        {/* Tags */}
        {parseTags().length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {parseTags().map((t, i) => (
              <span key={i} className="px-2 py-0.5 bg-zinc-800/80 text-zinc-300 text-[11px] rounded border border-zinc-700/60">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-xl">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Rendered Document Content
        </h4>
        <div className="prose prose-invert max-w-none text-sm text-zinc-200 whitespace-pre-wrap font-mono leading-relaxed bg-zinc-950/80 p-5 rounded-lg border border-zinc-800/90">
          {body || 'No body content entered yet.'}
        </div>
      </div>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Wide modal dialog: 96vw width, max 7xl (up to 1280px+) */}
      <DialogContent className="w-[96vw] max-w-7xl sm:max-w-6xl xl:max-w-7xl max-h-[94vh] flex flex-col p-0 overflow-hidden bg-zinc-950 border-zinc-800 text-zinc-100 shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-zinc-800/80 bg-zinc-900/60 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 shadow-inner">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-zinc-100 tracking-tight">
                  {isEditing ? 'Edit Content' : 'Create New Content'}
                </DialogTitle>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Technical guides, API documentation, FAQs, and release assets.
                </p>
              </div>
            </div>

            {/* View Mode Switcher: Edit | Split View | Preview */}
            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab('EDIT')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'EDIT'
                    ? 'bg-zinc-800 text-indigo-400 shadow-sm border border-zinc-700/60'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Form View</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('SPLIT')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'SPLIT'
                    ? 'bg-zinc-800 text-indigo-400 shadow-sm border border-zinc-700/60'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Side-by-Side</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('PREVIEW')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'PREVIEW'
                    ? 'bg-zinc-800 text-indigo-400 shadow-sm border border-zinc-700/60'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Full Preview</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 shrink-0">
            {error}
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'EDIT' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Metadata & Settings (5 cols on wide screens) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-5 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-4">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Document Metadata</span>
                  </h3>

                  {/* Title */}
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                      Title <span className="text-indigo-400">*</span>
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Payment Gateway API Specification v2"
                      className="bg-zinc-900 border-zinc-800 text-sm focus:border-indigo-500"
                    />
                  </div>

                  {/* Content Type & Project */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                        Content Type <span className="text-indigo-400">*</span>
                      </label>
                      <select
                        value={contentType}
                        onChange={(e) => setContentType(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="" disabled>-- Select Type --</option>
                        {selectableTypes.map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name} {!t.is_active ? '(Inactive)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                        Project
                      </label>
                      <select
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="NONE">General Operations</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Owner, Assignee, Priority */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                        Author / Owner
                      </label>
                      <select
                        value={ownerId}
                        onChange={(e) => setOwnerId(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                      >
                        {employees.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name} ({e.department || 'Staff'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                          Assignee
                        </label>
                        <select
                          value={assignedToId}
                          onChange={(e) => setAssignedToId(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="UNASSIGNED">-- Unassigned --</option>
                          {employees.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name} ({e.designation || 'Staff'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                          Priority
                        </label>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value as ContentPriority)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                          <option value="Urgent">Urgent</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Due Date & Tags */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                        Due Date
                      </label>
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 text-xs focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                        Tags (comma-separated)
                      </label>
                      <Input
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="API, Payment, V2"
                        className="bg-zinc-900 border-zinc-800 text-xs focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Executive Summary */}
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                      Executive Summary
                    </label>
                    <textarea
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="A concise synopsis of the document for search results and previews..."
                      rows={3}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Spacious Content Body Editor (7 cols on wide screens) */}
              <div className="lg:col-span-7 flex flex-col space-y-2">
                <div className="flex items-center justify-between pb-1">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Content Body (Markdown & Documentation)
                  </label>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-mono">
                    <span>Words: <strong className="text-zinc-400">{wordCount}</strong></span>
                    <span>&bull;</span>
                    <span>Est. Read: <strong className="text-zinc-400">{readingTime} min</strong></span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="# Enter content specifications, architectural diagrams, API examples, or guides here...\n\n## Overview\nWrite your markdown content here."
                    rows={22}
                    className="w-full flex-1 bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 text-sm font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-y leading-relaxed shadow-inner"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'SPLIT' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Quick Form & Editor */}
              <div className="space-y-4">
                <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">Title</label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Document title..."
                      className="bg-zinc-900 border-zinc-800 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">Content Type</label>
                      <select
                        value={contentType}
                        onChange={(e) => setContentType(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200"
                      >
                        {selectableTypes.map((t) => (
                          <option key={t.id} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">Due Date</label>
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">Summary</label>
                    <textarea
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="Document summary..."
                      rows={2}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between pb-1">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Markdown Editor</label>
                    <span className="text-[11px] text-zinc-500 font-mono">{wordCount} words</span>
                  </div>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="# Enter markdown here..."
                    rows={15}
                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 text-sm font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 leading-relaxed shadow-inner"
                  />
                </div>
              </div>

              {/* Right: Live Preview */}
              <div className="overflow-y-auto max-h-[70vh]">
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Real-time Live Preview</span>
                </div>
                {renderPreviewContent()}
              </div>
            </div>
          )}

          {activeTab === 'PREVIEW' && (
            <div className="max-w-4xl mx-auto">
              {renderPreviewContent()}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="text-zinc-400 hover:text-zinc-100"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => handleFormSubmit('Draft')}
              className="border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 px-4"
            >
              <Save className="w-4 h-4 mr-1.5" />
              Save as Draft
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={() => handleFormSubmit('In Review')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 shadow-md shadow-indigo-600/20"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Send className="w-4 h-4 mr-1.5" />
              )}
              Submit for Review
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
