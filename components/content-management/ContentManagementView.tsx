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

// Exactly One Main Tab: Task Board
type MainTab = 'board'
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
  
  // Main Tab: Task Board
  const [activeTab, setActiveTab] = useState<MainTab>('board')

  // Secondary View Switcher inside Task Board: Kanban | Gantt | Calendar (Icons Only)
  const [boardView, setBoardView] = useState<SecondaryBoardView>('kanban')

  // Task Board Search Filter
  const [searchQuery, setSearchQuery] = useState('')

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

  // Department & Employee Restrictions: Strictly Content Management department
  const contentEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const dept = (emp.department || '').toLowerCase().trim()
      const desig = (emp.designation || '').toLowerCase().trim()

      // Explicitly reject non-content departments
      if (['development', 'hr', 'management', 'accounting', 'payroll', 'sales'].includes(dept)) {
        return false
      }
      // Reject explicit non-content designations
      if (
        desig.includes('developer') ||
        desig.includes('full-stack') ||
        desig.includes('ui/ux') ||
        desig.includes('hr') ||
        desig.includes('accounting') ||
        desig.includes('finance')
      ) {
        return false
      }

      // Match content department or designations
      return (
        dept === 'content' ||
        desig.includes('content') ||
        desig.includes('marketing') ||
        desig.includes('video') ||
        desig.includes('editor') ||
        desig.includes('seo') ||
        desig.includes('copy') ||
        desig.includes('writer')
      )
    })
  }, [employees])

  // Filter tasks strictly to Content Management department
  const contentTasks = useMemo(() => {
    const contentEmpIdSet = new Set(contentEmployees.map((e) => e.id))
    return items.filter((item) => {
      if (item.assigned_to_id) {
        return contentEmpIdSet.has(item.assigned_to_id)
      }
      if (item.assigned_to_name) {
        const lower = item.assigned_to_name.toLowerCase()
        if (
          lower.includes('suraj') ||
          lower.includes('shital') ||
          lower.includes('prachi') ||
          lower.includes('omkar')
        ) {
          return false
        }
      }
      return true
    })
  }, [items, contentEmployees])

  // Filtered items for Task Board (Only search filter preserved; unwanted filters removed)
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return contentTasks

    const q = searchQuery.toLowerCase()
    return contentTasks.filter((item) => {
      const matchesTitle = item.title.toLowerCase().includes(q)
      const matchesSummary = (item.summary || '').toLowerCase().includes(q)
      const matchesBody = (item.body || '').toLowerCase().includes(q)
      const matchesAssignee = (item.assigned_to_name || '').toLowerCase().includes(q)
      const matchesType = (item.content_type || '').toLowerCase().includes(q)
      return matchesTitle || matchesSummary || matchesBody || matchesAssignee || matchesType
    })
  }, [contentTasks, searchQuery])

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

  // Statistics strictly for Content Management
  const totalTasks = contentTasks.length
  const overdueCount = useMemo(() => {
    return contentTasks.filter(
      (i) =>
        computeDeadlineState(i.due_date, i.status) === 'Overdue' &&
        getTaskColumn(i.status) !== 'Completed'
    ).length
  }, [contentTasks])

  const dueTodayCount = useMemo(() => {
    return contentTasks.filter(
      (i) =>
        i.due_date &&
        dayjs(i.due_date).format('YYYY-MM-DD') === todayStr &&
        getTaskColumn(i.status) !== 'Completed'
    ).length
  }, [contentTasks, todayStr])

  const dueThisWeekCount = useMemo(() => {
    const nextWeek = dayjs().add(7, 'day')
    return contentTasks.filter((i) => {
      if (!i.due_date || getTaskColumn(i.status) === 'Completed') return false
      const d = dayjs(i.due_date)
      return d.isAfter(dayjs().subtract(1, 'day')) && d.isBefore(nextWeek.add(1, 'day'))
    }).length
  }, [contentTasks])

  const unassignedCount = useMemo(() => {
    return contentTasks.filter((i) => !i.assigned_to_id && !i.assigned_to_name).length
  }, [contentTasks])

  // Content Employee-wise workload tracking
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

    // Initialize with content department employees only
    contentEmployees.forEach((emp) => {
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

    // Assign content tasks
    contentTasks.forEach((item) => {
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
  }, [contentTasks, contentEmployees])

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
    const emp = contentEmployees.find((e) => e.id === newEmployeeId)
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

  // Synchronized Date Change Handler (Gantt Drag/Resize & Calendar Drag-and-Drop)
  const handleDateChange = async (itemId: string, newStartDate: string, newDueDate: string) => {
    // Optimistic UI update across all views (Kanban, Gantt, Calendar, Deadlines)
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              start_date: newStartDate,
              due_date: newDueDate,
              updated_at: new Date().toISOString(),
            }
          : i
      )
    )

    if (viewItem && viewItem.id === itemId) {
      setViewItem((prev) => (prev ? { ...prev, start_date: newStartDate, due_date: newDueDate } : null))
    }

    try {
      const res = await updateContentItem(itemId, {
        start_date: newStartDate,
        due_date: newDueDate,
      })

      if (res.success && res.data) {
        setItems((prev) => prev.map((i) => (i.id === itemId ? res.data! : i)))
        if (viewItem && viewItem.id === itemId) {
          setViewItem(res.data)
        }
        toast({
          title: 'Schedule Updated',
          description: `Deliverable scheduled: ${dayjs(newStartDate).format('DD MMM')} – ${dayjs(newDueDate).format('DD MMM YYYY')}.`,
        })
      } else {
        toast({
          title: 'Update Failed',
          description: res.error || 'Failed to update schedule dates.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Could not update task dates.',
        variant: 'destructive',
      })
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
        const emp = contentEmployees.find((e) => e.id === formData.assigned_to_id)
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
        const emp = contentEmployees.find((e) => e.id === editingItem.assigned_to_id)
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

  const hasActiveBoardFilters = Boolean(searchQuery.trim())

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
      {/* MAIN NAVIGATION: Task Board                                */}
      {/* ========================================================= */}
      <div className="p-1.5 bg-card border border-border rounded-2xl flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/60 shadow-xs">
          {/* Main Tab: Task Board */}
          <button
            onClick={() => setActiveTab('board')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap bg-background text-foreground shadow-xs border border-border/80"
          >
            <KanbanSquare className="w-4 h-4 text-primary shrink-0" />
            <span>Task Board</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
              {totalTasks}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MAIN TAB: TASK BOARD                                      */}
      {/* Reusing Project Management Kanban Board Layout & UI       */}
      {/* Includes compact view options: Kanban | Gantt | Calendar  */}
      {/* ========================================================= */}
      {activeTab === 'board' && (
        <div className="space-y-4">
          {/* Compact Task Summary: Exactly 4 Small Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-card border border-border shadow-xs flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-muted-foreground">Overdue Tasks</span>
                <p className={cn("text-xl font-bold font-mono", overdueCount > 0 ? "text-rose-400" : "text-foreground")}>
                  {overdueCount}
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border shadow-xs flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-muted-foreground">Due This Week</span>
                <p className="text-xl font-bold font-mono text-foreground">{dueThisWeekCount}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <CalendarIcon className="w-4 h-4 text-primary" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border shadow-xs flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-muted-foreground">Unassigned Tasks</span>
                <p className="text-xl font-bold font-mono text-foreground">{unassignedCount}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border shadow-xs flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-muted-foreground">Total Tasks</span>
                <p className="text-xl font-bold font-mono text-foreground">{totalTasks}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                <KanbanSquare className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Controls Bar: Search Input on Left, Compact View Switcher on Right (Unwanted filters removed) */}
          <div className="p-3 bg-card border border-border rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
            {/* Search Input */}
            <div className="relative min-w-[240px] flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search tasks, descriptions, assignees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-muted/30 border-border/80 shadow-xs"
              />
            </div>

            {/* Three Compact View Icons Only (No text, compact buttons) */}
            <div
              role="radiogroup"
              aria-label="Task board view options"
              className="flex items-center h-9 p-0.5 rounded-lg border border-border/80 bg-muted/40 shadow-xs shrink-0 self-end md:self-auto"
            >
              <button
                type="button"
                role="radio"
                aria-checked={boardView === 'kanban'}
                aria-label="Kanban View"
                title="Kanban View"
                onClick={() => setBoardView('kanban')}
                className={cn(
                  "h-7.5 w-8 flex items-center justify-center rounded-md transition-colors cursor-pointer",
                  boardView === 'kanban'
                    ? "bg-background text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <Columns3 className="h-4 w-4" />
              </button>

              <div className="w-px h-4 bg-border/60 mx-0.5" aria-hidden="true" />

              <button
                type="button"
                role="radio"
                aria-checked={boardView === 'gantt'}
                aria-label="Gantt Chart View"
                title="Gantt Chart View"
                onClick={() => setBoardView('gantt')}
                className={cn(
                  "h-7.5 w-8 flex items-center justify-center rounded-md transition-colors cursor-pointer",
                  boardView === 'gantt'
                    ? "bg-background text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <Workflow className="h-4 w-4" />
              </button>

              <div className="w-px h-4 bg-border/60 mx-0.5" aria-hidden="true" />

              <button
                type="button"
                role="radio"
                aria-checked={boardView === 'calendar'}
                aria-label="Calendar View"
                title="Calendar View"
                onClick={() => setBoardView('calendar')}
                className={cn(
                  "h-7.5 w-8 flex items-center justify-center rounded-md transition-colors cursor-pointer",
                  boardView === 'calendar'
                    ? "bg-background text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <CalendarIcon className="h-4 w-4" />
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
                employees={contentEmployees}
                onItemClick={(item) => {
                  setViewItem(item)
                  setIsViewModalOpen(true)
                }}
                onStatusChange={(itemId, status) => handleDropTask(itemId, getTaskColumn(status))}
                onDateChange={handleDateChange}
              />
            </div>
          )}

          {/* Secondary View 3: CALENDAR VIEW */}
          {boardView === 'calendar' && (
            <div className="space-y-4">
              <ContentCalendarView
                items={filteredTasks}
                employees={contentEmployees}
                onItemClick={(item) => {
                  setViewItem(item)
                  setIsViewModalOpen(true)
                }}
                onStatusChange={(itemId, status) => handleDropTask(itemId, getTaskColumn(status))}
                onDateChange={handleDateChange}
              />
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
                    {contentEmployees.map((emp) => (
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
                    {contentEmployees.map((emp) => (
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
