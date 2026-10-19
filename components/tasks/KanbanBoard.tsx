'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Task, TaskStatus, Project } from '@/types/project-management'
import { AssignableEmployee } from '@/lib/actions/team'
import { KanbanColumn } from './KanbanColumn'
import { TaskDetailsModal } from './TaskDetailsModal'
import { TaskFormModal } from './TaskFormModal'
import { Dropdown } from '@/components/ui/Dropdown'
import { updateTaskStatusAction } from '@/lib/actions/tasks'
import { Kanban, Columns3, Workflow, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { TaskGanttView } from './TaskGanttView'
import { TaskCalendarView } from './TaskCalendarView'
import { PageHeader } from '@/components/PageHeader'

interface KanbanBoardProps {
  initialTasks: Task[]
  projects: Array<{ id: string; name: string }>
  employees: AssignableEmployee[]
  canManage: boolean
  defaultProjectId?: string
}

type ViewMode = 'kanban' | 'gantt' | 'calendar'

const COLUMNS: { status: TaskStatus; title: string }[] = [
  { status: 'TODO', title: 'To Do' },
  { status: 'IN_PROGRESS', title: 'In Progress' },
  { status: 'IN_REVIEW', title: 'In Review' },
  { status: 'DONE', title: 'Done' },
  { status: 'ON_HOLD', title: 'On Hold' },
]

export function KanbanBoard({
  initialTasks,
  projects,
  employees,
  canManage,
  defaultProjectId,
}: KanbanBoardProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [selectedProjectId] = useState<string>(defaultProjectId || 'ALL')
  const [selectedAssignee, setSelectedAssignee] = useState<string>('ALL')
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)
  const [defaultStatusForNew, setDefaultStatusForNew] = useState<TaskStatus | undefined>('TODO')

  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  const filteredTasks = tasks.filter((t) => {
    const matchesProject = selectedProjectId === 'ALL' || t.project_id === selectedProjectId
    const matchesAssignee = selectedAssignee === 'ALL' || (t.assignees?.some(a => a.user_id === selectedAssignee) ?? false)
    const matchesPriority = selectedPriority === 'ALL' || t.priority === selectedPriority
    const matchesStatus = selectedStatus === 'ALL' || t.status === selectedStatus

    return matchesProject && matchesAssignee && matchesPriority && matchesStatus
  })

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId)
  }

  const handleDropTask = async (taskId: string, targetStatus: TaskStatus) => {
    const currentTask = tasks.find((t) => t.id === taskId)
    if (!currentTask || currentTask.status === targetStatus) return

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    )

    try {
      const res = await updateTaskStatusAction(taskId, targetStatus)
      if (!res.success) {
        toast.error(res.error || 'Failed to update task status.')
        // Rollback
        setTasks(initialTasks)
      } else {
        toast.success(`Task moved to ${targetStatus.replace('_', ' ')}`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating status')
      setTasks(initialTasks)
    }
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setIsDetailsOpen(true)
  }

  const handleEditTaskFromDetails = (task: Task) => {
    setTaskToEdit(task)
    setIsCreateOpen(true)
  }

  const handleSuccess = (updatedOrNewTask?: Task) => {
    if (updatedOrNewTask) {
      const isExisting = tasks.some((t) => t.id === updatedOrNewTask.id)
      setTasks((prev) => {
        const exists = prev.some((t) => t.id === updatedOrNewTask.id)
        if (exists) {
          return prev.map((t) => (t.id === updatedOrNewTask.id ? { ...t, ...updatedOrNewTask } : t))
        }
        return [updatedOrNewTask, ...prev]
      })

      if (selectedTask?.id === updatedOrNewTask.id) {
        setSelectedTask(updatedOrNewTask)
      }

      if (!isExisting && selectedStatus !== 'ALL' && selectedStatus !== 'TODO') {
        setSelectedStatus('ALL')
      }
    }
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks Board"
        subtitle="Manage project tasks with a visual workflow."
        icon={Kanban}
        actions={
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
            {/* Segmented View Switcher: Kanban | Gantt | Calendar */}
            <div
              role="radiogroup"
              aria-label="Tasks view options"
              className="flex items-center h-9 p-0.5 rounded-lg border border-border/80 bg-card shadow-xs shrink-0"
            >
              <button
                type="button"
                role="radio"
                aria-checked={viewMode === 'kanban'}
                aria-label="Kanban board view"
                title="Kanban Board"
                onClick={() => setViewMode('kanban')}
                className={`h-7.5 w-8 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-secondary text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Columns3 className="h-4 w-4" />
              </button>

              <div className="w-px h-4 bg-border/60 mx-0.5 shrink-0" aria-hidden="true" />

              <button
                type="button"
                role="radio"
                aria-checked={viewMode === 'gantt'}
                aria-label="Gantt chart view"
                title="Gantt Chart"
                onClick={() => setViewMode('gantt')}
                className={`h-7.5 w-8 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                  viewMode === 'gantt'
                    ? 'bg-secondary text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Workflow className="h-4 w-4" />
              </button>

              <div className="w-px h-4 bg-border/60 mx-0.5 shrink-0" aria-hidden="true" />

              <button
                type="button"
                role="radio"
                aria-checked={viewMode === 'calendar'}
                aria-label="Calendar view"
                title="Calendar View"
                onClick={() => setViewMode('calendar')}
                className={`h-7.5 w-8 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-secondary text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Calendar className="h-4 w-4" />
              </button>
            </div>

            {/* All Assignees Filter */}
            <Dropdown
              value={selectedAssignee}
              onChange={(val) => setSelectedAssignee(val || 'ALL')}
              options={[
                { value: 'ALL', label: 'All Assignees' },
                ...employees.map((e) => ({ value: e.id, label: e.name })),
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

            {/* All Status Filter */}
            <Dropdown
              value={selectedStatus}
              onChange={(val) => setSelectedStatus(val || 'ALL')}
              options={[
                { value: 'ALL', label: 'All Status' },
                { value: 'TODO', label: 'To Do' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'IN_REVIEW', label: 'In Review' },
                { value: 'DONE', label: 'Done' },
                { value: 'ON_HOLD', label: 'On Hold' },
              ]}
              className="w-auto space-y-0 shrink-0"
              buttonClassName="!h-9 !min-h-[36px] !max-h-[36px] !text-xs px-3 rounded-lg border-border/80 bg-card font-normal min-w-[110px] shadow-xs hover:border-foreground/30 transition-colors"
            />
          </div>
        }
      />

      {/* Active View Container */}
      {viewMode === 'kanban' && (
        <div className="w-full overflow-x-auto pb-6 pt-2 custom-scrollbar">
          <div className="flex items-start gap-4 min-w-max">
            {COLUMNS.map((col) => {
              const colTasks = filteredTasks.filter((t) => t.status === col.status)
              return (
                <KanbanColumn
                  key={col.status}
                  status={col.status}
                  title={col.title}
                  tasks={colTasks}
                  onTaskClick={handleTaskClick}
                  onDragStart={handleDragStart}
                  onDropTask={handleDropTask}
                  canManage={canManage}
                  onQuickStatusChange={handleDropTask}
                  onAddTask={
                    col.status === 'TODO'
                      ? () => {
                          setTaskToEdit(null)
                          setDefaultStatusForNew('TODO')
                          setIsCreateOpen(true)
                        }
                      : undefined
                  }
                />
              )
            })}
          </div>
        </div>
      )}

      {viewMode === 'gantt' && (
        <div className="w-full pt-2">
          <TaskGanttView
            tasks={filteredTasks}
            onTaskClick={handleTaskClick}
            canManage={canManage}
          />
        </div>
      )}

      {viewMode === 'calendar' && (
        <div className="w-full pt-2">
          <TaskCalendarView
            tasks={filteredTasks}
            onTaskClick={handleTaskClick}
            canManage={canManage}
          />
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false)
            setSelectedTask(null)
          }}
          onUpdate={handleSuccess}
          canManage={canManage}
          onEditTask={handleEditTaskFromDetails}
        />
      )}

      {/* Task Create / Edit Modal */}
      {isCreateOpen && (
        <TaskFormModal
          isOpen={isCreateOpen}
          onClose={() => {
            setIsCreateOpen(false)
            setTaskToEdit(null)
            setDefaultStatusForNew('TODO')
          }}
          onSuccess={handleSuccess}
          projects={projects}
          employees={employees}
          defaultProjectId={selectedProjectId !== 'ALL' ? selectedProjectId : defaultProjectId}
          defaultStatus={defaultStatusForNew}
          taskToEdit={taskToEdit}
        />
      )}
    </div>
  )
}
