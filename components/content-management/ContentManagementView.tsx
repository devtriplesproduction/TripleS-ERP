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
  MinusCircle,
  UserCheck,
  Users,
  Columns3,
  Workflow,
  ExternalLink,
  Filter
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
import isBetween from 'dayjs/plugin/isBetween'
import { cn } from '@/lib/utils'

dayjs.extend(isBetween)

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

// Exactly Two Main Tabs
type MainTab = 'board' | 'assignments_deadlines'
type BoardColumnKey = 'To Do' | 'In Progress' | 'In Review' | 'Completed'
type SecondaryBoardView = 'kanban' | 'gantt' | 'calendar'

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
  
  // 1. Exactly Two Main Tabs: Task Board & Assignments & Deadlines
  const [activeTab, setActiveTab] = useState<MainTab>('board')

  // 2. Secondary View Switcher inside Task Board: Kanban | Gantt | Calendar
  const [boardView, setBoardView] = useState<SecondaryBoardView>('kanban')

  // Task Board Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAssignee, setSelectedAssignee] = useState<string>('ALL')
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL')
  const [selectedDeadline, setSelectedDeadline] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')

  // Assignments & Deadlines Tab Filters
  const [adSearchQuery, setAdSearchQuery] = useState('')
  const [adSelectedEmployee, setAdSelectedEmployee] = useState<string>('ALL')
  const [adSelectedPriority, setAdSelectedPriority] = useState<string>('ALL')
  const [adSelectedStatus, setAdSelectedStatus] = useState<string>('ALL')
  const [adSelectedDeadlineType, setAdSelectedDeadlineType] = useState<string>('ALL')
  const [adViewMode, setAdViewMode] = useState<'table' | 'workload'>('table')

  // HTML5 Drag and Drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<BoardColumnKey | null>(null)

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
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

  // Filtered items for Task Board
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

  // Tasks grouped by column for Kanban
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

  // Filtered tasks for Assignments & Deadlines Tab
  const filteredAssignmentsDeadlines = useMemo(() => {
    const now = dayjs()
    const todayFormatted = now.format('YYYY-MM-DD')
    const nextWeek = now.add(7, 'day')

    return items.filter((item) => {
      // Employee filter
      if (adSelectedEmployee !== 'ALL') {
        if (adSelectedEmployee === 'UNASSIGNED') {
          if (item.assigned_to_id || item.assigned_to_name) return false
        } else if (item.assigned_to_id !== adSelectedEmployee) {
          return false
        }
      }

      // Priority filter
      if (adSelectedPriority !== 'ALL') {
        const itemP = (item.priority || 'MEDIUM').toUpperCase()
        if (itemP !== adSelectedPriority) return false
      }

      // Status filter
      if (adSelectedStatus !== 'ALL') {
        if (getTaskColumn(item.status) !== adSelectedStatus) return false
      }

      // Deadline filter
      if (adSelectedDeadlineType !== 'ALL') {
        const isCompleted = getTaskColumn(item.status) === 'Completed'
        const isOverdue = computeDeadlineState(item.due_date, item.status) === 'Overdue' && !isCompleted

        if (adSelectedDeadlineType === 'OVERDUE') {
          if (!isOverdue) return false
        } else if (adSelectedDeadlineType === 'TODAY') {
          if (!item.due_date || dayjs(item.due_date).format('YYYY-MM-DD') !== todayFormatted) {
            return false
          }
        } else if (adSelectedDeadlineType === 'THIS_WEEK') {
          if (!item.due_date) return false
          const d = dayjs(item.due_date)
          if (!d.isAfter(now.subtract(1, 'day')) || !d.isBefore(nextWeek.add(1, 'day'))) {
            return false
          }
        } else if (adSelectedDeadlineType === 'UPCOMING') {
          if (!item.due_date || !dayjs(item.due_date).isAfter(now)) {
            return false
          }
        }
      }

      // Search Query
      if (adSearchQuery.trim()) {
        const q = adSearchQuery.toLowerCase()
        const matchesTitle = item.title.toLowerCase().includes(q)
        const matchesSummary = (item.summary || '').toLowerCase().includes(q)
        const matchesBody = (item.body || '').toLowerCase().includes(q)
        const matchesAssignee = (item.assigned_to_name || '').toLowerCase().includes(q)
        if (!matchesTitle && !matchesSummary && !matchesBody && !matchesAssignee) return false
      }

      return true
    })
  }, [
    items,
    adSelectedEmployee,
    adSelectedPriority,
    adSelectedStatus,
    adSelectedDeadlineType,
    adSearchQuery,
  ])

  // Statistics
  const totalTasks = items.length
  const overdueCount = useMemo(() => {
    return items.filter(
      (i) =>
        computeDeadlineState(i.due_date, i.status) === 'Overdue' &&
        getTaskColumn(i.status) !== 'Completed'
    ).length
  }, [items])

  const dueTodayCount = useMemo(() => {
    return items.filter(
      (i) =>
        i.due_date &&
        dayjs(i.due_date).format('YYYY-MM-DD') === todayStr &&
        getTaskColumn(i.status) !== 'Completed'
    ).length
  }, [items, todayStr])

  const dueThisWeekCount = useMemo(() => {
    const nextWeek = dayjs().add(7, 'day')
    return items.filter((i) => {
      if (!i.due_date || getTaskColumn(i.status) === 'Completed') return false
      const d = dayjs(i.due_date)
      return d.isAfter(dayjs().subtract(1, 'day')) && d.isBefore(nextWeek.add(1, 'day'))
    }).length
  }, [items])

  const unassignedCount = useMemo(() => {
    return items.filter((i) => !i.assigned_to_id && !i.assigned_to_name).length
  }, [items])

  // Employee-wise assignments mapping for workload tracking
  const employeeWorkloadList = useMemo(() => {
    const map: Record<
      string,
      {
        id: string
        name: string
        role: string
        profile_photo?: string
        tasks: ContentItem[]
        inProgress: number
        completed: number
        overdue: number
      }
    > = {}

    // Initialize with employees
    employees.forEach((emp) => {
      map[emp.id] = {
        id: emp.id,
        name: emp.name || (emp as any).employee_name || 'Staff Member',
        role: emp.designation || 'Content Creator',
        profile_photo: (emp as any).profile_photo,
        tasks: [],
        inProgress: 0,
        completed: 0,
        overdue: 0,
      }
    })

    // Assign tasks
    items.forEach((item) => {
      const key = item.assigned_to_id
      if (key && map[key]) {
        map[key].tasks.push(item)
        const col = getTaskColumn(item.status)
        if (col === 'In Progress' || col === 'In Review') {
          map[key].inProgress += 1
        } else if (col === 'Completed') {
          map[key].completed += 1
        }

        if (computeDeadlineState(item.due_date, item.status) === 'Overdue' && col !== 'Completed') {
          map[key].overdue += 1
        }
      }
    })

    return Object.values(map)
  }, [items, employees])

  // HTML5 Drag and drop handlers
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

  // In-place Reassign Employee Handler
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

  // In-place Extend Deadline Handler
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

  // Submit New Task Form (Synchronized across all views)
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
        // Automatically appears in Task Board, Gantt, Calendar, and Assignments & Deadlines
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
        setIsCreateModalOpen(false)

        toast({
          title: 'Task Created Successfully',
          description: `"${res.data.title}" has been created and synchronized across all views.`,
        })
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

  const hasActiveBoardFilters =
    searchQuery ||
    selectedAssignee !== 'ALL' ||
    selectedPriority !== 'ALL' ||
    selectedDeadline !== 'ALL' ||
    selectedStatus !== 'ALL'

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Page Header with Existing Create Task Button Preserved */}
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span>Content Management</span>
          </div>
        }
        subtitle="Manage deliverables, Kanban workflows, schedules, and team assignments."
        icon={FileText}
        iconClassName="text-primary"
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              size="sm"
              className="h-9 px-4 text-xs font-semibold gap-1.5 shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground transition-all"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Create Task</span>
            </Button>
          </div>
        }
      />

      {/* ========================================================= */}
      {/* MAIN NAVIGATION: EXACTLY TWO TABS AS REQUESTED             */}
      {/* 1. Task Board | 2. Assignments & Deadlines                */}
      {/* ========================================================= */}
      <div className="p-1.5 bg-card border border-border rounded-2xl flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/60 shadow-xs overflow-x-auto">
          {/* Main Tab 1: Task Board */}
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

          {/* Main Tab 2: Assignments & Deadlines */}
          <button
            onClick={() => setActiveTab('assignments_deadlines')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
              activeTab === 'assignments_deadlines'
                ? "bg-background text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <UserCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Assignments & Deadlines</span>
            {overdueCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                {overdueCount} Overdue
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MAIN TAB 1: TASK BOARD                                    */}
      {/* Reusing Project Management Kanban Board Layout & UI       */}
      {/* Includes compact view options: Kanban | Gantt | Calendar  */}
      {/* ========================================================= */}
      {activeTab === 'board' && (
        <div className="space-y-4">
          {/* Controls Bar: Search & Filters on Left/Center, Compact Secondary View Switcher on Right */}
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

            {/* Filter Dropdowns matching Project Management Task Board */}
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

              {hasActiveBoardFilters && (
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

            {/* Small Compact Secondary View Options: Kanban Board | Gantt Chart | Calendar */}
            <div
              role="radiogroup"
              aria-label="Task board view options"
              className="flex items-center h-9 p-0.5 rounded-lg border border-border/80 bg-muted/40 shadow-xs shrink-0 self-end md:self-auto"
            >
              <button
                type="button"
                role="radio"
                aria-checked={boardView === 'kanban'}
                aria-label="Kanban board view"
                title="Kanban Board"
                onClick={() => setBoardView('kanban')}
                className={cn(
                  "h-7.5 px-2.5 flex items-center gap-1.5 rounded-md transition-colors text-xs font-semibold cursor-pointer",
                  boardView === 'kanban'
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <Columns3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Kanban</span>
              </button>

              <div className="w-px h-4 bg-border/60 mx-0.5 shrink-0" aria-hidden="true" />

              <button
                type="button"
                role="radio"
                aria-checked={boardView === 'gantt'}
                aria-label="Gantt chart view"
                title="Gantt Chart"
                onClick={() => setBoardView('gantt')}
                className={cn(
                  "h-7.5 px-2.5 flex items-center gap-1.5 rounded-md transition-colors text-xs font-semibold cursor-pointer",
                  boardView === 'gantt'
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <Workflow className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Gantt</span>
              </button>

              <div className="w-px h-4 bg-border/60 mx-0.5 shrink-0" aria-hidden="true" />

              <button
                type="button"
                role="radio"
                aria-checked={boardView === 'calendar'}
                aria-label="Calendar view"
                title="Calendar View"
                onClick={() => setBoardView('calendar')}
                className={cn(
                  "h-7.5 px-2.5 flex items-center gap-1.5 rounded-md transition-colors text-xs font-semibold cursor-pointer",
                  boardView === 'calendar'
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Calendar</span>
              </button>
            </div>
          </div>

          {/* Secondary View 1: KANBAN LAYOUT (4 Columns: To Do, In Progress, In Review, Completed) */}
          {boardView === 'kanban' && (
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
                              setIsCreateModalOpen(true)
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
                                  onClick={() => {
                                    setFormData((prev) => ({ ...prev, status: 'To Do' }))
                                    setIsCreateModalOpen(true)
                                  }}
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
          )}

          {/* Secondary View 2: GANTT CHART VIEW */}
          {boardView === 'gantt' && (
            <div className="space-y-4">
              <ContentGanttChart
                items={filteredTasks}
                employees={employees}
                onItemClick={(item) => {
                  setViewItem(item)
                  setIsViewModalOpen(true)
                }}
                onStatusChange={(itemId, status) => handleDropTask(itemId, getTaskColumn(status))}
              />
            </div>
          )}

          {/* Secondary View 3: CALENDAR VIEW */}
          {boardView === 'calendar' && (
            <div className="space-y-4">
              <ContentCalendarView
                items={filteredTasks}
                employees={employees}
                onItemClick={(item) => {
                  setViewItem(item)
                  setIsViewModalOpen(true)
                }}
                onStatusChange={(itemId, status) => handleDropTask(itemId, getTaskColumn(status))}
              />
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MAIN TAB 2: ASSIGNMENTS & DEADLINES (COMBINED TAB)         */}
      {/* ========================================================= */}
      {activeTab === 'assignments_deadlines' && (
        <div className="space-y-5">
          {/* Top KPI Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
              <span className="text-xs text-rose-400 font-semibold flex items-center justify-between">
                <span>Overdue Deadlines</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </span>
              <p className={cn("text-2xl font-bold mt-1", overdueCount > 0 ? "text-rose-400" : "text-foreground")}>
                {overdueCount}
              </p>
              <span className="text-[10px] text-muted-foreground">Requires immediate review</span>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
              <span className="text-xs text-amber-400 font-semibold flex items-center justify-between">
                <span>Due Today</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </span>
              <p className="text-2xl font-bold text-amber-400 mt-1">{dueTodayCount}</p>
              <span className="text-[10px] text-muted-foreground">Due by end of day</span>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
              <span className="text-xs text-primary font-semibold flex items-center justify-between">
                <span>Due This Week</span>
                <Calendar className="w-4 h-4 text-primary" />
              </span>
              <p className="text-2xl font-bold text-foreground mt-1">{dueThisWeekCount}</p>
              <span className="text-[10px] text-muted-foreground">Next 7 calendar days</span>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
              <span className="text-xs text-indigo-400 font-semibold flex items-center justify-between">
                <span>Unassigned Tasks</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </span>
              <p className="text-2xl font-bold text-foreground mt-1">{unassignedCount}</p>
              <span className="text-[10px] text-muted-foreground">Awaiting team allocation</span>
            </div>
          </div>

          {/* Sub-navigation & Filters for Assignments & Deadlines */}
          <div className="p-3 bg-card border border-border rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search assignments & deadlines..."
                value={adSearchQuery}
                onChange={(e) => setAdSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-muted/30 border-border/80 shadow-xs"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Employee Filter */}
              <Dropdown
                value={adSelectedEmployee}
                onChange={(val) => setAdSelectedEmployee(val || 'ALL')}
                options={[
                  { value: 'ALL', label: 'All Staff' },
                  { value: 'UNASSIGNED', label: 'Unassigned Only' },
                  ...employees.map((e) => ({
                    value: e.id,
                    label: e.name || (e as any).employee_name || 'Staff',
                  })),
                ]}
                className="w-auto space-y-0 shrink-0"
                buttonClassName="!h-9 !min-h-[36px] !max-h-[36px] !text-xs px-3 rounded-lg border-border/80 bg-card font-normal min-w-[125px] shadow-xs hover:border-foreground/30 transition-colors"
              />

              {/* Priority Filter */}
              <Dropdown
                value={adSelectedPriority}
                onChange={(val) => setAdSelectedPriority(val || 'ALL')}
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

              {/* Deadline Status Filter */}
              <Dropdown
                value={adSelectedDeadlineType}
                onChange={(val) => setAdSelectedDeadlineType(val || 'ALL')}
                options={[
                  { value: 'ALL', label: 'All Deadlines' },
                  { value: 'OVERDUE', label: 'Overdue Only' },
                  { value: 'TODAY', label: 'Due Today' },
                  { value: 'THIS_WEEK', label: 'Due This Week' },
                  { value: 'UPCOMING', label: 'Upcoming' },
                ]}
                className="w-auto space-y-0 shrink-0"
                buttonClassName="!h-9 !min-h-[36px] !max-h-[36px] !text-xs px-3 rounded-lg border-border/80 bg-card font-normal min-w-[125px] shadow-xs hover:border-foreground/30 transition-colors"
              />

              {/* Status Filter */}
              <Dropdown
                value={adSelectedStatus}
                onChange={(val) => setAdSelectedStatus(val || 'ALL')}
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

              {/* View Switcher: Table View vs Team Workload Grid */}
              <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-border/80 h-9 shrink-0 ml-1">
                <button
                  type="button"
                  onClick={() => setAdViewMode('table')}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-md transition-all",
                    adViewMode === 'table' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Deliverables Table
                </button>
                <button
                  type="button"
                  onClick={() => setAdViewMode('workload')}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-md transition-all",
                    adViewMode === 'workload' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Staff Workload
                </button>
              </div>
            </div>
          </div>

          {/* VIEW MODE 1: DELIVERABLES TABLE (ASSIGNMENTS & DEADLINES DETAILS) */}
          {adViewMode === 'table' && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-3.5">Task Deliverable</th>
                      <th className="p-3.5">Assigned Employee</th>
                      <th className="p-3.5">Assignment Date</th>
                      <th className="p-3.5">Start Date</th>
                      <th className="p-3.5">Deadline</th>
                      <th className="p-3.5">Priority</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredAssignmentsDeadlines.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-muted-foreground">
                          No tasks found matching your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredAssignmentsDeadlines.map((task) => {
                        const deadlineState = computeDeadlineState(task.due_date, task.status)
                        const isOverdue =
                          deadlineState === 'Overdue' && getTaskColumn(task.status) !== 'Completed'

                        return (
                          <tr
                            key={task.id}
                            className="hover:bg-muted/20 transition-colors group"
                          >
                            {/* Task Name & Description */}
                            <td className="p-3.5 max-w-[260px]">
                              <div className="space-y-0.5">
                                <span
                                  className="font-bold text-foreground hover:text-primary transition-colors cursor-pointer block truncate"
                                  onClick={() => {
                                    setViewItem(task)
                                    setIsViewModalOpen(true)
                                  }}
                                  title={task.title}
                                >
                                  {task.title}
                                </span>
                                <span className="text-[11px] text-muted-foreground line-clamp-1">
                                  {task.summary || task.body || 'No description'}
                                </span>
                              </div>
                            </td>

                            {/* Assigned Employee with In-place Reassign Dropdown */}
                            <td className="p-3.5">
                              <select
                                value={task.assigned_to_id || ''}
                                onChange={(e) => handleReassignTask(task.id, e.target.value)}
                                className="h-8 px-2 rounded-lg text-xs bg-muted/40 border border-border text-foreground font-medium outline-none cursor-pointer max-w-[140px] truncate"
                                title="Change assigned employee"
                              >
                                <option value="">Unassigned</option>
                                {employees.map((e) => (
                                  <option key={e.id} value={e.id}>
                                    {e.name || (e as any).employee_name}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Assignment / Creation Date */}
                            <td className="p-3.5 text-muted-foreground font-mono text-[11px]">
                              {dayjs(task.created_at).format('DD MMM YYYY')}
                            </td>

                            {/* Start Date */}
                            <td className="p-3.5 text-foreground font-mono text-[11px]">
                              {task.start_date ? dayjs(task.start_date).format('DD MMM YYYY') : '-'}
                            </td>

                            {/* Due Date / Deadline */}
                            <td className="p-3.5">
                              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                {isOverdue ? (
                                  <span className="flex items-center gap-1 text-rose-400 font-bold">
                                    <AlertTriangle className="w-3 h-3 shrink-0" />
                                    <span>{dayjs(task.due_date).format('DD MMM')} (Overdue)</span>
                                  </span>
                                ) : (
                                  <span className="text-foreground">
                                    {task.due_date ? dayjs(task.due_date).format('DD MMM YYYY') : 'Flexible'}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Priority */}
                            <td className="p-3.5">
                              <span
                                className={cn(
                                  "text-[10px] px-2 py-0.5 rounded-[3.5px] border uppercase tracking-wider font-bold inline-block",
                                  getPriorityVariant(task.priority)
                                )}
                              >
                                {task.priority || 'MEDIUM'}
                              </span>
                            </td>

                            {/* Task Status */}
                            <td className="p-3.5">
                              <Badge variant="outline" className="text-[10px] font-mono border-border">
                                {task.status}
                              </Badge>
                            </td>

                            {/* Quick Actions (Extend Deadline / Edit) */}
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleExtendDeadline(task.id, 3)}
                                  className="h-7 text-[10px] px-2 border-border"
                                  title="Extend deadline by 3 days"
                                >
                                  +3d
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleExtendDeadline(task.id, 7)}
                                  className="h-7 text-[10px] px-2 border-border"
                                  title="Extend deadline by 1 week"
                                >
                                  +1w
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingItem(task)}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                  title="Edit Task Details"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW MODE 2: EMPLOYEE-WISE WORKLOAD & ASSIGNMENTS GRID */}
          {adViewMode === 'workload' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employeeWorkloadList.map((member) => {
                const capacityPercent = Math.min(100, Math.round((member.tasks.length / 8) * 100))

                return (
                  <Card key={member.id} className="bg-card border-border shadow-xs flex flex-col justify-between">
                    <CardHeader className="p-4 pb-3 border-b border-border">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 border border-border bg-secondary text-xs">
                            {member.profile_photo && (
                              <AvatarImage
                                src={getProfilePhotoUrl(member.profile_photo) || undefined}
                                alt={member.name}
                              />
                            )}
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-sm font-bold text-foreground">{member.name}</CardTitle>
                            <span className="text-[11px] text-muted-foreground">{member.role}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono border-border">
                          {member.tasks.length} Tasks
                        </Badge>
                      </div>

                      {/* Workload Capacity Bar */}
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
                        Assigned Tasks ({member.tasks.length})
                      </p>

                      {member.tasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-4 text-center">
                          No deliverables assigned currently.
                        </p>
                      ) : (
                        member.tasks.slice(0, 4).map((task) => (
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

                            {/* In-place Reassign Dropdown */}
                            <select
                              value={member.id}
                              onChange={(e) => handleReassignTask(task.id, e.target.value)}
                              className="h-6 text-[10px] bg-muted border border-border rounded px-1 text-muted-foreground hover:text-foreground outline-none cursor-pointer max-w-[100px] truncate"
                              title="Reassign to another staff member"
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
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* CREATE TASK MODAL (SINGLE SOURCE FOR TASK CREATION)       */}
      {/* Triggered via PageHeader Create Task button & To Do '+'   */}
      {/* ========================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-bold text-foreground">Create Content Task</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4 overflow-y-auto flex-1">
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

              {/* Task Instructions */}
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
                  onClick={() => setIsCreateModalOpen(false)}
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
          </div>
        </div>
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
