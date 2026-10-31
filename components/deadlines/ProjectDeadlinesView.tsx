'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FolderKanban,
  CheckSquare,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  User,
  SlidersHorizontal,
  Calendar,
  AlertCircle,
  Flag,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Project, Task, ProjectStatus } from '@/types/project-management'
import { cn } from '@/lib/utils'
import dayjs from 'dayjs'

import { HODFilterBar, HODFilterValues } from '@/components/hod/HODFilterBar'
import { filterProjects } from '@/lib/utils/hod-filter-utils'

export interface ProjectDeadlinesViewProps {
  projects: Project[]
  tasks: Task[]
  canManage?: boolean
}

export function ProjectDeadlinesView({
  projects = [],
  tasks = [],
  canManage = true,
}: ProjectDeadlinesViewProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'overdue' | 'milestones'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<HODFilterValues>({
    startDate: '',
    endDate: '',
    projectId: 'ALL',
    projectStatus: 'ALL',
  })

  const now = dayjs().startOf('day')

  // Filter projects by Date Range, Project ID, and Project Status
  const filteredProjects = useMemo(() => {
    return filterProjects(projects, filters, tasks)
  }, [projects, filters, tasks])

  // Process and decorate projects with remaining days / overdue days
  const processedProjects = useMemo(() => {
    return filteredProjects.map((p) => {
      const isCompleted = ['COMPLETED'].includes((p.status || '').toUpperCase())
      const isCancelled = ['CANCELLED'].includes((p.status || '').toUpperCase())
      
      let deadlineDay = p.deadline ? dayjs(p.deadline).startOf('day') : null
      let diffDays: number | null = null
      let isOverdue = false
      let isUpcoming = false
      let remainingDaysText = 'No deadline'
      let daysOverdueText = ''

      if (deadlineDay && deadlineDay.isValid()) {
        diffDays = deadlineDay.diff(now, 'day')
        if (!isCompleted && !isCancelled) {
          if (diffDays < 0) {
            isOverdue = true
            const overdueCount = Math.abs(diffDays)
            daysOverdueText = `${overdueCount} ${overdueCount === 1 ? 'Day' : 'Days'} Overdue`
          } else {
            isUpcoming = true
            if (diffDays === 0) {
              remainingDaysText = 'Due Today'
            } else if (diffDays === 1) {
              remainingDaysText = '1 day remaining'
            } else {
              remainingDaysText = `${diffDays} days remaining`
            }
          }
        }
      }

      return {
        ...p,
        diffDays,
        isOverdue,
        isUpcoming,
        remainingDaysText,
        daysOverdueText,
        teamLead: p.project_manager_name || 'Unassigned',
      }
    })
  }, [projects, now])

  // Overdue projects: Current Date > Project Deadline and not completed/cancelled
  const overdueProjects = useMemo(() => {
    return processedProjects
      .filter((p) => p.isOverdue)
      .sort((a, b) => (a.diffDays ?? 0) - (b.diffDays ?? 0)) // Most overdue first
  }, [processedProjects])

  // Upcoming deadlines: Deadline >= Current Date and not completed/cancelled
  const upcomingProjects = useMemo(() => {
    return processedProjects
      .filter((p) => p.isUpcoming)
      .sort((a, b) => (a.diffDays ?? 9999) - (b.diffDays ?? 9999)) // Soonest first
  }, [processedProjects])

  // Process Project Milestones: Tasks associated with projects that serve as deliverable milestones
  const milestones = useMemo(() => {
    return tasks.map((t) => {
      const isCompleted = ['DONE', 'COMPLETED'].includes((t.status || '').toUpperCase())
      const dueDay = t.due_date ? dayjs(t.due_date).startOf('day') : null
      let diffDays: number | null = null
      let isOverdue = false
      let remainingText = 'No due date'

      if (dueDay && dueDay.isValid()) {
        diffDays = dueDay.diff(now, 'day')
        if (!isCompleted) {
          if (diffDays < 0) {
            isOverdue = true
            const count = Math.abs(diffDays)
            remainingText = `${count}d overdue`
          } else if (diffDays === 0) {
            remainingText = 'Due today'
          } else {
            remainingText = `${diffDays}d left`
          }
        } else {
          remainingText = 'Completed'
        }
      }

      // Calculate milestone completion rate (based on checklist if available, else status)
      let progress = 0
      if (isCompleted) {
        progress = 100
      } else if (t.checklist_total && t.checklist_total > 0) {
        progress = Math.round(((t.checklist_completed || 0) / t.checklist_total) * 100)
      } else if ((t.status || '').toUpperCase() === 'IN_PROGRESS') {
        progress = 50
      } else if ((t.status || '').toUpperCase() === 'IN_REVIEW') {
        progress = 85
      }

      return {
        id: t.id,
        title: t.title,
        projectId: t.project_id,
        projectName: t.project_name || (t as any).project?.name || 'Project Deliverable',
        dueDate: t.due_date,
        status: t.status,
        progress,
        isCompleted,
        isOverdue,
        remainingText,
        assignees: t.assignees || [],
      }
    }).sort((a, b) => {
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })
  }, [tasks, now])

  // Filtered upcoming projects
  const filteredUpcoming = useMemo(() => {
    return upcomingProjects.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.teamLead.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.project_id_display || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus =
        !filters.projectStatus ||
        filters.projectStatus === 'ALL' ||
        (p.status || '').toUpperCase() === filters.projectStatus.toUpperCase()
      return matchesSearch && matchesStatus
    })
  }, [upcomingProjects, searchTerm, filters])

  // Filtered overdue projects
  const filteredOverdue = useMemo(() => {
    return overdueProjects.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.teamLead.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.project_id_display || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus =
        !filters.projectStatus ||
        filters.projectStatus === 'ALL' ||
        (p.status || '').toUpperCase() === filters.projectStatus.toUpperCase()
      return matchesSearch && matchesStatus
    })
  }, [overdueProjects, searchTerm, filters])

  // Filtered milestones
  const filteredMilestones = useMemo(() => {
    return milestones.filter((m) => {
      const matchesSearch =
        m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.projectName.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus =
        !filters.projectStatus ||
        filters.projectStatus === 'ALL' ||
        (m.status || '').toUpperCase() === filters.projectStatus.toUpperCase()
      return matchesSearch && matchesStatus
    })
  }, [milestones, searchTerm, filters])

  // Status badge styling helper
  const renderStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase()
    switch (s) {
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20">In Progress</Badge>
      case 'PLANNED':
        return <Badge variant="outline" className="text-muted-foreground border-border">Planned</Badge>
      case 'COMPLETED':
      case 'DONE':
        return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Completed</Badge>
      case 'IN_REVIEW':
        return <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">In Review</Badge>
      case 'ON_HOLD':
        return <Badge variant="secondary" className="text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30">On Hold</Badge>
      case 'TODO':
        return <Badge variant="outline" className="text-slate-500">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. TOP METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Upcoming Deadlines */}
        <Card
          data-testid="stat-upcoming-deadlines"
          className="border-border bg-card shadow-xs rounded-xl cursor-pointer hover:border-foreground/30 transition-all"
          onClick={() => setActiveTab('upcoming')}
        >
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Upcoming Deadlines
              </p>
              <h3 className="text-3xl font-bold tracking-tight text-foreground font-sans">
                {upcomingProjects.length}
              </h3>
              <p className="text-xs text-muted-foreground">
                Projects with future delivery dates
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
              <CalendarDays className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Overdue Projects */}
        <Card
          data-testid="stat-overdue-projects"
          className={cn(
            "border-border bg-card shadow-xs rounded-xl cursor-pointer hover:border-foreground/30 transition-all",
            overdueProjects.length > 0 ? "border-destructive/30 bg-destructive/5" : ""
          )}
          onClick={() => setActiveTab('overdue')}
        >
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span>Overdue Projects</span>
                {overdueProjects.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                )}
              </p>
              <h3 className={cn(
                "text-3xl font-bold tracking-tight font-sans",
                overdueProjects.length > 0 ? "text-destructive" : "text-foreground"
              )}>
                {overdueProjects.length}
              </h3>
              <p className="text-xs text-muted-foreground">
                Past deadline & incomplete
              </p>
            </div>
            <div className={cn(
              "p-2.5 rounded-lg shrink-0",
              overdueProjects.length > 0 ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"
            )}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Project Milestones */}
        <Card
          data-testid="stat-project-milestones"
          className="border-border bg-card shadow-xs rounded-xl cursor-pointer hover:border-foreground/30 transition-all"
          onClick={() => setActiveTab('milestones')}
        >
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Project Milestones
              </p>
              <h3 className="text-3xl font-bold tracking-tight text-foreground font-sans">
                {milestones.length}
              </h3>
              <p className="text-xs text-muted-foreground">
                Deliverables tracked across projects
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
              <Flag className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Total Tracked Projects */}
        <Card
          data-testid="stat-total-projects"
          className="border-border bg-card shadow-xs rounded-xl"
        >
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Projects
              </p>
              <h3 className="text-3xl font-bold tracking-tight text-foreground font-sans">
                {projects.length}
              </h3>
              <p className="text-xs text-muted-foreground">
                Active in Development pipeline
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
              <FolderKanban className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. HOD FILTER BAR & SEARCH CONTROLS */}
      <div className="space-y-3">
        <HODFilterBar
          projects={projects}
          showDateRange={true}
          showProject={true}
          showDeveloper={false}
          showProjectStatus={true}
          values={filters}
          onChange={setFilters}
          onReset={() =>
            setFilters({
              startDate: '',
              endDate: '',
              projectId: 'ALL',
              projectStatus: 'ALL',
            })
          }
        />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects, team leads, or milestones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs sm:text-sm bg-background border-border/70"
            />
          </div>

          <div className="flex items-center gap-2">
            <Link href="/projects">
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 shrink-0">
                <FolderKanban className="h-3.5 w-3.5" />
                <span>Projects Module</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. TABS CONTAINER */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full space-y-4">
        <TabsList className="bg-secondary/60 p-1 rounded-lg border border-border">
          <TabsTrigger value="all" className="text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-xs">
            All Deadlines Overview
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-xs gap-1.5">
            <span>Upcoming Deadlines</span>
            <span className="ml-1 px-1.5 py-0.2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-[11px] font-semibold">
              {upcomingProjects.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="overdue" className="text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-xs gap-1.5">
            <span>Overdue Projects</span>
            {overdueProjects.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-destructive/10 text-destructive rounded-full text-[11px] font-semibold">
                {overdueProjects.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="milestones" className="text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-xs gap-1.5">
            <span>Project Milestones</span>
            <span className="ml-1 px-1.5 py-0.2 bg-secondary text-foreground rounded-full text-[11px] font-semibold">
              {milestones.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ALL DEADLINES OVERVIEW */}
        <TabsContent value="all" className="space-y-6">
          {/* Overdue Alert Section (if any overdue) */}
          {overdueProjects.length > 0 && (
            <Card className="border-destructive/30 bg-destructive/5 rounded-xl shadow-xs">
              <CardHeader className="pb-3 border-b border-destructive/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Critical: {overdueProjects.length} Overdue {overdueProjects.length === 1 ? 'Project' : 'Projects'} Require Attention</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:bg-destructive/10 h-7"
                    onClick={() => setActiveTab('overdue')}
                  >
                    View All Overdue &rarr;
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="divide-y divide-destructive/10">
                  {overdueProjects.slice(0, 3).map((p) => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                      <div>
                        <p className="text-xs font-bold text-foreground">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">Team Lead: {p.teamLead}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="destructive" className="text-[10px] uppercase font-semibold">
                          {p.daysOverdueText}
                        </Badge>
                        <Link href="/projects">
                          <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10">
                            Open Project
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Deadlines Table Preview */}
          <Card className="border-border bg-card rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">
                    Upcoming Project Deadlines
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Monitor active project schedules and upcoming target completion dates
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary h-7"
                  onClick={() => setActiveTab('upcoming')}
                >
                  View Full Table &rarr;
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredUpcoming.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No upcoming deadlines found matching criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-medium">
                        <th className="py-3 px-4">Project</th>
                        <th className="py-3 px-4">Team Lead</th>
                        <th className="py-3 px-4 text-right">Progress</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Deadline</th>
                        <th className="py-3 px-4 text-right">Remaining</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredUpcoming.slice(0, 5).map((p) => (
                        <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground">
                            <div>
                              <span>{p.name}</span>
                              {p.project_id_display && (
                                <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                                  {p.project_id_display}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-foreground">{p.teamLead}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="font-semibold text-foreground">{p.progress || 0}%</span>
                              <div className="w-16 bg-secondary rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${p.progress || 0}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">{renderStatusBadge(p.status)}</td>
                          <td className="py-3 px-4 font-mono">
                            {p.deadline ? dayjs(p.deadline).format('DD MMM YYYY') : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-blue-600 dark:text-blue-400">
                            {p.remainingDaysText}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link href="/projects">
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground">
                                Open &rarr;
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Project Milestones Table Preview */}
          <Card className="border-border bg-card rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Flag className="h-4 w-4 text-indigo-500" />
                    <span>Project Milestones</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Key deliverable targets and scheduled milestones across active projects
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary h-7"
                  onClick={() => setActiveTab('milestones')}
                >
                  View All Milestones &rarr;
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredMilestones.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No project milestones found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-medium">
                        <th className="py-3 px-4">Milestone</th>
                        <th className="py-3 px-4">Project</th>
                        <th className="py-3 px-4">Due Date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Completion / Progress</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredMilestones.slice(0, 5).map((m) => (
                        <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-foreground">{m.title}</div>
                            {m.remainingText && (
                              <span className={cn(
                                "text-[10px] font-mono",
                                m.isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"
                              )}>
                                {m.remainingText}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium text-foreground">
                            <span className="inline-flex items-center gap-1 rounded bg-secondary/80 px-2 py-0.5 text-xs">
                              {m.projectName}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono">
                            {m.dueDate ? dayjs(m.dueDate).format('DD MMM YYYY') : 'No Due Date'}
                          </td>
                          <td className="py-3 px-4">{renderStatusBadge(m.status)}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="font-semibold text-foreground">{m.progress}%</span>
                              <div className="w-16 bg-secondary rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    m.progress === 100 ? "bg-emerald-500" : "bg-primary"
                                  )}
                                  style={{ width: `${m.progress}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link href="/tasks">
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-foreground">
                                View Task &rarr;
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: UPCOMING DEADLINES (DETAILED TABLE) */}
        <TabsContent value="upcoming">
          <Card className="border-border bg-card rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-blue-500" />
                    <span>Upcoming Deadlines ({filteredUpcoming.length})</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Live schedule of all active projects with remaining days to delivery
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredUpcoming.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No upcoming deadlines found. All projects are either delivered or have no target deadlines.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-medium">
                        <th className="py-3 px-4">Project</th>
                        <th className="py-3 px-4">Team Lead</th>
                        <th className="py-3 px-4 text-right">Project Progress</th>
                        <th className="py-3 px-4">Project Status</th>
                        <th className="py-3 px-4">Deadline</th>
                        <th className="py-3 px-4 text-right">Remaining Days</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredUpcoming.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-semibold text-foreground">{p.name}</p>
                              {p.project_id_display && (
                                <p className="font-mono text-[10px] text-muted-foreground">{p.project_id_display}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-foreground font-medium">{p.teamLead}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="font-semibold text-foreground">{p.progress || 0}%</span>
                              <div className="w-20 bg-secondary rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${p.progress || 0}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">{renderStatusBadge(p.status)}</td>
                          <td className="py-3 px-4 font-mono">
                            {p.deadline ? dayjs(p.deadline).format('DD MMM YYYY') : '—'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/5 font-semibold">
                              {p.remainingDaysText}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link href="/projects">
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-foreground hover:bg-muted">
                                <span>Open Project</span>
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: OVERDUE PROJECTS (DETAILED TABLE) */}
        <TabsContent value="overdue">
          <Card className="border-destructive/30 bg-card rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60 bg-destructive/5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Overdue Projects ({filteredOverdue.length})</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Projects where Current Date &gt; Project Deadline and delivery is not completed
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredOverdue.length === 0 ? (
                <div className="py-12 text-center text-xs text-emerald-600 dark:text-emerald-400 flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  <p className="font-semibold">Excellent! No overdue projects.</p>
                  <p className="text-muted-foreground text-[11px]">All active development projects are currently on schedule.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-destructive/10 text-destructive font-medium">
                        <th className="py-3 px-4">Project</th>
                        <th className="py-3 px-4">Team Lead</th>
                        <th className="py-3 px-4 text-right">Progress</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Deadline</th>
                        <th className="py-3 px-4 text-right">Days Overdue</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredOverdue.map((p) => (
                        <tr key={p.id} className="hover:bg-destructive/5 transition-colors">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-bold text-foreground">{p.name}</p>
                              {p.project_id_display && (
                                <p className="font-mono text-[10px] text-muted-foreground">{p.project_id_display}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-foreground font-medium">{p.teamLead}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="font-semibold text-foreground">{p.progress || 0}%</span>
                              <div className="w-20 bg-secondary rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-destructive rounded-full"
                                  style={{ width: `${p.progress || 0}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">{renderStatusBadge(p.status)}</td>
                          <td className="py-3 px-4 font-mono font-semibold text-destructive">
                            {p.deadline ? dayjs(p.deadline).format('DD MMM YYYY') : '—'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Badge variant="destructive" className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5">
                              {p.daysOverdueText}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link href="/projects">
                              <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10">
                                Open Project
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: PROJECT MILESTONES */}
        <TabsContent value="milestones">
          <Card className="border-border bg-card rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Flag className="h-4 w-4 text-indigo-500" />
                    <span>Project Milestones ({filteredMilestones.length})</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Deliverables and milestone targets tracked across development projects
                  </CardDescription>
                </div>
                <Link href="/tasks">
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <CheckSquare className="h-3.5 w-3.5" />
                    <span>Task Board</span>
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredMilestones.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No project milestones or deliverables found matching criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-medium">
                        <th className="py-3 px-4">Milestone</th>
                        <th className="py-3 px-4">Project</th>
                        <th className="py-3 px-4">Due Date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Completion / Progress</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredMilestones.map((m) => (
                        <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-foreground">{m.title}</div>
                            {m.remainingText && (
                              <span className={cn(
                                "text-[10px] font-mono",
                                m.isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"
                              )}>
                                {m.remainingText}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium text-foreground">
                            <span className="inline-flex items-center gap-1 rounded bg-secondary/80 px-2 py-0.5 text-xs">
                              {m.projectName}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono">
                            {m.dueDate ? dayjs(m.dueDate).format('DD MMM YYYY') : 'No Due Date'}
                          </td>
                          <td className="py-3 px-4">{renderStatusBadge(m.status)}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="font-semibold text-foreground">{m.progress}%</span>
                              <div className="w-16 bg-secondary rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    m.progress === 100 ? "bg-emerald-500" : "bg-primary"
                                  )}
                                  style={{ width: `${m.progress}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link href="/tasks">
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-foreground">
                                View Task &rarr;
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
