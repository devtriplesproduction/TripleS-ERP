'use client'

import { Project, Task, ProjectTeamMemberStats, ProjectActivity } from '@/types/project-management'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target, FileText, CheckCircle2, Clock, AlertCircle, Layers, Activity } from 'lucide-react'
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
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="border-border bg-card shadow-xs p-4 flex flex-col justify-center">
          <p className="text-xs text-muted-foreground font-medium">Progress</p>
          <div className="flex items-end gap-2 mt-1">
            <h4 className="text-2xl font-bold text-foreground">{project.progress || 0}%</h4>
          </div>
        </Card>
        <Card className="border-border bg-card shadow-xs p-4 flex flex-col justify-center">
          <p className="text-xs text-muted-foreground font-medium">Total Tasks</p>
          <h4 className="text-2xl font-bold text-foreground mt-1">{summary.total}</h4>
        </Card>
        <Card className="border-border bg-card shadow-xs p-4 flex flex-col justify-center">
          <p className="text-xs text-muted-foreground font-medium">Completed</p>
          <h4 className="text-2xl font-bold text-foreground mt-1">{summary.done}</h4>
        </Card>
        <Card className="border-border bg-card shadow-xs p-4 flex flex-col justify-center">
          <p className="text-xs text-muted-foreground font-medium">Remaining</p>
          <h4 className="text-2xl font-bold text-foreground mt-1">{summary.todo + summary.in_progress + summary.in_review + summary.on_hold}</h4>
        </Card>
        <Card className="border-border bg-card shadow-xs p-4 flex flex-col justify-center">
          <p className="text-xs text-destructive font-medium flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> Overdue
          </p>
          <h4 className="text-2xl font-bold text-destructive mt-1">
            {tasks.filter(t => t.is_overdue && t.status !== 'DONE').length}
          </h4>
        </Card>
      </div>

      {/* Main 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Description & Notes */}
        <div className="space-y-4">
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
        </div>

        {/* Middle: Active Tasks */}
        <div className="space-y-4">
          <Card className="border-border bg-card shadow-xs h-full">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Active Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              {activeTasks.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No active tasks currently.</div>
              ) : (
                <div className="divide-y divide-border/50">
                  {activeTasks.map(t => (
                    <div key={t.id} className="p-4 hover:bg-secondary/20 transition-colors">
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <span className="font-semibold text-sm text-foreground line-clamp-1">{t.title}</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{t.priority}</Badge>
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {t.due_date ? dayjs(t.due_date).format('DD MMM') : '-'}
                        </span>
                        <div className="flex items-center -space-x-1.5">
                          {(t.assignees || []).slice(0, 3).map((a, idx) => (
                            <Avatar key={idx} className="h-5 w-5 border border-card bg-secondary text-[8px]">
                              {a.profile?.profile_photo && <AvatarImage src={a.profile.profile_photo} />}
                              <AvatarFallback>{(a.profile?.first_name || 'U').charAt(0)}</AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Team & Activity */}
        <div className="space-y-4">
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
                teamStats.map(member => (
                  <div key={member.userId} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-border">
                      {member.profilePhoto && <AvatarImage src={member.profilePhoto} />}
                      <AvatarFallback className="text-[10px]">{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{member.designation || 'Team Member'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono font-medium text-foreground bg-secondary px-1.5 py-0.5 rounded">
                        {member.completedTasks}/{member.assignedTasks}
                      </span>
                    </div>
                  </div>
                ))
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
                recentActivities.map(act => (
                  <div key={act.id} className="text-xs space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {act.user_profile ? `${act.user_profile.first_name || ''}` : 'System'}
                      </span>
                      <span className="text-[10px]">{dayjs(act.created_at).fromNow(true)} ago</span>
                    </div>
                    <p className="text-muted-foreground leading-snug">
                      {act.activity_type.replace(/_/g, ' ')}
                    </p>
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
