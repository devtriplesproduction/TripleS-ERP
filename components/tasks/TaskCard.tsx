'use client'

import { Task, TaskStatus } from '@/types/project-management'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dropdown } from '@/components/ui/Dropdown'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, AlertCircle, MessageSquare, Clock, GripVertical } from 'lucide-react'
import dayjs from 'dayjs'

interface TaskCardProps {
  task: Task
  onClick: () => void
  onDragStart?: (e: React.DragEvent, taskId: string) => void
  canManage: boolean
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void
}

const ALL_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'ON_HOLD']

export function TaskCard({ task, onClick, onDragStart, canManage, onStatusChange }: TaskCardProps) {
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

  const assignees = task.assignees || []

  return (
    <Card
      draggable={true}
      onDragStart={(e) => onDragStart && onDragStart(e, task.id)}
      className="border-border bg-card shadow-xs hover:border-foreground/40 transition-all cursor-pointer group active:opacity-60"
      onClick={onClick}
    >
      <CardContent className="p-3.5 space-y-2.5">
        {/* Top: ID, Priority, Drag Handle */}
        <div className="flex items-center justify-between gap-1 text-[11px]">
          <span className="font-mono text-muted-foreground font-medium">{task.task_id_display}</span>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getPriorityVariant(task.priority)}`}>
              {task.priority}
            </Badge>
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
          </div>
        </div>

        {/* Task Title */}
        <h4 className="font-semibold text-sm text-foreground leading-snug line-clamp-2 group-hover:text-foreground/90">
          {task.title}
        </h4>

        {/* Project Reference if available */}
        {task.project_name && (
          <p className="text-[11px] text-muted-foreground truncate">{task.project_name}</p>
        )}

        {/* Footer: Due date, worked hours, comment count, and assignees */}
        <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
          {/* Due date & comments */}
          <div className="flex items-center gap-2 text-muted-foreground">
            {task.due_date && (
              <span
                className={`flex items-center gap-1 text-[11px] ${
                  task.is_overdue ? 'text-destructive font-bold' : ''
                }`}
              >
                {task.is_overdue ? <AlertCircle className="h-3 w-3 shrink-0" /> : <Calendar className="h-3 w-3 shrink-0" />}
                {dayjs(task.due_date).format('DD MMM')}
              </span>
            )}

            {(task.comments_count || 0) > 0 && (
              <span className="flex items-center gap-0.5 text-[11px]">
                <MessageSquare className="h-3 w-3 shrink-0" />
                {task.comments_count}
              </span>
            )}

            {task.worked_hours ? (
              <span className="flex items-center gap-0.5 text-[11px] font-mono">
                <Clock className="h-3 w-3 shrink-0" />
                {task.worked_hours}h
              </span>
            ) : null}
          </div>

          {/* Assignees avatars */}
          <div className="flex items-center -space-x-1.5 overflow-hidden">
            {assignees.slice(0, 3).map((a, idx) => {
              const name = a.profile ? `${a.profile.first_name || ''} ${a.profile.last_name || ''}`.trim() : 'User'
              const initials = name.slice(0, 2).toUpperCase()
              return (
                <Avatar key={idx} className="h-6 w-6 border border-card bg-secondary text-[9px]">
                  {a.profile?.profile_photo && <AvatarImage src={a.profile.profile_photo} alt={name} />}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              )
            })}
            {assignees.length > 3 && (
              <div className="h-6 w-6 rounded-full bg-secondary border border-card flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                +{assignees.length - 3}
              </div>
            )}
          </div>
        </div>

        {/* Mobile quick status selector button (stops propagation) */}
        <div className="sm:hidden pt-1 flex items-center justify-between text-[11px] text-muted-foreground" onClick={(e) => e.stopPropagation()}>
          <span>Move to:</span>
          <Dropdown
            value={task.status}
            onChange={(val) => onStatusChange && onStatusChange(task.id, val as TaskStatus)}
            options={ALL_STATUSES.map((st) => ({
              value: st,
              label: st.replace('_', ' '),
            }))}
            buttonClassName="h-7 text-[11px] bg-secondary/40 border-border py-0.5 px-2"
            className="w-auto"
          />
        </div>
      </CardContent>
    </Card>
  )
}
