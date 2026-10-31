'use client'

import React from 'react'
import Link from 'next/link'
import {
  Code2,
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  CheckSquare,
  Activity,
  Layers,
  Calendar,
  Briefcase,
  Bug,
  Bell,
  BarChart3,
  ShieldAlert,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AuthUser } from '@/lib/auth'
import { Project, Task } from '@/types/project-management'
import { AssignableEmployee } from '@/lib/actions/team'
import dayjs from 'dayjs'

import { HODFilterBar, HODFilterValues } from '@/components/hod/HODFilterBar'
import { filterProjects, filterTasks } from '@/lib/utils/hod-filter-utils'

export interface HeadOfDevelopmentMetrics {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  pendingTasks: number
  overdueTasks: number
  totalDevelopers: number
}

interface HeadOfDevelopmentDashboardProps {
  user: AuthUser
  metrics: HeadOfDevelopmentMetrics
  projects?: Project[]
  tasks?: Task[]
  employees?: AssignableEmployee[]
}

export function HeadOfDevelopmentDashboard({
  user,
  metrics,
  projects = [],
  tasks = [],
  employees = [],
}: HeadOfDevelopmentDashboardProps) {
  // Filter state for dashboard overview
  const [filters, setFilters] = React.useState<HODFilterValues>({
    startDate: '',
    endDate: '',
    projectId: 'ALL',
    developerId: 'ALL',
    projectStatus: 'ALL',
  })

  // Full Development Team
  const devTeam = React.useMemo(() => {
    return employees.filter((e) => e.department?.toLowerCase() === 'development')
  }, [employees])

  // Filter projects and tasks based on active filters
  const filteredProjects = React.useMemo(() => {
    return filterProjects(projects, filters, tasks)
  }, [projects, filters, tasks])

  const filteredTasks = React.useMemo(() => {
    return filterTasks(tasks, filters, projects)
  }, [tasks, filters, projects])

  // Filtered developers
  const filteredDevTeam = React.useMemo(() => {
    if (filters.developerId && filters.developerId !== 'ALL') {
      return devTeam.filter((d) => d.id === filters.developerId)
    }
    if (filters.projectId && filters.projectId !== 'ALL') {
      return devTeam.filter((d) =>
        filteredProjects.some(
          (p) =>
            p.members?.some((m) => m.user_id === d.id) ||
            p.project_manager_id === d.id ||
            filteredTasks.some((t) => t.project_id === p.id && t.assignees?.some((a) => a.user_id === d.id))
        )
      )
    }
    return devTeam
  }, [devTeam, filters, filteredProjects, filteredTasks])

  const isFiltered = Boolean(
    filters.startDate ||
    filters.endDate ||
    (filters.projectId && filters.projectId !== 'ALL') ||
    (filters.developerId && filters.developerId !== 'ALL') ||
    (filters.projectStatus && filters.projectStatus !== 'ALL')
  )

  const now = new Date()

  // Dynamically recalculate metrics when filtered
  const activeProjectsCount = filteredProjects.filter((p) => {
    const s = (p.status || '').toUpperCase()
    return s === 'IN_PROGRESS' || s === 'PLANNED'
  }).length

  const completedProjectsCount = filteredProjects.filter(
    (p) => (p.status || '').toUpperCase() === 'COMPLETED'
  ).length

  const pendingTasksCount = filteredTasks.filter((t) => {
    const s = (t.status || '').toUpperCase()
    return s !== 'DONE' && s !== 'COMPLETED'
  }).length

  const overdueTasksCount = filteredTasks.filter((t) => {
    const s = (t.status || '').toUpperCase()
    const isIncomplete = s !== 'DONE' && s !== 'COMPLETED'
    return isIncomplete && t.due_date && new Date(t.due_date) < now
  }).length

  const displayedMetrics: HeadOfDevelopmentMetrics = isFiltered
    ? {
        totalProjects: filteredProjects.length,
        activeProjects: activeProjectsCount,
        completedProjects: completedProjectsCount,
        pendingTasks: pendingTasksCount,
        overdueTasks: overdueTasksCount,
        totalDevelopers: filteredDevTeam.length,
      }
    : metrics

  // Overall Project Delivery Progress
  const avgProjectProgress =
    filteredProjects.length > 0
      ? Math.round(
          filteredProjects.reduce((sum, p) => sum + (p.progress || 0), 0) / filteredProjects.length
        )
      : 0

  // Task Completion Breakdown
  const doneTasks = filteredTasks.filter(
    (t) => (t.status || '').toUpperCase() === 'DONE' || (t.status || '').toUpperCase() === 'COMPLETED'
  ).length
  const inProgressTasks = filteredTasks.filter(
    (t) => (t.status || '').toUpperCase() === 'IN_PROGRESS'
  ).length
  const inReviewTasks = filteredTasks.filter(
    (t) => (t.status || '').toUpperCase() === 'IN_REVIEW'
  ).length
  const todoTasks = filteredTasks.filter(
    (t) => (t.status || '').toUpperCase() === 'TODO' || (t.status || '').toUpperCase() === 'ON_HOLD'
  ).length

  const taskCompletionRate =
    filteredTasks.length > 0 ? Math.round((doneTasks / filteredTasks.length) * 100) : 0

  // Developer workload summary: assigned active tasks per developer
  const developerWorkloads = filteredDevTeam.map((dev) => {
    const devTasks = filteredTasks.filter((t) =>
      t.assignees?.some((a) => a.user_id === dev.id)
    )
    const activeCount = devTasks.filter(
      (t) => (t.status || '').toUpperCase() !== 'DONE' && (t.status || '').toUpperCase() !== 'COMPLETED'
    ).length
    const doneCount = devTasks.filter(
      (t) => (t.status || '').toUpperCase() === 'DONE' || (t.status || '').toUpperCase() === 'COMPLETED'
    ).length

    return {
      id: dev.id,
      name: dev.name,
      designation: dev.designation || 'Developer',
      activeCount,
      doneCount,
    }
  })

  // Upcoming deadlines & overdue projects summary
  const overdueProjectsCount = filteredProjects.filter(
    (p) => p.deadline && new Date(p.deadline) < now && (p.status || '').toUpperCase() !== 'COMPLETED' && (p.status || '').toUpperCase() !== 'CANCELLED'
  ).length

  const upcomingDeadlinesCount = filteredProjects.filter(
    (p) => p.deadline && new Date(p.deadline) >= now && (p.status || '').toUpperCase() !== 'COMPLETED' && (p.status || '').toUpperCase() !== 'CANCELLED'
  ).length

  // 1. Bugs & Issues Summary
  const openBugsCount = filteredTasks.filter((t) => {
    const s = (t.status || '').toUpperCase()
    return s === 'TODO' || s === 'IN_PROGRESS' || s === 'IN_REVIEW'
  }).length
  const criticalIssuesCount = filteredTasks.filter((t) => {
    const p = (t.priority || '').toUpperCase()
    const s = (t.status || '').toUpperCase()
    return (p === 'URGENT' || p === 'HIGH') && s !== 'DONE' && s !== 'COMPLETED'
  }).length
  const blockedTasksCount = filteredTasks.filter((t) => {
    return (t.status || '').toUpperCase() === 'ON_HOLD'
  }).length

  // 2. Pending Actions Summary
  const pendingCodeReviewsCount = filteredTasks.filter((t) => (t.status || '').toUpperCase() === 'IN_REVIEW').length
  const escalatedIssuesCount = filteredTasks.filter((t) => {
    const p = (t.priority || '').toUpperCase()
    const s = (t.status || '').toUpperCase()
    return (p === 'URGENT' || s === 'ON_HOLD') && s !== 'DONE' && s !== 'COMPLETED'
  }).length

  const upcomingDeadlines = [
    ...filteredProjects
      .filter((p) => p.deadline && (p.status || '').toUpperCase() !== 'COMPLETED')
      .map((p) => ({
        id: p.id,
        title: p.name,
        type: 'Project',
        date: p.deadline!,
        isOverdue: new Date(p.deadline!) < now,
        href: `/projects`,
      })),
    ...filteredTasks
      .filter(
        (t) =>
          t.due_date &&
          (t.status || '').toUpperCase() !== 'DONE' &&
          (t.status || '').toUpperCase() !== 'COMPLETED'
      )
      .map((t) => ({
        id: t.id,
        title: t.title,
        type: 'Task',
        date: t.due_date!,
        isOverdue: new Date(t.due_date!) < now,
        href: `/tasks`,
      })),
  ]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)

  const cards = [
    {
      id: 'stat-total-projects',
      title: 'Total Projects',
      value: displayedMetrics.totalProjects,
      description: 'All development team projects',
      icon: FolderKanban,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-500/10',
      href: '/projects',
    },
    {
      id: 'stat-active-projects',
      title: 'Active Projects',
      value: displayedMetrics.activeProjects,
      description: 'Projects currently in progress',
      icon: TrendingUp,
      iconColor: 'text-indigo-500',
      iconBg: 'bg-indigo-500/10',
      href: '/projects',
    },
    {
      id: 'stat-completed-projects',
      title: 'Completed Projects',
      value: displayedMetrics.completedProjects,
      description: 'Successfully delivered projects',
      icon: CheckCircle2,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-500/10',
      href: '/projects',
    },
    {
      id: 'stat-pending-tasks',
      title: 'Pending Tasks',
      value: displayedMetrics.pendingTasks,
      description: 'Incomplete tasks awaiting completion',
      icon: Clock,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-500/10',
      href: '/tasks',
    },
    {
      id: 'stat-overdue-tasks',
      title: 'Overdue Tasks',
      value: displayedMetrics.overdueTasks,
      description: 'Incomplete tasks past deadline',
      icon: AlertTriangle,
      iconColor: displayedMetrics.overdueTasks > 0 ? 'text-destructive' : 'text-muted-foreground',
      iconBg: displayedMetrics.overdueTasks > 0 ? 'bg-destructive/10' : 'bg-secondary',
      highlight: displayedMetrics.overdueTasks > 0,
      href: '/tasks',
    },
    {
      id: 'stat-total-developers',
      title: 'Total Developers',
      value: displayedMetrics.totalDevelopers,
      description: 'Active Development department staff',
      icon: Users,
      iconColor: 'text-purple-500',
      iconBg: 'bg-purple-500/10',
      href: '/developers',
    },
  ]

  return (
    <div className="space-y-6">
      {/* 1. ROLE RECOGNITION & OVERVIEW BANNER */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-r from-card via-card to-muted/30 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            {/* Hierarchy Badge: Employee -> Development Department -> Head of Development */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5 text-foreground">
                <Users className="h-3 w-3" />
                Employee
              </span>
              <span>→</span>
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5 text-foreground">
                <Code2 className="h-3 w-3 text-blue-500" />
                Development Department
              </span>
              <span>→</span>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 border border-emerald-500/20">
                <ShieldCheck className="h-3 w-3" />
                Head of Development
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Head of Development Dashboard
              </h2>
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium"
              >
                HOD Active
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground">
              Welcome, <span className="font-semibold text-foreground">{user.employee_name || 'Head of Development'}</span>.
              Here is your centralized development operations, team workload, and delivery overview.
            </p>
          </div>

          {/* Quick Section Switchers */}
          <div className="flex flex-wrap sm:flex-col lg:flex-row gap-2 shrink-0">
            <Link href="/projects">
              <Button size="sm" className="h-9 gap-1.5 bg-foreground text-background hover:bg-foreground/90 font-medium text-xs">
                <FolderKanban className="h-3.5 w-3.5" />
                Projects Section
              </Button>
            </Link>
            <Link href="/tasks">
              <Button size="sm" variant="outline" className="h-9 gap-1.5 font-medium text-xs">
                <CheckSquare className="h-3.5 w-3.5" />
                Tasks Section
              </Button>
            </Link>
            <Link href="/project-deadlines">
              <Button size="sm" variant="outline" className="h-9 gap-1.5 font-medium text-xs">
                <Calendar className="h-3.5 w-3.5" />
                Deadlines Section
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* FILTER BAR: Date Range, Project, Developer, Project Status */}
      <HODFilterBar
        projects={projects}
        developers={devTeam}
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

      {/* 2. THE SIX OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const IconComponent = card.icon
          return (
            <Link key={card.id} href={card.href} className="block group">
              <Card
                data-testid={card.id}
                className={`border-border bg-card rounded-xl shadow-xs transition-all hover:border-foreground/30 h-full ${
                  card.highlight ? 'border-destructive/30' : ''
                }`}
              >
                <CardContent className="p-5 flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-1">
                      <span>{card.title}</span>
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                    <h3 className="text-3xl font-bold tracking-tight text-foreground font-sans">
                      {card.value}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {card.description}
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${card.iconBg} ${card.iconColor} shrink-0`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* 3. DASHBOARD SUMMARY / VISUALIZATION WIDGETS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Widget 1: Project Delivery & Progress Summary */}
        <Card className="border-border bg-card shadow-xs rounded-xl flex flex-col">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
                  <FolderKanban className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Project Progress Summary
                </CardTitle>
              </div>
              <Link href="/projects">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
                  Open Projects <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-4 flex-1 space-y-4">
            <div className="p-3.5 rounded-lg bg-muted/20 border border-border/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Overall Delivery Progress</span>
                <span className="font-bold text-foreground text-sm">{avgProjectProgress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-foreground transition-all duration-500 rounded-full"
                  style={{ width: `${Math.max(0, Math.min(100, avgProjectProgress))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span>{activeProjectsCount} Active / In Progress</span>
                <span>{completedProjectsCount} Delivered</span>
              </div>
            </div>

            {/* Visual snapshot of top active projects */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Active Projects Progress
              </p>
              {projects.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  No development projects recorded.
                </div>
              ) : (
                projects.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-lg border border-border/40 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-foreground truncate">{p.name}</span>
                      <span className="font-mono text-[11px] font-bold">{p.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden mt-1.5">
                      <div
                        className="h-full bg-foreground transition-all duration-300 rounded-full"
                        style={{ width: `${Math.max(0, Math.min(100, p.progress || 0))}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Widget 2: Task Completion & Workflow Summary */}
        <Card className="border-border bg-card shadow-xs rounded-xl flex flex-col">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
                  <CheckSquare className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Task Completion Summary
                </CardTitle>
              </div>
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
                  Open Tasks <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-4 flex-1 space-y-4">
            <div className="p-3.5 rounded-lg bg-muted/20 border border-border/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Completion Rate</span>
                <span className="font-bold text-foreground text-sm">{taskCompletionRate}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${taskCompletionRate}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span>{doneTasks} Completed</span>
                <span>{tasks.length} Total Tasks</span>
              </div>
            </div>

            {/* Status distribution blocks */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{doneTasks}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Completed</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{inProgressTasks}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-medium">In Progress</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{inReviewTasks}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-medium">In Review</p>
              </div>
              <div className="p-2 rounded-lg bg-secondary/80 border border-border/60">
                <p className="text-lg font-bold text-foreground">{todoTasks}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Pending</p>
              </div>
            </div>

            {metrics.overdueTasks > 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>{metrics.overdueTasks} tasks</strong> past deadline need immediate action.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Widget 3 & 4: Developer Workload & Upcoming Deadlines */}
      <div id="developer-workload" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Developer Workload Summary */}
        <Card className="border-border bg-card shadow-xs rounded-xl flex flex-col">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-500">
                  <Users className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Developer Workload Summary
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {devTeam.length} Developers
                </Badge>
                <Link
                  href="/developers"
                  className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                >
                  Manage Developers &rarr;
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 flex-1">
            {developerWorkloads.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No active developers assigned to Development.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {developerWorkloads.map((dev) => (
                  <div key={dev.id} className="py-2.5 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-secondary-foreground shrink-0 border border-border/60">
                        {dev.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{dev.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{dev.designation}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        {dev.activeCount} Active Tasks
                      </Badge>
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                        {dev.doneCount} Done
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Deadlines & Critical Actions */}
        <Card className="border-border bg-card shadow-xs rounded-xl flex flex-col">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
                  <Calendar className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Upcoming Deadlines & Actions
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                  Upcoming Deadlines: {upcomingDeadlinesCount}
                </Badge>
                {overdueProjectsCount > 0 && (
                  <Badge variant="destructive" className="text-xs font-semibold">
                    Overdue Projects: {overdueProjectsCount}
                  </Badge>
                )}
                <Link href="/project-deadlines">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-primary gap-1">
                    <span>Project Deadlines &rarr;</span>
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 flex-1">
            {upcomingDeadlines.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No upcoming deadlines or pending milestones.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {upcomingDeadlines.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <Link href={item.href} className="text-xs font-semibold text-foreground hover:underline truncate block">
                        {item.title}
                      </Link>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {item.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-medium ${
                          item.isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'
                        }`}
                      >
                        {dayjs(item.date).format('DD MMM YYYY')}
                      </span>
                      {item.isOverdue && (
                        <Badge variant="destructive" className="text-[9px] px-1.5 py-0 uppercase">
                          Overdue
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-3 border-t border-border/40 mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Upcoming: <strong className="text-foreground">{upcomingDeadlinesCount}</strong></span>
                <span>•</span>
                <span>Overdue: <strong className={overdueProjectsCount > 0 ? "text-destructive" : "text-foreground"}>{overdueProjectsCount}</strong></span>
              </div>
              <Link href="/project-deadlines" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                View Project Deadlines Management &rarr;
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. SUMMARY MODULE WIDGETS: BUGS, PROGRESS & PENDING ACTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Widget 1: Bugs & Issues Summary */}
        <Card data-testid="summary-bugs-issues" className="border-border bg-card shadow-xs rounded-xl flex flex-col">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
                  <Bug className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Bugs &amp; Issues
                </CardTitle>
              </div>
              <Link href="/bugs-issues">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-primary gap-1">
                  <span>View All &rarr;</span>
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-4 flex-1 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-muted/20 border border-border/60">
                <span className="text-muted-foreground font-medium">Open Bugs</span>
                <span className="font-bold text-foreground font-mono">{openBugsCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-destructive/5 border border-destructive/20">
                <span className="text-destructive font-medium">Critical Issues</span>
                <span className="font-bold text-destructive font-mono">{criticalIssuesCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <span className="text-amber-600 dark:text-amber-400 font-medium">Blocked Tasks</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">{blockedTasksCount}</span>
              </div>
            </div>
            <div className="pt-2">
              <Link href="/bugs-issues" className="text-xs text-primary font-medium hover:underline flex items-center justify-between">
                <span>Manage Bugs &amp; Issues</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Widget 2: Development Progress Summary */}
        <Card data-testid="summary-development-progress" className="border-border bg-card shadow-xs rounded-xl flex flex-col">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Development Progress
                </CardTitle>
              </div>
              <Link href="/development-progress">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-primary gap-1">
                  <span>Charts &rarr;</span>
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-4 flex-1 space-y-3">
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-muted/20 border border-border/60 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Overall Project Progress</span>
                  <span className="font-bold text-foreground font-mono">{avgProjectProgress}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${avgProjectProgress}%` }} />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-muted/20 border border-border/60">
                <span className="text-muted-foreground font-medium">Task Completion</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{taskCompletionRate}%</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-muted/20 border border-border/60">
                <span className="text-muted-foreground font-medium">Developer Workload</span>
                <span className="font-bold text-foreground font-mono">{devTeam.length} Active Devs</span>
              </div>
            </div>
            <div className="pt-2">
              <Link href="/development-progress" className="text-xs text-primary font-medium hover:underline flex items-center justify-between">
                <span>View Department Analytics</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Widget 3: Pending Actions Summary */}
        <Card data-testid="summary-pending-actions" className="border-border bg-card shadow-xs rounded-xl flex flex-col">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-500">
                  <Bell className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Pending Actions
                </CardTitle>
              </div>
              <Link href="/pending-actions">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-primary gap-1">
                  <span>Take Action &rarr;</span>
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-4 flex-1 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-muted/20 border border-border/60">
                <span className="text-muted-foreground font-medium">Pending Approvals</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">0</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
                <span className="text-indigo-600 dark:text-indigo-400 font-medium">Code Reviews</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">{pendingCodeReviewsCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-destructive/5 border border-destructive/20">
                <span className="text-destructive font-medium">Escalated Issues</span>
                <span className="font-bold text-destructive font-mono">{escalatedIssuesCount}</span>
              </div>
            </div>
            <div className="pt-2">
              <Link href="/pending-actions" className="text-xs text-primary font-medium hover:underline flex items-center justify-between">
                <span>Review Pending Items</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
