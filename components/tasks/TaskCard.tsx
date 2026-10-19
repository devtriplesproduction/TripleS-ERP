'use client'

import { Task, TaskStatus } from '@/types/project-management'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, MessageSquare, Clock } from 'lucide-react'
import dayjs from 'dayjs'
import { getProfilePhotoUrl } from '@/lib/utils/profile-photos'
import { cn } from '@/lib/utils'

interface TaskCardProps {
  task: Task
  onClick: () => void
  onDragStart?: (e: React.DragEvent, taskId: string) => void
  canManage: boolean
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void
}

export function TaskCard({ task, onClick, onDragStart }: TaskCardProps) {
  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'border-red-500/60 bg-red-500/10 text-red-500 font-bold'
      case 'HIGH':
        return 'border-red-500/50 bg-red-500/10 text-red-400 font-bold'
      case 'MEDIUM':
        return 'border-amber-500/60 bg-amber-500/10 text-amber-500 font-bold'
      case 'LOW':
        return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-bold'
      default:
        return 'border-border/60 bg-secondary/30 text-muted-foreground font-semibold'
    }
  }

  const assignees = task.assignees || []

  // Business timezone due date check
  const getISTDate = (daysAdd = 0) => {
    const d = new Date()
    d.setDate(d.getDate() + daysAdd)
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  }
  const tomorrowStr = getISTDate(1)
  const isTomorrow = task.due_date ? task.due_date.substring(0, 10) === tomorrowStr : false

  const hasBottomRow = Boolean(
    task.due_date || (task.comments_count || 0) > 0 || task.worked_hours || assignees.length > 0
  )

  return (
    <div
      draggable={true}
      onDragStart={(e) => onDragStart && onDragStart(e, task.id)}
      className="border border-border/70 bg-card rounded-xl px-3.5 py-2.5 sm:py-3 shadow-xs hover:shadow-sm hover:border-border hover:bg-accent/5 transition-all duration-200 cursor-pointer group flex flex-col justify-between gap-2.5 select-none"
      onClick={onClick}
    >
      {/* Header Row: Title on Left, Priority Badge on Right */}
      <div className="flex items-center justify-between gap-2.5 min-w-0 w-full">
        <h4
          className="font-bold text-[14px] sm:text-[15px] text-foreground tracking-tight truncate min-w-0 flex-1 leading-snug"
          title={task.project_name ? `${task.title} (${task.project_name})` : task.title}
        >
          {task.title}
        </h4>

        {/* Priority Badge with square-corner style (3-4px border radius) */}
        <span
          className={cn(
            "text-[10px] sm:text-[11px] px-2 py-0.5 rounded-[3.5px] border shrink-0 uppercase tracking-wider font-bold leading-none inline-flex items-center justify-center",
            getPriorityVariant(task.priority)
          )}
        >
          {task.priority}
        </span>
      </div>

      {/* Bottom Row: Metadata & Assignees (Aligned neatly below the title) */}
      {hasBottomRow && (
        <div className="flex items-center justify-between gap-2 pt-0.5 min-h-[22px]">
          {/* Metadata: Due Date, Comments, Tracked Hours */}
          <div className="flex items-center gap-3 text-xs sm:text-[12.5px] font-medium shrink-0">
            {/* Due Date */}
            {task.due_date && (
              <span
                className={cn(
                  "flex items-center gap-1.5",
                  task.is_overdue && task.status !== 'DONE'
                    ? "text-red-500 font-bold"
                    : isTomorrow && task.status !== 'DONE'
                    ? "text-orange-500 font-semibold"
                    : "text-muted-foreground"
                )}
              >
                {task.is_overdue && task.status !== 'DONE' ? (
                  <span className="h-2 w-2 rounded-full bg-red-500 shrink-0 inline-block" />
                ) : isTomorrow && task.status !== 'DONE' ? (
                  <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0 inline-block" />
                ) : (
                  <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" />
                )}
                <span>{dayjs(task.due_date).format('MMM DD')}</span>
              </span>
            )}

            {/* Comments Count */}
            {(task.comments_count || 0) > 0 && (
              <span className="flex items-center gap-1.5 text-muted-foreground/85">
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span>{task.comments_count}</span>
              </span>
            )}

            {/* Tracked / Worked Operational Hours */}
            {task.worked_hours ? (
              <span className="flex items-center gap-1.5 text-muted-foreground/85 font-mono">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>{task.worked_hours}h</span>
              </span>
            ) : null}
          </div>

          {/* Assignees Avatars Stack */}
          {assignees.length > 0 && (
            <div className="flex items-center -space-x-1.5 overflow-hidden shrink-0 ml-auto">
              {assignees.slice(0, 3).map((a, idx) => {
                const name = a.profile ? `${a.profile.first_name || ''} ${a.profile.last_name || ''}`.trim() : 'User'
                const firstInitial = a.profile?.first_name?.charAt(0) || ''
                const lastInitial = a.profile?.last_name?.charAt(0) || ''
                const initials = (firstInitial && lastInitial ? `${firstInitial}${lastInitial}` : name.slice(0, 2)).toUpperCase()
                return (
                  <Avatar
                    key={idx}
                    title={name}
                    className="h-6 w-6 sm:h-6.5 sm:w-6.5 border-2 border-card bg-secondary text-[9px] hover:z-10 transition-transform"
                  >
                    {a.profile?.profile_photo && (
                      <AvatarImage src={getProfilePhotoUrl(a.profile.profile_photo) || undefined} alt={name} />
                    )}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                )
              })}
              {assignees.length > 3 && (
                <div
                  title={assignees
                    .slice(3)
                    .map((a) => (a.profile ? `${a.profile.first_name} ${a.profile.last_name}`.trim() : 'User'))
                    .join(', ')}
                  className="h-6 w-6 sm:h-6.5 sm:w-6.5 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[9.5px] font-bold text-muted-foreground z-10 cursor-help"
                >
                  +{assignees.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
