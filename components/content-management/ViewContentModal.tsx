'use client'

import React, { useState } from 'react'
import {
  FileText,
  Calendar,
  User,
  FolderKanban,
  Tag,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  Eye,
  History,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ContentItem, computeDeadlineState } from '@/types/content-management'
import { AuthUser } from '@/lib/auth'
import dayjs from 'dayjs'

interface ViewContentModalProps {
  item: ContentItem | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (item: ContentItem) => void
  onSubmitForReview?: (item: ContentItem) => void
  onOpenReview?: (item: ContentItem) => void
  onOpenAssign?: (item: ContentItem) => void
  onPublish?: (item: ContentItem) => void
  user?: AuthUser
}

export function ViewContentModal({
  item,
  isOpen,
  onClose,
  onEdit,
  onSubmitForReview,
  onOpenReview,
  onOpenAssign,
  onPublish,
  user,
}: ViewContentModalProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'approval_history' | 'assignment_history' | 'attachments'>('content')

  if (!isOpen || !item) return null

  const isHod = user?.is_hod || /\b(hod|head of department|head of content)\b/i.test(user?.designation || '')
  const isAdmin = user?.role === 'Admin'
  const isAuthorizedManager = isAdmin || isHod

  const deadlineState = computeDeadlineState(item.due_date, item.status)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Published':
        return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Published</Badge>
      case 'Approved':
        return <Badge className="bg-teal-500/15 text-teal-400 border-teal-500/30">Approved</Badge>
      case 'In Review':
        return <Badge className="bg-indigo-500/15 text-indigo-400 border-indigo-500/30">In Review</Badge>
      case 'Changes Requested':
        return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">Changes Requested</Badge>
      case 'Draft':
        return <Badge className="bg-zinc-500/15 text-zinc-400 border-zinc-500/30">Draft</Badge>
      case 'Rejected':
        return <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30">Rejected</Badge>
      case 'Archived':
        return <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30">Archived</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getDeadlineBadge = (state: string) => {
    switch (state) {
      case 'Overdue':
        return <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40">Overdue</Badge>
      case 'Upcoming':
        return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40">Due Soon</Badge>
      case 'Completed':
        return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">Completed</Badge>
      default:
        return <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">Pending</Badge>
    }
  }

  const getPriorityBadge = (p?: string) => {
    switch (p) {
      case 'Urgent':
        return <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/40">Urgent</Badge>
      case 'High':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/40">High</Badge>
      case 'Medium':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/40">Medium</Badge>
      case 'Low':
        return <Badge className="bg-zinc-700/50 text-zinc-400 border-zinc-600">Low</Badge>
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-400">{item.id}</span>
                {getStatusBadge(item.status)}
                {getDeadlineBadge(deadlineState)}
                {item.priority && getPriorityBadge(item.priority)}
              </div>
              <h2 className="text-lg font-bold text-zinc-100 line-clamp-1 mt-0.5">{item.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 text-sm font-medium p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-4 px-6 border-b border-zinc-800 bg-zinc-950/40 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('content')}
            className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'content'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Content & Metadata</span>
          </button>
          <button
            onClick={() => setActiveTab('approval_history')}
            className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'approval_history'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Approval History ({item.review_history?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('attachments')}
            className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'attachments'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span>Attachments ({item.attachments?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('assignment_history')}
            className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'assignment_history'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Assignment History ({item.assignment_history?.length || 0})</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-zinc-300">
          {activeTab === 'content' && (
            <>
              {/* Metadata Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-lg text-xs">
                <div>
                  <span className="text-zinc-500 block mb-0.5">Content Type</span>
                  <span className="font-medium text-zinc-200">{item.content_type}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-0.5">Project</span>
                  <span className="font-medium text-zinc-200">{item.project_name || 'Global / General'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-0.5">Author / Owner</span>
                  <span className="font-medium text-zinc-200">{item.owner_name}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-0.5">Assigned To</span>
                  <span className={`font-medium ${item.assigned_to_name ? 'text-indigo-400' : 'text-zinc-500'}`}>
                    {item.assigned_to_name ? `${item.assigned_to_name} (${item.assigned_role || 'Staff'})` : 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-0.5">Due Date</span>
                  <span className={`font-medium ${deadlineState === 'Overdue' ? 'text-rose-400' : 'text-zinc-200'}`}>
                    {item.due_date ? dayjs(item.due_date).format('DD MMM YYYY') : 'Not scheduled'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-0.5">Submission Date</span>
                  <span className="font-medium text-zinc-200">
                    {item.submission_date ? dayjs(item.submission_date).format('DD MMM YYYY') : 'Not submitted'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-0.5">Created Date</span>
                  <span className="font-medium text-zinc-200">{dayjs(item.created_at).format('DD MMM YYYY')}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-0.5">Last Updated</span>
                  <span className="font-medium text-zinc-200">{dayjs(item.updated_at).format('DD MMM YYYY')}</span>
                </div>
              </div>

              {/* Summary */}
              {item.summary && (
                <div>
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Executive Summary</h4>
                  <p className="p-3 bg-zinc-800/40 border border-zinc-800 rounded-lg text-zinc-200 text-sm leading-relaxed">
                    {item.summary}
                  </p>
                </div>
              )}

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag, idx) => (
                      <span key={idx} className="px-2.5 py-0.5 bg-zinc-800/70 text-zinc-300 text-xs rounded border border-zinc-700/60">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Body */}
              <div>
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Content Body</h4>
                <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-lg text-sm text-zinc-200 font-mono whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                  {item.body}
                </div>
              </div>
            </>
          )}

          {activeTab === 'approval_history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Approval & Review Decisions
                </h4>
                <span className="text-xs text-zinc-500">
                  {item.review_history?.length || 0} recorded decision(s)
                </span>
              </div>

              {(!item.review_history || item.review_history.length === 0) ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                  No review records yet. Content is currently {item.status}.
                </div>
              ) : (
                <div className="space-y-3">
                  {item.review_history.map((rev, idx) => (
                    <div
                      key={rev.id || idx}
                      className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {rev.decision === 'Approved' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : rev.decision === 'Changes Requested' ? (
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400" />
                          )}
                          <strong className="text-sm text-zinc-200">{rev.decision}</strong>
                          <span className="text-xs text-zinc-400">by {rev.reviewer_name}</span>
                        </div>
                        <div className="text-xs text-zinc-500">
                          {rev.date} at {rev.time}
                        </div>
                      </div>
                      {rev.comment && (
                        <div className="text-xs text-zinc-300 bg-zinc-900/80 p-2.5 rounded border border-zinc-800/80">
                          <span className="text-zinc-500 font-medium">Comment: </span>
                          {rev.comment}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Attached Documents & Media Assets
                </h4>
                <span className="text-xs text-zinc-500">
                  {item.attachments?.length || 0} attached file(s)
                </span>
              </div>

              {(!item.attachments || item.attachments.length === 0) ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  <FolderKanban className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                  No documents, images, or project files attached to this content item.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {item.attachments.map((file, idx) => (
                    <div
                      key={file.id || idx}
                      className="p-3.5 bg-zinc-950/60 border border-zinc-800 rounded-lg flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 text-indigo-400 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-zinc-200 truncate">{file.file_name}</div>
                          <div className="text-zinc-500 text-[11px] flex items-center gap-2">
                            <span>{Math.round(file.file_size / 1024)} KB</span>
                            <span>&bull;</span>
                            <span>{file.mime_type}</span>
                            <span>&bull;</span>
                            <span>By {file.uploaded_by_name}</span>
                            <span>&bull;</span>
                            <span>{dayjs(file.created_at).format('DD MMM YYYY')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={file.file_url}
                          download={file.file_name}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors flex items-center gap-1"
                        >
                          <span>Download</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'assignment_history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Assignment & Workload Audit Log
                </h4>
                <span className="text-xs text-zinc-500">
                  {item.assignment_history?.length || 0} assignment record(s)
                </span>
              </div>

              {(!item.assignment_history || item.assignment_history.length === 0) ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  <UserCheck className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                  No assignment changes recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {item.assignment_history.map((asg, idx) => (
                    <div
                      key={asg.id || idx}
                      className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-lg space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-indigo-400" />
                          <span className="text-zinc-400">Assigned to:</span>
                          <strong className="text-sm text-zinc-200">{asg.new_assignee_name}</strong>
                          {asg.previous_assignee_name && (
                            <span className="text-zinc-500">
                              (reassigned from {asg.previous_assignee_name})
                            </span>
                          )}
                        </div>
                        <span className="text-zinc-500">{asg.date} at {asg.time}</span>
                      </div>
                      <div className="text-zinc-400">
                        <span>Changed by: <strong className="text-zinc-300">{asg.changed_by_name}</strong></span>
                        {asg.reason && (
                          <span className="ml-3 pl-3 border-l border-zinc-800 text-amber-400/90">
                            Reason: {asg.reason}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with Contextual Actions */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {/* Submit for Review trigger */}
            {(item.status === 'Draft' || item.status === 'Changes Requested') && onSubmitForReview && (
              <button
                type="button"
                onClick={() => {
                  onSubmitForReview(item)
                  onClose()
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit for Review</span>
              </button>
            )}

            {/* Review Decision trigger */}
            {item.status === 'In Review' && isAuthorizedManager && onOpenReview && (
              <button
                type="button"
                onClick={() => {
                  onOpenReview(item)
                  onClose()
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-teal-600 hover:bg-teal-500 transition-colors shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Review / Decision</span>
              </button>
            )}

            {/* Publish trigger (Only for Approved status & HOD/Admin) */}
            {item.status === 'Approved' && isAuthorizedManager && onPublish && (
              <button
                type="button"
                onClick={() => {
                  onPublish(item)
                  onClose()
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Publish Content</span>
              </button>
            )}

            {/* Assign / Reassign trigger */}
            {isAuthorizedManager && onOpenAssign && (
              <button
                type="button"
                onClick={() => {
                  onOpenAssign(item)
                  onClose()
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{item.assigned_to_id ? 'Reassign' : 'Assign'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onEdit(item)
                  onClose()
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
