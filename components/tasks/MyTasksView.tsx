'use client'

import { useState } from 'react'
import Link from 'next/link'
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
}: MyTasksViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('today')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setIsDetailsOpen(true)
  }

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const res = await updateTaskStatusAction(taskId, newStatus)
      if (!res.success) {
        toast.error(res.error || 'Failed to update task status.')
      } else {
        toast.success(`Task moved to ${newStatus.replace('_', ' ')}`)
        window.location.reload()
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating status')
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

    return (
      <div className={viewMode === 'list' ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"}>
        {tasks.map((task) => (
          <Card
            key={task.id}
            className={cn(
              "border-border/80 bg-card rounded-xl shadow-xs transition-all duration-200 hover:border-foreground/30 hover:shadow-sm cursor-pointer flex flex-col justify-between overflow-hidden group",
              task.is_overdue && task.status !== 'DONE' && "border-destructive/40 hover:border-destructive/60"
            )}
            onClick={() => handleTaskClick(task)}
          >
            <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full gap-3">
              {/* Top Row: Task ID, Priority, Project */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="font-mono text-xs font-semibold text-muted-foreground">
                  {task.task_id_display}
                </span>
                <span className={cn(
                  "text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border",
                  getPriorityBadgeStyle(task.priority)
                )}>
                  {task.priority}
                </span>
                <span className="text-muted-foreground/60">·</span>
                <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={getProjectDisplayName(task)}>
                  {getProjectDisplayName(task)}
                </span>
              </div>

              {/* Middle Section: Title/Desc (Left) & Due Date/Status/Arrow (Right) */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 my-0.5 flex-1">
                {/* Left: Title & Description */}
                <div className="flex-1 min-w-0 pr-1">
                  <h4 className="font-bold text-base sm:text-[17px] text-foreground leading-snug truncate" title={task.title}>
                    {task.title}
                  </h4>
                  <p className="text-xs sm:text-[13px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed break-words">
                    {task.description?.trim() ? task.description : 'No description provided.'}
                  </p>
                </div>

                {/* Right: Due Date, Status Dropdown, Arrow Button */}
                <div
                  className="flex items-center gap-2 sm:gap-3 shrink-0 self-start sm:self-center mt-1 sm:mt-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">
                      Due Date
                    </span>
                    <span className={cn(
                      "text-xs sm:text-[13px] block whitespace-nowrap",
                      task.is_overdue && task.status !== 'DONE'
                        ? "text-destructive font-bold"
                        : task.due_date
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    )}>
                      {task.due_date ? dayjs(task.due_date).format('DD MMM YYYY') : 'No due date'}
                    </span>
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

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleTaskClick(task)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-lg shrink-0 transition-transform group-hover:translate-x-0.5"
                    aria-label="View task details"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Bottom Divider: Logged Hours, Attachments, Comments */}
              <div className="pt-3 mt-auto border-t border-border/50 flex items-center gap-5 text-xs text-muted-foreground font-medium">
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
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="My Tasks & Daily View"
        subtitle="Review your personal task schedule, pending deliverables, and assigned project workflows."
        icon={ListTodo}
        actions={
          <div className="flex items-center bg-secondary/30 p-1 rounded-xl border border-border shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                viewMode === 'grid'
                  ? "bg-foreground text-background shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                viewMode === 'list'
                  ? "bg-foreground text-background shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="h-3.5 w-3.5" />
              List
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
          Today ({todayTasks.length})
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
          Upcoming ({upcomingTasks.length})
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
          Pending ({pendingTasks.length})
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
          Overdue ({overdueTasks.length})
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
          Completed ({completedTasks.length})
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
        {activeTab === 'today' && renderTaskList(todayTasks, 'All clear for today!')}
        {activeTab === 'upcoming' && renderTaskList(upcomingTasks, 'No upcoming tasks scheduled.')}
        {activeTab === 'pending' && renderTaskList(pendingTasks, 'No pending tasks without deadlines.')}
        {activeTab === 'overdue' && renderTaskList(overdueTasks, 'Great job! Zero overdue tasks.')}
        {activeTab === 'completed' && renderTaskList(completedTasks, 'No completed tasks yet.')}
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
          onUpdate={() => window.location.reload()}
          canManage={false}
        />
      )}
    </div>
  )
}
