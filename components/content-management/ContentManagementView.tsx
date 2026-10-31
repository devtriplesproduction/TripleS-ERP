'use client'

import React, { useState } from 'react'
import {
  FileText,
  FolderKanban,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Archive,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  Layers,
  Settings2,
  Calendar,
  Tag,
  ArrowUpDown,
  MoreVertical,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  XCircle,
  History,
  LayoutDashboard,
  Bell,
  Check,
  ExternalLink,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  ContentItem,
  ContentType,
  ContentStatus,
  ContentPriority,
  ReviewDecision,
  ContentActivityRecord,
  ContentNotificationRecord,
  ContentAttachment,
  CreateContentInput,
  UpdateContentInput,
  computeDeadlineState,
} from '@/types/content-management'
import { Project } from '@/types/project-management'
import { AssignableEmployee } from '@/lib/actions/team'
import { AuthUser } from '@/lib/auth'
import {
  createContentItem,
  updateContentItem,
  updateContentStatus,
  archiveContentItem,
  deleteContentItem,
  createContentType,
  toggleContentTypeStatus,
  submitForReview,
  publishContentItem,
  markContentNotificationRead,
} from '@/lib/actions/content-management'
import { ViewContentModal } from './ViewContentModal'
import { CreateEditContentModal } from './CreateEditContentModal'
import { ManageContentTypesModal } from './ManageContentTypesModal'
import { ReviewModal } from './ReviewModal'
import { MediaFilesSection } from './MediaFilesSection'
import { AssignReassignModal } from './AssignReassignModal'
import { useToast } from '@/hooks/use-toast'
import dayjs from 'dayjs'

interface ContentManagementViewProps {
  initialItems: ContentItem[]
  initialTypes: ContentType[]
  initialActivities?: ContentActivityRecord[]
  initialNotifications?: ContentNotificationRecord[]
  initialAttachments?: ContentAttachment[]
  projects: Project[]
  employees: AssignableEmployee[]
  user: AuthUser
}

