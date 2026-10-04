'use client'

import { useState } from 'react'
import { Task, TaskStatus } from '@/types/project-management'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  ChevronRight,
  ListTodo,
} from 'lucide-react'
import dayjs from 'dayjs'
import { toast } from 'sonner'

interface MyTasksViewProps {
  todayTasks: Task[]
  pendingTasks: Task[]
  overdueTasks: Task[]
  recentlyAssignedTasks: Task[]
  completedTasks: Task[]
  userProjects: Array<{ id: string; name: string; taskCount: number }>
}

type TabType = 'today' | 'upcoming' | 'overdue' | 'completed' | 'projects'

export function MyTasksView({
  todayTasks,
  pendingTasks,
  overdueTasks,
  recentlyAssignedTasks,
  completedTasks,
  userProjects,
}: MyTasksViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('today')
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

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'border-destructive text-destructive font-bold'
      case 'HIGH':
        return 'border-foreground/80 text-foreground font-semibold'
      case 'MEDIUM':
        return 'border-border text-foreground'
      default:
        return 'border-border text-muted-foreground'
    }
  }

  const renderTaskList = (tasks: Task[], emptyMessage: string) => {
    if (tasks.length === 0) {
      return (
        <div className="p-12 text-center text-muted-foreground bg-card border border-border rounded-lg space-y-2">
          <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground/60" />
          <h4 className="font-semibold text-foreground">{emptyMessage}</h4>
          <p className="text-xs">You have no tasks in this queue right now.</p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {tasks.map((task) => (
          <Card
            key={task.id}
            className={`border-border bg-card shadow-xs transition-colors hover:border-foreground/40 cursor-pointer ${
              task.is_overdue ? 'border-destructive/40' : ''
            }`}
            onClick={() => handleTaskClick(task)}
          >
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-semibold text-muted-foreground">
                    {task.task_id_display}
                  </span>
                  <Badge variant="outline" className={`text-[10px] px-2 py-0 ${getPriorityVariant(task.priority)}`}>
                    {task.priority}
                  </Badge>
                  {task.is_overdue && (
                    <Badge className="text-[10px] px-2 py-0 bg-destructive text-destructive-foreground">
                      Overdue
                    </Badge>
                  )}
                  {task.project_name && (
                    <span className="text-xs text-muted-foreground">• {task.project_name}</span>
                  )}
                </div>

                <h4 className="font-semibold text-base text-foreground leading-snug">
                  {task.title}
                </h4>

                {task.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {task.description}
                  </p>
                )}
              </div>

              {/* Status and Action Buttons */}
              <div
                className="flex items-center gap-3 shrink-0 self-start sm:self-center"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-right text-xs space-y-0.5 hidden md:block">
                  <span className="text-muted-foreground block text-[11px]">Due Date</span>
                  <span className={task.is_overdue ? 'text-destructive font-bold' : 'text-foreground font-medium'}>
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
                    { value: 'DONE', label: 'Done' },
                    { value: 'ON_HOLD', label: 'On Hold' },
                  ]}
                  buttonClassName="h-8 text-xs bg-secondary/40 border-border min-w-[120px]"
                  className="w-auto"
                />

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTaskClick(task)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
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
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ListTodo className="h-7 w-7 text-foreground" />
          My Tasks & Daily View
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review your personal task schedule, pending deliverables, and assigned project workflows.
        </p>
      </div>

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
          Upcoming / Pending ({pendingTasks.length})
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
          My Projects ({userProjects.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div>
        {activeTab === 'today' && renderTaskList(todayTasks, 'All clear for today!')}
        {activeTab === 'upcoming' && renderTaskList(pendingTasks, 'No pending tasks scheduled.')}
        {activeTab === 'overdue' && renderTaskList(overdueTasks, 'Great job! Zero overdue tasks.')}
        {activeTab === 'completed' && renderTaskList(completedTasks, 'No completed tasks yet.')}
        {activeTab === 'projects' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {userProjects.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground bg-card border border-border rounded-lg col-span-full">
                You are not assigned to any projects currently.
              </div>
            ) : (
              userProjects.map((p) => (
                <Card key={p.id} className="border-border bg-card shadow-xs">
                  <CardContent className="p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <FolderGit2 className="h-5 w-5 text-foreground" />
                      <Badge variant="outline" className="border-border text-xs">
                        {p.taskCount} Tasks
                      </Badge>
                    </div>
                    <h4 className="font-bold text-base text-foreground mt-2">{p.name}</h4>
                  </CardContent>
                </Card>
              ))
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
