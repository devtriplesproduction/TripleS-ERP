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
    <div className="space-y-6">
      {/* Project Milestones Header Card */}
      <Card className="border-border bg-card shadow-xs">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-secondary rounded-lg">
                <Flag className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Project Lifecycle</p>
                <h3 className="text-base font-bold text-foreground">
                  {project.start_date ? dayjs(project.start_date).format('DD MMMM YYYY') : 'Start date unset'}{' '}
                  →{' '}
                  {project.deadline ? dayjs(project.deadline).format('DD MMMM YYYY') : 'Target deadline unset'}
                </h3>
              </div>
            </div>

            {project.is_overdue && (
              <Badge variant="outline" className="border-destructive text-destructive font-bold self-start sm:self-center">
                <AlertCircle className="mr-1 h-3.5 w-3.5" />
                Project Past Deadline
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Task Milestones List / Timeline */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Task Delivery Milestones</h4>

        {sortedTasks.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-card border border-border rounded-lg">
            No scheduled tasks recorded for this project timeline yet.
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
            {sortedTasks.map((t) => {
              const isCompleted = t.status === 'DONE'
              const isOverdue = t.is_overdue

              return (
                <div key={t.id} className="relative group">
                  {/* Timeline Node Dot */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-3 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all bg-card ${
                      isCompleted
                        ? 'border-foreground text-foreground'
                        : isOverdue
                        ? 'border-destructive text-destructive bg-destructive/10'
                        : 'border-muted-foreground text-muted-foreground'
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

                  {/* Task Card */}
                  <Card
                    className={`border-border bg-card shadow-xs transition-colors hover:border-foreground/30 ${
                      isOverdue ? 'border-destructive/30' : ''
                    }`}
                  >
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {t.task_id_display}
                          </span>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-border">
                            {t.status.replace('_', ' ')}
                          </Badge>
                          {isOverdue && (
                            <Badge className="text-[10px] py-0 px-1.5 bg-destructive text-destructive-foreground">
                              Overdue
                            </Badge>
                          )}
                        </div>
                        <h5 className="font-semibold text-sm text-foreground">{t.title}</h5>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0 flex-wrap">
                        {t.start_date && (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px]">Start:</span>
                            <span className="text-foreground">{dayjs(t.start_date).format('DD MMM')}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <span className="text-[11px]">Due:</span>
                          <span className={isOverdue ? 'text-destructive font-bold' : 'text-foreground'}>
                            {t.due_date ? dayjs(t.due_date).format('DD MMM YYYY') : 'No due date'}
                          </span>
                        </div>

                        {t.worked_hours ? (
                          <div className="font-mono text-[11px] bg-secondary/50 px-2 py-0.5 rounded-sm">
                            {t.worked_hours}h worked
                          </div>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
