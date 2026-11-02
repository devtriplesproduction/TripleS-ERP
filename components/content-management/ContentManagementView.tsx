'use client'

import React, { useState, useMemo } from 'react'
import {
  KanbanSquare,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Calendar,
  Paperclip,
  Search,
  MoreVertical,
  Trash2,
  Edit,
  Check,
  Eye,
  RefreshCw,
  X,
  FileText,
  Layers,
  ArrowRight,
  Sparkles,
  Send,
  SlidersHorizontal,
  ChevronDown,
  UploadCloud,
  BarChart2,
  Users,
  UserCheck,
  ArrowUpDown,
  CalendarDays,
  ExternalLink
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
  deleteContentItem,
  uploadContentAttachment,
} from '@/lib/actions/content-management'
import { ViewContentModal } from './ViewContentModal'
import { ContentGanttChart } from './ContentGanttChart'
import { useToast } from '@/hooks/use-toast'
import dayjs from 'dayjs'
import { cn } from '@/lib/utils'

interface ContentManagementViewProps {
  initialItems: ContentItem[]
  initialTypes?: ContentType[]
  initialCategories?: any[]
  initialTags?: any[]
  initialActivities?: any[]
  initialNotifications?: any[]
  initialAttachments?: any[]
  projects?: Project[]
  employees?: AssignableEmployee[]
  user: AuthUser
}

type BoardColumnKey = 'To Do' | 'In Progress' | 'In Review' | 'Completed'

const BOARD_COLUMNS: { key: BoardColumnKey; title: string; color: string; badgeClass: string; dotClass: string }[] = [
  {
    key: 'To Do',
    title: 'To Do',
    color: 'zinc',
    badgeClass: 'bg-zinc-500/15 text-zinc-300 border-zinc-600',
    dotClass: 'bg-zinc-400',
  },
  {
    key: 'In Progress',
    title: 'In Progress',
    color: 'amber',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dotClass: 'bg-amber-400',
  },
  {
    key: 'In Review',
    title: 'In Review',
    color: 'indigo',
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    dotClass: 'bg-indigo-400',
  },
  {
    key: 'Completed',
    title: 'Completed',
    color: 'emerald',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dotClass: 'bg-emerald-400',
  },
]

const STANDARD_CONTENT_TYPES = [
  'Blog',
  'Article',
  'Social Media Post',
  'Website Content',
  'Advertisement',
  'Email Content',
  'Other',
]

