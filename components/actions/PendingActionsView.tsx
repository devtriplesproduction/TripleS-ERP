'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Bell,
  CheckCircle2,
  Code2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronRight,
  FolderKanban,
  CheckSquare,
  ShieldAlert,
  ArrowRight,
  FileCheck2,
  Eye,
  User,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Task, Project } from '@/types/project-management'
import { cn } from '@/lib/utils'
import dayjs from 'dayjs'

import { HODFilterBar, HODFilterValues } from '@/components/hod/HODFilterBar'
import { AssignableEmployee } from '@/lib/actions/team'

export interface PendingApprovalItem {
  id: string
  title: string
  submitterName: string
  department?: string
  date: string
  type: 'EOD Report' | 'Leave Request' | 'Timesheet'
  details?: string
  status: string
  employeeId?: string
}

export interface PendingActionsViewProps {
  approvals: PendingApprovalItem[]
  tasks: Task[]
  projects: Project[]
  employees?: AssignableEmployee[]
  canManage?: boolean
}

export function PendingActionsView({
  approvals = [],
  tasks = [],
  projects = [],
  employees = [],
  canManage = true,
}: PendingActionsViewProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'approvals' | 'reviews' | 'escalations'>('all')
  const [filters, setFilters] = useState<HODFilterValues>({
    projectId: 'ALL',
    developerId: 'ALL',
  })

  // Filter tasks by Project and Developer
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      if (filters.projectId && filters.projectId !== 'ALL' && t.project_id !== filters.projectId) {
        return false
      }
      if (filters.developerId && filters.developerId !== 'ALL') {
        const hasAssignee = t.assignees?.some((a) => a.user_id === filters.developerId)
        if (!hasAssignee) return false
      }
      return true
    })
  }, [tasks, filters])

  // Filter approvals by Developer
  const filteredApprovals = React.useMemo(() => {
    return approvals.filter((a) => {
      if (filters.developerId && filters.developerId !== 'ALL') {
        const dev = employees.find((e) => e.id === filters.developerId)
        if (a.employeeId && a.employeeId !== filters.developerId) {
          return false
        }
        if (!a.employeeId && dev && !a.submitterName.toLowerCase().includes(dev.name.toLowerCase())) {
          return false
        }
      }
      return true
    })
  }, [approvals, filters, employees])

  // 1. Pending Code Reviews: Tasks in IN_REVIEW status
  const pendingReviews = React.useMemo(() => {
    return filteredTasks.filter((t) => (t.status || '').toUpperCase() === 'IN_REVIEW')
  }, [filteredTasks])

  // 2. Escalated Issues: Tasks with URGENT priority or ON_HOLD (blocked)
  const escalatedIssues = React.useMemo(() => {
    return filteredTasks.filter(
      (t) =>
        (t.priority || '').toUpperCase() === 'URGENT' ||
        (t.status || '').toUpperCase() === 'ON_HOLD'
    )
  }, [filteredTasks])

  return (
    <div className="space-y-6">
      {/* FILTER BAR: Project, Developer */}
      <HODFilterBar
        projects={projects}
        developers={employees.filter((e) => (e.department || '').toLowerCase() === 'development')}
        showDateRange={false}
        showProject={true}
        showDeveloper={true}
        showProjectStatus={false}
        values={filters}
        onChange={setFilters}
        onReset={() =>
          setFilters({
            projectId: 'ALL',
            developerId: 'ALL',
          })
        }
      />

      {/* 1. TOP SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Pending Approvals */}
        <Card
          data-testid="stat-pending-approvals"
          className="border-border bg-card shadow-xs rounded-xl cursor-pointer hover:border-foreground/30 transition-all"
          onClick={() => setActiveTab('approvals')}
        >
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pending Approvals
              </p>
              <h3 className="text-3xl font-bold tracking-tight text-foreground font-sans">
                {approvals.length}
              </h3>
              <p className="text-xs text-muted-foreground">
                EODs &amp; submissions awaiting sign-off
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
              <FileCheck2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Pending Code Reviews */}
        <Card
          data-testid="stat-pending-reviews"
          className="border-border bg-card shadow-xs rounded-xl cursor-pointer hover:border-foreground/30 transition-all"
          onClick={() => setActiveTab('reviews')}
        >
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pending Code Reviews
              </p>
              <h3 className="text-3xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 font-sans">
                {pendingReviews.length}
              </h3>
              <p className="text-xs text-muted-foreground">
                Development tasks in review stage
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
              <Code2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Escalated Issues */}
        <Card
          data-testid="stat-escalated-issues"
          className={cn(
            "border-border bg-card shadow-xs rounded-xl cursor-pointer hover:border-foreground/30 transition-all",
            escalatedIssues.length > 0 ? "border-destructive/30 bg-destructive/5" : ""
          )}
          onClick={() => setActiveTab('escalations')}
        >
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span>Escalated Issues</span>
                {escalatedIssues.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                )}
              </p>
              <h3 className={cn(
                "text-3xl font-bold tracking-tight font-sans",
                escalatedIssues.length > 0 ? "text-destructive" : "text-foreground"
              )}>
                {escalatedIssues.length}
              </h3>
              <p className="text-xs text-muted-foreground">
                Urgent roadblocks requiring HOD action
              </p>
            </div>
            <div className={cn(
              "p-2.5 rounded-lg shrink-0",
              escalatedIssues.length > 0 ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"
            )}>
              <ShieldAlert className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. TABS CONTAINER */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full space-y-4">
        <TabsList className="bg-secondary/60 p-1 rounded-lg border border-border">
          <TabsTrigger value="all" className="text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-xs">
            All Actions ({approvals.length + pendingReviews.length + escalatedIssues.length})
          </TabsTrigger>
          <TabsTrigger value="approvals" className="text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-xs gap-1.5">
            <span>Pending Approvals</span>
            <span className="ml-1 px-1.5 py-0.2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-[11px] font-semibold">
              {approvals.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="reviews" className="text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-xs gap-1.5">
            <span>Code Reviews</span>
            <span className="ml-1 px-1.5 py-0.2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-[11px] font-semibold">
              {pendingReviews.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="escalations" className="text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-xs gap-1.5">
            <span>Escalated Issues</span>
            {escalatedIssues.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-destructive/10 text-destructive rounded-full text-[11px] font-semibold">
                {escalatedIssues.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ALL ACTIONS OVERVIEW */}
        <TabsContent value="all" className="space-y-6">
          {/* Section 1: Escalated Alert */}
          {escalatedIssues.length > 0 && (
            <Card className="border-destructive/30 bg-destructive/5 rounded-xl shadow-xs">
              <CardHeader className="pb-3 border-b border-destructive/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
                    <ShieldAlert className="h-4 w-4" />
                    <span>Immediate Attention: {escalatedIssues.length} Escalated Issues</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:bg-destructive/10 h-7"
                    onClick={() => setActiveTab('escalations')}
                  >
                    View All &rarr;
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="divide-y divide-destructive/10">
                  {escalatedIssues.slice(0, 3).map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                      <div>
                        <p className="text-xs font-bold text-foreground">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground">{item.project_name || 'Project'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-[10px] uppercase font-semibold">
                          {item.priority === 'URGENT' ? 'Urgent Priority' : 'Blocked on Hold'}
                        </Badge>
                        <Link href="/tasks">
                          <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/30 text-destructive">
                            Take Action
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 2: Pending Code Reviews Summary */}
          <Card className="border-border bg-card rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-indigo-500" />
                    <span>Pending Code Reviews</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Completed development pull requests and deliverables awaiting HOD review
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary h-7"
                  onClick={() => setActiveTab('reviews')}
                >
                  View All ({pendingReviews.length}) &rarr;
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {pendingReviews.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No pending code reviews in queue.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-medium">
                        <th className="py-3 px-4">Task Deliverable</th>
                        <th className="py-3 px-4">Project</th>
                        <th className="py-3 px-4">Assignee</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {pendingReviews.slice(0, 4).map((task) => (
                        <tr key={task.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground">
                            <div>{task.title}</div>
                            {task.task_id_display && (
                              <span className="font-mono text-[10px] text-muted-foreground">{task.task_id_display}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-foreground">{task.project_name || 'Project'}</td>
                          <td className="py-3 px-4">
                            {(task.assignees || []).map((a) => `${a.profile?.first_name || ''} ${a.profile?.last_name || ''}`).join(', ') || 'Developer'}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
                              In Review
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link href="/tasks">
                              <Button size="sm" variant="outline" className="h-7 text-xs">
                                Review &rarr;
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

          {/* Section 3: Pending Approvals Preview */}
          <Card className="border-border bg-card rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4 text-blue-500" />
                    <span>Pending Approvals</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Work reports and development approvals awaiting HOD sign-off
                  </CardDescription>
                </div>
                <Link href="/eod">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-primary">
                    Open Review Dashboard &rarr;
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {approvals.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  All developer submissions and reports are up to date!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-medium">
                        <th className="py-3 px-4">Item</th>
                        <th className="py-3 px-4">Submitter</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {approvals.slice(0, 4).map((item) => (
                        <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground">{item.title}</td>
                          <td className="py-3 px-4 text-foreground">{item.submitterName}</td>
                          <td className="py-3 px-4 font-mono text-muted-foreground">{dayjs(item.date).format('DD MMM YYYY')}</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">{item.type}</Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link href="/eod">
                              <Button size="sm" variant="outline" className="h-7 text-xs">
                                Review EOD
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

        {/* TAB 2: PENDING APPROVALS */}
        <TabsContent value="approvals">
          <Card className="border-border bg-card rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4 text-blue-500" />
                    <span>Pending Approvals ({approvals.length})</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Requests and submissions awaiting Head of Development authorization
                  </CardDescription>
                </div>
                <Link href="/eod">
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <span>EOD Review Dashboard</span>
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {approvals.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No pending approvals. All submissions have been approved.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-medium">
                        <th className="py-3 px-4">Item</th>
                        <th className="py-3 px-4">Submitter</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {approvals.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground">{item.title}</td>
                          <td className="py-3 px-4 text-foreground">{item.submitterName}</td>
                          <td className="py-3 px-4 font-mono text-muted-foreground">{dayjs(item.date).format('DD MMM YYYY')}</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">{item.type}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="secondary" className="text-blue-600 bg-blue-500/10">Pending</Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link href="/eod">
                              <Button size="sm" variant="outline" className="h-7 text-xs">
                                Review
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

        {/* TAB 3: PENDING CODE REVIEWS */}
        <TabsContent value="reviews">
          <Card className="border-border bg-card rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-indigo-500" />
                    <span>Pending Code Reviews ({pendingReviews.length})</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Development deliverables completed by engineers and submitted for HOD review
                  </CardDescription>
                </div>
                <Link href="/tasks">
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <span>Task Board</span>
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {pendingReviews.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No pending code reviews waiting for review.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-medium">
                        <th className="py-3 px-4">Task Deliverable</th>
                        <th className="py-3 px-4">Project</th>
                        <th className="py-3 px-4">Assignee</th>
                        <th className="py-3 px-4">Priority</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {pendingReviews.map((task) => (
                        <tr key={task.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground">
                            <div>{task.title}</div>
                            {task.task_id_display && (
                              <span className="font-mono text-[10px] text-muted-foreground">{task.task_id_display}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-foreground">{task.project_name || 'Project'}</td>
                          <td className="py-3 px-4">
                            {(task.assignees || []).map((a) => `${a.profile?.first_name || ''} ${a.profile?.last_name || ''}`).join(', ') || 'Developer'}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">{task.priority}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
                              In Review
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link href="/tasks">
                              <Button size="sm" variant="outline" className="h-7 text-xs">
                                Review &rarr;
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

        {/* TAB 4: ESCALATED ISSUES */}
        <TabsContent value="escalations">
          <Card className="border-destructive/30 bg-card rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60 bg-destructive/5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-destructive flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    <span>Escalated Issues ({escalatedIssues.length})</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Urgent priority items and blocked tasks requiring HOD intervention
                  </CardDescription>
                </div>
                <Link href="/tasks">
                  <Button variant="outline" size="sm" className="h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10">
                    <span>Task Board</span>
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {escalatedIssues.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No escalated issues or blocked tasks found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-destructive/10 text-destructive font-medium">
                        <th className="py-3 px-4">Issue</th>
                        <th className="py-3 px-4">Project</th>
                        <th className="py-3 px-4">Priority</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {escalatedIssues.map((task) => (
                        <tr key={task.id} className="hover:bg-destructive/5 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground">
                            <div>{task.title}</div>
                            {task.task_id_display && (
                              <span className="font-mono text-[10px] text-muted-foreground">{task.task_id_display}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-foreground">{task.project_name || 'Project'}</td>
                          <td className="py-3 px-4">
                            <Badge variant="destructive">{task.priority}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className={task.status === 'ON_HOLD' ? 'text-destructive border-destructive/30 font-semibold' : ''}>
                              {task.status === 'ON_HOLD' ? 'Blocked / On Hold' : task.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link href="/tasks">
                              <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10">
                                Unblock &rarr;
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
