'use client'

import { Project, Task } from '@/types/project-management'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, AlertCircle, CheckCircle2, Clock, Flag } from 'lucide-react'
import dayjs from 'dayjs'

interface ProjectTimelineTabProps {
  project: Project
  tasks: Task[]
}

export function ProjectTimelineTab({ project, tasks }: ProjectTimelineTabProps) {
  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })

  return (
    <div className="space-y-8">
      {/* Project Milestones Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          Project Timeline
        </h3>

        <div className="flex items-center gap-4 bg-card border border-border/60 px-4 py-2.5 rounded-lg shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Start Date</span>
            <span className="text-sm font-semibold">{project.start_date ? dayjs(project.start_date).format('DD MMM YYYY') : 'Unset'}</span>
          </div>
          <div className="w-px h-8 bg-border/60" />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Deadline</span>
            <span className="text-sm font-semibold flex items-center gap-2">
              {project.deadline ? dayjs(project.deadline).format('DD MMM YYYY') : 'Unset'}
              {project.is_overdue && <Badge variant="destructive" className="text-[9px] px-1 py-0 uppercase">Overdue</Badge>}
            </span>
          </div>
        </div>
      </div>

      {/* Task Milestones Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedTasks.length === 0 ? (
          <div className="lg:col-span-2 p-12 text-center text-muted-foreground bg-card border border-border/60 rounded-xl shadow-sm">
            No scheduled tasks recorded for this project timeline yet.
          </div>
        ) : (
          sortedTasks.map((t) => {
            const isCompleted = t.status === 'DONE'
            const isOverdue = t.is_overdue

            return (
              <div
                key={t.id}
                className={`flex gap-3 border border-border/60 bg-card rounded-xl p-4 shadow-sm transition-colors hover:border-foreground/30 ${isOverdue ? 'border-destructive/30 bg-destructive/5' : ''
                  }`}
              >
                {/* Status Dot */}
                <div
                  className={`mt-1 h-6 w-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${isCompleted
                      ? 'border-primary text-primary bg-primary/5'
                      : isOverdue
                        ? 'border-destructive text-destructive bg-destructive/10'
                        : 'border-border text-muted-foreground bg-secondary/50'
                    }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : isOverdue ? (
                    <AlertCircle className="h-3.5 w-3.5" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                </div>

                {/* Task Details */}
                <div className="flex-1 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-sm">
                        {t.task_id_display}
                      </span>
                      <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-border/60 bg-background uppercase">
                        {t.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <h5 className="font-semibold text-[14px] text-foreground leading-snug truncate">{t.title}</h5>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0 bg-secondary/30 px-3 py-2 rounded-lg border border-border/40">
                    {t.start_date && (
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground/70">Start</span>
                        <span className="text-foreground font-medium whitespace-nowrap">{dayjs(t.start_date).format('DD MMM')}</span>
                      </div>
                    )}

                    {t.start_date && <div className="w-px h-6 bg-border/60" />}

                    <div className="flex flex-col items-end">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground/70">Due</span>
                      <span className={`font-medium whitespace-nowrap ${isOverdue ? 'text-destructive font-bold' : 'text-foreground'}`}>
                        {t.due_date ? dayjs(t.due_date).format('DD MMM YYYY') : 'Unset'}
                      </span>
                    </div>

                    {t.worked_hours ? (
                      <>
                        <div className="w-px h-6 bg-border/60" />
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground/70">Time</span>
                          <span className="font-mono font-medium text-foreground">{t.worked_hours}h</span>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
