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
  Calendar,
  AlertCircle,
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
  QuickTaskPriority,
} from '@/types/quick-tasks'
import {
  getQuickTasksAction,
  createQuickTasksAction,
  markQuickTaskCompleteAction,
  cancelQuickTaskAction,
} from '@/lib/actions/quick-tasks'
import { AssignableEmployee, getAssignableEmployees } from '@/lib/actions/team'
import { TaskAssigneeSelector } from '@/components/tasks/TaskAssigneeSelector'
import { DatePicker } from '@/components/ui/date-picker'
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

  // Assignable employees (shared with Create Task form)
  const [assignableEmployees, setAssignableEmployees] = useState<AssignableEmployee[]>([])

  // Inline Creation State
  const [isCreatingInline, setIsCreatingInline] = useState(false)
  const [inlineTitle, setInlineTitle] = useState('')
  const [inlineDescription, setInlineDescription] = useState('')
  const [inlineAssignees, setInlineAssignees] = useState<string[]>([])
  const [inlinePriority, setInlinePriority] = useState<QuickTaskPriority>('Medium')
  const [inlineDueDate, setInlineDueDate] = useState('')
  const [isSubmittingInline, setIsSubmittingInline] = useState(false)

  // Edit Modal State
  const [editingTask, setEditingTask] = useState<QuickTask | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const inlineTitleRef = useRef<HTMLInputElement>(null)

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
  }, [loadTasks])

  // Load assignable employees for Admin (reusing existing team assignment action)
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
    window.addEventListener('erp-quick-tasks-update', handleUpdate)

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
      if (bc) bc.close()
    }
  }, [loadTasks])

  // Focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchOpen])

  // Focus inline title when inline creator opens
  useEffect(() => {
    if (isCreatingInline && inlineTitleRef.current) {
      inlineTitleRef.current.focus()
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

  // Handle Save Inline Quick Task
  const handleSaveInlineTask = async () => {
    const trimmedTitle = inlineTitle.trim()
    if (!trimmedTitle) {
      toast.error('Task title is required')
      return
    }

    if (inlineAssignees.length === 0) {
      toast.error('Please assign at least one member')
      return
    }

    setIsSubmittingInline(true)
    try {
      const res = await createQuickTasksAction({
        title: trimmedTitle,
        description: inlineDescription.trim() || undefined,
        assigned_to: inlineAssignees,
        priority: inlinePriority,
        due_date: inlineDueDate || undefined,
      })

      if (res.success && res.data) {
        toast.success(
          inlineAssignees.length > 1
            ? `Assigned task to ${inlineAssignees.length} members`
            : 'Task assigned successfully'
        )

        // Broadcast notifications
        try {
          const bc = new BroadcastChannel('erp-notifications-channel')
          bc.postMessage({ type: 'QUICK_TASK_CREATED' })
          bc.close()
        } catch {}
        window.dispatchEvent(new CustomEvent('erp-quick-tasks-update'))
        window.dispatchEvent(new CustomEvent('erp-notification-update'))

        // Update list & reset inline editor
        setTasks((prev) => [...res.data!, ...prev])
        setActiveTab('Pending')

        setInlineTitle('')
        setInlineDescription('')
        setInlineAssignees([])
        setInlinePriority('Medium')
        setInlineDueDate('')
        setIsCreatingInline(false)
      } else {
        toast.error(res.error || 'Failed to assign task')
      }
    } catch {
      toast.error('Error assigning task')
    } finally {
      setIsSubmittingInline(false)
    }
  }

  // Handle Cancel Inline Quick Task
  const handleCancelInline = () => {
    setInlineTitle('')
    setInlineDescription('')
    setInlineAssignees([])
    setInlinePriority('Medium')
    setInlineDueDate('')
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
    if (isAdmin && selectedAssigneeId !== 'ALL') {
      result = result.filter((t) => t.assigned_to === selectedAssigneeId)
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.assigned_to_name && t.assigned_to_name.toLowerCase().includes(q)) ||
          (t.assigned_by_name && t.assigned_by_name.toLowerCase().includes(q)) ||
          t.priority.toLowerCase().includes(q)
      )
    }

    return result
  }, [tasks, activeTab, selectedAssigneeId, isAdmin, searchQuery])

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
                <DropdownMenuContent align="end" className="w-48 text-xs max-h-64 overflow-y-auto z-[120]">
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Filter by Assignee
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setSelectedAssigneeId('ALL')}
                    className={`cursor-pointer ${selectedAssigneeId === 'ALL' ? 'font-semibold bg-muted' : ''}`}
                  >
                    <span>All Assignees</span>
                  </DropdownMenuItem>
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
                placeholder="Search tasks by title, description, or person..."
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

        {/* Action Bar: Filter Tabs & Admin "+ Assign Task" inline toggle */}
        <div className="px-3 py-2 border-b border-border/40 bg-muted/10 flex items-center justify-between gap-2 shrink-0">
          {/* Tabs */}
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
            {isAdmin && (
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
            )}
          </div>

          {/* Admin "+ Assign Task" Inline Toggle Button */}
          {isAdmin && (
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
              <span>{isCreatingInline ? 'Cancel' : 'Assign Task'}</span>
            </Button>
          )}
        </div>

        {/* Active Filter indicator if Admin filtered by specific assignee */}
        {isAdmin && selectedAssigneeId !== 'ALL' && (
          <div className="px-3 py-1.5 bg-muted/30 border-b border-border/30 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              Filtered to:{' '}
              <strong className="text-foreground">
                {assignableEmployees.find((u) => u.id === selectedAssigneeId)?.name || 'Assignee'}
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
          {isAdmin && isCreatingInline && (
            <div className="p-3 bg-card border border-border/90 rounded-xl shadow-md space-y-2.5 animate-in fade-in-50 zoom-in-98 duration-150 mb-2">
              {/* Header */}
              <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <span className="p-0.5 rounded bg-foreground text-background">
                    <Plus className="w-3 h-3" />
                  </span>
                  <span>Assign Quick Task</span>
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

              {/* Title input */}
              <div className="space-y-1">
                <input
                  ref={inlineTitleRef}
                  type="text"
                  value={inlineTitle}
                  onChange={(e) => setInlineTitle(e.target.value)}
                  placeholder="Task title (required)..."
                  className="w-full text-xs font-semibold bg-background border border-border/70 rounded-lg px-2.5 py-1.5 outline-none focus:border-foreground/50 transition-colors text-foreground placeholder:text-muted-foreground/60"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && inlineTitle.trim() && inlineAssignees.length > 0) {
                      e.preventDefault()
                      handleSaveInlineTask()
                    }
                  }}
                />
              </div>

              {/* Description input */}
              <div className="space-y-1">
                <textarea
                  value={inlineDescription}
                  onChange={(e) => setInlineDescription(e.target.value)}
                  placeholder="Description or notes (optional)..."
                  rows={2}
                  className="w-full text-xs bg-background border border-border/70 rounded-lg px-2.5 py-1.5 outline-none focus:border-foreground/50 transition-colors resize-none text-foreground placeholder:text-muted-foreground/60 leading-relaxed"
                />
              </div>

              {/* Reusable Assignee Selector (Shared with Create Task form) */}
              <TaskAssigneeSelector
                employees={assignableEmployees}
                selectedAssignees={inlineAssignees}
                onChange={setInlineAssignees}
                compact
                label="Assign To"
                popoverAlign="start"
              />

              {/* Priority & Due Date Row */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                {/* Priority Pills */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Priority
                  </label>
                  <div className="grid grid-cols-3 gap-0.5 bg-muted/40 p-0.5 rounded-lg border border-border/60">
                    {(['Low', 'Medium', 'High'] as QuickTaskPriority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setInlinePriority(p)}
                        className={`py-0.5 text-center text-[10px] font-medium rounded transition-all cursor-pointer ${
                          inlinePriority === p
                            ? 'bg-foreground text-background shadow-xs font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Due Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />
                    <span>Due Date</span>
                  </label>
                  <DatePicker
                    value={inlineDueDate}
                    onChange={(date) => setInlineDueDate(date)}
                    placeholder="Select due date"
                    className="h-7 text-[11px] bg-background border-border/70 rounded-lg px-2 py-1"
                    popoverAlign="end"
                    isClearable
                  />
                </div>
              </div>

              {/* Action Buttons: Cancel and Assign Task */}
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
                  disabled={isSubmittingInline || !inlineTitle.trim() || inlineAssignees.length === 0}
                  onClick={handleSaveInlineTask}
                  className="h-7 px-3 text-xs font-medium rounded-lg bg-foreground text-background hover:bg-foreground/90 cursor-pointer gap-1.5 shadow-xs"
                >
                  {isSubmittingInline ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Assigning...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3 h-3" />
                      <span>
                        Assign Task{inlineAssignees.length > 1 ? ` (${inlineAssignees.length})` : ''}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Task List Content */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs">Loading tasks...</span>
            </div>
          ) : displayedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-center p-4">
              <div className="w-10 h-10 rounded-full bg-muted/50 border border-border flex items-center justify-center text-muted-foreground mb-2">
                <CheckSquare className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-foreground">
                {searchQuery
                  ? 'No matching tasks'
                  : activeTab === 'Pending'
                  ? 'No pending quick tasks'
                  : 'No completed tasks'}
              </p>
              <p className="text-[11px] text-muted-foreground max-w-[240px] mt-0.5">
                {searchQuery
                  ? 'Try adjusting your search query or filters'
                  : activeTab === 'Pending'
                  ? 'You are all caught up! New casual tasks assigned by Admin will appear here.'
                  : 'Tasks you mark completed will be kept here.'}
              </p>
              {isAdmin && activeTab === 'Pending' && !searchQuery && !isCreatingInline && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreatingInline(true)}
                  className="mt-3 text-xs h-7 rounded-lg gap-1 border-border cursor-pointer hover:bg-muted"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Assign a Task</span>
                </Button>
              )}
            </div>
          ) : (
            displayedTasks.map((task) => (
              <QuickTaskCard
                key={task.id}
                task={task}
                currentUserId={user.id}
                currentUserRole={user.role}
                onToggleComplete={handleToggleComplete}
                onEditTask={isAdmin ? (t) => setEditingTask(t) : undefined}
                onCancelTask={isAdmin ? handleCancelTask : undefined}
                isCompact
              />
            ))
          )}
        </div>
      </div>

      {/* Admin Edit Task Modal */}
      {isAdmin && editingTask && (
        <QuickTaskEditModal
          task={editingTask}
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          onTaskUpdated={(updated) => {
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
            setEditingTask(null)
          }}
        />
      )}
    </>
  )
}
