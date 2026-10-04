'use client'

import { useState } from 'react'
import { Task, TaskStatus, Project } from '@/types/project-management'
import { AssignableEmployee } from '@/lib/actions/team'
import { KanbanColumn } from './KanbanColumn'
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

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.task_id_display.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(search.toLowerCase())

    const matchesProject =
      selectedProjectId === 'ALL' || t.project_id === selectedProjectId

    return matchesSearch && matchesProject
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Kanban className="h-7 w-7 text-foreground" />
            Tasks & Kanban Board
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drag and drop tasks between workflow columns to track operational delivery.
          </p>
        </div>

        {canManage && (
          <Button
            onClick={() => {
              setTaskToEdit(null)
              setIsCreateOpen(true)
            }}
            className="w-full sm:w-auto h-11 px-5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks by title, ID, or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border h-11"
          />
        </div>

        <div className="w-full sm:w-64">
          <Dropdown
            value={selectedProjectId}
            onChange={(val) => setSelectedProjectId(val || 'ALL')}
            options={[
              { value: 'ALL', label: 'All Projects' },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
            ]}
            buttonClassName="bg-card border-border h-11 text-xs"
            className="w-full"
          />
        </div>
      </div>

      {/* Kanban Columns Horizontal Container */}
      <div className="w-full overflow-x-auto pb-4 pt-1">
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
              />
            )
          })}
        </div>
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
          }}
          onSuccess={handleSuccess}
          projects={projects}
          employees={employees}
          defaultProjectId={selectedProjectId !== 'ALL' ? selectedProjectId : defaultProjectId}
          taskToEdit={taskToEdit}
        />
      )}
    </div>
  )
}
