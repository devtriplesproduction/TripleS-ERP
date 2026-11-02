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
  Trash2,
  Edit,
  Check,
  RefreshCw,
  X,
  FileText,
  UploadCloud,
  CalendarDays,
  Calendar as CalendarIcon,
  Plus,
  MinusCircle
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Dropdown } from '@/components/ui/Dropdown'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getProfilePhotoUrl } from '@/lib/utils/profile-photos'
import {
  ContentItem,
  ContentType,
  ContentStatus,
  ContentPriority,
  CreateContentInput,
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
import { ContentCalendarView } from './ContentCalendarView'
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

// 4 Kanban Columns matching Project Management Board Layout
const COLUMNS: { key: BoardColumnKey; title: string; dotClass: string }[] = [
  { key: 'To Do', title: 'To Do', dotClass: 'bg-muted-foreground/60' },
  { key: 'In Progress', title: 'In Progress', dotClass: 'bg-blue-500' },
  { key: 'In Review', title: 'In Review', dotClass: 'bg-orange-500' },
  { key: 'Completed', title: 'Completed', dotClass: 'bg-green-500' },
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
  
  // Navigation Tabs: Task Board | Gantt Chart | Calendar View | Create Task
  const [activeTab, setActiveTab] = useState<'board' | 'gantt' | 'calendar' | 'create'>('board')

  // Task Board Filters (Matching Project Management Task Board)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAssignee, setSelectedAssignee] = useState<string>('ALL')
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL')
  const [selectedDeadline, setSelectedDeadline] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')

  // HTML5 Drag and Drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<BoardColumnKey | null>(null)

  // Modals state
  const [viewItem, setViewItem] = useState<ContentItem | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null)
  const [itemToDelete, setItemToDelete] = useState<ContentItem | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)

  // Task Creation Form State
  const todayStr = useMemo(() => dayjs().format('YYYY-MM-DD'), [])
  const defaultDueStr = useMemo(() => dayjs().add(7, 'day').format('YYYY-MM-DD'), [])

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to_id: '',
    content_type: 'Blog',
    priority: 'Medium' as ContentPriority,
    status: 'To Do' as ContentStatus,
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

  // Priority Badge style matching Project Management TaskCard
  const getPriorityVariant = (priority?: string) => {
    const p = (priority || '').toUpperCase()
    switch (p) {
      case 'URGENT':
        return 'border-red-500/60 bg-red-500/10 text-red-500 font-bold'
      case 'HIGH':
        return 'border-red-500/50 bg-red-500/10 text-red-400 font-bold'
      case 'MEDIUM':
        return 'border-amber-500/60 bg-amber-500/10 text-amber-500 font-bold'
      case 'LOW':
        return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-bold'
      default:
        return 'border-border/60 bg-secondary/30 text-muted-foreground font-semibold'
    }
  }

  // Filtered items for the Task Board
  const filteredTasks = useMemo(() => {
    const now = dayjs()
    const todayFormatted = now.format('YYYY-MM-DD')
    const nextWeek = now.add(7, 'day')

    return items.filter((item) => {
      // 1. Assignee filter
      if (selectedAssignee !== 'ALL' && item.assigned_to_id !== selectedAssignee) {
        return false
      }

      // 2. Priority filter
      if (selectedPriority !== 'ALL') {
        const itemP = (item.priority || 'MEDIUM').toUpperCase()
        if (itemP !== selectedPriority) return false
      }

      // 3. Status filter
      if (selectedStatus !== 'ALL') {
        const itemCol = getTaskColumn(item.status)
        if (itemCol !== selectedStatus) return false
      }

      // 4. Deadline filter
      if (selectedDeadline !== 'ALL') {
        const isCompleted = getTaskColumn(item.status) === 'Completed'
        const isOverdue = computeDeadlineState(item.due_date, item.status) === 'Overdue' && !isCompleted

        if (selectedDeadline === 'OVERDUE') {
          if (!isOverdue) return false
        } else if (selectedDeadline === 'TODAY') {
          if (!item.due_date || dayjs(item.due_date).format('YYYY-MM-DD') !== todayFormatted) {
            return false
          }
        } else if (selectedDeadline === 'THIS_WEEK') {
          if (!item.due_date) return false
          const d = dayjs(item.due_date)
          if (!d.isAfter(now.subtract(1, 'day')) || !d.isBefore(nextWeek.add(1, 'day'))) {
            return false
          }
        } else if (selectedDeadline === 'UPCOMING') {
          if (!item.due_date || !dayjs(item.due_date).isAfter(now)) {
            return false
          }
        }
      }

      // 5. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = item.title.toLowerCase().includes(q)
        const matchesSummary = (item.summary || '').toLowerCase().includes(q)
        const matchesBody = (item.body || '').toLowerCase().includes(q)
        const matchesAssignee = (item.assigned_to_name || '').toLowerCase().includes(q)
        const matchesType = (item.content_type || '').toLowerCase().includes(q)
        if (!matchesTitle && !matchesSummary && !matchesBody && !matchesAssignee && !matchesType) {
          return false
        }
      }

      return true
    })
  }, [items, selectedAssignee, selectedPriority, selectedStatus, selectedDeadline, searchQuery])

  // Tasks grouped by column
  const columnTasks = useMemo(() => {
    const map: Record<BoardColumnKey, ContentItem[]> = {
      'To Do': [],
      'In Progress': [],
      'In Review': [],
      'Completed': [],
    }
    filteredTasks.forEach((item) => {
      const col = getTaskColumn(item.status)
      map[col].push(item)
    })
    return map
  }, [filteredTasks])

  // Statistics
  const totalTasks = items.length

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedTaskId(taskId)
  }

  const handleDragEnd = () => {
    setDraggedTaskId(null)
    setDragOverColumn(null)
  }

  // Update Task Status via Drop
  const handleDropTask = async (taskId: string, targetCol: BoardColumnKey) => {
    const currentTask = items.find((t) => t.id === taskId)
    if (!currentTask || getTaskColumn(currentTask.status) === targetCol) return

    setUpdatingStatusId(taskId)
    const newStatus = targetCol as ContentStatus
    const newProgress =
      targetCol === 'Completed' ? 100 : targetCol === 'In Review' ? 75 : targetCol === 'In Progress' ? 40 : 0

    // Optimistic UI update across all views
    setItems((prev) =>
      prev.map((i) =>
        i.id === taskId
          ? {
              ...i,
              status: newStatus,
              progress: newProgress,
              updated_at: new Date().toISOString(),
            }
          : i
      )
    )

    if (viewItem && viewItem.id === taskId) {
      setViewItem((prev) => (prev ? { ...prev, status: newStatus, progress: newProgress } : null))
    }

    try {
      const res = await updateContentStatus(taskId, newStatus)
      if (res.success && res.data) {
        setItems((prev) => prev.map((i) => (i.id === taskId ? res.data! : i)))
        if (viewItem && viewItem.id === taskId) {
          setViewItem(res.data)
        }
        toast({
          title: 'Status Updated',
          description: `Task moved to ${targetCol}.`,
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

  // Submit New Task Form (Connected to Task Board)
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

      const initialProgress =
        formData.status === 'Completed' ? 100 : formData.status === 'In Review' ? 75 : formData.status === 'In Progress' ? 40 : 0

      const createInput: CreateContentInput = {
        title: formData.title.trim(),
        summary: formData.description.trim(),
        body: formData.instructions.trim() || formData.description.trim(),
        content_type: formData.content_type,
        priority: formData.priority,
        status: formData.status,
        start_date: formData.start_date || todayStr,
        due_date: formData.due_date || null,
        instructions: formData.instructions.trim() || null,
        assigned_to_id: formData.assigned_to_id || null,
        assigned_to_name: selectedEmpName || null,
        reference_attachment: referenceAttachmentName || null,
        attachments: uploadedAttachments,
        progress: initialProgress,
      }

      const res = await createContentItem(createInput)

      if (res.success && res.data) {
        // Automatically display in Task Board and synchronize
        setItems((prev) => [res.data!, ...prev])

        setFormData({
          title: '',
          description: '',
          assigned_to_id: '',
          content_type: 'Blog',
          priority: 'Medium',
          status: 'To Do',
          start_date: todayStr,
          due_date: defaultDueStr,
          instructions: '',
          reference_attachment: '',
        })
        setAttachmentFile(null)

        toast({
          title: 'Task Created Successfully',
          description: `"${res.data.title}" has been placed in ${getTaskColumn(res.data.status)}.`,
        })

        // Seamlessly switch back to the Task Board view
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
        status: editingItem.status,
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
        toast({ title: 'Task Updated', description: 'Task assignment and details updated successfully.' })
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

  const hasActiveFilters =
    searchQuery ||
    selectedAssignee !== 'ALL' ||
    selectedPriority !== 'ALL' ||
    selectedDeadline !== 'ALL' ||
    selectedStatus !== 'ALL'

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Page Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span>Content Management</span>
          </div>
        }
        subtitle="Organize content deliverables, employee assignments, deadlines, and visual workflows."
        icon={FileText}
        iconClassName="text-primary"
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setActiveTab('create')}
              size="sm"
              className={cn(
                "h-9 px-4 text-xs font-semibold gap-1.5 shadow-xs transition-all",
                activeTab === 'create'
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Create Task</span>
            </Button>
          </div>
        }
      />

      {/* Main Internal Navigation Bar: Task Board | Gantt Chart | Calendar View | Create Task */}
      <div className="p-1.5 bg-card border border-border rounded-2xl flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/60 shadow-xs overflow-x-auto">
          {/* Tab 1: Task Board (Kanban) */}
          <button
            onClick={() => setActiveTab('board')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
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
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
              activeTab === 'gantt'
                ? "bg-background text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarDays className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Gantt Chart</span>
          </button>

          {/* Tab 3: Calendar View */}
          <button
            onClick={() => setActiveTab('calendar')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
              activeTab === 'calendar'
                ? "bg-background text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarIcon className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Calendar View</span>
          </button>

          {/* Tab 4: Create Task */}
          <button
            onClick={() => setActiveTab('create')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
              activeTab === 'create'
                ? "bg-background text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <PlusCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: TASK BOARD (REUSING PROJECT MANAGEMENT DESIGN)     */}
      {/* ========================================================= */}
      {activeTab === 'board' && (
        <div className="space-y-4">
          {/* Filter Bar matching Project Management Task Board */}
          <div className="p-3 bg-card border border-border rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search tasks, descriptions, assignees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-muted/30 border-border/80 shadow-xs"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* All Assignees Filter */}
              <Dropdown
                value={selectedAssignee}
                onChange={(val) => setSelectedAssignee(val || 'ALL')}
                options={[
                  { value: 'ALL', label: 'All Assignees' },
                  ...employees.map((e) => ({
                    value: e.id,
                    label: e.name || (e as any).employee_name || 'Staff Member',
                  })),
                ]}
                className="w-auto space-y-0 shrink-0"
                buttonClassName="!h-9 !min-h-[36px] !max-h-[36px] !text-xs px-3 rounded-lg border-border/80 bg-card font-normal min-w-[125px] shadow-xs hover:border-foreground/30 transition-colors"
              />

              {/* All Priority Filter */}
              <Dropdown
                value={selectedPriority}
                onChange={(val) => setSelectedPriority(val || 'ALL')}
                options={[
                  { value: 'ALL', label: 'All Priority' },
                  { value: 'LOW', label: 'Low' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HIGH', label: 'High' },
                  { value: 'URGENT', label: 'Urgent' },
                ]}
                className="w-auto space-y-0 shrink-0"
                buttonClassName="!h-9 !min-h-[36px] !max-h-[36px] !text-xs px-3 rounded-lg border-border/80 bg-card font-normal min-w-[110px] shadow-xs hover:border-foreground/30 transition-colors"
              />

              {/* All Deadlines Filter */}
              <Dropdown
                value={selectedDeadline}
                onChange={(val) => setSelectedDeadline(val || 'ALL')}
                options={[
                  { value: 'ALL', label: 'All Deadlines' },
                  { value: 'OVERDUE', label: 'Overdue' },
                  { value: 'TODAY', label: 'Due Today' },
                  { value: 'THIS_WEEK', label: 'Due This Week' },
                  { value: 'UPCOMING', label: 'Upcoming' },
                ]}
                className="w-auto space-y-0 shrink-0"
                buttonClassName="!h-9 !min-h-[36px] !max-h-[36px] !text-xs px-3 rounded-lg border-border/80 bg-card font-normal min-w-[120px] shadow-xs hover:border-foreground/30 transition-colors"
              />

              {/* All Status Filter */}
              <Dropdown
                value={selectedStatus}
                onChange={(val) => setSelectedStatus(val || 'ALL')}
                options={[
                  { value: 'ALL', label: 'All Status' },
                  { value: 'To Do', label: 'To Do' },
                  { value: 'In Progress', label: 'In Progress' },
                  { value: 'In Review', label: 'In Review' },
                  { value: 'Completed', label: 'Completed' },
                ]}
                className="w-auto space-y-0 shrink-0"
                buttonClassName="!h-9 !min-h-[36px] !max-h-[36px] !text-xs px-3 rounded-lg border-border/80 bg-card font-normal min-w-[110px] shadow-xs hover:border-foreground/30 transition-colors"
              />

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedAssignee('ALL')
                    setSelectedPriority('ALL')
                    setSelectedDeadline('ALL')
                    setSelectedStatus('ALL')
                  }}
                  className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Kanban Board Layout matching Project Management Task Board */}
          <div className="w-full overflow-x-auto pb-6 pt-2 custom-scrollbar">
            <div className="flex items-start gap-4 min-w-max">
              {COLUMNS.map((col) => {
                const tasks = columnTasks[col.key] || []
                const isOver = dragOverColumn === col.key

                return (
                  <div
                    key={col.key}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      if (dragOverColumn !== col.key) {
                        setDragOverColumn(col.key)
                      }
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget === e.target) {
                        setDragOverColumn(null)
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId
                      setDragOverColumn(null)
                      setDraggedTaskId(null)
                      if (taskId) {
                        handleDropTask(taskId, col.key)
                      }
                    }}
                    className={cn(
                      "flex flex-col min-w-[280px] w-[300px] max-w-[320px] shrink-0 bg-secondary/40 border rounded-lg p-3 transition-all duration-200",
                      isOver
                        ? "border-foreground/50 bg-accent/40 shadow-sm"
                        : "border-border/60 hover:border-border"
                    )}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between h-12 pb-3 mb-3 border-b border-border/40">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("h-2 w-2 rounded-full", col.dotClass)} />
                        <h3 className="font-semibold text-[13px] uppercase tracking-wide text-foreground font-sans">
                          {col.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className="text-[11px] px-1.5 py-0 border-border/60 bg-background/50 font-mono text-muted-foreground"
                        >
                          {tasks.length}
                        </Badge>
                      </div>

                      {col.key === 'To Do' && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, status: 'To Do' }))
                            setActiveTab('create')
                          }}
                          className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded p-1 transition-colors"
                          title="Add Task to To Do"
                          aria-label="Add Task to To Do"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Task List */}
                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-290px)] pr-0.5 custom-scrollbar">
                      {tasks.length === 0 ? (
                        <div className="p-4 text-center border border-dashed border-border/40 rounded-md flex flex-col items-center justify-center gap-2 bg-background/20 h-28">
                          <div className="h-6 w-6 rounded-full bg-secondary/50 flex items-center justify-center">
                            <MinusCircle className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[13px] font-medium text-muted-foreground">No tasks here</p>
                            {col.key === 'To Do' && (
                              <button
                                onClick={() => setActiveTab('create')}
                                className="text-xs text-primary hover:underline font-semibold"
                              >
                                + Create a task
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        tasks.map((task) => {
                          const deadlineState = computeDeadlineState(task.due_date, task.status)
                          const isOverdue =
                            deadlineState === 'Overdue' && col.key !== 'Completed'
                          const isBeingDragged = draggedTaskId === task.id

                          const assigneeName = task.assigned_to_name || 'Unassigned'
                          const initials = (
                            assigneeName
                              .split(' ')
                              .map((w) => w[0])
                              .filter(Boolean)
                              .slice(0, 2)
                              .join('') || 'U'
                          ).toUpperCase()

                          const assignedEmployee = employees.find(
                            (e) => e.id === task.assigned_to_id
                          )
                          const profilePhoto = (assignedEmployee as any)?.profile_photo

                          return (
                            <div
                              key={task.id}
                              draggable={true}
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              onDragEnd={handleDragEnd}
                              onClick={() => {
                                setViewItem(task)
                                setIsViewModalOpen(true)
                              }}
                              className={cn(
                                "border border-border/70 bg-card rounded-xl px-3.5 py-2.5 sm:py-3 shadow-xs hover:shadow-sm hover:border-border hover:bg-accent/5 transition-all duration-200 cursor-pointer group flex flex-col justify-between gap-2.5 select-none",
                                isBeingDragged && "opacity-40 border-dashed border-primary scale-[0.98]",
                                isOverdue && "border-rose-500/40"
                              )}
                            >
                              {/* Header Row: Title on Left, Priority Badge on Right */}
                              <div className="flex items-center justify-between gap-2.5 min-w-0 w-full">
                                <h4
                                  className="font-bold text-[14px] sm:text-[15px] text-foreground tracking-tight truncate min-w-0 flex-1 leading-snug group-hover:text-primary transition-colors"
                                  title={task.title}
                                >
                                  {task.title}
                                </h4>

                                {/* Priority Badge with square-corner style matching Project Management TaskCard */}
                                <span
                                  className={cn(
                                    "text-[10px] sm:text-[11px] px-2 py-0.5 rounded-[3.5px] border shrink-0 uppercase tracking-wider font-bold leading-none inline-flex items-center justify-center",
                                    getPriorityVariant(task.priority)
                                  )}
                                >
                                  {task.priority || 'MEDIUM'}
                                </span>
                              </div>

                              {/* Task Description Snippet */}
                              {(task.summary || task.body) && (
                                <p className="text-[12px] text-muted-foreground line-clamp-2 leading-relaxed">
                                  {task.summary || task.body}
                                </p>
                              )}

                              {/* Bottom Row: Metadata & Assignees */}
                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 min-h-[24px]">
                                {/* Dates: Start Date & Deadline */}
                                <div className="flex items-center gap-2.5 text-xs font-medium shrink-0">
                                  {/* Start Date */}
                                  {task.start_date && (
                                    <span className="flex items-center gap-1 text-muted-foreground/80 text-[11px]">
                                      <Calendar className="h-3 w-3 shrink-0 opacity-70" />
                                      <span>{dayjs(task.start_date).format('MMM DD')}</span>
                                    </span>
                                  )}

                                  {/* Deadline */}
                                  {task.due_date && (
                                    <span
                                      className={cn(
                                        "flex items-center gap-1 text-[11px]",
                                        isOverdue
                                          ? "text-red-500 font-bold"
                                          : "text-muted-foreground"
                                      )}
                                    >
                                      {isOverdue ? (
                                        <span className="h-2 w-2 rounded-full bg-red-500 shrink-0 inline-block" />
                                      ) : (
                                        <Clock className="h-3 w-3 shrink-0 opacity-70" />
                                      )}
                                      <span>{dayjs(task.due_date).format('MMM DD')}</span>
                                    </span>
                                  )}
                                </div>

                                {/* Assignee Avatar Stack */}
                                <div
                                  className="flex items-center gap-1.5 shrink-0 ml-auto"
                                  title={assigneeName}
                                >
                                  <Avatar className="h-6 w-6 border-2 border-card bg-secondary text-[9px]">
                                    {profilePhoto && (
                                      <AvatarImage
                                        src={getProfilePhotoUrl(profilePhoto) || undefined}
                                        alt={assigneeName}
                                      />
                                    )}
                                    <AvatarFallback>{initials}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-[11px] font-medium text-foreground max-w-[85px] truncate hidden sm:inline">
                                    {assigneeName.split(' ')[0]}
                                  </span>
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
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: GANTT CHART (TIMELINE & DEPENDENCIES)              */}
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
            onStatusChange={(itemId, status) => handleDropTask(itemId, getTaskColumn(status))}
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: CALENDAR VIEW (DAILY, WEEKLY, MONTHLY)             */}
      {/* ========================================================= */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <ContentCalendarView
            items={items}
            employees={employees}
            onItemClick={(item) => {
              setViewItem(item)
              setIsViewModalOpen(true)
            }}
            onStatusChange={(itemId, status) => handleDropTask(itemId, getTaskColumn(status))}
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: CREATE TASK (DEDICATED FULL FORM TAB)              */}
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
                  Define a new deliverable, assign staff, schedule deadlines, and place in workflow.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('board')}
                className="text-xs"
              >
                Back to Task Board
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleCreateTask} className="space-y-5">
              {/* Task Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Task Title <span className="text-rose-500">*</span></span>
                  <span className="text-[11px] text-muted-foreground font-normal">Actionable deliverable name</span>
                </label>
                <Input
                  required
                  placeholder="e.g., Weekly Product Announcement Newsletter"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-muted/30 border-border text-sm h-10 font-medium"
                />
              </div>

              {/* Task Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Task Description <span className="text-rose-500">*</span></span>
                  <span className="text-[11px] text-muted-foreground font-normal">Summary of the deliverable</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Outline the main purpose, goals, target audience, and key highlights of this task..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-y"
                />
              </div>

              {/* Assignment & Content Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span>Assign Employee</span>
                  </label>
                  <select
                    value={formData.assigned_to_id}
                    onChange={(e) => setFormData({ ...formData, assigned_to_id: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-muted/30 border border-border text-xs text-foreground font-medium outline-none cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name || (emp as any).employee_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Content Type</label>
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

              {/* Priority, Task Status, Start Date & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as ContentPriority })}
                    className="w-full h-10 px-3 rounded-xl bg-muted/30 border border-border text-xs text-foreground font-medium outline-none cursor-pointer"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Task Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ContentStatus })}
                    className="w-full h-10 px-3 rounded-xl bg-muted/30 border border-border text-xs text-foreground font-medium outline-none cursor-pointer"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="In Review">In Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Start Date</label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="bg-muted/30 border-border text-xs h-10 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Due Date / Deadline</label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="bg-muted/30 border-border text-xs h-10 font-mono"
                  />
                </div>
              </div>

              {/* Additional Task Details / Instructions */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Task Instructions & Guidelines (Optional)</span>
                  <span className="text-[11px] text-muted-foreground font-normal">Tone, word count, or required checklist</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide detailed instructions, references, or specific rules for this task..."
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-y"
                />
              </div>

              {/* Reference Attachment (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-primary" />
                  <span>Reference Attachment (Optional)</span>
                </label>
                <div className="p-3 rounded-xl border border-dashed border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="space-y-0.5 text-center sm:text-left">
                    <p className="text-xs font-semibold text-foreground">
                      {attachmentFile ? attachmentFile.name : formData.reference_attachment || 'Upload document or brief'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
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
                        className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
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

      {/* ========================================================= */}
      {/* EDIT TASK MODAL (EDIT DETAILS, ASSIGNMENT & DEADLINE)     */}
      {/* ========================================================= */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Edit Task Details</h3>
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
                  rows={2}
                  value={editingItem.summary || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, summary: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Assign Employee</label>
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
                  <label className="text-xs font-semibold text-foreground">Due Date / Deadline</label>
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

      {/* Task View Details Modal */}
      <ViewContentModal
        item={viewItem}
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false)
          setViewItem(null)
        }}
        onEdit={(item) => setEditingItem(item)}
        onStatusChange={(itemId, status) => handleDropTask(itemId, getTaskColumn(status))}
        user={user}
      />

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