export function ContentManagementView({
  initialItems,
  initialTypes = [],
  projects = [],
  employees = [],
  user,
}: ContentManagementViewProps) {
  const [items, setItems] = useState<ContentItem[]>(initialItems || [])
  const [activeTab, setActiveTab] = useState<'board' | 'gantt' | 'deadlines' | 'assignments' | 'create'>('board')

  // Board filters
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('All')
  const [priorityFilter, setPriorityFilter] = useState<string>('All')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('All')

  // Modals state
  const [viewItem, setViewItem] = useState<ContentItem | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ContentItem | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)

  // Edit Task modal state
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null)

  // Task Creation Form State
  const todayStr = useMemo(() => dayjs().format('YYYY-MM-DD'), [])
  const defaultDueStr = useMemo(() => dayjs().add(7, 'day').format('YYYY-MM-DD'), [])

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to_id: '',
    content_type: 'Blog',
    priority: 'Medium' as ContentPriority,
    start_date: todayStr,
    due_date: defaultDueStr,
    instructions: '',
    reference_attachment: '',
  })

  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { toast } = useToast()

  const isHod = user.is_hod || /\b(hod|head of department|head of content)\b/i.test(user.designation || '')
  const isAdmin = user.role === 'Admin'
  const isAuthorizedManager = isAdmin || isHod

  // Map any ContentStatus into one of the 4 Kanban columns
  const getTaskColumn = (status: ContentStatus): BoardColumnKey => {
    switch (status) {
      case 'In Progress':
      case 'Changes Requested':
        return 'In Progress'
      case 'In Review':
        return 'In Review'
      case 'Completed':
      case 'Approved':
      case 'Published':
        return 'Completed'
      case 'To Do':
      case 'Draft':
      case 'Rejected':
      case 'Archived':
      default:
        return 'To Do'
    }
  }

  // Calculate task progress percentage
  const getTaskProgress = (item: ContentItem): number => {
    if (typeof item.progress === 'number' && !isNaN(item.progress)) {
      return Math.min(100, Math.max(0, item.progress))
    }
    const col = getTaskColumn(item.status)
    switch (col) {
      case 'Completed':
        return 100
      case 'In Review':
        return 75
      case 'In Progress':
        return 40
      case 'To Do':
      default:
        return 0
    }
  }

  // Filtered items for the Task Board
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (typeFilter !== 'All' && item.content_type !== typeFilter) return false
      if (priorityFilter !== 'All' && item.priority !== priorityFilter) return false
      if (assigneeFilter !== 'All' && item.assigned_to_id !== assigneeFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = item.title.toLowerCase().includes(q)
        const matchesSummary = (item.summary || '').toLowerCase().includes(q)
        const matchesAssignee = (item.assigned_to_name || '').toLowerCase().includes(q)
        const matchesType = (item.content_type || '').toLowerCase().includes(q)
        if (!matchesTitle && !matchesSummary && !matchesAssignee && !matchesType) {
          return false
        }
      }
      return true
    })
  }, [items, typeFilter, priorityFilter, assigneeFilter, searchQuery])

  // Tasks grouped by column
  const columnTasks = useMemo(() => {
    const map: Record<BoardColumnKey, ContentItem[]> = {
      'To Do': [],
      'In Progress': [],
      'In Review': [],
      'Completed': [],
    }
    filteredItems.forEach((item) => {
      const col = getTaskColumn(item.status)
      map[col].push(item)
    })
    return map
  }, [filteredItems])

  // Statistics
  const totalTasks = items.length
  const todoCount = items.filter((i) => getTaskColumn(i.status) === 'To Do').length
  const inProgressCount = items.filter((i) => getTaskColumn(i.status) === 'In Progress').length
  const inReviewCount = items.filter((i) => getTaskColumn(i.status) === 'In Review').length
  const completedCount = items.filter((i) => getTaskColumn(i.status) === 'Completed').length
  const overdueCount = items.filter(
    (i) =>
      computeDeadlineState(i.due_date, i.status) === 'Overdue' &&
      getTaskColumn(i.status) !== 'Completed'
  ).length

  // Deadlines grouping
  const deadlineTasks = useMemo(() => {
    const overdue: ContentItem[] = []
    const dueToday: ContentItem[] = []
    const dueThisWeek: ContentItem[] = []
    const dueLater: ContentItem[] = []
    const completedList: ContentItem[] = []

    const now = dayjs()
    const weekFromNow = now.add(7, 'day')

    items.forEach((item) => {
      if (getTaskColumn(item.status) === 'Completed') {
        completedList.push(item)
        return
      }

      if (!item.due_date) {
        dueLater.push(item)
        return
      }

      const d = dayjs(item.due_date)
      if (computeDeadlineState(item.due_date, item.status) === 'Overdue') {
        overdue.push(item)
      } else if (d.format('YYYY-MM-DD') === todayStr) {
        dueToday.push(item)
      } else if (d.isBefore(weekFromNow.add(1, 'day'))) {
        dueThisWeek.push(item)
      } else {
        dueLater.push(item)
      }
    })

    return { overdue, dueToday, dueThisWeek, dueLater, completed: completedList }
  }, [items, todayStr])

  // Team Workload Mapping for Assignments tab
  const teamWorkloadList = useMemo(() => {
    const map: Record<
      string,
      { id: string; name: string; role: string; assignedTasks: ContentItem[]; inProgress: number; completed: number; overdue: number }
    > = {}

    // Add employees
    employees.forEach((emp) => {
      map[emp.id] = {
        id: emp.id,
        name: emp.name || (emp as any).employee_name || 'Staff Member',
        role: emp.designation || 'Content Creator',
        assignedTasks: [],
        inProgress: 0,
        completed: 0,
        overdue: 0,
      }
    })

    // Assign tasks
    items.forEach((item) => {
      const key = item.assigned_to_id || item.assigned_to_name
      if (!key) return

      if (!map[key]) {
        map[key] = {
          id: key,
          name: item.assigned_to_name || 'Staff Member',
          role: item.assigned_role || 'Creator',
          assignedTasks: [],
          inProgress: 0,
          completed: 0,
          overdue: 0,
        }
      }

      map[key].assignedTasks.push(item)
      if (getTaskColumn(item.status) === 'In Progress' || getTaskColumn(item.status) === 'In Review') {
        map[key].inProgress += 1
      } else if (getTaskColumn(item.status) === 'Completed') {
        map[key].completed += 1
      }

      if (computeDeadlineState(item.due_date, item.status) === 'Overdue' && getTaskColumn(item.status) !== 'Completed') {
        map[key].overdue += 1
      }
    })

    return Object.values(map)
  }, [items, employees])

  const unassignedTasks = useMemo(() => {
    return items.filter((i) => !i.assigned_to_id && !i.assigned_to_name)
  }, [items])

  // Update Task Status Handler
  const handleUpdateStatus = async (itemId: string, newStatus: ContentStatus) => {
    setUpdatingStatusId(itemId)
    const newProgress =
      newStatus === 'Completed' || newStatus === 'Approved' || newStatus === 'Published'
        ? 100
        : newStatus === 'In Review'
        ? 75
        : newStatus === 'In Progress'
        ? 40
        : 0

    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              status: newStatus,
              progress: newProgress,
              updated_at: new Date().toISOString(),
            }
          : i
      )
    )

    if (viewItem && viewItem.id === itemId) {
      setViewItem((prev) => (prev ? { ...prev, status: newStatus, progress: newProgress } : null))
    }

    try {
      const res = await updateContentStatus(itemId, newStatus)
      if (res.success && res.data) {
        setItems((prev) => prev.map((i) => (i.id === itemId ? res.data! : i)))
        if (viewItem && viewItem.id === itemId) {
          setViewItem(res.data)
        }
        toast({
          title: 'Status Updated',
          description: `Task status changed to "${newStatus}".`,
        })
      } else {
        toast({
          title: 'Update Failed',
          description: res.error || 'Failed to update task status.',
          variant: 'destructive',
        })
      }
    } finally {
      setUpdatingStatusId(null)
    }
  }

  // Quick Reassign Employee Handler
  const handleReassignTask = async (itemId: string, newEmployeeId: string) => {
    const emp = employees.find((e) => e.id === newEmployeeId)
    const empName = emp ? (emp.name || (emp as any).employee_name) : null

    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              assigned_to_id: newEmployeeId || null,
              assigned_to_name: empName,
              updated_at: new Date().toISOString(),
            }
          : i
      )
    )

    try {
      const res = await updateContentItem(itemId, {
        assigned_to_id: newEmployeeId || null,
        assigned_to_name: empName || null,
      })

      if (res.success && res.data) {
        setItems((prev) => prev.map((i) => (i.id === itemId ? res.data! : i)))
        toast({
          title: 'Task Assigned',
          description: `Task assigned to ${empName || 'Unassigned'}.`,
        })
      } else {
        toast({
          title: 'Assignment Failed',
          description: res.error || 'Failed to update assignment.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({ title: 'Error', description: 'Could not reassign task', variant: 'destructive' })
    }
  }

  // Quick Extend Deadline Handler
  const handleExtendDeadline = async (itemId: string, daysToAdd: number) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    const currentDue = item.due_date ? dayjs(item.due_date) : dayjs()
    const newDue = currentDue.add(daysToAdd, 'day').format('YYYY-MM-DD')

    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              due_date: newDue,
              updated_at: new Date().toISOString(),
            }
          : i
      )
    )

    try {
      const res = await updateContentItem(itemId, { due_date: newDue })
      if (res.success && res.data) {
        setItems((prev) => prev.map((i) => (i.id === itemId ? res.data! : i)))
        toast({
          title: 'Deadline Rescheduled',
          description: `New deadline set to ${dayjs(newDue).format('DD MMM YYYY')}.`,
        })
      }
    } catch {
      toast({ title: 'Error', description: 'Could not extend deadline', variant: 'destructive' })
    }
  }

  // Delete Task Handler
  const handleDeleteTask = async () => {
    if (!itemToDelete) return
    const res = await deleteContentItem(itemToDelete.id)
    if (res.success) {
      setItems((prev) => prev.filter((i) => i.id !== itemToDelete.id))
      if (viewItem && viewItem.id === itemToDelete.id) {
        setIsViewModalOpen(false)
        setViewItem(null)
      }
      toast({ title: 'Task Deleted', description: 'Task has been permanently removed.' })
    } else {
      toast({
        title: 'Delete Failed',
        description: res.error || 'Unauthorized or delete failed',
        variant: 'destructive',
      })
    }
    setItemToDelete(null)
  }

  // Submit New Task Form
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast({ title: 'Title Required', description: 'Please enter a task title.', variant: 'destructive' })
      return
    }

    if (!formData.description.trim()) {
      toast({ title: 'Description Required', description: 'Please enter a task description.', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)

    try {
      let selectedEmpName = ''
      if (formData.assigned_to_id) {
        const emp = employees.find((e) => e.id === formData.assigned_to_id)
        if (emp) {
          selectedEmpName = emp.name || (emp as any).employee_name || ''
        }
      }

      let referenceAttachmentName = formData.reference_attachment.trim() || undefined

      // If user selected a file for reference attachment, upload it
      let uploadedAttachments: any[] = []
      if (attachmentFile) {
        try {
          const fd = new FormData()
          fd.append('file', attachmentFile)
          const upRes = await uploadContentAttachment(fd)
          if (upRes.success && upRes.data) {
            uploadedAttachments = [upRes.data]
            referenceAttachmentName = attachmentFile.name
          }
        } catch (uploadErr) {
          console.warn('File upload fallback:', uploadErr)
          referenceAttachmentName = attachmentFile.name
        }
      }

      const createInput: CreateContentInput = {
        title: formData.title.trim(),
        summary: formData.description.trim(),
        body: formData.instructions.trim() || formData.description.trim(),
        content_type: formData.content_type,
        priority: formData.priority,
        start_date: formData.start_date || todayStr,
        due_date: formData.due_date || null,
        instructions: formData.instructions.trim() || null,
        assigned_to_id: formData.assigned_to_id || null,
        assigned_to_name: selectedEmpName || null,
        reference_attachment: referenceAttachmentName || null,
        attachments: uploadedAttachments,
        status: 'To Do',
        progress: 0,
      }

      const res = await createContentItem(createInput)

      if (res.success && res.data) {
        setItems((prev) => [res.data!, ...prev])

        setFormData({
          title: '',
          description: '',
          assigned_to_id: '',
          content_type: 'Blog',
          priority: 'Medium',
          start_date: todayStr,
          due_date: defaultDueStr,
          instructions: '',
          reference_attachment: '',
        })
        setAttachmentFile(null)

        toast({
          title: 'Task Created Successfully',
          description: `"${res.data.title}" is now added to the To Do column.`,
        })

        setActiveTab('board')
      } else {
        toast({
          title: 'Creation Failed',
          description: res.error || 'Could not create task.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'An unexpected error occurred.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update Existing Task (Edit Modal)
  const handleSaveEditedTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    setIsSubmitting(true)
    try {
      let selectedEmpName = editingItem.assigned_to_name || ''
      if (editingItem.assigned_to_id) {
        const emp = employees.find((e) => e.id === editingItem.assigned_to_id)
        if (emp) {
          selectedEmpName = emp.name || (emp as any).employee_name || selectedEmpName
        }
      }

      const res = await updateContentItem(editingItem.id, {
        title: editingItem.title,
        summary: editingItem.summary,
        body: editingItem.instructions || editingItem.body || editingItem.summary,
        content_type: editingItem.content_type,
        priority: editingItem.priority,
        start_date: editingItem.start_date,
        due_date: editingItem.due_date,
        instructions: editingItem.instructions,
        assigned_to_id: editingItem.assigned_to_id,
        assigned_to_name: selectedEmpName,
      })

      if (res.success && res.data) {
        setItems((prev) => prev.map((i) => (i.id === res.data!.id ? res.data! : i)))
        if (viewItem && viewItem.id === res.data.id) {
          setViewItem(res.data)
        }
        toast({ title: 'Task Updated', description: 'Task details updated successfully.' })
        setEditingItem(null)
      } else {
        toast({
          title: 'Update Failed',
          description: res.error || 'Could not update task.',
          variant: 'destructive',
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Priority Badge Helper
  const renderPriorityBadge = (p?: ContentPriority) => {
    switch (p) {
      case 'Urgent':
        return <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30 text-[10px] px-2 py-0.5">Urgent</Badge>
      case 'High':
        return <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 text-[10px] px-2 py-0.5">High</Badge>
      case 'Medium':
        return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px] px-2 py-0.5">Medium</Badge>
      case 'Low':
        return <Badge className="bg-zinc-700/50 text-zinc-400 border-zinc-600 text-[10px] px-2 py-0.5">Low</Badge>
      default:
        return null
    }
  }

  // Content Type options list
  const contentTypeOptions = useMemo(() => {
    const list = [...STANDARD_CONTENT_TYPES]
    initialTypes.forEach((t) => {
      if (!list.includes(t.name)) {
        list.push(t.name)
      }
    })
    return list
  }, [initialTypes])

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Page Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span>Content Management</span>
          </div>
        }
        subtitle="Organize, schedule, and track content deliverables with Gantt timeline, deadlines, and team assignments."
        icon={FileText}
        iconClassName="text-primary"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'create' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('create')}
              className={cn(
                "h-9 px-3.5 text-xs font-semibold gap-1.5 transition-all shadow-xs",
                activeTab === 'create'
                  ? "bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted"
              )}
            >
              <PlusCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Create Task</span>
            </Button>
          </div>
        }
      />

      {/* Main Segmented Navigation Bar */}
      <div className="p-1.5 bg-card border border-border rounded-2xl flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/60 shadow-xs overflow-x-auto">
          {/* Tab 1: Task Board */}
          <button
            onClick={() => setActiveTab('board')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
              activeTab === 'board'
                ? "bg-background text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <KanbanSquare className="w-4 h-4 text-primary shrink-0" />
            <span>Task Board</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
              {totalTasks}
            </span>
          </button>

          {/* Tab 2: Gantt Chart */}
          <button
            onClick={() => setActiveTab('gantt')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
              activeTab === 'gantt'
                ? "bg-background text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarDays className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Gantt Chart</span>
          </button>

          {/* Tab 3: Deadlines */}
          <button
            onClick={() => setActiveTab('deadlines')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
              activeTab === 'deadlines'
                ? "bg-background text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Deadlines</span>
            {overdueCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {overdueCount}
              </span>
            )}
          </button>

          {/* Tab 4: Assignments */}
          <button
            onClick={() => setActiveTab('assignments')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
              activeTab === 'assignments'
                ? "bg-background text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <UserCheck className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Assignments</span>
            {unassignedTasks.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
                {unassignedTasks.length} unassigned
              </span>
            )}
          </button>

          {/* Tab 5: Task Creation */}
          <button
            onClick={() => setActiveTab('create')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
              activeTab === 'create'
                ? "bg-background text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <PlusCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Create Task</span>
          </button>
        </div>

        {/* Quick Summary Counts (Desktop) */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-medium text-muted-foreground px-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-zinc-400" />
            <span>To Do: <strong className="text-foreground">{todoCount}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>In Progress: <strong className="text-foreground">{inProgressCount}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>In Review: <strong className="text-foreground">{inReviewCount}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Completed: <strong className="text-foreground">{completedCount}</strong></span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: TASK BOARD                                         */}
      {/* ========================================================= */}
      {activeTab === 'board' && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs">
              <p className="text-[11px] font-medium text-muted-foreground">Total Tasks</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{totalTasks}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs">
              <p className="text-[11px] font-medium text-muted-foreground">To Do</p>
              <p className="text-xl font-bold text-zinc-300 mt-0.5">{todoCount}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs">
              <p className="text-[11px] font-medium text-muted-foreground">In Progress</p>
              <p className="text-xl font-bold text-amber-400 mt-0.5">{inProgressCount}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs">
              <p className="text-[11px] font-medium text-muted-foreground">In Review</p>
              <p className="text-xl font-bold text-indigo-400 mt-0.5">{inReviewCount}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs">
              <p className="text-[11px] font-medium text-muted-foreground">Completed</p>
              <p className="text-xl font-bold text-emerald-400 mt-0.5">{completedCount}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs">
              <p className="text-[11px] font-medium text-muted-foreground">Overdue</p>
              <p className={cn("text-xl font-bold mt-0.5", overdueCount > 0 ? "text-rose-400" : "text-muted-foreground")}>
                {overdueCount}
              </p>
            </div>
          </div>

          {/* Board Search & Filter Controls */}
          <div className="p-3 bg-card border border-border rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search tasks by title, description, or assignee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-9 text-xs bg-muted/40 border-border"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 px-3 rounded-lg text-xs bg-muted/40 border border-border text-foreground font-medium outline-none cursor-pointer"
              >
                <option value="All">All Types</option>
                {contentTypeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="h-9 px-3 rounded-lg text-xs bg-muted/40 border border-border text-foreground font-medium outline-none cursor-pointer"
              >
                <option value="All">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="h-9 px-3 rounded-lg text-xs bg-muted/40 border border-border text-foreground font-medium outline-none cursor-pointer max-w-[150px] truncate"
              >
                <option value="All">All Assignees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name || (emp as any).employee_name}
                  </option>
                ))}
              </select>

              {(searchQuery || typeFilter !== 'All' || priorityFilter !== 'All' || assigneeFilter !== 'All') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('')
                    setTypeFilter('All')
                    setPriorityFilter('All')
                    setAssigneeFilter('All')
                  }}
                  className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Kanban Board Columns (4 Columns: To Do, In Progress, In Review, Completed) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            {BOARD_COLUMNS.map((col) => {
              const tasks = columnTasks[col.key] || []

              return (
                <div
                  key={col.key}
                  className="bg-card/70 border border-border rounded-2xl p-3 space-y-3 min-h-[500px] flex flex-col shadow-xs"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-1 pt-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2.5 h-2.5 rounded-full", col.dotClass)} />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        {col.title}
                      </h3>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {tasks.length}
                      </span>
                    </div>

                    {col.key === 'To Do' && (
                      <button
                        onClick={() => setActiveTab('create')}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Add Task"
                      >
                        <PlusCircle className="w-4 h-4 text-emerald-500" />
                      </button>
                    )}
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {tasks.length === 0 ? (
                      <div className="p-6 text-center border border-dashed border-border/80 rounded-xl space-y-1 my-4">
                        <p className="text-xs text-muted-foreground">No tasks in {col.title}</p>
                        {col.key === 'To Do' && (
                          <button
                            onClick={() => setActiveTab('create')}
                            className="text-xs text-primary hover:underline font-semibold"
                          >
                            + Create a task
                          </button>
                        )}
                      </div>
                    ) : (
                      tasks.map((task) => {
                        const progress = getTaskProgress(task)
                        const deadlineState = computeDeadlineState(task.due_date, task.status)
                        const isOverdue =
                          deadlineState === 'Overdue' &&
                          col.key !== 'Completed'

                        return (
                          <div
                            key={task.id}
                            className="group p-3.5 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-150 space-y-3 shadow-xs hover:shadow-md cursor-pointer relative"
                            onClick={() => {
                              setViewItem(task)
                              setIsViewModalOpen(true)
                            }}
                          >
                            {/* Card Top: Badges & Quick Menu */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                                  {task.id}
                                </span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border">
                                  {task.content_type || 'Content'}
                                </Badge>
                                {renderPriorityBadge(task.priority)}
                              </div>

                              {/* Overdue Badge */}
                              {isOverdue && (
                                <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[9px] px-1.5 py-0 font-bold shrink-0 flex items-center gap-1">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  <span>Overdue</span>
                                </Badge>
                              )}
                            </div>

                            {/* Task Title & Summary */}
                            <div className="space-y-1">
                              <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                                {task.title}
                              </h4>
                              {task.summary && (
                                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                  {task.summary}
                                </p>
                              )}
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                                <span>Progress</span>
                                <span className="font-bold text-foreground">{progress}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all duration-300",
                                    progress >= 100
                                      ? "bg-emerald-500"
                                      : progress >= 60
                                      ? "bg-indigo-500"
                                      : progress >= 30
                                      ? "bg-amber-500"
                                      : "bg-zinc-500"
                                  )}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>

                            {/* Meta: Assignee & Due Date */}
                            <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2 text-[11px]">
                              {/* Assignee */}
                              <div className="flex items-center gap-1.5 truncate max-w-[140px]" title={task.assigned_to_name || 'Unassigned'}>
                                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px] shrink-0">
                                  {task.assigned_to_name ? task.assigned_to_name.charAt(0).toUpperCase() : '?'}
                                </div>
                                <span className="truncate text-foreground font-medium">
                                  {task.assigned_to_name || 'Unassigned'}
                                </span>
                              </div>

                              {/* Due Date */}
                              <div className={cn(
                                "flex items-center gap-1 text-[10px] shrink-0 font-medium",
                                isOverdue ? "text-rose-400 font-bold" : "text-muted-foreground"
                              )}>
                                <Calendar className="w-3 h-3 shrink-0" />
                                <span>
                                  {task.due_date ? dayjs(task.due_date).format('DD MMM') : 'No date'}
                                </span>
                              </div>
                            </div>

                            {/* Status Quick Move Actions */}
                            <div
                              className="pt-2 border-t border-border/40 flex items-center justify-between gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="text-[10px] text-muted-foreground">Move to:</span>
                              <div className="flex items-center gap-1">
                                {BOARD_COLUMNS.filter((c) => c.key !== col.key).map((targetCol) => (
                                  <button
                                    key={targetCol.key}
                                    disabled={updatingStatusId === task.id}
                                    onClick={() => handleUpdateStatus(task.id, targetCol.key as ContentStatus)}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors border border-border/50"
                                    title={`Move to ${targetCol.title}`}
                                  >
                                    {targetCol.title === 'To Do' ? 'To Do' : targetCol.title === 'In Progress' ? 'Progress' : targetCol.title === 'In Review' ? 'Review' : 'Done'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: GANTT CHART (TIMELINE VIEW)                         */}
      {/* ========================================================= */}
      {activeTab === 'gantt' && (
        <div className="space-y-4">
          <ContentGanttChart
            items={items}
            employees={employees}
            onItemClick={(item) => {
              setViewItem(item)
              setIsViewModalOpen(true)
            }}
            onStatusChange={handleUpdateStatus}
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: DEADLINES & MILESTONES                             */}
      {/* ========================================================= */}
      {activeTab === 'deadlines' && (
        <div className="space-y-6">
          {/* Deadlines KPI Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
              <span className="text-xs text-rose-400 font-semibold flex items-center justify-between">
                <span>Overdue Deadlines</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </span>
              <p className={cn("text-2xl font-bold mt-1", deadlineTasks.overdue.length > 0 ? "text-rose-400" : "text-foreground")}>
                {deadlineTasks.overdue.length}
              </p>
              <span className="text-[10px] text-muted-foreground">Immediate escalation required</span>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
              <span className="text-xs text-amber-400 font-semibold flex items-center justify-between">
                <span>Due Today</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </span>
              <p className="text-2xl font-bold text-amber-400 mt-1">{deadlineTasks.dueToday.length}</p>
              <span className="text-[10px] text-muted-foreground">Expiring at end of day</span>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
              <span className="text-xs text-primary font-semibold flex items-center justify-between">
                <span>Due This Week</span>
                <Calendar className="w-4 h-4 text-primary" />
              </span>
              <p className="text-2xl font-bold text-foreground mt-1">{deadlineTasks.dueThisWeek.length}</p>
              <span className="text-[10px] text-muted-foreground">Next 7 calendar days</span>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
              <span className="text-xs text-emerald-400 font-semibold flex items-center justify-between">
                <span>Delivered & Closed</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{deadlineTasks.completed.length}</p>
              <span className="text-[10px] text-muted-foreground">Successfully published</span>
            </div>
          </div>

          {/* Overdue Items Alert Panel */}
          {deadlineTasks.overdue.length > 0 && (
            <Card className="border-rose-500/30 bg-rose-500/5 shadow-xs">
              <CardHeader className="p-4 border-b border-rose-500/20 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2 text-rose-400">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <CardTitle className="text-sm font-bold text-rose-400">
                    Overdue Attention Required ({deadlineTasks.overdue.length} Tasks Past Due)
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {deadlineTasks.overdue.map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 bg-card/90 border border-rose-500/30 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-rose-400 px-1.5 py-0.5 rounded bg-rose-500/10">
                          {task.id}
                        </span>
                        <h4 className="font-bold text-foreground">{task.title}</h4>
                        {renderPriorityBadge(task.priority)}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                        <span>Assignee: <strong className="text-foreground">{task.assigned_to_name || 'Unassigned'}</strong></span>
                        <span>&bull;</span>
                        <span className="text-rose-400 font-semibold">
                          Due Date: {dayjs(task.due_date).format('DD MMM YYYY')} ({dayjs().diff(dayjs(task.due_date), 'day')} days ago)
                        </span>
                      </div>
                    </div>

                    {/* Quick Reschedule & Complete Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExtendDeadline(task.id, 3)}
                        className="h-8 text-xs border-border"
                        title="Extend deadline by 3 days"
                      >
                        +3 Days
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExtendDeadline(task.id, 7)}
                        className="h-8 text-xs border-border"
                        title="Extend deadline by 1 week"
                      >
                        +1 Week
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(task.id, 'Completed')}
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Done</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Schedule Groupings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Due This Week */}
            <Card className="bg-card border-border shadow-xs">
              <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Due This Week ({deadlineTasks.dueThisWeek.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5">
                {deadlineTasks.dueThisWeek.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">No tasks expiring in the next 7 days.</p>
                ) : (
                  deadlineTasks.dueThisWeek.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setViewItem(t)
                        setIsViewModalOpen(true)
                      }}
                      className="p-3 rounded-xl bg-muted/20 border border-border hover:border-primary/40 transition-colors flex items-center justify-between gap-3 text-xs cursor-pointer"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <h5 className="font-bold text-foreground truncate">{t.title}</h5>
                        <p className="text-[11px] text-muted-foreground">{t.assigned_to_name || 'Unassigned'}</p>
                      </div>
                      <Badge variant="outline" className="border-border text-[10px] font-mono shrink-0">
                        {dayjs(t.due_date).format('DD MMM')}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Upcoming / Flexible Schedule */}
            <Card className="bg-card border-border shadow-xs">
              <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Upcoming (Next 30 Days & Later) ({deadlineTasks.dueLater.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5">
                {deadlineTasks.dueLater.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">No upcoming tasks scheduled.</p>
                ) : (
                  deadlineTasks.dueLater.slice(0, 6).map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setViewItem(t)
                        setIsViewModalOpen(true)
                      }}
                      className="p-3 rounded-xl bg-muted/20 border border-border hover:border-primary/40 transition-colors flex items-center justify-between gap-3 text-xs cursor-pointer"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <h5 className="font-bold text-foreground truncate">{t.title}</h5>
                        <p className="text-[11px] text-muted-foreground">{t.assigned_to_name || 'Unassigned'}</p>
                      </div>
                      <Badge variant="outline" className="border-border text-[10px] font-mono shrink-0">
                        {t.due_date ? dayjs(t.due_date).format('DD MMM') : 'Flexible'}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: ASSIGNMENTS & WORKLOAD                             */}
      {/* ========================================================= */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          {/* Unassigned Tasks Alert Queue */}
          {unassignedTasks.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5 shadow-xs">
              <CardHeader className="p-4 border-b border-amber-500/20 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Unassigned Tasks Queue ({unassignedTasks.length} Awaiting Staff Assignment)
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5">
                {unassignedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary text-[10px] px-1.5 py-0.2 bg-primary/10 rounded">
                          {task.id}
                        </span>
                        <h4 className="font-bold text-foreground truncate">{task.title}</h4>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{task.summary}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        onChange={(e) => {
                          if (e.target.value) handleReassignTask(task.id, e.target.value)
                        }}
                        className="h-8 px-2.5 rounded-lg text-xs bg-muted/40 border border-border text-foreground font-medium outline-none cursor-pointer"
                        defaultValue=""
                      >
                        <option value="" disabled>Assign to staff...</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name || (emp as any).employee_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Team Workload & Staff Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamWorkloadList.map((member) => {
              const capacityPercent = Math.min(100, Math.round((member.assignedTasks.length / 8) * 100))

              return (
                <Card key={member.id} className="bg-card border-border shadow-xs flex flex-col justify-between">
                  <CardHeader className="p-4 pb-3 border-b border-border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold text-foreground">{member.name}</CardTitle>
                          <span className="text-[11px] text-muted-foreground">{member.role}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono border-border">
                        {member.assignedTasks.length} Tasks
                      </Badge>
                    </div>

                    {/* Capacity Progress Bar */}
                    <div className="pt-2 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Workload Capacity</span>
                        <span className="font-bold text-foreground">{capacityPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            capacityPercent >= 90
                              ? "bg-rose-500"
                              : capacityPercent >= 60
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          )}
                          style={{ width: `${capacityPercent}%` }}
                        />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-2.5 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Assigned Deliverables ({member.assignedTasks.length})
                    </p>

                    {member.assignedTasks.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-4 text-center">
                        No active deliverables assigned.
                      </p>
                    ) : (
                      member.assignedTasks.slice(0, 4).map((task) => (
                        <div
                          key={task.id}
                          className="p-2.5 rounded-lg bg-muted/20 border border-border flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground truncate block">{task.title}</span>
                            <span className="text-[10px] text-muted-foreground">
                              Due: {task.due_date ? dayjs(task.due_date).format('DD MMM') : 'Flexible'}
                            </span>
                          </div>

                          {/* Quick Reassign Dropdown */}
                          <select
                            value={member.id}
                            onChange={(e) => handleReassignTask(task.id, e.target.value)}
                            className="h-6 text-[10px] bg-muted border border-border rounded px-1 text-muted-foreground hover:text-foreground outline-none cursor-pointer max-w-[100px] truncate"
                            title="Reassign to another team member"
                          >
                            <option value={member.id}>{member.name.split(' ')[0]}</option>
                            {employees.filter((e) => e.id !== member.id).map((e) => (
                              <option key={e.id} value={e.id}>
                                &rarr; {e.name?.split(' ')[0] || 'Staff'}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: TASK CREATION FORM                                 */}
      {/* ========================================================= */}
      {activeTab === 'create' && (
        <Card className="border-border shadow-xs max-w-4xl mx-auto">
          <CardHeader className="p-6 border-b border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-emerald-500" />
                  <span>Create Content Task</span>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Fill in the details below to schedule and assign a content production task. The new task will immediately appear on the Task Board under To Do and on the Gantt timeline.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('board')}
                className="text-xs border-border"
              >
                Cancel & View Board
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleCreateTask} className="space-y-6">
              {/* Task Title */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Task Title <span className="text-rose-500">*</span></span>
                  <span className="text-[11px] text-muted-foreground font-normal">Clear & descriptive headline</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Q4 Growth Case Study & Customer Story"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-muted/30 border-border text-sm h-10"
                />
              </div>

              {/* Task Description */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Task Description <span className="text-rose-500">*</span></span>
                  <span className="text-[11px] text-muted-foreground font-normal">Overview and goals of this content</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Outline what needs to be produced, key objectives, target audience, and expected outcome..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-y"
                />
              </div>

              {/* Grid: Assign Employee & Content Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Assign Employee */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span>Assign Employee</span>
                  </label>
                  <select
                    value={formData.assigned_to_id}
                    onChange={(e) => setFormData({ ...formData, assigned_to_id: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-muted/30 border border-border text-xs text-foreground font-medium outline-none cursor-pointer"
                  >
                    <option value="">Unassigned (Assign Later)</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name || (emp as any).employee_name} {emp.designation ? `(${emp.designation})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Content Type */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    <span>Content Type</span>
                  </label>
                  <select
                    value={formData.content_type}
                    onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-muted/30 border border-border text-xs text-foreground font-medium outline-none cursor-pointer"
                  >
                    {contentTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid: Priority, Start Date & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Priority */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">Priority</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['Low', 'Medium', 'High', 'Urgent'] as ContentPriority[]).map((p) => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setFormData({ ...formData, priority: p })}
                        className={cn(
                          "py-2 rounded-lg text-xs font-semibold border transition-all text-center",
                          formData.priority === p
                            ? p === 'Urgent'
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-xs"
                              : p === 'High'
                              ? "bg-orange-500/20 text-orange-300 border-orange-500/50 shadow-xs"
                              : p === 'Medium'
                              ? "bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-xs"
                              : "bg-zinc-700 text-zinc-200 border-zinc-600 shadow-xs"
                            : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>Start Date</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="bg-muted/30 border-border text-xs h-10 font-mono"
                  />
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>Due Date</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, due_date: dayjs().add(3, 'day').format('YYYY-MM-DD') })}
                        className="text-[10px] text-primary hover:underline"
                      >
                        +3d
                      </button>
                      <span className="text-muted-foreground text-[10px]">|</span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, due_date: dayjs().add(7, 'day').format('YYYY-MM-DD') })}
                        className="text-[10px] text-primary hover:underline"
                      >
                        +1w
                      </button>
                    </div>
                  </div>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="bg-muted/30 border-border text-xs h-10 font-mono"
                  />
                </div>
              </div>

              {/* Task Instructions */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Task Instructions & Guidelines (Optional)</span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    Style, tone of voice, word count, or required sections
                  </span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide detailed instructions, formatting rules, reference links, or key bullet points the assigned employee must follow..."
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-y"
                />
              </div>

              {/* Reference Attachment (Optional) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-primary" />
                  <span>Reference Attachment (Optional)</span>
                </label>
                <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="space-y-1 text-center sm:text-left">
                    <p className="text-xs font-semibold text-foreground">
                      {attachmentFile ? attachmentFile.name : formData.reference_attachment || 'Upload a file or provide a link'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Attach project brief, brand asset, or reference documentation (PDF, Word, Image)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors flex items-center gap-1.5">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{attachmentFile ? 'Replace File' : 'Choose File'}</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setAttachmentFile(file)
                            setFormData({ ...formData, reference_attachment: file.name })
                          }
                        }}
                      />
                    </label>
                    {attachmentFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setAttachmentFile(null)
                          setFormData({ ...formData, reference_attachment: '' })
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Action Buttons: Submit Task & Cancel */}
              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab('board')}
                  disabled={isSubmitting}
                  className="border-border text-xs h-10 px-4"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-10 px-5 gap-2 shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating Task...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Submit Task</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Task View Details Modal */}
      <ViewContentModal
        item={viewItem}
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false)
          setViewItem(null)
        }}
        onEdit={(item) => setEditingItem(item)}
        onStatusChange={handleUpdateStatus}
        user={user}
      />

      {/* Edit Task Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Edit Task</h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedTask} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Title</label>
                <Input
                  required
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="bg-muted/30 border-border text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Description</label>
                <textarea
                  rows={3}
                  value={editingItem.summary || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, summary: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Assignee</label>
                  <select
                    value={editingItem.assigned_to_id || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, assigned_to_id: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl bg-muted/30 border border-border text-xs text-foreground outline-none"
                  >
                    <option value="">Unassigned</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name || (emp as any).employee_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Priority</label>
                  <select
                    value={editingItem.priority || 'Medium'}
                    onChange={(e) => setEditingItem({ ...editingItem, priority: e.target.value as ContentPriority })}
                    className="w-full h-9 px-3 rounded-xl bg-muted/30 border border-border text-xs text-foreground outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Start Date</label>
                  <Input
                    type="date"
                    value={editingItem.start_date || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, start_date: e.target.value })}
                    className="bg-muted/30 border-border text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Due Date</label>
                  <Input
                    type="date"
                    value={editingItem.due_date || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, due_date: e.target.value })}
                    className="bg-muted/30 border-border text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Instructions</label>
                <textarea
                  rows={2}
                  value={editingItem.instructions || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, instructions: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                {isAuthorizedManager && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setItemToDelete(editingItem)
                      setEditingItem(null)
                    }}
                    className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </Button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingItem(null)}
                    className="border-border text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    size="sm"
                    className="bg-primary text-primary-foreground text-xs"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <ConfirmModal
          open={true}
          onOpenChange={(open) => {
            if (!open) setItemToDelete(null)
          }}
          title="Delete Content Task"
          description={`Are you sure you want to permanently delete "${itemToDelete.title}"? This action cannot be undone.`}
          confirmText="Delete Task"
          variant="destructive"
          onConfirm={handleDeleteTask}
        />
      )}
    </div>
  )
}
