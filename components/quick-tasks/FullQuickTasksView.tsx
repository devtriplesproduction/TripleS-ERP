'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search,
  Plus,
  CheckSquare,
  Filter,
  LayoutGrid,
  List,
  Clock,
  Loader2,
  RefreshCw,
  X,
  User,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import type { QuickTask } from '@/types/quick-tasks'
import {
  getQuickTasksAction,
  markQuickTaskCompleteAction,
  cancelQuickTaskAction,
  deleteQuickTaskAction,
} from '@/lib/actions/quick-tasks'
import { AssignableEmployee, getAssignableEmployees } from '@/lib/actions/team'
import { QuickTaskCard } from './QuickTaskCard'
import { CreateQuickTaskModal } from './CreateQuickTaskModal'
import { QuickTaskEditModal } from './QuickTaskEditModal'
import { toast } from 'sonner'
import type { AuthUser } from '@/lib/auth'

interface FullQuickTasksViewProps {
  user: AuthUser
}

export function FullQuickTasksView({ user }: FullQuickTasksViewProps) {
  const isAdmin = user.role === 'Admin'

  const [tasks, setTasks] = useState<QuickTask[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [activeTab, setActiveTab] = useState<'Pending' | 'Completed' | 'All'>('Pending')
  const [selectedType, setSelectedType] = useState<'ALL' | 'PERSONAL' | 'ASSIGNED'>('ALL')
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Assignable employees for Admin filter
  const [assignableEmployees, setAssignableEmployees] = useState<AssignableEmployee[]>([])

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<QuickTask | null>(null)

  // Load tasks
  const loadTasks = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getQuickTasksAction({
        status: 'All',
        assigneeId: selectedAssigneeId !== 'ALL' ? selectedAssigneeId : undefined,
      })
      if (res.success && res.data) {
        setTasks(res.data)
      } else {
        toast.error(res.error || 'Failed to load quick tasks')
      }
    } catch {
      toast.error('Network error loading tasks')
    } finally {
      setIsLoading(false)
    }
  }, [selectedAssigneeId])

  useEffect(() => {
    loadTasks()
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

  // Realtime & event listeners
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
      bc.onmessage = () => {
        loadTasks()
      }
    } catch {}

    return () => {
      window.removeEventListener('erp-quick-tasks-update', handleUpdate)
      window.removeEventListener('employee-status-changed', handleEmployeeChange)
      if (bc) bc.close()
    }
  }, [loadTasks])

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

  // Delete Task
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

    // Type filter (All vs Personal vs Assigned)
    if (selectedType === 'PERSONAL') {
      result = result.filter((t) => Boolean(t.is_personal || t.assigned_by === t.assigned_to) && t.assigned_to === user.id)
    } else if (selectedType === 'ASSIGNED') {
      result = result.filter((t) => !t.is_personal && t.assigned_by !== t.assigned_to)
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
          (t.assigned_by_name && t.assigned_by_name.toLowerCase().includes(q))
      )
    }

    return result
  }, [tasks, activeTab, selectedType, selectedAssigneeId, isAdmin, searchQuery, user.id])

  return (
    <div className="max-w-7xl mx-auto space-y-6 select-none">
      <PageHeader
        title="Quick Tasks"
        subtitle={
          isAdmin
            ? 'Manage personal tasks and assign casual tasks across your team without project overhead.'
            : 'Your personal quick tasks and assignments from management.'
        }
        icon={CheckSquare}
        actions={
          <div className="flex items-center gap-2 sm:gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadTasks}
              className="h-9 px-3.5 text-xs font-medium rounded-lg gap-1.5 border-border/80 bg-card hover:bg-muted text-foreground cursor-pointer shadow-xs"
              title="Refresh tasks"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="h-9 px-3.5 text-xs font-semibold rounded-lg bg-foreground text-background hover:bg-foreground/90 cursor-pointer gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{isAdmin ? 'Assign Task' : 'New Task'}</span>
            </Button>
          </div>
        }
      />

      {/* Standardized Control Bar: Search, Status Tabs, Ownership Filter, Assignee Dropdown, View Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3">
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks by description or person..."
            className="!h-9 !min-h-[36px] !max-h-[36px] !pl-9 !pr-8 !text-xs rounded-lg border-border/80 bg-card font-normal shadow-xs focus-visible:ring-1 focus-visible:ring-foreground/20 text-foreground w-full placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Tabs & Filters */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
          {/* Status Tabs */}
          <div
            role="radiogroup"
            aria-label="Filter by status"
            className="flex items-center h-9 p-0.5 rounded-lg border border-border/80 bg-card shadow-xs shrink-0"
          >
            {(['Pending', 'Completed', 'All'] as const).map((tab) => {
              const count = tab === 'Pending' ? pendingCount : tab === 'Completed' ? completedCount : tasks.length
              const isSelected = activeTab === tab
              return (
                <button
                  key={tab}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setActiveTab(tab)}
                  className={`h-7.5 px-3 flex items-center justify-center rounded-md text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-foreground text-background shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium'
                  }`}
                >
                  {tab} ({count})
                </button>
              )
            })}
          </div>

          {/* Type Filter: All / Personal / Assigned */}
          <div
            role="radiogroup"
            aria-label="Filter by ownership"
            className="flex items-center h-9 p-0.5 rounded-lg border border-border/80 bg-card shadow-xs shrink-0"
          >
            <button
              type="button"
              role="radio"
              aria-checked={selectedType === 'ALL'}
              onClick={() => setSelectedType('ALL')}
              className={`h-7.5 px-3 flex items-center justify-center rounded-md text-xs transition-colors cursor-pointer ${
                selectedType === 'ALL'
                  ? 'bg-foreground text-background shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium'
              }`}
            >
              All
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={selectedType === 'PERSONAL'}
              onClick={() => setSelectedType('PERSONAL')}
              className={`h-7.5 px-3 flex items-center gap-1.5 justify-center rounded-md text-xs transition-colors cursor-pointer ${
                selectedType === 'PERSONAL'
                  ? 'bg-foreground text-background shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Personal</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={selectedType === 'ASSIGNED'}
              onClick={() => setSelectedType('ASSIGNED')}
              className={`h-7.5 px-3 flex items-center gap-1.5 justify-center rounded-md text-xs transition-colors cursor-pointer ${
                selectedType === 'ASSIGNED'
                  ? 'bg-foreground text-background shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Assigned</span>
            </button>
          </div>

          {/* Admin Assignee Filter */}
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={`flex items-center gap-1.5 h-9 px-3 text-xs font-medium rounded-lg border border-border/80 bg-card shadow-xs transition-colors outline-none cursor-pointer ${
                  selectedAssigneeId !== 'ALL'
                    ? 'border-foreground bg-foreground text-background'
                    : 'text-foreground hover:border-foreground/30 hover:bg-muted/40'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="max-w-[120px] truncate">
                  {selectedAssigneeId === 'ALL'
                    ? 'Assignee'
                    : assignableEmployees.find((e) => e.id === selectedAssigneeId)?.name || 'Assignee'}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 max-h-72 overflow-y-auto text-xs">
                <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">
                  Filter by Assignee
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setSelectedAssigneeId('ALL')}
                  className={`cursor-pointer ${selectedAssigneeId === 'ALL' ? 'font-semibold bg-muted' : ''}`}
                >
                  All Assignees
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

          {/* Standardized Segmented View Switcher: Grid | List */}
          <div
            role="radiogroup"
            aria-label="Quick tasks view options"
            className="flex items-center h-9 p-0.5 rounded-lg border border-border/80 bg-card shadow-xs shrink-0"
          >
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'grid'}
              aria-label="Grid view"
              title="Grid View"
              onClick={() => setViewMode('grid')}
              className={`h-7.5 w-8 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-foreground text-background shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <div className="w-px h-4 bg-border/60 mx-0.5 shrink-0" aria-hidden="true" />
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'list'}
              aria-label="List view"
              title="List View"
              onClick={() => setViewMode('list')}
              className={`h-7.5 w-8 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-foreground text-background shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Task List / Grid Display */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mb-2" />
          <span className="text-sm">Loading tasks...</span>
        </div>
      ) : displayedTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card rounded-2xl border border-border">
          <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center mb-3">
            <CheckSquare className="w-6 h-6 text-muted-foreground/70" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No quick tasks found</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm">
            {searchQuery
              ? 'No tasks match your current search or filter query.'
              : activeTab === 'Pending'
              ? 'You have zero pending tasks right now.'
              : activeTab === 'Completed'
              ? 'No tasks have been marked as completed yet.'
              : 'No tasks have been created yet.'}
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="mt-5 text-xs h-9 rounded-lg gap-1.5 bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{isAdmin ? 'Assign New Task' : 'Create Personal Task'}</span>
          </Button>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5'
              : 'flex flex-col gap-2.5 w-full'
          }
        >
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
              isCompact={viewMode === 'list'}
            />
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      <CreateQuickTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onTaskCreated={(newTasks) => {
          setTasks((prev) => [...newTasks, ...prev])
          loadTasks()
        }}
        user={user}
      />

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
    </div>
  )
}
