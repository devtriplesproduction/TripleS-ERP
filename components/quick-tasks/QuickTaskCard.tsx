'use client'

import React, { useState } from 'react'
import {
  Check,
  User,
  Users,
  Clock,
  MoreVertical,
  Pencil,
  Trash2,
  Ban,
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
  onDeleteTask?: (task: QuickTask) => void
  onCancelTask?: (task: QuickTask) => void
  isCompact?: boolean
}

export function QuickTaskCard({
  task,
  currentUserId,
  currentUserRole,
  onToggleComplete,
  onEditTask,
  onDeleteTask,
  onCancelTask,
  isCompact = false,
}: QuickTaskCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const isCompleted = task.status === 'Completed'
  const isCancelled = task.status === 'Cancelled'
  const isAdmin = currentUserRole === 'Admin'

  const isPersonal = Boolean(task.is_personal || task.assigned_by === task.assigned_to)
  const isOwner = task.assigned_to === currentUserId

  // Permission rules:
  // - Owners can complete their own tasks (personal or assigned)
  // - Admin can complete assigned tasks (but not others' personal tasks)
  const canComplete = (isOwner || (isAdmin && !isPersonal)) && !isCancelled

  // - Owners can edit/delete their own personal tasks
  // - Admin can edit/delete assigned tasks or admin's own tasks
  const canEdit = isPersonal ? isOwner : isAdmin
  const canDelete = isPersonal ? isOwner : isAdmin

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

  // Display text: either description or title
  const displayText = task.description || task.title || 'Untitled task'

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-200 select-none ${
        isCompleted
          ? 'bg-muted/20 border-border/40 opacity-80'
          : isCancelled
          ? 'bg-muted/10 border-border/30 opacity-60'
          : 'bg-card border-border/70 hover:border-foreground/30 hover:shadow-xs'
      } ${isCompact ? 'p-3' : 'p-3.5'}`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox / Toggle Complete button */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={!canComplete || isUpdating}
          title={
            !canComplete
              ? 'Only assigned user or owner can mark this completed'
              : isCompleted
              ? 'Mark as pending'
              : 'Mark as completed'
          }
          className={`shrink-0 mt-0.5 rounded-lg flex items-center justify-center transition-all ${
            isCompact ? 'w-5 h-5' : 'w-5.5 h-5.5'
          } ${
            isCompleted
              ? 'bg-foreground text-background cursor-pointer'
              : canComplete
              ? 'border-2 border-muted-foreground/50 hover:border-foreground hover:bg-muted/50 cursor-pointer text-transparent hover:text-muted-foreground'
              : 'border-2 border-muted/60 opacity-40 cursor-not-allowed text-transparent'
          }`}
        >
          <Check className={`${isCompact ? 'w-3.5 h-3.5' : 'w-3.5 h-3.5'} ${isCompleted ? 'stroke-[3]' : ''}`} />
        </button>

        {/* Task Details */}
        <div className="flex-1 min-w-0">
          {/* Header Row: Content & Badges & Actions */}
          <div className="flex items-start justify-between gap-2">
            <p
              className={`text-xs sm:text-sm font-medium tracking-tight break-words leading-snug whitespace-pre-wrap ${
                isCompleted
                  ? 'line-through text-muted-foreground'
                  : isCancelled
                  ? 'line-through text-muted-foreground italic'
                  : 'text-foreground'
              }`}
            >
              {displayText}
            </p>

            <div className="flex items-center gap-1.5 shrink-0 ml-1">
              {/* Personal vs Assigned badge */}
              {isPersonal ? (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-border/70 bg-muted/60 text-muted-foreground flex items-center gap-1 leading-none shrink-0">
                  <User className="w-2.5 h-2.5" />
                  Personal
                </span>
              ) : (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-border/60 bg-muted/40 text-muted-foreground flex items-center gap-1 leading-none shrink-0">
                  <Users className="w-2.5 h-2.5" />
                  Assigned
                </span>
              )}

              {/* Status badge if Cancelled */}
              {isCancelled && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-destructive/30 bg-destructive/10 text-destructive leading-none">
                  Cancelled
                </span>
              )}

              {/* Options Menu (Edit / Delete / Cancel) */}
              {(canEdit || canDelete) && !isCancelled && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors outline-none cursor-pointer"
                    aria-label="Task options"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36 text-xs">
                    {onEditTask && canEdit && (
                      <DropdownMenuItem
                        onClick={() => onEditTask(task)}
                        className="cursor-pointer gap-2"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit Task</span>
                      </DropdownMenuItem>
                    )}
                    {isAdmin && !isPersonal && onCancelTask && !isCompleted && (
                      <DropdownMenuItem
                        onClick={() => onCancelTask(task)}
                        className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Cancel Task</span>
                      </DropdownMenuItem>
                    )}
                    {onDeleteTask && canDelete && (
                      <DropdownMenuItem
                        onClick={() => onDeleteTask(task)}
                        className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Task</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Metadata Footer: Personal or Assigned details & Completed Timestamp */}
          <div className="mt-2 pt-2 border-t border-border/30 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
            {isPersonal ? (
              <div className="flex items-center gap-1 text-muted-foreground/80">
                <User className="w-3 h-3 text-muted-foreground/60" />
                <span>Personal task</span>
              </div>
            ) : (
              <>
                {/* Assigned by */}
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground/70">By:</span>
                  <span className="font-medium text-foreground">
                    {task.assigned_by_name || 'Admin'}
                  </span>
                </div>

                {/* Assigned to */}
                {task.assigned_to_name && (
                  <div className="flex items-center gap-1 border-l border-border/40 pl-2.5">
                    <span className="text-muted-foreground/70">To:</span>
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
              </>
            )}

            {/* Completed timestamp */}
            {isCompleted && task.completed_at && (
              <div className="flex items-center gap-1 border-l border-border/40 pl-2.5 text-foreground/80 font-medium ml-auto">
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
