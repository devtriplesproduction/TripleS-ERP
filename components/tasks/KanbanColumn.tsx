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
  onAddTask?: (status: TaskStatus) => void
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
  onAddTask,
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
      className={`flex flex-col min-w-[280px] w-[300px] max-w-[320px] shrink-0 bg-secondary/30 border rounded-lg p-3 transition-all duration-200 ${
        isOver ? 'border-foreground/50 bg-accent/40 shadow-sm' : 'border-border/60 hover:border-border'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between h-12 pb-3 mb-3 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          {status === 'TODO' && <div className="h-2 w-2 rounded-full bg-muted-foreground/60" />}
          {status === 'IN_PROGRESS' && <div className="h-2 w-2 rounded-full bg-blue-500" />}
          {status === 'IN_REVIEW' && <div className="h-2 w-2 rounded-full bg-orange-500" />}
          {status === 'DONE' && <div className="h-2 w-2 rounded-full bg-green-500" />}
          {status === 'ON_HOLD' && <div className="h-2 w-2 rounded-full bg-purple-500" />}
          <h3 className="font-semibold text-[13px] uppercase tracking-wide text-foreground font-sans">
            {title}
          </h3>
          <Badge
            variant="outline"
            className="text-[11px] px-1.5 py-0 border-border/60 bg-background/50 font-mono text-muted-foreground"
          >
            {tasks.length}
          </Badge>
        </div>
        {canManage && onAddTask && (
          <button 
            onClick={() => onAddTask(status)}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded p-1 transition-colors"
            title="Add Task"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          </button>
        )}
      </div>

      {/* Task List */}
      <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-290px)] pr-0.5 custom-scrollbar">
        {tasks.length === 0 ? (
          <div className="p-4 text-center border border-dashed border-border/40 rounded-md flex flex-col items-center justify-center gap-2 bg-background/20 h-28">
            <div className="h-6 w-6 rounded-full bg-secondary/50 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>
            </div>
            <div className="space-y-0.5">
              <p className="text-[13px] font-medium text-muted-foreground">No tasks here</p>
              <p className="text-[11px] text-muted-foreground/60">Drag a task here or create a new task.</p>
            </div>
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