export function ContentManagementView({
  initialItems,
  initialTypes,
  initialActivities = [],
  initialNotifications = [],
  initialAttachments = [],
  projects,
  employees,
  user,
}: ContentManagementViewProps) {
  const [items, setItems] = useState<ContentItem[]>(initialItems)
  const [types, setTypes] = useState<ContentType[]>(initialTypes)
  const [activities, setActivities] = useState<ContentActivityRecord[]>(initialActivities)
  const [notifications, setNotifications] = useState<ContentNotificationRecord[]>(initialNotifications)
  const [attachments, setAttachments] = useState<ContentAttachment[]>(initialAttachments)

  // Active top-level section/tab
  const [activeSection, setActiveSection] = useState<
    'dashboard' | 'content' | 'assignments' | 'approvals' | 'deadlines' | 'media' | 'activity'
  >('dashboard')

  // Content sub-status filter
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [typeFilter, setTypeFilter] = useState<string>('All')
  const [projectFilter, setProjectFilter] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals state
  const [viewItem, setViewItem] = useState<ContentItem | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)

  const [createEditItem, setCreateEditItem] = useState<ContentItem | null>(null)
  const [isCreateEditModalOpen, setIsCreateEditModalOpen] = useState(false)

  const [reviewItem, setReviewItem] = useState<ContentItem | null>(null)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)

  const [assignItem, setAssignItem] = useState<ContentItem | null>(null)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)

  const [isManageTypesOpen, setIsManageTypesOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ContentItem | null>(null)

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  const { toast } = useToast()

  const isHod = user.is_hod || /\b(hod|head of department|head of content)\b/i.test(user.designation || '')
  const isAdmin = user.role === 'Admin'
  const isAuthorizedManager = isAdmin || isHod

  // Stats calculation
  const totalCount = items.length
  const inReviewCount = items.filter((i) => i.status === 'In Review').length
  const changesRequestedCount = items.filter((i) => i.status === 'Changes Requested').length
  const approvedCount = items.filter((i) => i.status === 'Approved').length
  const publishedCount = items.filter((i) => i.status === 'Published').length
  const draftCount = items.filter((i) => i.status === 'Draft').length

  const overdueCount = items.filter((i) => computeDeadlineState(i.due_date, i.status) === 'Overdue').length
  const upcomingCount = items.filter((i) => computeDeadlineState(i.due_date, i.status) === 'Upcoming').length
  const unreadNotifsCount = notifications.filter((n) => !n.is_read).length

  // Filtered content for Content Catalog
  const filteredItems = items.filter((item) => {
    if (statusFilter !== 'All' && item.status !== statusFilter) return false
    if (typeFilter !== 'All' && item.content_type !== typeFilter) return false
    if (projectFilter !== 'All' && item.project_id !== projectFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesTitle = item.title.toLowerCase().includes(q)
      const matchesSummary = item.summary.toLowerCase().includes(q)
      const matchesOwner = item.owner_name.toLowerCase().includes(q)
      const matchesAssignee = item.assigned_to_name?.toLowerCase().includes(q)
      const matchesTags = item.tags.some((t) => t.toLowerCase().includes(q))
      if (!matchesTitle && !matchesSummary && !matchesOwner && !matchesAssignee && !matchesTags) {
        return false
      }
    }
    return true
  })

  // Pending Approvals
  const pendingApprovals = items.filter((i) => i.status === 'In Review')

  // Assigned items
  const assignedItems = items.filter((i) => i.assigned_to_id || i.assigned_to_name)

  // Status Badge Component
  const renderStatusBadge = (status: ContentStatus) => {
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

  // Deadline Badge Component
  const renderDeadlineBadge = (item: ContentItem) => {
    const state = computeDeadlineState(item.due_date, item.status)
    switch (state) {
      case 'Overdue':
        return <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40">Overdue</Badge>
      case 'Upcoming':
        return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40">Due Soon</Badge>
      case 'Completed':
        return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">Completed</Badge>
      default:
        return <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700">Pending</Badge>
    }
  }

  // Priority Badge Component
  const renderPriorityBadge = (p?: ContentPriority) => {
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

  // CRUD Handlers
  const handleSaveContent = async (
    input: CreateContentInput | UpdateContentInput,
    statusToSave: 'Draft' | 'In Review'
  ) => {
    if (createEditItem) {
      const res = await updateContentItem(createEditItem.id, {
        ...input,
        status: statusToSave,
      })
      if (res.success && res.data) {
        setItems((prev) => prev.map((i) => (i.id === res.data!.id ? res.data! : i)))
        toast({ title: 'Content Updated', description: `"${res.data.title}" updated successfully.` })
      } else {
        toast({ title: 'Update Failed', description: res.error || 'Could not update content', variant: 'destructive' })
      }
    } else {
      const res = await createContentItem({
        ...(input as CreateContentInput),
        status: statusToSave,
      })
      if (res.success && res.data) {
        setItems((prev) => [res.data!, ...prev])
        toast({ title: 'Content Created', description: `"${res.data.title}" created successfully.` })
      } else {
        toast({ title: 'Creation Failed', description: res.error || 'Could not create content', variant: 'destructive' })
      }
    }
  }

  const handleSubmitForReview = async (item: ContentItem) => {
    const res = await submitForReview(item.id)
    if (res.success && res.data) {
      setItems((prev) => prev.map((i) => (i.id === res.data!.id ? res.data! : i)))
      toast({ title: 'Submitted for Review', description: `"${item.title}" is now awaiting approval.` })
    } else {
      toast({ title: 'Submission Failed', description: res.error || 'Error submitting content', variant: 'destructive' })
    }
  }

  const handlePublish = async (item: ContentItem) => {
    const res = await publishContentItem(item.id)
    if (res.success && res.data) {
      setItems((prev) => prev.map((i) => (i.id === res.data!.id ? res.data! : i)))
      toast({ title: 'Content Published', description: `"${item.title}" is now published and live.` })
    } else {
      toast({ title: 'Publishing Failed', description: res.error || 'Content must be in Approved status.', variant: 'destructive' })
    }
  }

  const handleArchive = async (item: ContentItem) => {
    const res = await archiveContentItem(item.id)
    if (res.success && res.data) {
      setItems((prev) => prev.map((i) => (i.id === res.data!.id ? res.data! : i)))
      toast({ title: 'Content Archived', description: `"${item.title}" has been archived.` })
    } else {
      toast({ title: 'Archive Failed', description: res.error || 'Failed to archive content', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!itemToDelete) return
    const res = await deleteContentItem(itemToDelete.id)
    if (res.success) {
      setItems((prev) => prev.filter((i) => i.id !== itemToDelete.id))
      toast({ title: 'Content Deleted', description: 'Record permanently deleted.' })
    } else {
      toast({ title: 'Delete Failed', description: res.error || 'Unauthorized or delete failed', variant: 'destructive' })
    }
    setItemToDelete(null)
  }

  const handleMarkNotifRead = async (id: string) => {
    await markContentNotificationRead(id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Content Management</h1>
              <p className="text-xs text-zinc-400">
                Departmental documentation, multi-tier approvals, workload assignments, and deadline tracking.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Notifications Bell */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-zinc-100"
            >
              <Bell className="w-4 h-4 mr-1.5" />
              <span>Notifications</span>
              {unreadNotifsCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-rose-600 text-[10px] font-bold rounded-full text-white">
                  {unreadNotifsCount}
                </span>
              )}
            </Button>

            {/* Notification Drawer Popover */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150">
                <div className="p-3 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                    <Bell className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Content Notifications</span>
                  </div>
                  <span className="text-[11px] text-zinc-500">{unreadNotifsCount} unread</span>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800/60">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-zinc-500">No notifications.</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 text-xs space-y-1 transition-colors ${
                          !n.is_read ? 'bg-indigo-950/20' : 'bg-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-zinc-200">{n.title}</span>
                          <span className="text-[10px] text-zinc-500">
                            {dayjs(n.created_at).format('DD MMM, hh:mm A')}
                          </span>
                        </div>
                        <p className="text-zinc-400 text-xs leading-relaxed">{n.message}</p>
                        {n.reason && (
                          <div className="p-2 bg-zinc-950/60 rounded border border-zinc-800 text-amber-300 text-[11px]">
                            Reason: {n.reason}
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            onClick={() => {
                              const found = items.find((i) => i.id === n.content_id)
                              if (found) {
                                setViewItem(found)
                                setIsViewModalOpen(true)
                              }
                              setIsNotificationsOpen(false)
                            }}
                            className="text-indigo-400 hover:text-indigo-300 font-medium text-[11px] flex items-center gap-1"
                          >
                            <span>View Content</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          {!n.is_read && (
                            <button
                              onClick={() => handleMarkNotifRead(n.id)}
                              className="text-zinc-500 hover:text-zinc-300 text-[10px]"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsManageTypesOpen(true)}
              className="border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-zinc-100"
            >
              <Settings2 className="w-4 h-4 mr-1.5" />
              Content Types
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => {
              setCreateEditItem(null)
              setIsCreateEditModalOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Content
          </Button>
        </div>
      </div>

      {/* Main Section Navigation Bar (Matching Section 10) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-zinc-800 text-xs font-semibold">
        <button
          onClick={() => setActiveSection('dashboard')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
            activeSection === 'dashboard'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveSection('content')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
            activeSection === 'content'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Content ({totalCount})</span>
        </button>

        <button
          onClick={() => setActiveSection('assignments')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
            activeSection === 'assignments'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Assignments ({assignedItems.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('approvals')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
            activeSection === 'approvals'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Approval / Review ({inReviewCount})</span>
          {inReviewCount > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[10px] rounded-full">
              {inReviewCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSection('deadlines')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
            activeSection === 'deadlines'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Deadlines</span>
          {overdueCount > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-300 text-[10px] rounded-full">
              {overdueCount} Overdue
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSection('media')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
            activeSection === 'media'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <FolderKanban className="w-3.5 h-3.5" />
          <span>Media & Files ({attachments.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('activity')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
            activeSection === 'activity'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Activity / History</span>
        </button>
      </div>

      {/* ---------------- 1. DASHBOARD OVERVIEW ---------------- */}
      {activeSection === 'dashboard' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardContent className="p-4">
                <span className="text-xs text-zinc-400">Total Items</span>
                <div className="text-2xl font-bold text-zinc-100 mt-1">{totalCount}</div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardContent className="p-4">
                <span className="text-xs text-indigo-400">In Review (Pending)</span>
                <div className="text-2xl font-bold text-indigo-300 mt-1">{inReviewCount}</div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardContent className="p-4">
                <span className="text-xs text-amber-400">Changes Requested</span>
                <div className="text-2xl font-bold text-amber-300 mt-1">{changesRequestedCount}</div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardContent className="p-4">
                <span className="text-xs text-teal-400">Approved</span>
                <div className="text-2xl font-bold text-teal-300 mt-1">{approvedCount}</div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardContent className="p-4">
                <span className="text-xs text-emerald-400">Published</span>
                <div className="text-2xl font-bold text-emerald-300 mt-1">{publishedCount}</div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardContent className="p-4">
                <span className="text-xs text-rose-400">Overdue</span>
                <div className="text-2xl font-bold text-rose-300 mt-1">{overdueCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Dual Widget: Pending Approvals Queue & Team Workload */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Approvals Queue */}
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader className="p-4 pb-2 border-b border-zinc-800/80 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <CardTitle className="text-sm font-semibold text-zinc-100">
                    Pending Approval Queue ({pendingApprovals.length})
                  </CardTitle>
                </div>
                <button
                  onClick={() => setActiveSection('approvals')}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  View All &rarr;
                </button>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {pendingApprovals.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    No content waiting for review. All submissions cleared!
                  </div>
                ) : (
                  pendingApprovals.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-lg flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="font-semibold text-zinc-200 truncate">{item.title}</div>
                        <div className="text-zinc-500 flex items-center gap-3">
                          <span>By: <strong className="text-zinc-400">{item.owner_name}</strong></span>
                          <span>Type: <strong className="text-zinc-400">{item.content_type}</strong></span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setViewItem(item)
                            setIsViewModalOpen(true)
                          }}
                          className="h-7 text-xs text-zinc-400 hover:text-zinc-200"
                        >
                          View
                        </Button>
                        {isAuthorizedManager && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setReviewItem(item)
                              setIsReviewModalOpen(true)
                            }}
                            className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
                          >
                            Review
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Team Workload */}
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader className="p-4 pb-2 border-b border-zinc-800/80 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <CardTitle className="text-sm font-semibold text-zinc-100">
                    Team Workload & Assignments
                  </CardTitle>
                </div>
                <button
                  onClick={() => setActiveSection('assignments')}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Manage &rarr;
                </button>
              </CardHeader>
              <CardContent className="p-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
                        <th className="pb-2 font-medium">Team Member</th>
                        <th className="pb-2 font-medium text-center">Assigned</th>
                        <th className="pb-2 font-medium text-center">Completed</th>
                        <th className="pb-2 font-medium text-center">Pending</th>
                        <th className="pb-2 font-medium text-center">Overdue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {employees.slice(0, 5).map((emp) => {
                        const empAssigned = items.filter((i) => i.assigned_to_id === emp.id || i.assigned_to_name === emp.name)
                        const completed = empAssigned.filter((i) => i.status === 'Published' || i.status === 'Approved').length
                        const overdue = empAssigned.filter((i) => computeDeadlineState(i.due_date, i.status) === 'Overdue').length
                        const pending = empAssigned.length - completed
                        return (
                          <tr key={emp.id} className="hover:bg-zinc-900/40">
                            <td className="py-2.5 font-medium text-zinc-200">
                              <div>{emp.name}</div>
                              <span className="text-[10px] text-zinc-500">{emp.designation || 'Staff'}</span>
                            </td>
                            <td className="py-2.5 text-center text-zinc-300 font-semibold">{empAssigned.length}</td>
                            <td className="py-2.5 text-center text-emerald-400 font-semibold">{completed}</td>
                            <td className="py-2.5 text-center text-indigo-400 font-semibold">{pending}</td>
                            <td className="py-2.5 text-center font-semibold">
                              <span className={overdue > 0 ? 'text-rose-400' : 'text-zinc-500'}>{overdue}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dual Widget: Upcoming Deadlines & Recent Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Deadlines Widget */}
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader className="p-4 pb-2 border-b border-zinc-800/80 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <CardTitle className="text-sm font-semibold text-zinc-100">
                    Deadline Schedule ({overdueCount + upcomingCount} Alerting)
                  </CardTitle>
                </div>
                <button
                  onClick={() => setActiveSection('deadlines')}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  View All &rarr;
                </button>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5">
                {items
                  .filter((i) => {
                    const st = computeDeadlineState(i.due_date, i.status)
                    return st === 'Overdue' || st === 'Upcoming'
                  })
                  .slice(0, 4)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-lg flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-semibold text-zinc-200 truncate">{item.title}</div>
                        <div className="text-zinc-500 flex items-center gap-2">
                          <span>Owner: {item.owner_name}</span>
                          <span>&bull;</span>
                          <span>Due: {item.due_date ? dayjs(item.due_date).format('DD MMM YYYY') : 'None'}</span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {renderDeadlineBadge(item)}
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>

            {/* Recent Activity Feed */}
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader className="p-4 pb-2 border-b border-zinc-800/80 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-400" />
                  <CardTitle className="text-sm font-semibold text-zinc-100">Recent Activity</CardTitle>
                </div>
                <button
                  onClick={() => setActiveSection('activity')}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Full History &rarr;
                </button>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {activities.slice(0, 5).map((act) => (
                  <div key={act.id} className="flex items-start gap-3 text-xs">
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] shrink-0">
                      {act.action}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-zinc-300 truncate">{act.details}</div>
                      <div className="text-zinc-500 text-[10px]">{act.timestamp_display}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ---------------- 2. CONTENT CATALOG ---------------- */}
      {activeSection === 'content' && (
        <div className="space-y-4">
          {/* Sub-status filters */}
          <div className="flex flex-wrap items-center gap-2 pb-2">
            {[
              'All',
              'Draft',
              'In Review',
              'Changes Requested',
              'Approved',
              'Published',
              'Rejected',
              'Archived',
            ].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === st
                    ? 'bg-zinc-100 text-zinc-900 shadow'
                    : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search and Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Search title, summary, owner, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-zinc-900/80 border-zinc-800 text-xs text-zinc-100"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-zinc-900/80 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-200 focus:outline-none"
            >
              <option value="All">All Content Types</option>
              {types.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>

            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="bg-zinc-900/80 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-200 focus:outline-none"
            >
              <option value="All">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-3">Content Type</th>
                    <th className="py-3 px-3">Project</th>
                    <th className="py-3 px-3">Owner / Author</th>
                    <th className="py-3 px-3">Assignee</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Due Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-zinc-500">
                        No content items found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <button
                            onClick={() => {
                              setViewItem(item)
                              setIsViewModalOpen(true)
                            }}
                            className="font-semibold text-zinc-200 hover:text-indigo-400 text-left line-clamp-1"
                          >
                            {item.title}
                          </button>
                          <span className="text-[10px] text-zinc-500 font-mono">{item.id}</span>
                        </td>
                        <td className="py-3 px-3 text-zinc-300">{item.content_type}</td>
                        <td className="py-3 px-3 text-zinc-400">{item.project_name || 'General'}</td>
                        <td className="py-3 px-3 text-zinc-300 font-medium">{item.owner_name}</td>
                        <td className="py-3 px-3">
                          <span className={item.assigned_to_name ? 'text-indigo-400 font-medium' : 'text-zinc-500'}>
                            {item.assigned_to_name || 'Unassigned'}
                          </span>
                        </td>
                        <td className="py-3 px-3">{renderStatusBadge(item.status)}</td>
                        <td className="py-3 px-3">
                          <div className="space-y-0.5">
                            <span className="text-zinc-300">
                              {item.due_date ? dayjs(item.due_date).format('DD MMM YYYY') : '—'}
                            </span>
                            <div>{renderDeadlineBadge(item)}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setViewItem(item)
                                setIsViewModalOpen(true)
                              }}
                              className="h-7 px-2 text-zinc-400 hover:text-zinc-100"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setCreateEditItem(item)
                                setIsCreateEditModalOpen(true)
                              }}
                              className="h-7 px-2 text-zinc-400 hover:text-zinc-100"
                              title="Edit Content"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>

                            {/* Review Action */}
                            {item.status === 'In Review' && isAuthorizedManager && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setReviewItem(item)
                                  setIsReviewModalOpen(true)
                                }}
                                className="h-7 px-2 bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 hover:text-white"
                                title="Review / Decision"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            {/* Publish Action (Approved -> Published) */}
                            {item.status === 'Approved' && isAuthorizedManager && (
                              <Button
                                size="sm"
                                onClick={() => handlePublish(item)}
                                className="h-7 px-2 bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600 hover:text-white"
                                title="Publish"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            {/* Assign / Reassign */}
                            {isAuthorizedManager && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setAssignItem(item)
                                  setIsAssignModalOpen(true)
                                }}
                                className="h-7 px-2 text-zinc-400 hover:text-indigo-400"
                                title={item.assigned_to_id ? 'Reassign' : 'Assign'}
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            {/* Archive */}
                            {item.status !== 'Archived' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleArchive(item)}
                                className="h-7 px-2 text-zinc-400 hover:text-purple-400"
                                title="Archive"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            {/* Admin Delete */}
                            {isAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setItemToDelete(item)}
                                className="h-7 px-2 text-zinc-400 hover:text-rose-400"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 3. ASSIGNMENTS ---------------- */}
      {activeSection === 'assignments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-100">Content Workload & Assignments</h2>
              <p className="text-xs text-zinc-400">
                Assign and rebalance technical writing and review workloads across developers and leads.
              </p>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Content</th>
                    <th className="py-3 px-3">Assignee</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3">Workflow Status</th>
                    <th className="py-3 px-3">Due Date</th>
                    <th className="py-3 px-3">Deadline State</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => {
                            setViewItem(item)
                            setIsViewModalOpen(true)
                          }}
                          className="font-semibold text-zinc-200 hover:text-indigo-400 text-left line-clamp-1"
                        >
                          {item.title}
                        </button>
                        <span className="text-[10px] text-zinc-500 font-mono">{item.content_type}</span>
                      </td>
                      <td className="py-3 px-3 font-medium">
                        <span className={item.assigned_to_name ? 'text-indigo-300' : 'text-zinc-500'}>
                          {item.assigned_to_name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-zinc-400">{item.assigned_role || 'Developer'}</td>
                      <td className="py-3 px-3">{renderPriorityBadge(item.priority)}</td>
                      <td className="py-3 px-3">{renderStatusBadge(item.status)}</td>
                      <td className="py-3 px-3 text-zinc-300">
                        {item.due_date ? dayjs(item.due_date).format('DD MMM YYYY') : 'Not set'}
                      </td>
                      <td className="py-3 px-3">{renderDeadlineBadge(item)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isAuthorizedManager && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setAssignItem(item)
                                setIsAssignModalOpen(true)
                              }}
                              className="h-7 text-xs border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                            >
                              <UserCheck className="w-3.5 h-3.5 mr-1" />
                              <span>{item.assigned_to_id ? 'Reassign' : 'Assign'}</span>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setViewItem(item)
                              setIsViewModalOpen(true)
                            }}
                            className="h-7 text-xs text-zinc-400 hover:text-zinc-200"
                          >
                            Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 4. APPROVAL / REVIEW ---------------- */}
      {activeSection === 'approvals' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-zinc-100">Pending Review & Approval Queue</h2>
            <p className="text-xs text-zinc-400">
              Submissions waiting for sign-off from Head of Content Department or designated reviewers.
            </p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Content Title</th>
                    <th className="py-3 px-3">Project</th>
                    <th className="py-3 px-3">Author / Owner</th>
                    <th className="py-3 px-3">Content Type</th>
                    <th className="py-3 px-3">Submission Date</th>
                    <th className="py-3 px-3">Reviewer</th>
                    <th className="py-3 px-3">Due Date</th>
                    <th className="py-3 px-4 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {pendingApprovals.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-zinc-500">
                        <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                        No submissions currently in review.
                      </td>
                    </tr>
                  ) : (
                    pendingApprovals.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <button
                            onClick={() => {
                              setViewItem(item)
                              setIsViewModalOpen(true)
                            }}
                            className="font-semibold text-zinc-200 hover:text-indigo-400 text-left line-clamp-1"
                          >
                            {item.title}
                          </button>
                          <span className="text-[10px] text-zinc-500 font-mono">{item.id}</span>
                        </td>
                        <td className="py-3 px-3 text-zinc-400">{item.project_name || 'General'}</td>
                        <td className="py-3 px-3 text-zinc-200 font-medium">{item.owner_name}</td>
                        <td className="py-3 px-3 text-zinc-300">{item.content_type}</td>
                        <td className="py-3 px-3 text-zinc-400">
                          {item.submission_date ? dayjs(item.submission_date).format('DD MMM YYYY') : 'Recently'}
                        </td>
                        <td className="py-3 px-3 text-indigo-400 font-medium">
                          {item.current_reviewer_name || user.employee_name || 'Head of Content'}
                        </td>
                        <td className="py-3 px-3">
                          <div className="space-y-0.5">
                            <span className="text-zinc-300">
                              {item.due_date ? dayjs(item.due_date).format('DD MMM YYYY') : 'None'}
                            </span>
                            <div>{renderDeadlineBadge(item)}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setViewItem(item)
                                setIsViewModalOpen(true)
                              }}
                              className="h-7 text-xs text-zinc-400 hover:text-zinc-200"
                            >
                              Inspect
                            </Button>
                            {isAuthorizedManager && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setReviewItem(item)
                                  setIsReviewModalOpen(true)
                                }}
                                className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                                Review
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 5. DEADLINES ---------------- */}
      {activeSection === 'deadlines' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-zinc-100">Deadline Tracking & Delivery Schedule</h2>
            <p className="text-xs text-zinc-400">
              Categorized view of overdue submissions, imminent deliverables, and completed assets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Overdue */}
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Overdue</span>
                <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 font-bold text-xs rounded-full">
                  {overdueCount}
                </span>
              </div>
              <div className="space-y-2">
                {items
                  .filter((i) => computeDeadlineState(i.due_date, i.status) === 'Overdue')
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setViewItem(item)
                        setIsViewModalOpen(true)
                      }}
                      className="p-3 bg-zinc-900/80 border border-rose-500/30 rounded-lg cursor-pointer hover:border-rose-500 transition-colors text-xs space-y-1"
                    >
                      <div className="font-semibold text-zinc-200 line-clamp-1">{item.title}</div>
                      <div className="text-[11px] text-zinc-400 flex justify-between">
                        <span>Owner: {item.owner_name}</span>
                        <span className="text-rose-400 font-medium">Due: {item.due_date}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Upcoming / Due Soon */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Due Soon (≤ 3 Days)</span>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-bold text-xs rounded-full">
                  {upcomingCount}
                </span>
              </div>
              <div className="space-y-2">
                {items
                  .filter((i) => computeDeadlineState(i.due_date, i.status) === 'Upcoming')
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setViewItem(item)
                        setIsViewModalOpen(true)
                      }}
                      className="p-3 bg-zinc-900/80 border border-amber-500/30 rounded-lg cursor-pointer hover:border-amber-500 transition-colors text-xs space-y-1"
                    >
                      <div className="font-semibold text-zinc-200 line-clamp-1">{item.title}</div>
                      <div className="text-[11px] text-zinc-400 flex justify-between">
                        <span>Owner: {item.owner_name}</span>
                        <span className="text-amber-400 font-medium">Due: {item.due_date}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Pending Scheduled */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Scheduled (Pending)</span>
                <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 font-bold text-xs rounded-full">
                  {items.filter((i) => computeDeadlineState(i.due_date, i.status) === 'Pending').length}
                </span>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {items
                  .filter((i) => computeDeadlineState(i.due_date, i.status) === 'Pending')
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setViewItem(item)
                        setIsViewModalOpen(true)
                      }}
                      className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-700 transition-colors text-xs space-y-1"
                    >
                      <div className="font-semibold text-zinc-200 line-clamp-1">{item.title}</div>
                      <div className="text-[11px] text-zinc-400 flex justify-between">
                        <span>Owner: {item.owner_name}</span>
                        <span>Due: {item.due_date || 'Unscheduled'}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Completed */}
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Completed</span>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold text-xs rounded-full">
                  {items.filter((i) => computeDeadlineState(i.due_date, i.status) === 'Completed').length}
                </span>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {items
                  .filter((i) => computeDeadlineState(i.due_date, i.status) === 'Completed')
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setViewItem(item)
                        setIsViewModalOpen(true)
                      }}
                      className="p-3 bg-zinc-950/60 border border-emerald-500/30 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors text-xs space-y-1"
                    >
                      <div className="font-semibold text-zinc-200 line-clamp-1">{item.title}</div>
                      <div className="text-[11px] text-zinc-400 flex justify-between">
                        <span>Status: {item.status}</span>
                        <span className="text-emerald-400 font-medium">Delivered</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MEDIA & FILES ---------------- */}
      {activeSection === 'media' && (
        <MediaFilesSection initialAttachments={attachments} user={user} />
      )}

      {/* ---------------- 6. ACTIVITY / HISTORY ---------------- */}
      {activeSection === 'activity' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-zinc-100">Audit Trail & Activity Log</h2>
            <p className="text-xs text-zinc-400">
              Chronological ledger of content creation, reviewer decisions, reassignments, and publications.
            </p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl divide-y divide-zinc-800/70 overflow-hidden">
            {activities.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 text-xs">No activity logged yet.</div>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="p-4 hover:bg-zinc-800/30 transition-colors flex items-start gap-4 text-xs">
                  <span
                    className={`px-2.5 py-1 rounded font-mono text-[10px] uppercase font-bold shrink-0 ${
                      act.action === 'Approved' || act.action === 'Published'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : act.action === 'Changes Requested'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : act.action === 'Rejected'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : act.action === 'Reassigned' || act.action === 'Assigned'
                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                    }`}
                  >
                    {act.action}
                  </span>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-200">{act.content_title}</span>
                      <span className="text-[11px] text-zinc-500">{act.timestamp_display}</span>
                    </div>
                    <p className="text-zinc-400 leading-relaxed">{act.details}</p>
                    <div className="text-[10px] text-zinc-500">
                      User: <strong className="text-zinc-400">{act.user_name}</strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODALS */}
      <ViewContentModal
        item={viewItem}
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        onEdit={(it) => {
          setCreateEditItem(it)
          setIsCreateEditModalOpen(true)
        }}
        onSubmitForReview={handleSubmitForReview}
        onOpenReview={(it) => {
          setReviewItem(it)
          setIsReviewModalOpen(true)
        }}
        onOpenAssign={(it) => {
          setAssignItem(it)
          setIsAssignModalOpen(true)
        }}
        onPublish={handlePublish}
        user={user}
      />

      <CreateEditContentModal
        isOpen={isCreateEditModalOpen}
        onClose={() => setIsCreateEditModalOpen(false)}
        item={createEditItem}
        contentTypes={types}
        projects={projects}
        employees={employees}
        currentUserId={user.id}
        currentUserName={user.employee_name || undefined}
        onSubmit={handleSaveContent}
      />

      <ReviewModal
        item={reviewItem}
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSuccess={(updated) => {
          setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
        }}
      />

      <AssignReassignModal
        item={assignItem}
        employees={employees}
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onSuccess={(updated) => {
          setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
        }}
      />

      {isAdmin && (
        <ManageContentTypesModal
          isOpen={isManageTypesOpen}
          onClose={() => setIsManageTypesOpen(false)}
          contentTypes={types}
          onCreateType={async (name, desc) => {
            const res = await createContentType(name, desc)
            if (res.success && res.data) {
              setTypes((prev) => [...prev, res.data!])
              toast({ title: 'Content Type Added', description: `"${res.data.name}" is now available.` })
            } else {
              toast({ title: 'Failed to Add Type', description: res.error || 'Error adding type', variant: 'destructive' })
            }
          }}
          onToggleStatus={async (id: string) => {
            const res = await toggleContentTypeStatus(id)
            if (res.success && res.data) {
              setTypes((prev) => prev.map((t) => (t.id === id ? res.data! : t)))
              toast({
                title: 'Content Type Updated',
                description: `"${res.data.name}" marked as ${res.data.is_active ? 'Active' : 'Inactive'}.`,
              })
            } else {
              toast({ title: 'Update Failed', description: res.error || 'Error toggling type', variant: 'destructive' })
            }
          }}
        />
      )}

      {/* Confirm Permanent Delete Modal */}
      <ConfirmModal
        open={Boolean(itemToDelete)}
        onOpenChange={(open) => !open && setItemToDelete(null)}
        onConfirm={handleDelete}
        title="Permanently Delete Content"
        description={`Are you sure you want to permanently delete "${itemToDelete?.title}"? This action is irrevocable and permitted only for Administrators.`}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  )
}
