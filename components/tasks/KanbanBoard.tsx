'use client'

import { useState } from 'react'
import { Task, TaskStatus, Project } from '@/types/project-management'
import { AssignableEmployee } from '@/lib/actions/team'
import { KanbanColumn } from './KanbanColumn'
import { TaskCard } from './TaskCard'
import { TaskDetailsModal } from './TaskDetailsModal'
import { TaskModal } from './TaskModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dropdown } from '@/components/ui/Dropdown'
import { updateTaskStatusAction } from '@/lib/actions/tasks'
import { Plus, Search, Kanban, Filter } from 'lucide-react'
import { toast } from 'sonner'

interface KanbanBoardProps {
  initialTasks: Task[]
  projects: Array<{ id: string; name: string }>
  employees: AssignableEmployee[]
  canManage: boolean
  defaultProjectId?: string
}

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
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [search, setSearch] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState<string>(defaultProjectId || 'ALL')
  const [selectedAssignee, setSelectedAssignee] = useState<string>('ALL')
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)
  const [defaultStatusForNew, setDefaultStatusForNew] = useState<TaskStatus | undefined>(undefined)

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.task_id_display.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(search.toLowerCase())

    const matchesProject = selectedProjectId === 'ALL' || t.project_id === selectedProjectId
    const matchesAssignee = selectedAssignee === 'ALL' || (t.assignees?.some(a => a.user_id === selectedAssignee) ?? false)
    const matchesPriority = selectedPriority === 'ALL' || t.priority === selectedPriority
    const matchesStatus = selectedStatus === 'ALL' || t.status === selectedStatus

    return matchesSearch && matchesProject && matchesAssignee && matchesPriority && matchesStatus
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

  const handleSuccess = () => {
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3 font-sans">
            <div className="flex items-center justify-center bg-card border border-border p-1.5 rounded-md shadow-xs">
              <Kanban className="h-6 w-6 text-foreground" />
            </div>
            Tasks & Kanban Board
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Manage and track project tasks with a visual workflow.
          </p>
        </div>

        {canManage && (
          <Button
            onClick={() => {
              setTaskToEdit(null)
              setDefaultStatusForNew(undefined)
              setIsCreateOpen(true)
            }}
            className="w-full sm:w-auto h-11 px-5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center bg-card border border-border p-3 rounded-lg shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks by title, ID, or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background border-border h-10"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap">
          <Dropdown
            value={selectedProjectId}
            onChange={(val) => setSelectedProjectId(val || 'ALL')}
            options={[
              { value: 'ALL', label: 'All Projects' },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
            ]}
            buttonClassName="bg-background border-border h-10 text-xs min-w-[140px]"
          />
          <Dropdown
            value={selectedAssignee}
            onChange={(val) => setSelectedAssignee(val || 'ALL')}
            options={[
              { value: 'ALL', label: 'All Assignees' },
              ...employees.map((e) => ({ value: e.id, label: e.name })),
            ]}
            buttonClassName="bg-background border-border h-10 text-xs min-w-[140px]"
          />
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
            buttonClassName="bg-background border-border h-10 text-xs min-w-[120px]"
          />
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
            buttonClassName="bg-background border-border h-10 text-xs min-w-[120px]"
          />

          <div className="flex items-center bg-background border border-border rounded-md p-1 shrink-0">
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
                viewMode === 'board' ? 'bg-secondary text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
                viewMode === 'list' ? 'bg-secondary text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'board' ? (
        /* Kanban Columns Horizontal Container */
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
                  onAddTask={(status) => {
                    setTaskToEdit(null)
                    setDefaultStatusForNew(status)
                    setIsCreateOpen(true)
                  }}
                />
              )
            })}
          </div>
        </div>
      ) : (
        /* List View (Grid of Cards) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-6 pt-2">
          {filteredTasks.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground bg-secondary/20 rounded-lg border border-border/50">
              No tasks found.
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div key={task.id} className="h-full">
                <TaskCard
                  task={task}
                  onClick={() => handleTaskClick(task)}
                  canManage={canManage}
                />
              </div>
            ))
          )}
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
        <TaskModal
          isOpen={isCreateOpen}
          onClose={() => {
            setIsCreateOpen(false)
            setTaskToEdit(null)
            setDefaultStatusForNew(undefined)
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
