'use client'

import Link from 'next/link'
import { Task } from '@/types/project-management'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, AlertCircle, ArrowRight, ListTodo, FolderGit2, Sparkles } from 'lucide-react'
import dayjs from 'dayjs'

interface DashboardMyTasksProps {
  todayTasks: Task[]
  upcomingTasks: Task[]
  pendingTasks: Task[]
  overdueTasks: Task[]
  recentlyAssignedTasks: Task[]
  userProjectsCount: number
}

export function DashboardMyTasks({
  todayTasks,
  upcomingTasks,
  pendingTasks,
  overdueTasks,
  recentlyAssignedTasks,
  userProjectsCount,
}: DashboardMyTasksProps) {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-foreground" />
          My Tasks & Workflows
        </h2>

        <Link href="/my-tasks">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
            View All My Tasks
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Today's Tasks */}
        <Card className="border-border bg-card shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                <Calendar className="h-4 w-4 text-foreground" />
                Today's Tasks
              </CardTitle>
              <Badge variant="outline" className="text-xs font-mono">
                {todayTasks.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between pt-1">
            {todayTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground italic my-auto py-3">No tasks due today.</p>
            ) : (
              <div className="space-y-2">
                {todayTasks.slice(0, 2).map((t) => (
                  <div key={t.id} className="p-2.5 bg-secondary/30 rounded-md border border-border/60 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-foreground truncate">{t.title}</span>
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 ${getPriorityVariant(t.priority)}`}>
                        {t.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Due: Today</span>
                      <span className="font-medium text-foreground">{t.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link href="/my-tasks" className="block pt-3">
              <Button variant="outline" size="sm" className="w-full text-xs h-8">
                Open Daily View
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Card 2: Upcoming Tasks */}
        <Card className="border-border bg-card shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                <Clock className="h-4 w-4 text-foreground" />
                Upcoming Tasks
              </CardTitle>
              <Badge variant="outline" className="text-xs font-mono">
                {upcomingTasks.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between pt-1">
            {upcomingTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground italic my-auto py-3">No upcoming tasks.</p>
            ) : (
              <div className="space-y-2">
                {upcomingTasks.slice(0, 2).map((t) => (
                  <div key={t.id} className="p-2.5 bg-secondary/30 rounded-md border border-border/60 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-foreground truncate">{t.title}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-border">
                        {t.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Due: {t.due_date ? dayjs(t.due_date).format('DD MMM') : 'Unset'}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link href="/my-tasks" className="block pt-3">
              <Button variant="outline" size="sm" className="w-full text-xs h-8">
                Manage Queue
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Card 3: Pending Tasks */}
        <Card className="border-border bg-card shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                <FolderGit2 className="h-4 w-4 text-foreground" />
                Pending Tasks
              </CardTitle>
              <Badge variant="outline" className="text-xs font-mono">
                {pendingTasks.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between pt-1">
            {pendingTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground italic my-auto py-3">All caught up!</p>
            ) : (
              <div className="space-y-2">
                {pendingTasks.slice(0, 2).map((t) => (
                  <div key={t.id} className="p-2.5 bg-secondary/30 rounded-md border border-border/60 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-foreground truncate">{t.title}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-border">
                        {t.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      No Deadline
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link href="/my-tasks" className="block pt-3">
              <Button variant="outline" size="sm" className="w-full text-xs h-8">
                Manage Queue
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Card 3: Overdue Tasks */}
        <Card className={`border-border bg-card shadow-xs flex flex-col justify-between ${
          overdueTasks.length > 0 ? 'border-destructive/40 bg-destructive/5' : ''
        }`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                <AlertCircle className={`h-4 w-4 ${overdueTasks.length > 0 ? 'text-destructive' : 'text-foreground'}`} />
                Overdue Tasks
              </CardTitle>
              <Badge
                variant="outline"
                className={`text-xs font-mono ${
                  overdueTasks.length > 0 ? 'border-destructive text-destructive' : ''
                }`}
              >
                {overdueTasks.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between pt-1">
            {overdueTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground italic my-auto py-3">Zero overdue deliverables.</p>
            ) : (
              <div className="space-y-2">
                {overdueTasks.slice(0, 2).map((t) => (
                  <div key={t.id} className="p-2.5 bg-destructive/10 rounded-md border border-destructive/20 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-destructive truncate">{t.title}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-destructive text-destructive">
                        Overdue
                      </Badge>
                    </div>
                    <div className="text-[11px] text-destructive/80">
                      Was due: {t.due_date ? dayjs(t.due_date).format('DD MMM') : 'Unset'}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link href="/my-tasks" className="block pt-3">
              <Button variant="outline" size="sm" className="w-full text-xs h-8">
                Review Overdue
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Card 4: Newly Assigned / Projects */}
        <Card className="border-border bg-card shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                <Sparkles className="h-4 w-4 text-foreground" />
                Newly Assigned
              </CardTitle>
              <Badge variant="outline" className="text-xs font-mono">
                {recentlyAssignedTasks.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between pt-1">
            {recentlyAssignedTasks.length === 0 ? (
              <div className="my-auto py-3 text-xs text-muted-foreground space-y-1">
                <p className="flex items-center gap-1">
                  <FolderGit2 className="h-3.5 w-3.5" />
                  Active in {userProjectsCount} project(s)
                </p>
                <p className="text-[11px]">No new tasks assigned this week.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentlyAssignedTasks.slice(0, 2).map((t) => (
                  <div key={t.id} className="p-2.5 bg-secondary/30 rounded-md border border-border/60 text-xs space-y-1">
                    <p className="font-semibold text-foreground truncate">{t.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Project: {t.project_name || 'TripleS ERP'}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <Link href="/projects" className="block pt-3">
              <Button variant="outline" size="sm" className="w-full text-xs h-8">
                Browse Projects
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
