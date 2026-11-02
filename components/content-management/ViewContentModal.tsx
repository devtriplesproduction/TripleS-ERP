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
  GitBranch,
  Sparkles,
  Link2,
  BookmarkCheck,
  HelpCircle,
  Building2,
  Package,
  Megaphone,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ContentItem, ContentVersionRecord, computeDeadlineState, computeFreshnessState } from '@/types/content-management'
import { AuthUser } from '@/lib/auth'
import dayjs from 'dayjs'

interface ViewContentModalProps {
  item: ContentItem | null
  allItems?: ContentItem[]
  isOpen: boolean
  onClose: () => void
  onEdit?: (item: ContentItem) => void
  onSubmitForReview?: (item: ContentItem) => void
  onOpenReview?: (item: ContentItem) => void
  onOpenAssign?: (item: ContentItem) => void
  onPublish?: (item: ContentItem) => void
  onRestoreVersion?: (contentId: string, versionNumber: number) => Promise<void>
  onUpdateQualityFlags?: (contentId: string, flags: any) => Promise<void>
  user?: AuthUser
}

export function ViewContentModal({
  item,
  allItems = [],
  isOpen,
  onClose,
  onEdit,
  onSubmitForReview,
  onOpenReview,
  onOpenAssign,
  onPublish,
  onRestoreVersion,
  onUpdateQualityFlags,
  user,
}: ViewContentModalProps) {
  const [activeTab, setActiveTab] = useState<
    'content' | 'version_history' | 'quality_freshness' | 'approval_history' | 'assignment_history' | 'attachments'
  >('content')

  // Selected past version for inspection
  const [selectedVersion, setSelectedVersion] = useState<ContentVersionRecord | null>(null)
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null)

  // Quality Flags state
  const [isDuplicate, setIsDuplicate] = useState(item?.is_duplicate || false)
  const [duplicateOfId, setDuplicateOfId] = useState(item?.duplicate_of_id || '')
  const [followUpRequired, setFollowUpRequired] = useState(item?.follow_up_required || false)
  const [followUpReason, setFollowUpReason] = useState(item?.follow_up_reason || '')
  const [savingQuality, setSavingQuality] = useState(false)

  if (!isOpen || !item) return null

  const isHod = user?.is_hod || /\b(hod|head of department|head of content)\b/i.test(user?.designation || '')
  const isAdmin = user?.role === 'Admin'
  const isAuthorizedManager = isAdmin || isHod

  const deadlineState = computeDeadlineState(item.due_date, item.status)
  const freshnessState = computeFreshnessState(item)

  const handleSaveQualityFlags = async () => {
    if (!onUpdateQualityFlags) return
    setSavingQuality(true)
    try {
      const dupMatch = allItems.find(i => i.id === duplicateOfId)
      await onUpdateQualityFlags(item.id, {
        is_duplicate: isDuplicate,
        duplicate_of_id: isDuplicate ? duplicateOfId : null,
        duplicate_of_title: isDuplicate && dupMatch ? dupMatch.title : null,
        follow_up_required: followUpRequired,
        follow_up_reason: followUpRequired ? followUpReason : null,
      })
    } finally {
      setSavingQuality(false)
    }
  }

  const handleTriggerRestore = async (versionNumber: number) => {
    if (!onRestoreVersion) return
    const confirmed = window.confirm(
      `Restore version v${versionNumber}.0? This will create a NEW version v${(item.version || 1) + 1}.0 containing the previous content, preserving all historical records.`
    )
    if (!confirmed) return

    setRestoringVersion(versionNumber)
    try {
      await onRestoreVersion(item.id, versionNumber)
    } finally {
      setRestoringVersion(null)
    }
  }

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

  const getFreshnessBadge = (state: string) => {
    switch (state) {
      case 'Fresh':
        return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Fresh / Up to date</Badge>
      case 'Due Soon':
        return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">Review Due Soon</Badge>
      case 'Outdated':
        return <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30">Outdated / Needs Review</Badge>
      default:
        return <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700">Unreviewed</Badge>
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
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-400">{item.id}</span>
                <span className="text-zinc-600">&bull;</span>
                <span className="text-xs font-medium text-indigo-400">{item.content_type}</span>
                {item.category && (
                  <>
                    <span className="text-zinc-600">&bull;</span>
                    <span className="text-xs font-medium text-cyan-400">{item.category}</span>
                  </>
                )}
                <span className="text-zinc-600">&bull;</span>
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px] font-mono">
                  v{item.version || 1}.0
                </Badge>
                {item.is_duplicate && (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                    Duplicate
                  </Badge>
                )}
                {item.follow_up_required && (
                  <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px]">
                    Follow-up Required
                  </Badge>
                )}
              </div>
              <h2 className="text-lg font-bold text-zinc-100 line-clamp-1 mt-0.5">{item.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 text-sm font-medium p-1.5 rounded-md hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-950 px-6 gap-1 overflow-x-auto shrink-0">
          <button
            onClick={() => { setActiveTab('content'); setSelectedVersion(null); }}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'content'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Document Content</span>
          </button>

          <button
            onClick={() => setActiveTab('version_history')}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'version_history'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Version History ({item.version_history?.length || 1})</span>
          </button>

          <button
            onClick={() => setActiveTab('quality_freshness')}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'quality_freshness'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Quality & Freshness</span>
          </button>

          <button
            onClick={() => { setActiveTab('approval_history'); setSelectedVersion(null); }}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'approval_history'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Review History ({item.review_history?.length || 0})</span>
          </button>

          <button
            onClick={() => { setActiveTab('assignment_history'); setSelectedVersion(null); }}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'assignment_history'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Assignments</span>
          </button>

          <button
            onClick={() => { setActiveTab('attachments'); setSelectedVersion(null); }}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'attachments'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span>Attachments ({item.attachments?.length || 0})</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: CURRENT DOCUMENT CONTENT */}
          {activeTab === 'content' && (
            <>
              {/* Badges and Quick Details */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-zinc-400">Status:</span>
                  {getStatusBadge(item.status)}
                  <span className="text-zinc-400 ml-2">Freshness:</span>
                  {getFreshnessBadge(freshnessState)}
                  {item.priority && (
                    <>
                      <span className="text-zinc-400 ml-2">Priority:</span>
                      {getPriorityBadge(item.priority)}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3 text-zinc-400 text-xs">
                  <span className="flex items-center gap-1">
                    <FolderKanban className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Project: <strong className="text-zinc-200">{item.project_name || 'General Operations'}</strong></span>
                  </span>
                  {item.department && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Dept: <strong className="text-zinc-200">{item.department}</strong></span>
                    </span>
                  )}
                  {item.product && (
                    <span className="flex items-center gap-1">
                      <Package className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Product: <strong className="text-zinc-200">{item.product}</strong></span>
                    </span>
                  )}
                </div>
              </div>

              {/* Duplicate or Follow-up alerts */}
              {item.is_duplicate && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-300">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Marked as possible duplicate of: <strong>{item.duplicate_of_title || item.duplicate_of_id || 'Another content asset'}</strong>
                    </span>
                  </div>
                  <span className="text-[11px] text-amber-400 font-medium">Quality Flag (Preserved, not deleted)</span>
                </div>
              )}

              {item.follow_up_required && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between text-xs text-rose-300">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      Follow-up Required: <strong>{item.follow_up_reason || 'Action needed by reviewer / author'}</strong>
                    </span>
                  </div>
                  {item.follow_up_date && <span className="text-[11px] text-rose-400">Target Date: {item.follow_up_date}</span>}
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-zinc-950/40 border border-zinc-800 rounded-xl text-xs">
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
                  <span className="text-zinc-500 block mb-0.5">Last Reviewed Date</span>
                  <span className="font-medium text-zinc-200">
                    {item.last_reviewed_date ? dayjs(item.last_reviewed_date).format('DD MMM YYYY') : 'Never'}
                  </span>
                </div>
              </div>

              {/* Marketing Agency Campaign Specifications */}
              {(item.client_name || item.campaign_name || item.primary_platform || item.call_to_action) && (
                <div className="p-4 bg-gradient-to-r from-indigo-950/30 via-zinc-900/60 to-purple-950/30 border border-indigo-500/20 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Megaphone className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Marketing Agency Deliverable Brief</span>
                    </h4>
                    {item.creative_format && (
                      <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px]">
                        {item.creative_format}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    {item.client_name && (
                      <div>
                        <span className="text-zinc-500 block mb-0.5">Client</span>
                        <span className="font-semibold text-zinc-200">{item.client_name}</span>
                      </div>
                    )}
                    {item.campaign_name && (
                      <div>
                        <span className="text-zinc-500 block mb-0.5">Campaign</span>
                        <span className="font-semibold text-zinc-200">{item.campaign_name}</span>
                      </div>
                    )}
                    {item.primary_platform && (
                      <div>
                        <span className="text-zinc-500 block mb-0.5">Primary Channel</span>
                        <span className="font-semibold text-indigo-300">{item.primary_platform}</span>
                      </div>
                    )}
                    {item.tone_of_voice && (
                      <div>
                        <span className="text-zinc-500 block mb-0.5">Tone of Voice</span>
                        <span className="font-semibold text-zinc-200">{item.tone_of_voice}</span>
                      </div>
                    )}
                    {item.call_to_action && (
                      <div>
                        <span className="text-zinc-500 block mb-0.5">Call to Action (CTA)</span>
                        <span className="font-semibold text-emerald-400">{item.call_to_action}</span>
                      </div>
                    )}
                    {item.scheduled_publish_time && (
                      <div>
                        <span className="text-zinc-500 block mb-0.5">Scheduled Publish</span>
                        <span className="font-semibold text-zinc-300">{item.scheduled_publish_time}</span>
                      </div>
                    )}
                  </div>

                  {item.target_platforms && item.target_platforms.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-zinc-400">Target Channels:</span>
                      <div className="flex flex-wrap gap-1">
                        {item.target_platforms.map((plat) => (
                          <Badge key={plat} variant="outline" className="text-[10px] text-zinc-300 border-zinc-700 bg-zinc-900">
                            {plat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {item.creative_brief && (
                    <div className="pt-2 border-t border-indigo-500/10">
                      <span className="text-[11px] text-zinc-400 font-medium block mb-1">Creative Brief & Designer Notes:</span>
                      <p className="text-xs text-zinc-300 italic bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800">
                        {item.creative_brief}
                      </p>
                    </div>
                  )}
                </div>
              )}

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

          {/* TAB 2: VERSION MANAGEMENT */}
          {activeTab === 'version_history' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-zinc-300 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
                    <GitBranch className="w-4 h-4 text-indigo-400" />
                    <span>Version Audit Trail & Revisions</span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Every published update or meaningful change generates an immutable version snapshot. Authorized managers can inspect or restore any past revision. Restoring a version creates a new version, preserving all past revisions.
                  </p>
                </div>
                <Badge className="bg-indigo-600 text-white shrink-0">
                  Current: v{item.version || 1}.0
                </Badge>
              </div>

              {/* Past Versions List */}
              <div className="space-y-3">
                {(item.version_history || []).map((ver) => {
                  const isCurrent = ver.version_number === (item.version || 1)
                  return (
                    <div
                      key={ver.id}
                      className={`p-4 rounded-xl border transition-all ${isCurrent
                        ? 'bg-zinc-950 border-indigo-500/40 shadow-xs'
                        : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                        }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 font-mono text-xs font-bold border border-indigo-500/30">
                            {ver.version_label || `v${ver.version_number}.0`}
                          </span>
                          {isCurrent && (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                              Active Version
                            </Badge>
                          )}
                          <strong className="text-sm text-zinc-100">{ver.title}</strong>
                        </div>

                        <div className="text-xs text-zinc-400 flex items-center gap-3">
                          <span>Modified by <strong className="text-zinc-300">{ver.created_by_name}</strong></span>
                          <span>&bull;</span>
                          <span>{dayjs(ver.created_at).format('DD MMM YYYY, hh:mm A')}</span>
                        </div>
                      </div>

                      {ver.change_summary && (
                        <div className="mt-2.5 text-xs text-zinc-300 bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800 flex items-center gap-2">
                          <span className="text-zinc-500 font-medium shrink-0">Change Note:</span>
                          <span className="italic">{ver.change_summary}</span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                        <div className="text-zinc-500 text-[11px]">
                          Type: {ver.content_type} &bull; Category: {ver.category || 'General'}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedVersion(selectedVersion?.id === ver.id ? null : ver)}
                            className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md transition-colors"
                          >
                            {selectedVersion?.id === ver.id ? 'Hide Snapshot' : 'View Snapshot'}
                          </button>

                          {!isCurrent && isAuthorizedManager && onRestoreVersion && (
                            <button
                              type="button"
                              onClick={() => handleTriggerRestore(ver.version_number)}
                              disabled={restoringVersion === ver.version_number}
                              className="px-2.5 py-1 text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-md transition-colors flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>{restoringVersion === ver.version_number ? 'Restoring...' : 'Restore as New Version'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded Snapshot View */}
                      {selectedVersion?.id === ver.id && (
                        <div className="mt-3 p-4 bg-zinc-900 border border-zinc-800 rounded-lg space-y-2 animate-in fade-in duration-150">
                          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                            Version Snapshot Content ({ver.version_label})
                          </div>
                          {ver.summary && (
                            <p className="text-xs text-zinc-300 italic p-2 bg-zinc-950 rounded border border-zinc-800">
                              {ver.summary}
                            </p>
                          )}
                          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded text-xs font-mono text-zinc-300 whitespace-pre-wrap max-h-60 overflow-y-auto">
                            {ver.body}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 3: CONTENT QUALITY & FRESHNESS */}
          {activeTab === 'quality_freshness' && (
            <div className="space-y-5">
              {/* Freshness Status Card */}
              <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-sm font-bold text-zinc-200">Freshness & Review Cadence</h4>
                  </div>
                  {getFreshnessBadge(freshnessState)}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                    <span className="text-zinc-500 block mb-1">Last Reviewed Date</span>
                    <span className="text-zinc-200 font-semibold">
                      {item.last_reviewed_date ? dayjs(item.last_reviewed_date).format('DD MMM YYYY') : 'Not reviewed yet'}
                    </span>
                  </div>

                  <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                    <span className="text-zinc-500 block mb-1">Next Scheduled Review</span>
                    <span className={`font-semibold ${freshnessState === 'Outdated' ? 'text-rose-400' : 'text-zinc-200'}`}>
                      {item.next_review_date ? dayjs(item.next_review_date).format('DD MMM YYYY') : 'Cadence open'}
                    </span>
                  </div>

                  <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                    <span className="text-zinc-500 block mb-1">Review Cadence Interval</span>
                    <span className="text-zinc-200 font-semibold">
                      Every {item.review_frequency_days || 90} days
                    </span>
                  </div>
                </div>

                {freshnessState === 'Outdated' && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Documentation has passed its freshness review schedule date. Please verify accuracy and submit an updated review!
                    </span>
                  </div>
                )}
              </div>

              {/* Quality Flags & Duplicate Management */}
              <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-xl space-y-4">
                <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                  <BookmarkCheck className="w-4 h-4 text-indigo-400" />
                  <span>Quality Flags & Relationship Linking</span>
                </h4>

                <div className="space-y-3">
                  {/* Duplicate Flag */}
                  <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-2">
                    <label className="flex items-center gap-2.5 text-xs text-zinc-200 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isDuplicate}
                        onChange={(e) => setIsDuplicate(e.target.checked)}
                        className="rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Mark content as possible duplicate</span>
                    </label>

                    {isDuplicate && (
                      <div className="pl-6 space-y-2 pt-1">
                        <label className="text-[11px] text-zinc-400 block">
                          Select the original canonical document:
                        </label>
                        <select
                          value={duplicateOfId}
                          onChange={(e) => setDuplicateOfId(e.target.value)}
                          className="w-full sm:w-80 bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">-- Select Canonical Document --</option>
                          {allItems.filter(i => i.id !== item.id).map(i => (
                            <option key={i.id} value={i.id}>
                              [{i.id}] {i.title}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-zinc-500">
                          Notice: Marking as duplicate flags the article for team coordination. Content is never deleted automatically.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Follow-up Required Flag */}
                  <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-2">
                    <label className="flex items-center gap-2.5 text-xs text-zinc-200 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={followUpRequired}
                        onChange={(e) => setFollowUpRequired(e.target.checked)}
                        className="rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Flag document as "Follow-up Required"</span>
                    </label>

                    {followUpRequired && (
                      <div className="pl-6 space-y-2 pt-1">
                        <label className="text-[11px] text-zinc-400 block">
                          Reason / Instructions for Follow-up:
                        </label>
                        <input
                          type="text"
                          value={followUpReason}
                          onChange={(e) => setFollowUpReason(e.target.value)}
                          placeholder="e.g. Needs benchmark testing results before customer release..."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {onUpdateQualityFlags && (
                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      onClick={handleSaveQualityFlags}
                      disabled={savingQuality}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4"
                    >
                      {savingQuality ? 'Saving Quality Flags...' : 'Save Quality Attributes'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Reviewer Required Corrections (if any recorded in review history) */}
              <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-xl space-y-3">
                <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>Reviewer Action Items & Required Corrections</span>
                </h4>

                {(!item.review_history || item.review_history.every(r => !r.required_corrections || r.required_corrections.length === 0)) ? (
                  <p className="text-xs text-zinc-500 py-3 text-center">
                    No outstanding correction checklist items from reviewers.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {item.review_history
                      .filter(r => r.required_corrections && r.required_corrections.length > 0)
                      .map((r, rIdx) => (
                        <div key={rIdx} className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg space-y-2">
                          <div className="text-xs font-semibold text-amber-400 flex items-center justify-between">
                            <span>Requested by {r.reviewer_name} ({r.date}):</span>
                            <span className="text-[10px] text-zinc-400">{r.required_corrections?.length} item(s)</span>
                          </div>
                          <ul className="space-y-1.5 pl-2">
                            {r.required_corrections?.map((c, cIdx) => (
                              <li key={cIdx} className="text-xs text-zinc-300 flex items-start gap-2">
                                <span className="w-4 h-4 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] shrink-0 font-bold mt-0.5">
                                  {cIdx + 1}
                                </span>
                                <span>{c}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: APPROVAL HISTORY */}
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

                      {rev.required_corrections && rev.required_corrections.length > 0 && (
                        <div className="text-xs bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg space-y-1">
                          <span className="text-amber-400 font-semibold block">Required Corrections Checklist:</span>
                          <ul className="list-disc pl-4 space-y-0.5 text-zinc-300">
                            {rev.required_corrections.map((corr, cIdx) => (
                              <li key={cIdx}>{corr}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ASSIGNMENT HISTORY */}
          {activeTab === 'assignment_history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Assignment Audit Trail
                </h4>
                <span className="text-xs text-zinc-500">
                  {item.assignment_history?.length || 0} assignment record(s)
                </span>
              </div>

              {(!item.assignment_history || item.assignment_history.length === 0) ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  <UserCheck className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                  No assignment history recorded yet.
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
                          <User className="w-4 h-4 text-indigo-400" />
                          <strong className="text-sm text-zinc-200">
                            Assigned to {asg.new_assignee_name}
                          </strong>
                          {asg.previous_assignee_name && (
                            <span className="text-zinc-500">
                              (previously: {asg.previous_assignee_name})
                            </span>
                          )}
                        </div>
                        <div className="text-zinc-500">
                          {asg.date} at {asg.time}
                        </div>
                      </div>
                      <div className="text-zinc-400">
                        Assigned by <strong className="text-zinc-300">{asg.changed_by_name}</strong>
                        {asg.reason && <span className="ml-1 text-zinc-300 italic">— "{asg.reason}"</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: ATTACHMENTS */}
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
                          </div>
                        </div>
                      </div>

                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-medium transition-colors shrink-0"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 text-xs"
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            {onOpenAssign && isAuthorizedManager && (
              <Button
                type="button"
                variant="outline"
                onClick={() => { onClose(); onOpenAssign(item); }}
                className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 text-xs"
              >
                <UserCheck className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                Assign
              </Button>
            )}

            {onEdit && (item.status === 'Draft' || item.status === 'Changes Requested' || isAuthorizedManager) && (
              <Button
                type="button"
                variant="outline"
                onClick={() => { onClose(); onEdit(item); }}
                className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 text-xs"
              >
                Edit Content
              </Button>
            )}

            {onSubmitForReview && (item.status === 'Draft' || item.status === 'Changes Requested') && (
              <Button
                type="button"
                onClick={() => { onClose(); onSubmitForReview(item); }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                Submit for Review
              </Button>
            )}

            {onOpenReview && item.status === 'In Review' && isAuthorizedManager && (
              <Button
                type="button"
                onClick={() => { onClose(); onOpenReview(item); }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                Review & Decide
              </Button>
            )}

            {onPublish && item.status === 'Approved' && isAuthorizedManager && (
              <Button
                type="button"
                onClick={() => { onClose(); onPublish(item); }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Publish Officially
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
