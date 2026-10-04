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
    <div className="space-y-4">
      {activities.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground bg-card border border-border rounded-lg">
          No project activity recorded yet.
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((act) => (
            <Card key={act.id} className="border-border bg-card shadow-xs">
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-secondary mt-0.5 shrink-0">
                    {getActivityIcon(act.activity_type)}
                  </div>
                  <div>
                    <p className="text-sm text-foreground font-medium">{formatActivityText(act)}</p>
                    <span className="text-xs text-muted-foreground mt-0.5 block">
                      {dayjs(act.created_at).format('DD MMM YYYY, hh:mm A')} ({dayjs(act.created_at).fromNow()})
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
