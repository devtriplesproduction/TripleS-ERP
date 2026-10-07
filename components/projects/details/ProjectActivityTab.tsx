'use client'

import { ProjectActivity } from '@/types/project-management'
import { Card, CardContent } from '@/components/ui/card'
import {
  Activity,
  PlusCircle,
  UserCheck,
  CheckCircle2,
  MessageSquare,
  Clock,
  ArrowRightLeft,
  Calendar,
} from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

interface ProjectActivityTabProps {
  activities: ProjectActivity[]
}

export function ProjectActivityTab({ activities }: ProjectActivityTabProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'PROJECT_CREATED':
        return <PlusCircle className="h-4 w-4 text-foreground" />
      case 'TASK_CREATED':
        return <PlusCircle className="h-4 w-4 text-foreground" />
      case 'TASK_ASSIGNED':
      case 'TASK_REASSIGNED':
        return <UserCheck className="h-4 w-4 text-foreground" />
      case 'TASK_STATUS_CHANGED':
        return <ArrowRightLeft className="h-4 w-4 text-foreground" />
      case 'TASK_COMPLETED':
        return <CheckCircle2 className="h-4 w-4 text-foreground" />
      case 'TASK_COMMENT_ADDED':
        return <MessageSquare className="h-4 w-4 text-foreground" />
      case 'DEADLINE_CHANGED':
        return <Calendar className="h-4 w-4 text-foreground" />
      default:
        return <Activity className="h-4 w-4 text-foreground" />
    }
  }

  const formatActivityText = (act: ProjectActivity) => {
    const details = act.details || {}
    const actor =
      act.user_profile
        ? `${act.user_profile.first_name || ''} ${act.user_profile.last_name || ''}`.trim()
        : 'Team Member'

    switch (act.activity_type) {
      case 'PROJECT_CREATED':
        return `${actor} created the project "${details.project_name || 'Project'}" for client "${details.client_name || 'Client'}".`
      case 'TASK_CREATED':
        return `${actor} created task "${details.task_title || 'Task'}" (${details.task_id_display || ''}).`
      case 'TASK_ASSIGNED':
        return `${actor} assigned ${details.assigned_count || 1} team member(s) to "${details.task_title || 'Task'}".`
      case 'TASK_REASSIGNED':
        return `${actor} updated assignees for "${details.task_title || 'Task'}".`
      case 'TASK_STATUS_CHANGED':
        return `"${details.task_title || 'Task'}" status moved from ${details.old_status} to ${details.new_status}.`
      case 'TASK_COMPLETED':
        return `Task "${details.task_title || 'Task'}" was marked as completed.`
      case 'TASK_COMMENT_ADDED':
        return `${actor} commented on "${details.task_title || 'Task'}".`
      case 'PROJECT_UPDATED':
        return `${actor} updated project settings.`
      default:
        return `${actor} performed an update.`
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          Project Activity
        </h3>
      </div>

      {activities.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground bg-card border border-border/60 rounded-xl shadow-sm flex flex-col items-center justify-center">
          <Activity className="h-8 w-8 mb-2 opacity-20" />
          No project activity recorded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {activities.map((act) => (
            <div
              key={act.id}
              className="border border-border/60 bg-card rounded-xl p-4 shadow-sm hover:border-foreground/30 transition-colors flex items-start gap-4"
            >
              <div className="p-2 rounded-full bg-secondary/80 shrink-0 border border-border/50 text-muted-foreground mt-0.5">
                {getActivityIcon(act.activity_type)}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-sm text-foreground leading-snug">{formatActivityText(act)}</p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-2 bg-secondary/30 px-2.5 py-1 rounded-md w-fit border border-border/40">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span className="truncate">{dayjs(act.created_at).format('DD MMM YYYY, hh:mm A')}</span>
                  <div className="w-px h-3 bg-border/60 shrink-0" />
                  <span className="font-medium shrink-0">{dayjs(act.created_at).fromNow()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
