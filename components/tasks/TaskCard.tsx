'use client'

import { Task, TaskStatus } from '@/types/project-management'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dropdown } from '@/components/ui/Dropdown'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, AlertCircle, MessageSquare, Clock, MoreHorizontal } from 'lucide-react'
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
        return 'border-red-500/50 bg-red-500/10 text-red-500 font-bold'
      case 'HIGH':
        return 'border-red-500/30 bg-red-500/10 text-red-500 font-semibold'
      case 'MEDIUM':
        return 'border-amber-500/30 bg-amber-500/10 text-amber-500 font-medium'
      case 'LOW':
        return 'border-blue-500/30 bg-blue-500/10 text-blue-500 font-medium'
      default:
        return 'border-border text-muted-foreground'
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

  return (
    <Card
      draggable={true}
      onDragStart={(e) => onDragStart && onDragStart(e, task.id)}
      className="border-border/60 bg-card shadow-xs hover:shadow-md hover:border-border transition-all duration-200 cursor-pointer group hover:-translate-y-[1px]"
      onClick={onClick}
    >
      <CardContent className="p-4 flex flex-col gap-3">
        {/* Task Title & Menu */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-[14px] sm:text-[15px] text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors flex-1 font-sans">
            {task.title}
          </h4>
          <div className="flex items-center gap-1 shrink-0 mt-0.5">
            <button 
              onClick={(e) => {
                e.stopPropagation()
                onClick()
              }}
              className="p-1 rounded-md text-muted-foreground/40 hover:text-foreground hover:bg-secondary transition-colors"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Short description */}
        {task.description && (
          <p className="text-[12px] sm:text-[13px] text-muted-foreground line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Priority */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 rounded-sm ${getPriorityVariant(task.priority)}`}>
            {task.priority}
          </Badge>
          <span className="font-mono text-[10px] text-muted-foreground">{task.task_id_display}</span>
        </div>

        {/* Due date */}
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {task.due_date ? (
            task.status === 'DONE' ? (
              <span className="flex items-center gap-1 text-green-500">
                <div className="h-3 w-3 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                </div>
                Completed {dayjs(task.due_date).format('DD MMM')}
              </span>
            ) : task.is_overdue ? (
              <span className="flex items-center gap-1 text-destructive font-bold">
                <AlertCircle className="h-3 w-3 shrink-0" />
                Due {dayjs(task.due_date).format('DD MMM')}
              </span>
            ) : isTomorrow ? (
              <span className="flex items-center gap-1 text-orange-500">
                <Calendar className="h-3 w-3 shrink-0" />
                Due tomorrow
              </span>
            ) : (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3 w-3 shrink-0" />
                Due {dayjs(task.due_date).format('DD MMM')}
              </span>
            )
          ) : (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              No due date
            </span>
          )}
        </div>

        {/* Metadata (Comments, Attachments, Hours) */}
        {((task.comments_count || 0) > 0 || (task.attachments?.length || 0) > 0 || task.worked_hours) && (
          <div className="flex items-center gap-4 text-[12px] text-muted-foreground pb-0.5">
            {(task.comments_count || 0) > 0 && (
              <span className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                {task.comments_count}
              </span>
            )}
            {(task.attachments?.length || 0) > 0 && (
              <span className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                {task.attachments.length}
              </span>
            )}
            {task.worked_hours ? (
              <span className="flex items-center gap-1.5 font-mono">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                {task.worked_hours}h
              </span>
            ) : null}
          </div>
        )}

        {/* Footer: Avatars + Project */}
        <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-1">
          {/* Assignee Avatars */}
          <div className="flex items-center -space-x-2 overflow-hidden">
            {assignees.slice(0, 3).map((a, idx) => {
              const name = a.profile ? `${a.profile.first_name || ''} ${a.profile.last_name || ''}`.trim() : 'User'
              const initials = name.slice(0, 2).toUpperCase()
              return (
                <Avatar key={idx} className="h-7 w-7 border-2 border-card bg-secondary text-[10px]">
                  {a.profile?.profile_photo && <AvatarImage src={a.profile.profile_photo} alt={name} />}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              )
            })}
            {assignees.length > 3 && (
              <div className="h-7 w-7 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[10px] font-bold text-muted-foreground z-10">
                +{assignees.length - 3}
              </div>
            )}
            {assignees.length === 0 && (
              <span className="text-[11px] text-muted-foreground">Unassigned</span>
            )}
          </div>
          
          {/* Project Name */}
          <div className="text-[12px] text-muted-foreground font-medium truncate max-w-[120px] text-right">
            {task.project_name && task.project_name !== 'New Project' ? (
              <span className="truncate">{task.project_name}</span>
            ) : null}
          </div>
        </div>

        {/* Mobile quick status selector button (stops propagation) */}
        <div className="sm:hidden pt-2 flex items-center justify-between text-[11px] text-muted-foreground" onClick={(e) => e.stopPropagation()}>
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
