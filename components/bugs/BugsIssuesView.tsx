'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Bug,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  FolderKanban,
  CheckSquare,
  Flame,
  PauseCircle,
  PlayCircle,
  RotateCcw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Task, Project, TaskPriority, TaskStatus } from '@/types/project-management'
import { cn } from '@/lib/utils'
import dayjs from 'dayjs'

import { HODFilterBar, HODFilterValues } from '@/components/hod/HODFilterBar'
import { filterTasks } from '@/lib/utils/hod-filter-utils'
import { AssignableEmployee } from '@/lib/actions/team'

export interface BugsIssuesViewProps {
  tasks: Task[]
  projects: Project[]
  employees?: AssignableEmployee[]
  canManage?: boolean
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => Promise<void>
}

export function BugsIssuesView({
  tasks = [],
  projects = [],
  employees = [],
  canManage = true,
}: BugsIssuesViewProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'critical' | 'blocked' | 'resolved'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL')
  const [filters, setFilters] = useState<HODFilterValues>({
    startDate: '',
    endDate: '',
    projectId: 'ALL',
    developerId: 'ALL',
  })

  // Filter tasks using HODFilterBar (Date Range, Project, Developer)
  const filteredTasks = useMemo(() => {
    return filterTasks(tasks, filters, projects)
  }, [tasks, filters, projects])

  // Map tasks to issues with standardized classification
  const issueRecords = useMemo(() => {
    return filteredTasks.map((t) => {
      const statusUpper = (t.status || '').toUpperCase()
      const priorityUpper = (t.priority || '').toUpperCase()
      
      const isCritical = priorityUpper === 'URGENT' || priorityUpper === 'HIGH'
      const isBlocked = statusUpper === 'ON_HOLD'
      const isResolved = statusUpper === 'DONE' || statusUpper === 'COMPLETED'
      const isOpen = statusUpper === 'TODO' || statusUpper === 'IN_PROGRESS' || statusUpper === 'IN_REVIEW'

      // Suggested mapped status: Open → In Progress → Blocked → Resolved
      let displayStatus: 'Open' | 'In Progress' | 'Blocked' | 'Resolved' = 'Open'
      if (isResolved) displayStatus = 'Resolved'
      else if (isBlocked) displayStatus = 'Blocked'
      else if (statusUpper === 'IN_PROGRESS' || statusUpper === 'IN_REVIEW') displayStatus = 'In Progress'
      else displayStatus = 'Open'

      const assigneesText = (t.assignees || [])
        .map((a) => `${a.profile?.first_name || ''} ${a.profile?.last_name || ''}`.trim())
        .filter(Boolean)
        .join(', ') || 'Unassigned'

      const projectName = t.project_name || (t as any).project?.name || 'Development Project'

      return {
        ...t,
        isCritical,
        isBlocked,
        isResolved,
        isOpen,
        displayStatus,
        assigneesText,
        projectName,
      }
    })
  }, [filteredTasks])

  // Subsets
  const openBugs = useMemo(() => issueRecords.filter((i) => i.isOpen && !i.isBlocked), [issueRecords])
  const criticalIssues = useMemo(() => issueRecords.filter((i) => i.isCritical && !i.isResolved), [issueRecords])
  const blockedTasks = useMemo(() => issueRecords.filter((i) => i.isBlocked), [issueRecords])
  const resolvedIssues = useMemo(() => issueRecords.filter((i) => i.isResolved), [issueRecords])

  // Filter helper
  const filterList = (list: typeof issueRecords) => {
    return list.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.assigneesText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.task_id_display || '').toLowerCase().includes(searchTerm.toLowerCase())

      const matchPriority = priorityFilter === 'ALL' || (item.priority || '').toUpperCase() === priorityFilter.toUpperCase()

      return matchSearch && matchPriority
    })
  }

  const filteredAll = useMemo(() => filterList(issueRecords), [issueRecords, searchTerm, priorityFilter])
  const filteredOpen = useMemo(() => filterList(openBugs), [openBugs, searchTerm, priorityFilter])
  const filteredCritical = useMemo(() => filterList(criticalIssues), [criticalIssues, searchTerm, priorityFilter])
  const filteredBlocked = useMemo(() => filterList(blockedTasks), [blockedTasks, searchTerm, priorityFilter])
  const filteredResolved = useMemo(() => filterList(resolvedIssues), [resolvedIssues, searchTerm, priorityFilter])

  // Priority Badge
  const renderPriorityBadge = (priority: string) => {
    const p = (priority || '').toUpperCase()
    switch (p) {
      case 'URGENT':
        return <Badge variant="destructive" className="font-bold tracking-wider uppercase text-[10px] px-1.5 py-0.5">Urgent</Badge>
      case 'HIGH':
        return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold text-[10px]">High</Badge>
      case 'MEDIUM':
        return <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px]">Medium</Badge>
      default:
        return <Badge variant="outline" className="text-muted-foreground text-[10px]">Low</Badge>
    }
  }

  // Status Badge
  const renderStatusBadge = (status: 'Open' | 'In Progress' | 'Blocked' | 'Resolved') => {
    switch (status) {
      case 'Open':
        return <Badge variant="outline" className="text-slate-600 dark:text-slate-300 border-border">Open</Badge>
      case 'In Progress':
        return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">In Progress</Badge>
      case 'Blocked':
        return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/30 font-semibold">Blocked</Badge>
      case 'Resolved':
        return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold">Resolved</Badge>
    }
  }

  // Generic issues table
  const renderTable = (items: typeof issueRecords, emptyMessage: string) => {
    if (items.length === 0) {
      return (
        <div className="py-12 text-center text-xs text-muted-foreground">
          {emptyMessage}
        </div>
      )
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-medium">
              <th className="py-3 px-4">Issue / Task</th>
              <th className="py-3 px-4">Project</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Assigned Team</th>
              <th className="py-3 px-4">Due Date</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    {item.isCritical && <Flame className="h-3.5 w-3.5 text-destructive shrink-0" />}
                    {item.isBlocked && <PauseCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                    <span>{item.title}</span>
                  </div>
                  {item.task_id_display && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {item.task_id_display}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 rounded bg-secondary/80 px-2 py-0.5 text-xs text-foreground font-medium">
                    {item.projectName}
                  </span>
                </td>
                <td className="py-3 px-4">{renderPriorityBadge(item.priority)}</td>
                <td className="py-3 px-4">{renderStatusBadge(item.displayStatus)}</td>
                <td className="py-3 px-4 text-foreground">{item.assigneesText}</td>
                <td className="py-3 px-4 font-mono text-muted-foreground">
                  {item.due_date ? dayjs(item.due_date).format('DD MMM YYYY') : '—'}
                </td>
                <td className="py-3 px-4 text-center">
                  <Link href="/tasks">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground">
                      <span>Open Task</span>
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. TOP METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Open Bugs */}
        <Card
          data-testid="stat-open-bugs"
          className="border-border bg-card shadow-xs rounded-xl cursor-pointer hover:border-foreground/30 transition-all"
          onClick={() => setActiveTab('open')}
        >
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Open Bugs
              </p>
              <h3 className="text-3xl font-bold tracking-tight text-foreground font-sans">
                {openBugs.length}
              </h3>
              <p className="text-xs text-muted-foreground">
                Active issues in queue
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
              <Bug className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Critical Issues */}
        <Card
          data-testid="stat-critical-issues"
          className={cn(
            "border-border bg-card shadow-xs rounded-xl cursor-pointer hover:border-foreground/30 transition-all",
            criticalIssues.length > 0 ? "border-destructive/30 bg-destructive/5" : ""
          )}
          onClick={() => setActiveTab('critical')}
        >
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span>Critical Issues</span>
                {criticalIssues.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                )}
              </p>
              <h3 className={cn(
                "text-3xl font-bold tracking-tight font-sans",
                criticalIssues.length > 0 ? "text-destructive" : "text-foreground"
              )}>
                {criticalIssues.length}
              </h3>
              <p className="text-xs text-muted-foreground">
                Urgent or high priority
              </p>
            </div>
            <div className={cn(
              "p-2.5 rounded-lg shrink-0",
              criticalIssues.length > 0 ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"
            )}>
              <ShieldAlert className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Blocked Tasks */}
        <Card
          data-testid="stat-blocked-tasks"
          className={cn(
            "border-border bg-card shadow-xs rounded-xl cursor-pointer hover:border-foreground/30 transition-all",
            blockedTasks.length > 0 ? "border-amber-500/30 bg-amber-500/5" : ""
          )}
          onClick={() => setActiveTab('blocked')}
        >
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Blocked Tasks
              </p>
              <h3 className={cn(
                "text-3xl font-bold tracking-tight font-sans",
                blockedTasks.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
              )}>
                {blockedTasks.length}
              </h3>
              <p className="text-xs text-muted-foreground">
                Impeded deliverables on hold
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Resolved Issues */}
        <Card
          data-testid="stat-resolved-issues"
          className="border-border bg-card shadow-xs rounded-xl cursor-pointer hover:border-foreground/30 transition-all"
          onClick={() => setActiveTab('resolved')}
        >
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Resolved Issues
              </p>
              <h3 className="text-3xl font-bold tracking-tight text-foreground font-sans">
                {resolvedIssues.length}
              </h3>
              <p className="text-xs text-muted-foreground">
                Successfully delivered fixes
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. HOD FILTER BAR & SEARCH CONTROLS */}
      <div className="space-y-3">
        <HODFilterBar
          projects={projects}
          developers={employees}
          showDateRange={true}
          showProject={true}
          showDeveloper={true}
          showProjectStatus={false}
          values={filters}
          onChange={setFilters}
          onReset={() =>
            setFilters({
              startDate: '',
              endDate: '',
              projectId: 'ALL',
              developerId: 'ALL',
            })
          }
        />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bugs, issues, assigned developers, or projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs sm:text-sm bg-background border-border/70"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-9 px-3 text-xs bg-background border border-border/70 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>

            <Link href="/tasks">
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 shrink-0">
                <CheckSquare className="h-3.5 w-3.5" />
                <span>Task Board</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. TABS CONTAINER */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full space-y-4">
        <TabsList className="bg-secondary/60 p-1 rounded-lg border border-border">
          <TabsTrigger value="all" className="text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-xs">
            All Issues ({filteredAll.length})
          </TabsTrigger>
          <TabsTrigger value="open" className="text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-xs gap-1.5">
            <span>Open Bugs</span>
            <span className="ml-1 px-1.5 py-0.2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-[11px] font-semibold">
              {openBugs.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="critical" className="text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-xs gap-1.5">
            <span>Critical Issues</span>
            {criticalIssues.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-destructive/10 text-destructive rounded-full text-[11px] font-semibold">
                {criticalIssues.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="blocked" className="text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-xs gap-1.5">
            <span>Blocked Tasks</span>
            {blockedTasks.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-[11px] font-semibold">
                {blockedTasks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved" className="text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-xs gap-1.5">
            <span>Resolved</span>
            <span className="ml-1 px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[11px] font-semibold">
              {resolvedIssues.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ALL ISSUES */}
        <TabsContent value="all">
          <Card className="border-border bg-card rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Bug className="h-4 w-4 text-blue-500" />
                    <span>All Development Issues &amp; Tasks ({filteredAll.length})</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Comprehensive view of development defects, critical items, and blockers
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {renderTable(filteredAll, "No development issues found matching criteria.")}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: OPEN BUGS */}
        <TabsContent value="open">
          <Card className="border-border bg-card rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div>
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Bug className="h-4 w-4 text-blue-500" />
                  <span>Open Bugs ({filteredOpen.length})</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Active bug reports and issues requiring developer attention
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {renderTable(filteredOpen, "No open bugs found.")}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: CRITICAL ISSUES */}
        <TabsContent value="critical">
          <Card className="border-destructive/30 bg-card rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60 bg-destructive/5">
              <div>
                <CardTitle className="text-base font-semibold text-destructive flex items-center gap-2">
                  <Flame className="h-4 w-4" />
                  <span>Critical &amp; High Priority Issues ({filteredCritical.length})</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Issues flagged as Urgent or High priority requiring immediate HOD oversight
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {renderTable(filteredCritical, "Great job! No critical or high priority issues.")}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: BLOCKED TASKS */}
        <TabsContent value="blocked">
          <Card className="border-amber-500/30 bg-card rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60 bg-amber-500/5">
              <div>
                <CardTitle className="text-base font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Blocked Tasks ({filteredBlocked.length})</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Tasks impeded by technical dependencies or external blockers
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {renderTable(filteredBlocked, "No blocked tasks currently on hold.")}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: RESOLVED ISSUES */}
        <TabsContent value="resolved">
          <Card className="border-border bg-card rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div>
                <CardTitle className="text-base font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Resolved Issues ({filteredResolved.length})</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Successfully closed bug fixes and delivered resolutions
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {renderTable(filteredResolved, "No resolved issues found.")}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
