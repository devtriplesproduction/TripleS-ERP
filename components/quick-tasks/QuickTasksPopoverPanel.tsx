'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  ExternalLink,
  X,
  Plus,
  CheckCircle2,
  Filter,
  CheckSquare,
  Clock,
  Loader2,
  User,
  Users,
  Check,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import type {
  QuickTask,
  QuickTaskStatus,
} from '@/types/quick-tasks'
import {
  getQuickTasksAction,
  createQuickTasksAction,
  markQuickTaskCompleteAction,
  cancelQuickTaskAction,
  deleteQuickTaskAction,
  markQuickTasksSeenAction,
} from '@/lib/actions/quick-tasks'
import { AssignableEmployee, getAssignableEmployees } from '@/lib/actions/team'
import { TaskAssigneeSelector } from '@/components/tasks/TaskAssigneeSelector'
import { QuickTaskCard } from './QuickTaskCard'
import { QuickTaskEditModal } from './QuickTaskEditModal'
import { toast } from 'sonner'
import type { AuthUser } from '@/lib/auth'

interface QuickTasksPopoverPanelProps {
  onClose: () => void
  user: AuthUser
}

export function QuickTasksPopoverPanel({
  onClose,
  user,
}: QuickTasksPopoverPanelProps) {
  const router = useRouter()
  const isAdmin = user.role === 'Admin'

  const [tasks, setTasks] = useState<QuickTask[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filtering & Search
  const [activeTab, setActiveTab] = useState<'Pending' | 'Completed' | 'All'>('Pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('ALL')

  // Assignable employees (Admin only)
  const [assignableEmployees, setAssignableEmployees] = useState<AssignableEmployee[]>([])

  // Inline Creation State
  const [isCreatingInline, setIsCreatingInline] = useState(false)
  const [inlineDescription, setInlineDescription] = useState('')
  const [inlineAssignees, setInlineAssignees] = useState<string[]>([])
  const [isSubmittingInline, setIsSubmittingInline] = useState(false)

  // Edit Modal State
  const [editingTask, setEditingTask] = useState<QuickTask | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const inlineDescriptionRef = useRef<HTMLTextAreaElement>(null)

  // Load tasks
  const loadTasks = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getQuickTasksAction({
        status: 'All', // Fetch all so tabs can switch instantly without network delay
        assigneeId: selectedAssigneeId !== 'ALL' ? selectedAssigneeId : undefined,
      })
      if (res.success && res.data) {
        setTasks(res.data)
      } else {
        toast.error(res.error || 'Failed to load quick tasks')
      }
    } catch (err) {
      console.error('[QuickTasksPopoverPanel] Error loading tasks:', err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedAssigneeId])

  useEffect(() => {
    loadTasks()
    markQuickTasksSeenAction().catch(() => {})
  }, [loadTasks])

  // Load assignable employees for Admin
  useEffect(() => {
    if (isAdmin) {
      getAssignableEmployees().then((res) => {
        if (res.success && res.data) {
          setAssignableEmployees(res.data)
        }
      })
    }
  }, [isAdmin])

  // Listen to realtime & cross-tab events
  useEffect(() => {
    const handleUpdate = () => {
      loadTasks()
    }
    const handleEmployeeChange = () => {
      if (isAdmin) {
        getAssignableEmployees().then((res) => {
          if (res.success && res.data) {
            setAssignableEmployees(res.data)
          }
        })
      }
    }
    window.addEventListener('erp-quick-tasks-update', handleUpdate)
    window.addEventListener('employee-status-changed', handleEmployeeChange)

    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('erp-notifications-channel')
      bc.onmessage = (msg) => {
        if (msg.data?.type === 'QUICK_TASK_CREATED' || msg.data?.type === 'QUICK_TASK_UPDATED') {
          loadTasks()
        }
      }
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener('erp-quick-tasks-update', handleUpdate)
      window.removeEventListener('employee-status-changed', handleEmployeeChange)
      if (bc) bc.close()
    }
  }, [loadTasks])

  // Focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchOpen])

  // Focus inline description when inline creator opens
  useEffect(() => {
    if (isCreatingInline && inlineDescriptionRef.current) {
      inlineDescriptionRef.current.focus()
    }
  }, [isCreatingInline])

  // Toggle Complete handler
  const handleToggleComplete = async (task: QuickTask) => {
    const nextCompleted = task.status !== 'Completed'
    const nowIso = new Date().toISOString()

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: nextCompleted ? 'Completed' : 'Pending',
              completed_at: nextCompleted ? nowIso : null,
              completed_by: nextCompleted ? user.id : null,
              completed_by_name: nextCompleted ? (user.employee_name || 'You') : undefined,
            }
          : t
      )
    )

    try {
      const res = await markQuickTaskCompleteAction(task.id, nextCompleted)
      if (res.success && res.data) {
        toast.success(nextCompleted ? 'Task marked complete' : 'Task marked pending')
        window.dispatchEvent(new CustomEvent('erp-quick-tasks-update'))
        window.dispatchEvent(new CustomEvent('erp-notification-update'))
        try {
          const bc = new BroadcastChannel('erp-notifications-channel')
          bc.postMessage({ type: 'QUICK_TASK_UPDATED' })
          bc.close()
        } catch {}
      } else {
        toast.error(res.error || 'Failed to update task')
        loadTasks()
      }
    } catch {
      toast.error('Network error updating task')
      loadTasks()
    }
  }

  // Admin Cancel Task
  const handleCancelTask = async (task: QuickTask) => {
    try {
      const res = await cancelQuickTaskAction(task.id)
      if (res.success && res.data) {
        toast.success('Task cancelled')
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: 'Cancelled' } : t))
        )
        window.dispatchEvent(new CustomEvent('erp-quick-tasks-update'))
        window.dispatchEvent(new CustomEvent('erp-notification-update'))
      } else {
        toast.error(res.error || 'Failed to cancel task')
      }
    } catch {
      toast.error('Error cancelling task')
    }
  }

  // Delete Task (Owners can delete personal tasks; Admin can delete assigned tasks)
  const handleDeleteTask = async (task: QuickTask) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id))
    try {
      const res = await deleteQuickTaskAction(task.id)
      if (res.success) {
        toast.success('Task deleted')
        window.dispatchEvent(new CustomEvent('erp-quick-tasks-update'))
        window.dispatchEvent(new CustomEvent('erp-notification-update'))
      } else {
        toast.error(res.error || 'Failed to delete task')
        loadTasks()
      }
    } catch {
      toast.error('Error deleting task')
      loadTasks()
    }
  }

  // Handle Save Inline Quick Task
  const handleSaveInlineTask = async () => {
    const trimmed = inlineDescription.trim()
    if (!trimmed) {
      toast.error('Task description is required')
      return
    }

    setIsSubmittingInline(true)
    try {
      const res = await createQuickTasksAction({
        description: trimmed,
        assigned_to: isAdmin ? inlineAssignees : [],
      })

      if (res.success && res.data) {
        const isPersonal = inlineAssignees.length === 0 || (inlineAssignees.length === 1 && inlineAssignees[0] === user.id)
        toast.success(
          isPersonal
            ? 'Personal task created'
            : inlineAssignees.length > 1
            ? `Assigned task to ${inlineAssignees.length} members`
            : 'Task assigned successfully'
        )

        // Optimistically add to top of tasks
        setTasks((prev) => [...res.data!, ...prev])
        setInlineDescription('')
        setInlineAssignees([])
        setIsCreatingInline(false)

        window.dispatchEvent(new CustomEvent('erp-quick-tasks-update'))
        window.dispatchEvent(new CustomEvent('erp-notification-update'))
        try {
          const bc = new BroadcastChannel('erp-notifications-channel')
          bc.postMessage({ type: 'QUICK_TASK_CREATED' })
          bc.close()
        } catch {}

        loadTasks()
      } else {
        toast.error(res.error || 'Failed to create task')
      }
    } catch {
      toast.error('Error creating task')
    } finally {
      setIsSubmittingInline(false)
    }
  }

  // Handle Cancel Inline Quick Task
  const handleCancelInline = () => {
    setInlineDescription('')
    setInlineAssignees([])
    setIsCreatingInline(false)
  }

  // Open Full Page
  const handleOpenFullPage = () => {
    onClose()
    router.push('/quick-tasks')
  }

  // Counts for tabs
  const pendingCount = useMemo(
    () => tasks.filter((t) => t.status === 'Pending').length,
    [tasks]
  )
  const completedCount = useMemo(
    () => tasks.filter((t) => t.status === 'Completed').length,
    [tasks]
  )

  // Filtered tasks
  const displayedTasks = useMemo(() => {
    let result = tasks

    // Tab filter
    if (activeTab === 'Pending') {
      result = result.filter((t) => t.status === 'Pending')
    } else if (activeTab === 'Completed') {
      result = result.filter((t) => t.status === 'Completed')
    }

    // Assignee filter (Admin)
    if (isAdmin) {
      if (selectedAssigneeId === 'PERSONAL') {
        result = result.filter((t) => Boolean(t.is_personal || t.assigned_by === t.assigned_to) && t.assigned_to === user.id)
      } else if (selectedAssigneeId !== 'ALL') {
        result = result.filter((t) => t.assigned_to === selectedAssigneeId && !t.is_personal)
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.assigned_to_name && t.assigned_to_name.toLowerCase().includes(q)) ||
          (t.assigned_by_name && t.assigned_by_name.toLowerCase().includes(q))
      )
    }

    return result
  }, [tasks, activeTab, selectedAssigneeId, isAdmin, searchQuery, user.id])

  return (
    <>
      <div className="flex flex-col h-[540px] max-h-[85vh] w-full select-none bg-card text-card-foreground">
        {/* Top Header matching Notes panel aesthetics */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase leading-none">
              CASUAL TASKS
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-base font-semibold text-foreground tracking-tight">
                Quick Tasks
              </span>
              {pendingCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-foreground text-background">
                  {pendingCount}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Search Toggle */}
            <button
              type="button"
              onClick={() => setIsSearchOpen((prev) => !prev)}
              title="Search tasks"
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isSearchOpen
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Admin Assignee Filter */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={`p-2 rounded-lg transition-colors cursor-pointer outline-none ${
                    selectedAssigneeId !== 'ALL'
                      ? 'bg-foreground text-background font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                  }`}
                  title="Filter by Assignee"
                >
                  <Filter className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 text-xs max-h-64 overflow-y-auto z-[120]">
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Filter by Assignee
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setSelectedAssigneeId('ALL')}
                    className={`cursor-pointer ${selectedAssigneeId === 'ALL' ? 'font-semibold bg-muted' : ''}`}
                  >
                    <span>All Tasks</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSelectedAssigneeId('PERSONAL')}
                    className={`cursor-pointer ${selectedAssigneeId === 'PERSONAL' ? 'font-semibold bg-muted' : ''}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <User className="w-3 h-3" />
                      <span>My Personal Tasks</span>
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Assigned to Employee
                  </DropdownMenuLabel>
                  {assignableEmployees.map((emp) => (
                    <DropdownMenuItem
                      key={emp.id}
                      onClick={() => setSelectedAssigneeId(emp.id)}
                      className={`cursor-pointer justify-between ${
                        selectedAssigneeId === emp.id ? 'font-semibold bg-muted' : ''
                      }`}
                    >
                      <span className="truncate">{emp.name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">
                        {emp.department || emp.designation || 'Member'}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Open Full Page View */}
            <button
              type="button"
              onClick={handleOpenFullPage}
              title="Open full page view"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            {/* Close Panel */}
            <button
              type="button"
              onClick={onClose}
              title="Close"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expandable Search Input Bar */}
        {isSearchOpen && (
          <div className="p-2.5 px-3 border-b border-border/40 bg-muted/20 animate-in fade-in-0 duration-150">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-3 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks by description or person..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-background border border-border/60 rounded-lg outline-none focus:border-foreground/40 transition-colors text-foreground placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Action Bar: Filter Tabs & "+ New Task" inline toggle */}
        <div className="px-3 py-2 border-b border-border/40 bg-muted/10 flex items-center justify-between gap-2 shrink-0">
          {/* Tabs for Everyone: Pending, Completed, All */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('Pending')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeTab === 'Pending'
                  ? 'bg-foreground text-background font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('Completed')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeTab === 'Completed'
                  ? 'bg-foreground text-background font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Completed ({completedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('All')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeTab === 'All'
                  ? 'bg-foreground text-background font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              All ({tasks.length})
            </button>
          </div>

          {/* "+ New Task" Inline Toggle Button for ALL users */}
          <Button
            type="button"
            size="sm"
            onClick={() => setIsCreatingInline((prev) => !prev)}
            className={`h-7 px-2.5 text-xs rounded-lg font-medium cursor-pointer gap-1 shrink-0 transition-all ${
              isCreatingInline
                ? 'bg-muted text-foreground hover:bg-muted/80'
                : 'bg-foreground text-background hover:bg-foreground/90 shadow-xs'
            }`}
          >
            <Plus className={`w-3.5 h-3.5 transition-transform duration-200 ${isCreatingInline ? 'rotate-45' : ''}`} />
            <span>{isCreatingInline ? 'Cancel' : 'New Task'}</span>
          </Button>
        </div>

        {/* Active Filter indicator if Admin filtered by specific assignee */}
        {isAdmin && selectedAssigneeId !== 'ALL' && (
          <div className="px-3 py-1.5 bg-muted/30 border-b border-border/30 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              Filtered to:{' '}
              <strong className="text-foreground">
                {selectedAssigneeId === 'PERSONAL'
                  ? 'My Personal Tasks'
                  : assignableEmployees.find((u) => u.id === selectedAssigneeId)?.name || 'Assignee'}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => setSelectedAssigneeId('ALL')}
              className="text-foreground hover:underline cursor-pointer"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Scrollable Container (Inline Creator + Task List) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {/* Inline Creation Card (Inside the Popover window) */}
          {isCreatingInline && (
            <div className="p-3 bg-card border border-border/90 rounded-xl shadow-md space-y-2.5 animate-in fade-in-50 zoom-in-98 duration-150 mb-2">
              {/* Header */}
              <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <span className="p-0.5 rounded bg-foreground text-background">
                    <Plus className="w-3 h-3" />
                  </span>
                  <span>{isAdmin && inlineAssignees.length > 0 ? 'Assign Quick Task' : 'New Task'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelInline}
                  className="text-muted-foreground hover:text-foreground p-0.5 rounded-md hover:bg-muted cursor-pointer transition-colors"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Task Description multiline textarea */}
              <div className="space-y-1">
                <textarea
                  ref={inlineDescriptionRef}
                  value={inlineDescription}
                  onChange={(e) => setInlineDescription(e.target.value)}
                  placeholder="Task description or notes..."
                  rows={3}
                  className="w-full text-xs bg-background border border-border/70 rounded-lg px-2.5 py-1.5 outline-none focus:border-foreground/50 transition-colors resize-none text-foreground placeholder:text-muted-foreground/60 leading-relaxed"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault()
                      handleSaveInlineTask()
                    }
                  }}
                />
              </div>

              {/* Reusable Assignee Selector (Admin only) */}
              {isAdmin && (
                <div className="space-y-1">
                  <TaskAssigneeSelector
                    employees={assignableEmployees}
                    selectedAssignees={inlineAssignees}
                    onChange={setInlineAssignees}
                    compact
                    label="Assign To"
                    popoverAlign="start"
                  />
                  <p className="text-[10px] text-muted-foreground/70">
                    Leave empty to save as your own personal task.
                  </p>
                </div>
              )}

              {/* Action Buttons: Cancel and Save Task */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                <button
                  type="button"
                  onClick={handleCancelInline}
                  disabled={isSubmittingInline}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isSubmittingInline || !inlineDescription.trim()}
                  onClick={handleSaveInlineTask}
                  className="h-7 px-3 text-xs font-medium rounded-lg bg-foreground text-background hover:bg-foreground/90 cursor-pointer gap-1.5 shadow-xs"
                >
                  {isSubmittingInline ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{isAdmin && inlineAssignees.length > 0 ? 'Assign Task' : 'Save Task'}</span>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Task List or Empty / Loading State */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mb-2" />
              <span className="text-xs">Loading tasks...</span>
            </div>
          ) : displayedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                <CheckSquare className="w-5 h-5 text-muted-foreground/70" />
              </div>
              <p className="text-sm font-semibold text-foreground">No tasks found</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
                {searchQuery
                  ? 'No tasks match your search query.'
                  : activeTab === 'Pending'
                  ? 'You have no pending tasks right now.'
                  : activeTab === 'Completed'
                  ? 'No tasks have been marked completed yet.'
                  : 'No tasks have been created yet.'}
              </p>
              {!isCreatingInline && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreatingInline(true)}
                  className="mt-4 text-xs h-8 gap-1.5 rounded-lg border-border cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Quick Task</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {displayedTasks.map((task) => (
                <QuickTaskCard
                  key={task.id}
                  task={task}
                  currentUserId={user.id}
                  currentUserRole={user.role}
                  onToggleComplete={handleToggleComplete}
                  onEditTask={(t) => setEditingTask(t)}
                  onDeleteTask={handleDeleteTask}
                  onCancelTask={handleCancelTask}
                  isCompact
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-border/40 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
          <span>{tasks.length} total tasks</span>
          <button
            type="button"
            onClick={handleOpenFullPage}
            className="hover:text-foreground hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>View all</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <QuickTaskEditModal
          task={editingTask}
          isOpen={Boolean(editingTask)}
          onClose={() => setEditingTask(null)}
          onTaskUpdated={(updated) => {
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
            setEditingTask(null)
          }}
          onTaskDeleted={(deletedId) => {
            setTasks((prev) => prev.filter((t) => t.id !== deletedId))
            setEditingTask(null)
          }}
          currentUserId={user.id}
        />
      )}
    </>
  )
}
