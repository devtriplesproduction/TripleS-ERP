'use client'

import { Project, Task, ProjectTeamMemberStats, ProjectActivity } from '@/types/project-management'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target, FileText, CheckCircle2, Clock, AlertCircle, Layers, Activity, Calendar } from 'lucide-react'
import dayjs from 'dayjs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface ProjectOverviewTabProps {
  project: Project
  totalOperationalHours: number
  tasks: Task[]
  teamStats: ProjectTeamMemberStats[]
  activities: ProjectActivity[]
}

export function ProjectOverviewTab({ project, totalOperationalHours, tasks, teamStats, activities }: ProjectOverviewTabProps) {
  const summary = project.task_summary || { total: 0, done: 0, in_progress: 0, in_review: 0, todo: 0, on_hold: 0 }
  const activeTasks = tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW').slice(0, 5)
  const recentActivities = activities.slice(0, 5)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* LEFT / MAIN COLUMN */}
        <div className="lg:col-span-2 space-y-3">
          
          {/* Description & Scope */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Description & Scope
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {project.description || project.objective || 'No primary objective stated for this project.'}
              {project.notes && (
                <>
                  <div className="mt-4 pt-4 border-t border-border/50 font-semibold text-xs text-muted-foreground uppercase mb-2">Additional Notes</div>
                  <div className="text-muted-foreground">{project.notes}</div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 px-4 pb-4 space-y-4">
              {recentActivities.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-2">No recent activity.</div>
              ) : (
                <div className="space-y-4">
                  {recentActivities.map(act => (
                    <div key={act.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 border border-border">
                        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="space-y-0.5 flex-1 pt-0.5">
                        <p className="text-sm text-foreground">
                          <span className="font-semibold">{act.user_profile ? `${act.user_profile.first_name || ''}` : 'System'}</span> {act.activity_type.replace(/_/g, ' ').toLowerCase()}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {dayjs(act.created_at).fromNow()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Tasks */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Active Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 p-0">
              {activeTasks.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No active tasks currently.</div>
              ) : (
                <div className="divide-y divide-border/50">
                  {activeTasks.map(t => (
                    <div key={t.id} className="p-4 hover:bg-secondary/20 transition-colors flex items-center justify-between gap-4">
                      <div className="space-y-1 overflow-hidden">
                        <div className="font-semibold text-sm text-foreground truncate">{t.title}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {t.due_date ? dayjs(t.due_date).format('MMM DD') : 'No date'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center -space-x-1.5">
                          {(t.assignees || []).slice(0, 3).map((a, idx) => (
                            <Avatar key={idx} className="h-6 w-6 border border-card bg-secondary text-[10px]">
                              {a.profile?.profile_photo && <AvatarImage src={a.profile.profile_photo} />}
                              <AvatarFallback>{(a.profile?.first_name || 'U').charAt(0)}</AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-background">{t.priority}</Badge>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-medium">{t.status.replace('_', ' ')}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-3">
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Project Health
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-5 text-sm">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-medium">
                  <span className="text-muted-foreground">Progress</span>
                  <span>{project.progress || 0}%</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${project.progress || 0}%` }} />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <span className="text-muted-foreground font-medium block">Deadline</span>
                <div className="flex items-center gap-2 font-medium">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className={project.is_overdue ? 'text-destructive font-bold' : 'text-foreground'}>
                    {project.deadline ? dayjs(project.deadline).format('DD MMM YYYY') : 'Not set'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Team
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 px-4 pb-4 space-y-3">
              {teamStats.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-2">No team assigned.</div>
              ) : (
                teamStats.map((member: any) => (
                  <div key={member.userId} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-border">
                      {member.profilePhoto && <AvatarImage src={member.profilePhoto} />}
                      <AvatarFallback className="text-[10px]">{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{member.designation || 'Team Member'}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
