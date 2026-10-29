'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  FolderKanban,
  CheckSquare,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  Activity,
  Layers,
  BarChart3,
  PieChart,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Project, Task } from '@/types/project-management'
import { AssignableEmployee } from '@/lib/actions/team'
import { cn } from '@/lib/utils'
import dayjs from 'dayjs'

import { HODFilterBar, HODFilterValues } from '@/components/hod/HODFilterBar'
import { filterProjects, filterTasks } from '@/lib/utils/hod-filter-utils'

export interface DevelopmentProgressViewProps {
  projects: Project[]
  tasks: Task[]
  employees: AssignableEmployee[]
}

export function DevelopmentProgressView({
  projects = [],
  tasks = [],
  employees = [],
}: DevelopmentProgressViewProps) {
  const [filters, setFilters] = React.useState<HODFilterValues>({
    startDate: '',
    endDate: '',
    projectId: 'ALL',
    developerId: 'ALL',
    projectStatus: 'ALL',
  })

  const now = new Date()

  // Filter projects and tasks based on active HOD filters
  const filteredProjects = useMemo(() => {
    return filterProjects(projects, filters, tasks)
  }, [projects, filters, tasks])

  const filteredTasks = useMemo(() => {
    return filterTasks(tasks, filters, projects)
  }, [tasks, filters, projects])

  const devEmployees = useMemo(() => {
    const list = employees.filter(
      (e) => (e.department || '').toLowerCase() === 'development'
    )
    if (filters.developerId && filters.developerId !== 'ALL') {
      return list.filter((e) => e.id === filters.developerId)
    }
    return list
  }, [employees, filters])

  // 1. PROJECT PROGRESS ANALYTICS
  const projectStats = useMemo(() => {
    const list = filteredProjects.map((p) => {
      const progress = p.progress || 0
      const isCompleted = (p.status || '').toUpperCase() === 'COMPLETED'
      const isOverdue = p.deadline && new Date(p.deadline) < now && !isCompleted
      return {
        id: p.id,
        name: p.name,
        code: p.project_id_display || 'PRJ',
        progress,
        status: p.status || 'PLANNED',
        deadline: p.deadline,
        isCompleted,
        isOverdue,
        totalTasks: p.task_summary?.total || 0,
        doneTasks: p.task_summary?.done || 0,
      }
    }).sort((a, b) => b.progress - a.progress)

    const avgProgress = list.length > 0
      ? Math.round(list.reduce((acc, p) => acc + p.progress, 0) / list.length)
      : 0

    return { list, avgProgress }
  }, [filteredProjects, now])

  // 2. TASK COMPLETION ANALYTICS
  const taskStats = useMemo(() => {
    const total = filteredTasks.length
    const completed = filteredTasks.filter((t) =>
      ['DONE', 'COMPLETED'].includes((t.status || '').toUpperCase())
    ).length

    const inProgress = filteredTasks.filter((t) =>
      ['IN_PROGRESS', 'IN_REVIEW'].includes((t.status || '').toUpperCase())
    ).length

    const todo = filteredTasks.filter((t) =>
      ['TODO', 'PLANNED'].includes((t.status || '').toUpperCase())
    ).length

    const onHold = filteredTasks.filter((t) =>
      ['ON_HOLD', 'BLOCKED'].includes((t.status || '').toUpperCase())
    ).length

    const pending = total - completed

    const overdue = filteredTasks.filter((t) => {
      const isDone = ['DONE', 'COMPLETED'].includes((t.status || '').toUpperCase())
      return !isDone && t.due_date && new Date(t.due_date) < now
    }).length

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    const pendingRate = total > 0 ? Math.round((pending / total) * 100) : 0
    const overdueRate = total > 0 ? Math.round((overdue / total) * 100) : 0

    return {
      total,
      completed,
      pending,
      inProgress,
      todo,
      onHold,
      overdue,
      completionRate,
      pendingRate,
      overdueRate,
    }
  }, [filteredTasks, now])

  // 3. DEVELOPER WORKLOAD ANALYTICS
  const developerWorkloads = useMemo(() => {
    return devEmployees.map((dev) => {
      const assignedTasks = filteredTasks.filter((t) =>
        t.assignees?.some((a) => a.user_id === dev.id)
      )

      const total = assignedTasks.length
      const completed = assignedTasks.filter((t) =>
        ['DONE', 'COMPLETED'].includes((t.status || '').toUpperCase())
      ).length
      const pending = total - completed
      const overdue = assignedTasks.filter((t) => {
        const isDone = ['DONE', 'COMPLETED'].includes((t.status || '').toUpperCase())
        return !isDone && t.due_date && new Date(t.due_date) < now
      }).length

      let workload: 'High' | 'Normal' | 'Low' = 'Normal'
      if (pending >= 5 || overdue >= 2) {
        workload = 'High'
      } else if (pending <= 1) {
        workload = 'Low'
      }

      return {
        id: dev.id,
        name: dev.name || 'Developer',
        designation: dev.designation || 'Software Engineer',
        total,
        completed,
        pending,
        overdue,
        workload,
        capacityPercent: Math.min(100, Math.round((pending / 6) * 100)),
      }
    }).sort((a, b) => {
      const weight = { High: 3, Normal: 2, Low: 1 }
      if (weight[b.workload] !== weight[a.workload]) {
        return weight[b.workload] - weight[a.workload]
      }
      return b.pending - a.pending
    })
  }, [devEmployees, filteredTasks, now])

  // Workload summary counts
  const highWorkloadCount = developerWorkloads.filter((d) => d.workload === 'High').length
  const normalWorkloadCount = developerWorkloads.filter((d) => d.workload === 'Normal').length
  const lowWorkloadCount = developerWorkloads.filter((d) => d.workload === 'Low').length

  return (
    <div className="space-y-6">
      {/* FILTER BAR: Date Range, Project, Developer, Project Status */}
      <HODFilterBar
        projects={projects}
        developers={employees.filter((e) => (e.department || '').toLowerCase() === 'development')}
        showDateRange={true}
        showProject={true}
        showDeveloper={true}
        showProjectStatus={true}
        values={filters}
        onChange={setFilters}
        onReset={() =>
          setFilters({
            startDate: '',
            endDate: '',
            projectId: 'ALL',
            developerId: 'ALL',
            projectStatus: 'ALL',
          })
        }
      />

      {/* 1. TOP STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Average Project Progress */}
        <Card data-testid="stat-avg-progress" className="border-border bg-card shadow-xs rounded-xl">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Average Project Progress
              </p>
              <h3 className="text-3xl font-bold tracking-tight text-foreground font-sans">
                {projectStats.avgProgress}%
              </h3>
              <p className="text-xs text-muted-foreground">
                Across {projectStats.list.length} active development projects
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Task Completion Rate */}
        <Card data-testid="stat-task-completion" className="border-border bg-card shadow-xs rounded-xl">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Task Completion Rate
              </p>
              <h3 className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-sans">
                {taskStats.completionRate}%
              </h3>
              <p className="text-xs text-muted-foreground">
                {taskStats.completed} of {taskStats.total} total tasks delivered
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Overdue Deliverables */}
        <Card data-testid="stat-overdue-tasks" className={cn(
          "border-border bg-card shadow-xs rounded-xl",
          taskStats.overdue > 0 ? "border-destructive/30 bg-destructive/5" : ""
        )}>
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Overdue Tasks
              </p>
              <h3 className={cn(
                "text-3xl font-bold tracking-tight font-sans",
                taskStats.overdue > 0 ? "text-destructive" : "text-foreground"
              )}>
                {taskStats.overdue}
              </h3>
              <p className="text-xs text-muted-foreground">
                Incomplete tasks past deadline
              </p>
            </div>
            <div className={cn(
              "p-2.5 rounded-lg shrink-0",
              taskStats.overdue > 0 ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"
            )}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Total Developers */}
        <Card data-testid="stat-total-devs" className="border-border bg-card shadow-xs rounded-xl">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Developers
              </p>
              <h3 className="text-3xl font-bold tracking-tight text-foreground font-sans">
                {developerWorkloads.length}
              </h3>
              <p className="text-xs text-muted-foreground">
                {highWorkloadCount} high workload • {normalWorkloadCount} normal
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-500 shrink-0">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. REQUIRED CHART 1: PROJECT PROGRESS CHART */}
      <Card data-testid="chart-project-progress" className="border-border bg-card rounded-xl shadow-xs">
        <CardHeader className="pb-4 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-blue-500" />
                <span>Project Progress Chart</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Live delivery progress of all development projects
              </CardDescription>
            </div>
            <Link href="/projects">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <span>View All Projects</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          {projectStats.list.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No active development projects found.
            </div>
          ) : (
            <div className="space-y-4">
              {projectStats.list.map((proj) => (
                <div key={proj.id} className="p-3.5 rounded-lg border border-border/70 bg-muted/20 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm">{proj.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">({proj.code})</span>
                      <Badge variant="outline" className="text-[10px] py-0">
                        {proj.status}
                      </Badge>
                      {proj.isOverdue && (
                        <Badge variant="destructive" className="text-[9px] py-0 uppercase">
                          Overdue
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-muted-foreground">
                        {proj.doneTasks}/{proj.totalTasks} Tasks Completed
                      </span>
                      <span className="font-bold text-sm text-foreground font-mono">
                        {proj.progress}%
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar Visual */}
                  <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        proj.progress >= 80 ? "bg-emerald-500" : proj.progress >= 50 ? "bg-blue-500" : "bg-amber-500"
                      )}
                      style={{ width: `${Math.max(4, Math.min(100, proj.progress))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. ROW 2: TASK COMPLETION CHART & DEVELOPER WORKLOAD CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* REQUIRED CHART 2: TASK COMPLETION CHART */}
        <Card data-testid="chart-task-completion" className="border-border bg-card rounded-xl shadow-xs flex flex-col">
          <CardHeader className="pb-4 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-emerald-500" />
                  <span>Task Completion Chart</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Distribution of completed, pending, and overdue tasks
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {taskStats.total} Total Tasks
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-5 flex-1 flex flex-col justify-between space-y-6">
            {/* Segmented Distribution Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span>Task Distribution Breakdown</span>
                <span className="font-bold text-foreground">{taskStats.completionRate}% Done</span>
              </div>
              <div className="w-full h-4 rounded-full overflow-hidden flex bg-secondary">
                {taskStats.completed > 0 && (
                  <div
                    title={`Completed: ${taskStats.completed}`}
                    style={{ width: `${taskStats.completionRate}%` }}
                    className="h-full bg-emerald-500 transition-all"
                  />
                )}
                {taskStats.pending > 0 && (
                  <div
                    title={`Pending: ${taskStats.pending}`}
                    style={{ width: `${taskStats.pendingRate}%` }}
                    className="h-full bg-blue-500 transition-all"
                  />
                )}
                {taskStats.overdue > 0 && (
                  <div
                    title={`Overdue: ${taskStats.overdue}`}
                    style={{ width: `${taskStats.overdueRate}%` }}
                    className="h-full bg-destructive transition-all"
                  />
                )}
              </div>
            </div>

            {/* Three Required Metrics Blocks */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-lg border border-border bg-emerald-500/5 text-center space-y-1">
                <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Completed Tasks
                </p>
                <p className="text-2xl font-bold text-foreground font-mono">{taskStats.completed}</p>
                <p className="text-[10px] text-muted-foreground">{taskStats.completionRate}% of total</p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-blue-500/5 text-center space-y-1">
                <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Pending Tasks
                </p>
                <p className="text-2xl font-bold text-foreground font-mono">{taskStats.pending}</p>
                <p className="text-[10px] text-muted-foreground">{taskStats.pendingRate}% of total</p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-destructive/5 text-center space-y-1">
                <p className="text-[11px] font-semibold text-destructive uppercase tracking-wider">
                  Overdue Tasks
                </p>
                <p className="text-2xl font-bold text-destructive font-mono">{taskStats.overdue}</p>
                <p className="text-[10px] text-muted-foreground">{taskStats.overdueRate}% of total</p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/40">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Completed
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block ml-2" /> Pending
                <span className="w-2.5 h-2.5 rounded-full bg-destructive inline-block ml-2" /> Overdue
              </span>
              <Link href="/tasks" className="text-primary hover:underline font-medium">
                Open Task Board &rarr;
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* REQUIRED CHART 3: DEVELOPER WORKLOAD CHART */}
        <Card data-testid="chart-developer-workload" className="border-border bg-card rounded-xl shadow-xs flex flex-col">
          <CardHeader className="pb-4 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  <span>Developer Workload Chart</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Workload allocation across team based on assigned tasks
                </CardDescription>
              </div>
              <Link href="/developers">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-primary gap-1">
                  <span>Manage Developers &rarr;</span>
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-5 flex-1 space-y-4">
            {developerWorkloads.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No active developers found in Development.
              </div>
            ) : (
              <div className="space-y-3">
                {developerWorkloads.map((dev) => (
                  <div key={dev.id} className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-foreground truncate">{dev.name}</span>
                        <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">
                          • {dev.designation}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {dev.pending} pending tasks
                        </span>
                        <Badge
                          variant={dev.workload === 'High' ? 'destructive' : dev.workload === 'Normal' ? 'secondary' : 'outline'}
                          className="text-[10px] uppercase font-semibold px-1.5 py-0"
                        >
                          {dev.workload}
                        </Badge>
                      </div>
                    </div>

                    {/* Developer Workload Capacity Bar */}
                    <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          dev.workload === 'High' ? "bg-destructive" : dev.workload === 'Normal' ? "bg-purple-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.max(8, dev.capacityPercent)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
