'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search,
  Plus,
  CheckSquare,
  Filter,
  LayoutGrid,
  List,
  Calendar,
  Users,
  Clock,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import type {
  QuickTask,
  QuickTaskPriority,
} from '@/types/quick-tasks'
import {
  getQuickTasksAction,
  markQuickTaskCompleteAction,
  cancelQuickTaskAction,
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
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL')
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
    window.addEventListener('erp-quick-tasks-update', handleUpdate)

    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('erp-notifications-channel')
      bc.onmessage = () => {
        loadTasks()
      }
    } catch {}

    return () => {
      window.removeEventListener('erp-quick-tasks-update', handleUpdate)
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

    // Priority filter
    if (selectedPriority !== 'ALL') {
      result = result.filter((t) => t.priority === selectedPriority)
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
  }, [tasks, activeTab, selectedPriority, selectedAssigneeId, isAdmin, searchQuery])

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-muted border border-border text-foreground">
              <CheckSquare className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Quick Tasks
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {isAdmin
              ? 'Assign and oversee casual, ad-hoc tasks across your team without project overhead.'
              : 'Casual tasks assigned directly to your account by management.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadTasks}
            className="text-xs h-9 rounded-lg gap-1.5 border-border cursor-pointer hover:bg-muted"
            title="Refresh tasks"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          {isAdmin && (
            <Button
              type="button"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="text-xs h-9 rounded-lg bg-foreground text-background hover:bg-foreground/90 font-medium gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Task</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card border border-border/60 p-3 rounded-2xl shadow-xs">
        {/* Left: Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('Pending')}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer ${
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
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer ${
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
              className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer ${
                activeTab === 'All'
                  ? 'bg-foreground text-background font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              All ({tasks.length})
            </button>
          )}
        </div>

        {/* Right: Search, Priority filter, Assignee filter (Admin), View Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-60 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search quick tasks..."
              className="pl-8 text-xs bg-background h-8 rounded-lg border-border"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Priority Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`h-8 px-2.5 text-xs rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer outline-none ${
                selectedPriority !== 'ALL'
                  ? 'bg-foreground text-background border-foreground font-semibold'
                  : 'bg-background border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{selectedPriority === 'ALL' ? 'Priority' : selectedPriority}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32 text-xs">
              <DropdownMenuItem onClick={() => setSelectedPriority('ALL')} className="cursor-pointer">
                All Priorities
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedPriority('High')} className="cursor-pointer">
                High
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedPriority('Medium')} className="cursor-pointer">
                Medium
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedPriority('Low')} className="cursor-pointer">
                Low
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Admin Assignee Filter */}
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={`h-8 px-2.5 text-xs rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer outline-none ${
                  selectedAssigneeId !== 'ALL'
                    ? 'bg-foreground text-background border-foreground font-semibold'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="truncate max-w-[100px]">
                  {selectedAssigneeId === 'ALL'
                    ? 'Assignee'
                    : assignableEmployees.find((u) => u.id === selectedAssigneeId)?.name || 'Assignee'}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 text-xs max-h-64 overflow-y-auto">
                <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">
                  Filter by Assignee
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setSelectedAssigneeId('ALL')}
                  className="cursor-pointer"
                >
                  All Assignees
                </DropdownMenuItem>
                {assignableEmployees.map((u) => (
                  <DropdownMenuItem
                    key={u.id}
                    onClick={() => setSelectedAssigneeId(u.id)}
                    className="cursor-pointer justify-between"
                  >
                    <span className="truncate">{u.name}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{u.department || u.designation || 'Member'}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Task Grid / List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-xs sm:text-sm">Loading quick tasks...</span>
        </div>
      ) : displayedTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-border bg-card/50 p-6">
          <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground mb-3">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            {searchQuery || selectedPriority !== 'ALL' || selectedAssigneeId !== 'ALL'
              ? 'No matching tasks found'
              : activeTab === 'Pending'
              ? 'No pending quick tasks'
              : 'No completed tasks yet'}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            {searchQuery || selectedPriority !== 'ALL' || selectedAssigneeId !== 'ALL'
              ? 'Try resetting your search query or filters to see more tasks.'
              : activeTab === 'Pending'
              ? 'All caught up! Quick tasks assigned by management will show up here.'
              : 'Completed quick tasks remain safely archived here for your records.'}
          </p>
          {isAdmin && activeTab === 'Pending' && !searchQuery && (
            <Button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="mt-4 text-xs h-8 rounded-lg bg-foreground text-background hover:bg-foreground/90 font-medium gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign a Quick Task</span>
            </Button>
          )}
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5'
              : 'flex flex-col gap-2.5 max-w-4xl'
          }
        >
          {displayedTasks.map((task) => (
            <QuickTaskCard
              key={task.id}
              task={task}
              currentUserId={user.id}
              currentUserRole={user.role}
              onToggleComplete={handleToggleComplete}
              onEditTask={isAdmin ? (t) => setEditingTask(t) : undefined}
              onCancelTask={isAdmin ? handleCancelTask : undefined}
              isCompact={false}
            />
          ))}
        </div>
      )}

      {/* Admin Create Task Modal */}
      {isAdmin && (
        <CreateQuickTaskModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onTaskCreated={(newTasks) => {
            setTasks((prev) => [...newTasks, ...prev])
            setActiveTab('Pending')
          }}
        />
      )}

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
    </div>
  )
}
