'use client'

import React, { useState } from 'react'
import {
  Check,
  Calendar,
  User,
  Clock,
  MoreVertical,
  Pencil,
  Ban,
  CheckCircle2,
  Circle,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { QuickTask } from '@/types/quick-tasks'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

interface QuickTaskCardProps {
  task: QuickTask
  currentUserId: string
  currentUserRole: string
  onToggleComplete: (task: QuickTask) => void
  onEditTask?: (task: QuickTask) => void
  onCancelTask?: (task: QuickTask) => void
  isCompact?: boolean
}

export function QuickTaskCard({
  task,
  currentUserId,
  currentUserRole,
  onToggleComplete,
  onEditTask,
  onCancelTask,
  isCompact = false,
}: QuickTaskCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const isCompleted = task.status === 'Completed'
  const isCancelled = task.status === 'Cancelled'
  const isAdmin = currentUserRole === 'Admin'
  const isAssignedToMe = task.assigned_to === currentUserId
  // Allowed to complete if assigned to me or if Admin
  const canComplete = (isAssignedToMe || isAdmin) && !isCancelled

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!canComplete || isUpdating) return
    setIsUpdating(true)
    try {
      await onToggleComplete(task)
    } finally {
      setIsUpdating(false)
    }
  }

  // Format due date & check overdue
  const isOverdue =
    task.due_date &&
    !isCompleted &&
    !isCancelled &&
    dayjs(task.due_date).isBefore(dayjs(), 'day')

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-200 select-none ${
        isCompleted
          ? 'bg-muted/20 border-border/40 opacity-80'
          : isCancelled
          ? 'bg-muted/10 border-border/30 opacity-60'
          : 'bg-card border-border/70 hover:border-foreground/30 hover:shadow-xs'
      } ${isCompact ? 'p-3' : 'p-4'}`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox / Toggle Complete button */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={!canComplete || isUpdating}
          title={
            !canComplete
              ? 'Only assigned user can mark this completed'
              : isCompleted
              ? 'Mark as pending'
              : 'Mark as completed'
          }
          className={`shrink-0 mt-0.5 rounded-lg flex items-center justify-center transition-all ${
            isCompact ? 'w-5 h-5' : 'w-6 h-6'
          } ${
            isCompleted
              ? 'bg-foreground text-background cursor-pointer'
              : canComplete
              ? 'border-2 border-muted-foreground/50 hover:border-foreground hover:bg-muted/50 cursor-pointer text-transparent hover:text-muted-foreground'
              : 'border-2 border-muted/60 opacity-40 cursor-not-allowed text-transparent'
          }`}
        >
          <Check className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${isCompleted ? 'stroke-[3]' : ''}`} />
        </button>

        {/* Task Details */}
        <div className="flex-1 min-w-0">
          {/* Header Row: Title & Priority & Actions */}
          <div className="flex items-start justify-between gap-2">
            <h4
              className={`text-xs sm:text-sm font-semibold tracking-tight break-words ${
                isCompleted
                  ? 'line-through text-muted-foreground'
                  : isCancelled
                  ? 'line-through text-muted-foreground italic'
                  : 'text-foreground'
              }`}
            >
              {task.title}
            </h4>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Priority badge */}
              <span
                className={`text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded border leading-none ${
                  task.priority === 'High'
                    ? 'border-foreground/40 bg-foreground/10 text-foreground'
                    : task.priority === 'Medium'
                    ? 'border-border bg-muted/60 text-muted-foreground'
                    : 'border-border/60 bg-muted/30 text-muted-foreground/80'
                }`}
              >
                {task.priority}
              </span>

              {/* Status badge if Cancelled or Completed */}
              {isCancelled && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-destructive/30 bg-destructive/10 text-destructive leading-none">
                  Cancelled
                </span>
              )}

              {/* Admin Menu */}
              {isAdmin && !isCancelled && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors outline-none cursor-pointer"
                    aria-label="Task options"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36 text-xs">
                    {onEditTask && (
                      <DropdownMenuItem
                        onClick={() => onEditTask(task)}
                        className="cursor-pointer gap-2"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit Task</span>
                      </DropdownMenuItem>
                    )}
                    {onCancelTask && !isCompleted && (
                      <DropdownMenuItem
                        onClick={() => onCancelTask(task)}
                        className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Cancel Task</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <p
              className={`mt-1 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed ${
                isCompleted ? 'opacity-70' : ''
              }`}
            >
              {task.description}
            </p>
          )}

          {/* Metadata Footer: Assignees, Due Date, Completed Timestamp */}
          <div className="mt-2.5 pt-2 border-t border-border/40 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
            {/* Assigned by */}
            <div className="flex items-center gap-1">
              <User className="w-3 h-3 text-muted-foreground/70" />
              <span>By:</span>
              <span className="font-medium text-foreground">
                {task.assigned_by_name || 'Admin'}
              </span>
            </div>

            {/* Assigned to (crucial for Admin view) */}
            {isAdmin && task.assigned_to_name && (
              <div className="flex items-center gap-1 border-l border-border/40 pl-2.5">
                <span className="text-muted-foreground/80">To:</span>
                <span className="font-medium text-foreground">
                  {task.assigned_to_name}
                </span>
                {task.assigned_to_department && (
                  <span className="text-[10px] text-muted-foreground/70">
                    ({task.assigned_to_department})
                  </span>
                )}
              </div>
            )}

            {/* Due Date */}
            {task.due_date && (
              <div
                className={`flex items-center gap-1 border-l border-border/40 pl-2.5 ${
                  isOverdue ? 'text-destructive font-medium' : ''
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>
                  Due: {dayjs(task.due_date).format('MMM D, YYYY')}
                  {isOverdue && ' (Overdue)'}
                </span>
              </div>
            )}

            {/* Completed timestamp */}
            {isCompleted && task.completed_at && (
              <div className="flex items-center gap-1 border-l border-border/40 pl-2.5 text-foreground/80 font-medium">
                <Clock className="w-3 h-3" />
                <span>
                  Done {dayjs(task.completed_at).format('MMM D, h:mm A')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
