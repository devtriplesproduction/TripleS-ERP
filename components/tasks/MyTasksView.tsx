'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Task, TaskStatus, Project } from '@/types/project-management'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TaskDetailsModal } from './TaskDetailsModal'
import { updateTaskStatusAction } from '@/lib/actions/tasks'
import { Dropdown } from '@/components/ui/Dropdown'
import {
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  FolderGit2,
  Folder,
  ChevronRight,
  ListTodo,
  LayoutGrid,
  List,
  Paperclip,
  MessageSquare,
  ExternalLink,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { getProfilePhotoUrl } from '@/lib/utils/profile-photos'
import { PageHeader } from '@/components/PageHeader'
import { cn } from '@/lib/utils'

interface MyTasksViewProps {
  todayTasks: Task[]
  upcomingTasks: Task[]
  pendingTasks: Task[]
  overdueTasks: Task[]
  recentlyAssignedTasks: Task[]
  completedTasks: Task[]
  userProjects: Array<{ id: string; name: string; taskCount: number }>
  projects?: Project[]
  userRole?: string
  isHod?: boolean
  defaultViewMode?: 'list' | 'grid'
}

type TabType = 'today' | 'upcoming' | 'pending' | 'overdue' | 'completed' | 'projects'

export function MyTasksView({
  todayTasks,
  upcomingTasks,
  pendingTasks,
  overdueTasks,
  recentlyAssignedTasks,
  completedTasks,
  userProjects,
  projects,
  userRole,
  isHod,
  defaultViewMode = 'list',
}: MyTasksViewProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('today')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(defaultViewMode)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<string>('due_date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const [todayList, setTodayList] = useState<Task[]>(todayTasks)
  const [upcomingList, setUpcomingList] = useState<Task[]>(upcomingTasks)
  const [pendingList, setPendingList] = useState<Task[]>(pendingTasks)
  const [overdueList, setOverdueList] = useState<Task[]>(overdueTasks)
  const [completedList, setCompletedList] = useState<Task[]>(completedTasks)

  useEffect(() => {
    setTodayList(todayTasks)
    setUpcomingList(upcomingTasks)
    setPendingList(pendingTasks)
    setOverdueList(overdueTasks)
    setCompletedList(completedTasks)
  }, [todayTasks, upcomingTasks, pendingTasks, overdueTasks, completedTasks])

  const handleTaskUpdated = (updatedTask: Task) => {
    const updateInList = (list: Task[]) =>
      list.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t))

    setTodayList(updateInList)
    setUpcomingList(updateInList)
    setPendingList(updateInList)
    setOverdueList(updateInList)
    setCompletedList(updateInList)

    if (selectedTask?.id === updatedTask.id) {
      setSelectedTask(updatedTask)
    }
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 opacity-40 ml-1 inline shrink-0" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-primary ml-1 inline shrink-0" />
    ) : (
      <ArrowDown className="h-3 w-3 text-primary ml-1 inline shrink-0" />
    )
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setIsDetailsOpen(true)
  }

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    // Optimistic local update
    const updateStatus = (list: Task[]) =>
      list.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    setTodayList(updateStatus)
    setUpcomingList(updateStatus)
    setPendingList(updateStatus)
    setOverdueList(updateStatus)
    setCompletedList(updateStatus)
    if (selectedTask?.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, status: newStatus } : null))
    }

    try {
      const res = await updateTaskStatusAction(taskId, newStatus)
      if (!res.success) {
        toast.error(res.error || 'Failed to update task status.')
        router.refresh()
      } else {
        toast.success(`Task moved to ${newStatus.replace('_', ' ')}`)
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating status')
      router.refresh()
    }
  }

  const getPriorityBadgeStyle = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'border-red-600/50 text-red-500 bg-red-500/10 font-bold'
      case 'HIGH':
        return 'border-red-500/40 text-red-400 bg-red-500/10 font-semibold'
      case 'MEDIUM':
        return 'border-amber-500/40 text-amber-400 bg-amber-500/10 font-semibold'
      case 'LOW':
        return 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10 font-semibold'
      default:
        return 'border-border text-muted-foreground bg-secondary/30'
    }
  }

  const getStatusButtonClass = (status: TaskStatus, isOverdue?: boolean) => {
    const base = "h-8 text-xs font-medium rounded-lg transition-colors px-3 py-1 flex items-center justify-between gap-1.5 border min-w-[105px] sm:min-w-[115px]"
    if (isOverdue && status !== 'DONE') {
      return cn(base, "border-destructive/60 text-destructive bg-destructive/10 hover:bg-destructive/20 font-semibold")
    }
    switch (status) {
      case 'IN_PROGRESS':
        return cn(base, "border-indigo-500/40 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20")
      case 'IN_REVIEW':
        return cn(base, "border-amber-500/40 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20")
      case 'DONE':
        return cn(base, "border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20")
      case 'ON_HOLD':
        return cn(base, "border-zinc-500/40 text-zinc-400 bg-zinc-500/10 hover:bg-zinc-500/20")
      case 'TODO':
      default:
        return cn(base, "border-teal-500/40 text-teal-400 bg-teal-500/10 hover:bg-teal-500/20")
    }
  }

  const getProjectDisplayName = (task: Task) => {
    const name = task.project_name?.trim()
    if (!name || name === 'undefined' || name === 'null') {
      return 'No project'
    }
    return name
  }

  const truncateDescription = (text?: string | null, maxWords: number = 12): string => {
    if (!text || !text.trim()) return ''
    const words = text.trim().split(/\s+/)
    if (words.length <= maxWords) return text.trim()
    return words.slice(0, maxWords).join(' ') + '...'
  }

  const getCommentProgressText = (task: Task) => {
    if ((task as any).comment_progress) return (task as any).comment_progress
    if ((task as any).checklist_total) {
      return `${(task as any).checklist_completed || 0}/${(task as any).checklist_total}`
    }
    const count = task.comments_count ?? (task.comments || []).length ?? 0
    return `${count}`
  }

  const getProgressBarColor = (index: number) => {
    const colors = [
      'bg-emerald-500',
      'bg-blue-500',
      'bg-purple-500',
      'bg-teal-500',
      'bg-indigo-500',
    ]
    return colors[index % colors.length]
  }

  const displayProjects: Project[] = (projects && projects.length > 0)
    ? projects
    : userProjects.map((up, i) => ({
        id: up.id,
        project_id_display: `PRJ-${String(i + 1).padStart(3, '0')}`,
        name: up.name,
        client_id: '',
        description: null,
        start_date: null,
        deadline: null,
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        department: null,
        project_manager_id: null,
        objective: null,
        notes: null,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        task_summary: {
          total: up.taskCount,
          done: 0,
          in_progress: up.taskCount,
          in_review: 0,
          todo: 0,
          on_hold: 0,
        },
        progress: 0,
        members: [],
      }))

  const renderTaskList = (tasks: Task[], emptyMessage: string) => {
    if (tasks.length === 0) {
      return (
        <div className="p-12 text-center text-muted-foreground bg-card border border-border rounded-xl space-y-3">
          <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground/60" />
          <h4 className="font-semibold text-foreground text-base">{emptyMessage}</h4>
          <p className="text-xs text-muted-foreground">You have no tasks in this queue right now.</p>
        </div>
      )
    }

    const filteredTasks = tasks.filter((t) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        t.title.toLowerCase().includes(q) ||
        t.task_id_display.toLowerCase().includes(q) ||
        (t.project_name || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      )
    })

    const sortedTasks = [...filteredTasks].sort((a, b) => {
      let res = 0
      if (sortColumn === 'task_id') {
        res = a.task_id_display.localeCompare(b.task_id_display)
      } else if (sortColumn === 'title') {
        res = a.title.localeCompare(b.title)
      } else if (sortColumn === 'project') {
        res = (a.project_name || '').localeCompare(b.project_name || '')
      } else if (sortColumn === 'priority') {
        const priorityWeight: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
        res = (priorityWeight[a.priority] || 0) - (priorityWeight[b.priority] || 0)
      } else if (sortColumn === 'due_date') {
        const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity
        const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity
        res = dateA - dateB
      } else if (sortColumn === 'status') {
        res = a.status.localeCompare(b.status)
      } else if (sortColumn === 'hours') {
        res = (a.worked_hours || 0) - (b.worked_hours || 0)
      }
      return sortDirection === 'asc' ? res : -res
    })

    return (
      <div className="space-y-3">
        {/* Search & Task Count Bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks by title, ID, project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
            />
          </div>
          <div className="text-xs text-muted-foreground shrink-0 font-medium">
            Showing <span className="font-semibold text-foreground">{sortedTasks.length}</span> of {tasks.length} tasks
          </div>
        </div>

        {sortedTasks.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-card border border-border rounded-xl">
            <p className="text-xs">No tasks match your search query &quot;{searchQuery}&quot;.</p>
          </div>
        ) : viewMode === 'list' ? (
          /* Table View for List Mode */
          <div className="w-full overflow-x-auto rounded-xl border border-border/80 bg-card shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
              <thead className="bg-secondary/40 border-b border-border/70 text-[11px] text-muted-foreground uppercase font-semibold tracking-wider select-none">
                <tr>
                  <th
                    className="px-3.5 py-3 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort('task_id')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Task ID</span>
                      {renderSortIcon('task_id')}
                    </div>
                  </th>
                  <th
                    className="px-3.5 py-3 cursor-pointer hover:text-foreground transition-colors min-w-[200px] max-w-[320px]"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Task Title</span>
                      {renderSortIcon('title')}
                    </div>
                  </th>
                  <th
                    className="px-3.5 py-3 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort('project')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Project</span>
                      {renderSortIcon('project')}
                    </div>
                  </th>
                  <th
                    className="px-3.5 py-3 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort('priority')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Priority</span>
                      {renderSortIcon('priority')}
                    </div>
                  </th>
                  <th
                    className="px-3.5 py-3 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort('due_date')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Due Date</span>
                      {renderSortIcon('due_date')}
                    </div>
                  </th>
                  <th
                    className="px-3.5 py-3 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      {renderSortIcon('status')}
                    </div>
                  </th>
                  <th className="px-3.5 py-3">
                    <span>Assignee</span>
                  </th>
                  <th
                    className="px-3.5 py-3 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort('hours')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Metrics</span>
                      {renderSortIcon('hours')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {sortedTasks.map((task) => {
                  const isOverdue = task.is_overdue && task.status !== 'DONE'
                  const assignees = task.assignees || []

                  return (
                    <tr
                      key={task.id}
                      onClick={() => handleTaskClick(task)}
                      className="hover:bg-accent/10 transition-colors cursor-pointer group"
                    >
                      {/* Task ID */}
                      <td className="px-3.5 py-3 font-mono text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                        <span className="px-1.5 py-0.5 rounded bg-secondary/50 border border-border/60">
                          {task.task_id_display}
                        </span>
                      </td>

                      {/* Title & snippet */}
                      <td className="px-3.5 py-3 min-w-[200px] max-w-[320px]">
                        <div className="flex flex-col min-w-0 max-w-full overflow-hidden">
                          <span
                            className="font-semibold text-foreground text-xs sm:text-[13px] truncate group-hover:text-primary transition-colors block max-w-full"
                            title={task.title}
                          >
                            {task.title}
                          </span>
                          {task.description?.trim() && (
                            <span
                              className="text-[11px] text-muted-foreground truncate block max-w-full"
                              title={task.description}
                            >
                              {truncateDescription(task.description, 12)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Project */}
                      <td className="px-3.5 py-3 text-xs text-muted-foreground max-w-[180px] truncate" title={getProjectDisplayName(task)}>
                        {getProjectDisplayName(task)}
                      </td>

                      {/* Priority */}
                      <td className="px-3.5 py-3">
                        <span className={cn(
                          "text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border inline-block whitespace-nowrap",
                          getPriorityBadgeStyle(task.priority)
                        )}>
                          {task.priority}
                        </span>
                      </td>

                      {/* Due Date */}
                      <td className="px-3.5 py-3 text-xs">
                        <div className={cn(
                          "flex items-center gap-1.5 whitespace-nowrap",
                          isOverdue
                            ? "text-destructive font-semibold"
                            : task.due_date
                            ? "text-foreground font-medium"
                            : "text-muted-foreground"
                        )}>
                          {isOverdue ? (
                            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                          ) : (
                            <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                          )}
                          <span>
                            {task.due_date ? dayjs(task.due_date).format('DD MMM YYYY') : 'No due date'}
                          </span>
                        </div>
                      </td>

                      {/* Status Dropdown */}
                      <td className="px-3.5 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <Dropdown
                          value={task.status}
                          onChange={(val) => handleStatusChange(task.id, val as TaskStatus)}
                          options={[
                            { value: 'TODO', label: 'To Do' },
                            { value: 'IN_PROGRESS', label: 'In Progress' },
                            { value: 'IN_REVIEW', label: 'In Review' },
                            ...(userRole === 'Admin' || isHod ? [{ value: 'DONE', label: 'Done' }] : []),
                            { value: 'ON_HOLD', label: 'On Hold' },
                          ]}
                          buttonClassName={getStatusButtonClass(task.status, task.is_overdue)}
                          className="w-auto"
                        />
                      </td>

                      {/* Assignees */}
                      <td className="px-3.5 py-3">
                        <div className="flex items-center -space-x-1.5 overflow-hidden">
                          {assignees.slice(0, 3).map((a, idx) => {
                            const name = a.profile ? `${a.profile.first_name || ''} ${a.profile.last_name || ''}`.trim() : 'User'
                            const initials = name.slice(0, 2).toUpperCase()
                            return (
                              <Avatar key={idx} title={name} className="h-6 w-6 border-2 border-card bg-secondary text-[9px] hover:z-10 transition-transform">
                                {a.profile?.profile_photo && (
                                  <AvatarImage src={getProfilePhotoUrl(a.profile.profile_photo) || undefined} alt={name} />
                                )}
                                <AvatarFallback>{initials}</AvatarFallback>
                              </Avatar>
                            )
                          })}
                          {assignees.length > 3 && (
                            <div
                              title={assignees.slice(3).map(a => a.profile ? `${a.profile.first_name} ${a.profile.last_name}`.trim() : 'User').join(', ')}
                              className="h-6 w-6 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[9px] font-bold text-muted-foreground z-10 cursor-help"
                            >
                              +{assignees.length - 3}
                            </div>
                          )}
                          {assignees.length === 0 && (
                            <span className="text-xs text-muted-foreground italic">Unassigned</span>
                          )}
                        </div>
                      </td>

                      {/* Metrics: Hours, Attachments, Comments */}
                      <td className="px-3.5 py-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 font-mono font-medium text-foreground/80" title="Operational hours">
                            <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                            {task.worked_hours ? `${task.worked_hours}h` : '0h'}
                          </span>
                          {(task.attachments || []).length > 0 && (
                            <span className="flex items-center gap-1 text-muted-foreground/80" title="Attachments">
                              <Paperclip className="h-3 w-3 shrink-0" />
                              {(task.attachments || []).length}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-muted-foreground/80" title="Comments">
                            <MessageSquare className="h-3 w-3 shrink-0" />
                            {getCommentProgressText(task)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Card Grid View for Grid Mode */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {sortedTasks.map((task) => (
              <Card
                key={task.id}
                className={cn(
                  "border-border/80 bg-card rounded-xl shadow-xs transition-all duration-200 hover:border-foreground/30 hover:shadow-sm cursor-pointer flex flex-col justify-between overflow-hidden group",
                  task.is_overdue && task.status !== 'DONE' && "border-destructive/40 hover:border-destructive/60"
                )}
                onClick={() => handleTaskClick(task)}
              >
                <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full gap-2.5">
                  {/* Top Row: Task ID & Project (Left), Priority Badge (Top-Right Corner) */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 text-xs">
                      <span className="font-mono text-xs font-semibold text-muted-foreground shrink-0">
                        {task.task_id_display}
                      </span>
                      <span className="text-muted-foreground/50 shrink-0">·</span>
                      <span className="text-xs text-muted-foreground truncate" title={getProjectDisplayName(task)}>
                        {getProjectDisplayName(task)}
                      </span>
                    </div>

                    <span className={cn(
                      "text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border shrink-0",
                      getPriorityBadgeStyle(task.priority)
                    )}>
                      {task.priority}
                    </span>
                  </div>

                  {/* Middle Section: Title/Desc (Left) & Due Date / Status (Right) */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 my-0.5 flex-1">
                    {/* Left: Title & Description */}
                    <div className="flex-1 min-w-0 pr-1">
                      <h4 className="font-bold text-base sm:text-[17px] text-foreground leading-snug truncate" title={task.title}>
                        {task.title}
                      </h4>
                      <p className="text-xs sm:text-[13px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed break-words">
                        {task.description?.trim() ? task.description : 'No description provided.'}
                      </p>
                    </div>

                    {/* Right: Due Date & Status Dropdown (Aligned vertically around same center) */}
                    <div
                      className="flex items-end gap-2.5 sm:gap-3 shrink-0 self-start sm:self-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-right flex flex-col items-end">
                        <span className="text-[10px] text-muted-foreground/80 font-semibold uppercase tracking-wider leading-none mb-1">
                          Due Date
                        </span>
                        <div className="h-8 flex items-center justify-end">
                          <span className={cn(
                            "text-xs sm:text-[13px] whitespace-nowrap leading-none",
                            task.is_overdue && task.status !== 'DONE'
                              ? "text-destructive font-bold"
                              : task.due_date
                              ? "text-foreground font-semibold"
                              : "text-muted-foreground"
                          )}>
                            {task.due_date ? dayjs(task.due_date).format('DD MMM YYYY') : 'No due date'}
                          </span>
                        </div>
                      </div>

                      <Dropdown
                        value={task.status}
                        onChange={(val) => handleStatusChange(task.id, val as TaskStatus)}
                        options={[
                          { value: 'TODO', label: 'To Do' },
                          { value: 'IN_PROGRESS', label: 'In Progress' },
                          { value: 'IN_REVIEW', label: 'In Review' },
                          ...(userRole === 'Admin' || isHod ? [{ value: 'DONE', label: 'Done' }] : []),
                          { value: 'ON_HOLD', label: 'On Hold' },
                        ]}
                        buttonClassName={getStatusButtonClass(task.status, task.is_overdue)}
                        className="w-auto"
                      />
                    </div>
                  </div>

                  {/* Bottom Divider: Details Button (Bottom-Left) & Logged Hours, Attachments, Comments */}
                  <div className="pt-2.5 mt-auto border-t border-border/50 flex items-center justify-between gap-3 text-xs text-muted-foreground font-medium">
                    {/* Bottom-Left: Details Navigation Control */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleTaskClick(task)
                      }}
                      className="h-7 w-7 rounded-lg border border-border/80 bg-secondary/40 hover:bg-secondary hover:text-foreground text-foreground/80 shrink-0 shadow-2xs transition-all hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
                      title="Open task details"
                      aria-label={`Open details for ${task.title}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>

                    {/* Right: Metrics (Hours, Attachments, Comments) */}
                    <div className="flex items-center gap-3.5 sm:gap-4 text-xs text-muted-foreground font-medium shrink-0">
                      <div className="flex items-center gap-1.5" title="Operational hours logged">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{task.worked_hours ? `${task.worked_hours} hrs` : '0 hrs'}</span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Attachments count">
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{(task.attachments || []).length}</span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Comments count">
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{getCommentProgressText(task)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="My Tasks & Daily View"
        subtitle="Track your daily tasks, deliverables, and project workflows."
        icon={ListTodo}
        actions={
          <div
            role="radiogroup"
            aria-label="Tasks view options"
            className="flex items-center h-9 p-0.5 rounded-lg border border-border/80 bg-card shadow-xs shrink-0"
          >
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'grid'}
              aria-label="Grid view"
              title="Grid View"
              onClick={() => setViewMode('grid')}
              className={cn(
                "h-7.5 px-3 flex items-center gap-1.5 justify-center rounded-md text-xs transition-colors cursor-pointer",
                viewMode === 'grid'
                  ? "bg-foreground text-background shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Grid</span>
            </button>
            <div className="w-px h-4 bg-border/60 mx-0.5 shrink-0" aria-hidden="true" />
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'list'}
              aria-label="List view"
              title="List View"
              onClick={() => setViewMode('list')}
              className={cn(
                "h-7.5 px-3 flex items-center gap-1.5 justify-center rounded-md text-xs transition-colors cursor-pointer",
                viewMode === 'list'
                  ? "bg-foreground text-background shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium"
              )}
            >
              <List className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
          </div>
        }
      />

      {/* Filter Tabs Header */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border">
        <button
          onClick={() => setActiveTab('today')}
          className={`h-10 px-4 text-xs font-semibold rounded-t-md border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'today'
              ? 'border-primary text-foreground bg-accent/40'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          Today ({todayList.length})
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`h-10 px-4 text-xs font-semibold rounded-t-md border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'upcoming'
              ? 'border-primary text-foreground bg-accent/40'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          Upcoming ({upcomingList.length})
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`h-10 px-4 text-xs font-semibold rounded-t-md border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'pending'
              ? 'border-primary text-foreground bg-accent/40'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Pending ({pendingList.length})
        </button>

        <button
          onClick={() => setActiveTab('overdue')}
          className={`h-10 px-4 text-xs font-semibold rounded-t-md border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'overdue'
              ? 'border-destructive text-destructive bg-destructive/10'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <AlertCircle className="h-3.5 w-3.5" />
          Overdue ({overdueList.length})
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`h-10 px-4 text-xs font-semibold rounded-t-md border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'completed'
              ? 'border-primary text-foreground bg-accent/40'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Completed ({completedList.length})
        </button>

        <button
          onClick={() => setActiveTab('projects')}
          className={`h-10 px-4 text-xs font-semibold rounded-t-md border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'projects'
              ? 'border-primary text-foreground bg-accent/40'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FolderGit2 className="h-3.5 w-3.5" />
          My Projects ({displayProjects.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div>
        {activeTab === 'today' && renderTaskList(todayList, 'All clear for today!')}
        {activeTab === 'upcoming' && renderTaskList(upcomingList, 'No upcoming tasks scheduled.')}
        {activeTab === 'pending' && renderTaskList(pendingList, 'No pending tasks without deadlines.')}
        {activeTab === 'overdue' && renderTaskList(overdueList, 'Great job! Zero overdue tasks.')}
        {activeTab === 'completed' && renderTaskList(completedList, 'No completed tasks yet.')}
        {activeTab === 'projects' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayProjects.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground bg-card border border-border rounded-2xl col-span-full space-y-3">
                <Folder className="h-10 w-10 mx-auto text-muted-foreground/60" />
                <h4 className="font-semibold text-foreground text-base">No authorized projects found</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  You are not assigned to any projects currently. When you are added to a project team or assigned project tasks, they will appear here.
                </p>
              </div>
            ) : (
              displayProjects.map((p, idx) => {
                const summary = p.task_summary || {
                  total: 0,
                  todo: 0,
                  in_progress: 0,
                  in_review: 0,
                  done: 0,
                  on_hold: 0,
                }
                const totalTasks = summary.total || (summary.todo + summary.in_progress + summary.in_review + summary.done)
                const completed = summary.done
                const progress = p.progress !== undefined ? p.progress : (totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0)
                const members = p.members || []

                return (
                  <Card
                    key={p.id}
                    className="border-border/80 bg-card rounded-xl shadow-xs transition-all duration-200 hover:border-foreground/30 hover:shadow-md flex flex-col justify-between overflow-hidden group"
                  >
                    <CardContent className="p-4 sm:p-4.5 flex flex-col justify-between h-full gap-3">
                      <div>
                        {/* Top Row: Folder Icon & Task Count Badge */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="h-9 w-9 rounded-lg bg-secondary/50 border border-border/70 flex items-center justify-center shrink-0 text-foreground group-hover:text-primary transition-colors">
                            <Folder className="h-4 w-4" />
                          </div>
                          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold border-border/60 bg-secondary/30 text-foreground">
                            {totalTasks} Tasks
                          </Badge>
                        </div>

                        {/* Project Title & Metadata */}
                        <h3 className="font-bold text-base sm:text-[17px] text-foreground mt-2.5 group-hover:text-primary transition-colors truncate" title={p.name}>
                          {p.name}
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 font-mono">
                          <span>{p.project_id_display || `PRJ-${String(idx + 1).padStart(3, '0')}`}</span>
                          <span className="text-muted-foreground/50">|</span>
                          <span>Created on {p.created_at ? dayjs(p.created_at).format('DD MMM YYYY') : 'Recent'}</span>
                        </p>

                        {/* Description */}
                        {p.description?.trim() && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
                            {p.description}
                          </p>
                        )}

                        {/* Progress Bar */}
                        <div className="mt-3 space-y-1">
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <div className="flex-1 h-1.5 bg-secondary/60 rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full transition-all duration-300", getProgressBarColor(idx))}
                                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                              />
                            </div>
                            <span className="font-bold text-xs text-foreground font-mono shrink-0">
                              {progress}%
                            </span>
                          </div>
                        </div>

                        {/* Team Members */}
                        <div className="mt-3">
                          <div className="text-[11px] font-semibold text-muted-foreground">
                            Team Members ({members.length})
                          </div>
                          <div className="flex items-center -space-x-1.5 mt-1.5">
                            {members.length === 0 ? (
                              <span className="text-[11px] text-muted-foreground italic">No members assigned</span>
                            ) : (
                              <>
                                {members.slice(0, 4).map((m, mIdx) => {
                                  const name = m.profile
                                    ? `${m.profile.first_name || ''} ${m.profile.last_name || ''}`.trim()
                                    : 'Member'
                                  const initials = name
                                    ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                                    : 'U'
                                  return (
                                    <Avatar
                                      key={m.id || mIdx}
                                      title={name}
                                      className="h-7 w-7 rounded-full border-2 border-card bg-secondary text-[10px] font-bold text-foreground transition-transform hover:z-10 hover:scale-105"
                                    >
                                      {m.profile?.profile_photo && (
                                        <AvatarImage src={getProfilePhotoUrl(m.profile.profile_photo) || undefined} alt={name} />
                                      )}
                                      <AvatarFallback>{initials}</AvatarFallback>
                                    </Avatar>
                                  )
                                })}
                                {members.length > 4 && (
                                  <div
                                    title={members.slice(4).map(m => m.profile ? `${m.profile.first_name} ${m.profile.last_name}`.trim() : 'User').join(', ')}
                                    className="h-7 w-7 rounded-full border-2 border-card bg-secondary text-[10px] font-bold text-muted-foreground flex items-center justify-center z-10"
                                  >
                                    +{members.length - 4}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Full-width View Project Action */}
                      <Link
                        href={`/projects/${p.id}`}
                        className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg border border-border/70 bg-secondary/20 hover:bg-secondary/50 text-foreground text-xs font-semibold transition-all mt-2.5 group-hover:border-foreground/30"
                      >
                        <div className="flex items-center gap-2">
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>View Project</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false)
            setSelectedTask(null)
          }}
          onUpdate={(updatedTask) => {
            if (updatedTask) {
              handleTaskUpdated(updatedTask)
            }
            router.refresh()
          }}
          canManage={false}
        />
      )}
    </div>
  )
}
