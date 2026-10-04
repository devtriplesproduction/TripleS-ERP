'use client'

import { useState } from 'react'
import { Task, TaskStatus } from '@/types/project-management'
import { TaskCard } from './TaskCard'
import { Badge } from '@/components/ui/badge'

interface KanbanColumnProps {
  status: TaskStatus
  title: string
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onDragStart: (e: React.DragEvent, taskId: string) => void
  onDropTask: (taskId: string, targetStatus: TaskStatus) => void
  canManage: boolean
  onQuickStatusChange: (taskId: string, newStatus: TaskStatus) => void
}

export function KanbanColumn({
  status,
  title,
  tasks,
  onTaskClick,
  onDragStart,
  onDropTask,
  canManage,
  onQuickStatusChange,
}: KanbanColumnProps) {
  const [isOver, setIsOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!isOver) setIsOver(true)
  }

  const handleDragLeave = () => {
    setIsOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(false)
    const taskId = e.dataTransfer.getData('text/plain')
    if (taskId) {
      onDropTask(taskId, status)
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col min-w-[280px] max-w-[320px] w-full shrink-0 bg-secondary/30 border rounded-lg p-3 transition-colors ${
        isOver ? 'border-foreground bg-accent/30' : 'border-border'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
            {title}
          </h3>
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 border-border bg-card font-mono text-muted-foreground"
          >
            {tasks.length}
          </Badge>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)] pr-0.5">
        {tasks.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-border/80 rounded-md text-xs text-muted-foreground">
            No tasks here
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              onDragStart={onDragStart}
              canManage={canManage}
              onStatusChange={onQuickStatusChange}
            />
          ))
        )}
      </div>
    </div>
  )
}
