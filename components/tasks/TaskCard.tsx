'use client'

import { Task, TaskStatus } from '@/types/project-management'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, MessageSquare, Clock } from 'lucide-react'
import dayjs from 'dayjs'


interface TaskCardProps {
  task: Task
  onClick: () => void
  onDragStart?: (e: React.DragEvent, taskId: string) => void
  canManage: boolean
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void
}

export function TaskCard({ task, onClick, onDragStart, canManage, onStatusChange }: TaskCardProps) {
  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'border-red-500/40 bg-red-500/10 text-red-500 font-bold'
      case 'HIGH':
        return 'border-red-500/20 bg-red-500/5 text-red-500/90 font-semibold'
      case 'MEDIUM':
        return 'border-amber-500/20 bg-amber-500/5 text-amber-500/90 font-medium'
      case 'LOW':
      default:
        return 'border-border/50 bg-secondary/30 text-muted-foreground font-medium'
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
      className="border-border/60 bg-card shadow-xs hover:shadow-sm hover:border-border hover:bg-accent/5 transition-colors duration-200 cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-3.5 flex flex-col gap-2.5">
        
        {/* Top Row: Project Badge & Priority */}
        <div className="flex items-center justify-between gap-2 overflow-hidden">
          {task.project_name && task.project_name !== 'New Project' && task.project_name !== 'Project' ? (
            <div className="flex-1 min-w-0" title={task.project_name}>
              <Badge variant="outline" className="text-[10px] sm:text-[11px] px-2 py-0.5 font-medium bg-secondary/40 text-muted-foreground border-border/50 truncate max-w-full inline-block">
                {task.project_name}
              </Badge>
            </div>
          ) : (
            <div className="flex-1 min-w-0" />
          )}

          <Badge variant="outline" className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-[4px] shrink-0 uppercase tracking-wider ${getPriorityVariant(task.priority)}`}>
            {task.priority}
          </Badge>
        </div>

        {/* Task Title */}
        <h4 className="font-medium sm:font-semibold text-[14px] sm:text-[15px] text-foreground leading-snug line-clamp-2">
          {task.title}
        </h4>

        {/* Bottom Row: Metadata & Assignees */}
        <div className="flex items-end justify-between mt-0.5 gap-2">
          
          {/* Metadata: Due Date & Comments */}
          <div className="flex items-center gap-3 text-[11px] sm:text-[12px] font-medium shrink-0">
            {/* Due Date */}
            {task.due_date && (
              <span className={`flex items-center gap-1.5 ${task.is_overdue && task.status !== 'DONE' ? 'text-red-500' : 'text-muted-foreground'}`}>
                {task.is_overdue && task.status !== 'DONE' ? (
                  <span className="text-[10px] shrink-0 leading-none">🔴</span>
                ) : isTomorrow && task.status !== 'DONE' ? (
                  <span className="text-[10px] text-orange-500 shrink-0 leading-none">🟠</span>
                ) : (
                  <Calendar className="h-3 w-3 shrink-0 opacity-70" />
                )}
                {dayjs(task.due_date).format('MMM DD')}
              </span>
            )}
            
            {/* Additional Metadata */}
            {(task.comments_count || 0) > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground/80">
                <MessageSquare className="h-3 w-3 shrink-0" />
                {task.comments_count}
              </span>
            )}
            {task.worked_hours ? (
              <span className="flex items-center gap-1 text-muted-foreground/80 font-mono">
                <Clock className="h-3 w-3 shrink-0" />
                {task.worked_hours}h
              </span>
            ) : null}
          </div>

          {/* Assignees */}
          <div className="flex items-center -space-x-1.5 overflow-hidden shrink-0">
            {assignees.slice(0, 3).map((a, idx) => {
              const name = a.profile ? `${a.profile.first_name || ''} ${a.profile.last_name || ''}`.trim() : 'User'
              const initials = name.slice(0, 2).toUpperCase()
              return (
                <Avatar key={idx} title={name} className="h-6 w-6 border-[1.5px] border-card bg-secondary text-[9px] hover:z-10 transition-transform">
                  {a.profile?.profile_photo && <AvatarImage src={a.profile.profile_photo} alt={name} />}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              )
            })}
            {assignees.length > 3 && (
              <div title={assignees.slice(3).map(a => a.profile ? `${a.profile.first_name} ${a.profile.last_name}`.trim() : 'User').join(', ')} className="h-6 w-6 rounded-full bg-secondary border-[1.5px] border-card flex items-center justify-center text-[9px] font-bold text-muted-foreground z-10 cursor-help">
                +{assignees.length - 3}
              </div>
            )}
            {assignees.length === 0 && (
              <span className="text-[10px] text-muted-foreground opacity-70 border border-dashed border-border/80 rounded-full h-6 w-6 flex items-center justify-center shrink-0">
                <span className="sr-only">Unassigned</span>
                👤
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
