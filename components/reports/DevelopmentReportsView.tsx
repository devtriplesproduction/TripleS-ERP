'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  BarChart3,
  Download,
  FolderKanban,
  CheckSquare,
  Users,
  Search,
  Filter,
  FileSpreadsheet,
  Printer,
  Copy,
  Check,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Project, Task } from '@/types/project-management'
import { AssignableEmployee } from '@/lib/actions/team'
import { cn } from '@/lib/utils'
import dayjs from 'dayjs'

import { HODFilterBar, HODFilterValues } from '@/components/hod/HODFilterBar'
import { filterProjects, filterTasks } from '@/lib/utils/hod-filter-utils'

export interface DevelopmentReportsViewProps {
  projects: Project[]
  tasks: Task[]
  employees: AssignableEmployee[]
}

export function DevelopmentReportsView({
  projects = [],
  tasks = [],
  employees = [],
}: DevelopmentReportsViewProps) {
  const [activeReport, setActiveReport] = useState<'project' | 'developer' | 'task'>('project')
  const [searchTerm, setSearchTerm] = useState('')
  const [copied, setCopied] = useState(false)
  const [filters, setFilters] = useState<HODFilterValues>({
    startDate: '',
    endDate: '',
    projectId: 'ALL',
    developerId: 'ALL',
    projectStatus: 'ALL',
  })

  const now = new Date()

  // Filter projects and tasks by active HOD filters
  const scopedProjects = useMemo(() => {
    return filterProjects(projects, filters, tasks)
  }, [projects, filters, tasks])

  const scopedTasks = useMemo(() => {
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

  // 1. DATA: Project Progress Report
  const projectProgressReport = useMemo(() => {
    return scopedProjects.map((p) => {
      const teamLead = p.project_manager_name || 'Unassigned'
      const progress = p.progress || 0
      const startDate = p.start_date ? dayjs(p.start_date).format('DD MMM YYYY') : '—'
      const deadline = p.deadline ? dayjs(p.deadline).format('DD MMM YYYY') : '—'

      return {
        id: p.id,
        name: p.name,
        code: p.project_id_display || 'PRJ',
        teamLead,
        progress,
        status: p.status || 'PLANNED',
        startDate,
        deadline,
        rawStartDate: p.start_date,
        rawDeadline: p.deadline,
      }
    })
  }, [scopedProjects])

  // 2. DATA: Developer Performance Report
  const developerPerformanceReport = useMemo(() => {
    return devEmployees.map((dev) => {
      const devTasks = scopedTasks.filter((t) =>
        t.assignees?.some((a) => a.user_id === dev.id)
      )

      const assignedProjectIds = Array.from(new Set(devTasks.map((t) => t.project_id)))
      const assignedProjectsCount = assignedProjectIds.length
      const assignedProjectNames = scopedProjects
        .filter((p) => assignedProjectIds.includes(p.id))
        .map((p) => p.name)
        .join(', ') || 'None'

      const totalTasks = devTasks.length
      const completedTasks = devTasks.filter((t) =>
        ['DONE', 'COMPLETED'].includes((t.status || '').toUpperCase())
      ).length
      const pendingTasks = totalTasks - completedTasks

      let workloadStatus: 'High' | 'Normal' | 'Low' = 'Normal'
      if (pendingTasks >= 5) workloadStatus = 'High'
      else if (pendingTasks <= 1) workloadStatus = 'Low'

      return {
        id: dev.id,
        name: dev.name || 'Developer',
        employeeId: dev.employee_id || 'EMP',
        designation: dev.designation || 'Developer',
        assignedProjectsCount,
        assignedProjectNames,
        totalTasks,
        completedTasks,
        pendingTasks,
        workloadStatus,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      }
    })
  }, [devEmployees, scopedTasks, scopedProjects])

  // 3. DATA: Task Completion Report
  const taskCompletionReport = useMemo(() => {
    const totalTasks = scopedTasks.length
    const completedTasks = scopedTasks.filter((t) =>
      ['DONE', 'COMPLETED'].includes((t.status || '').toUpperCase())
    ).length
    const pendingTasks = totalTasks - completedTasks
    const overdueTasks = scopedTasks.filter((t) => {
      const isDone = ['DONE', 'COMPLETED'].includes((t.status || '').toUpperCase())
      return !isDone && t.due_date && new Date(t.due_date) < now
    }).length
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // Group by Project
    const byProject = scopedProjects.map((p) => {
      const pTasks = scopedTasks.filter((t) => t.project_id === p.id)
      const pTotal = pTasks.length
      const pCompleted = pTasks.filter((t) =>
        ['DONE', 'COMPLETED'].includes((t.status || '').toUpperCase())
      ).length
      const pPending = pTotal - pCompleted
      const pOverdue = pTasks.filter((t) => {
        const isDone = ['DONE', 'COMPLETED'].includes((t.status || '').toUpperCase())
        return !isDone && t.due_date && new Date(t.due_date) < now
      }).length
      const pRate = pTotal > 0 ? Math.round((pCompleted / pTotal) * 100) : 0

      return {
        id: p.id,
        projectName: p.name,
        code: p.project_id_display || 'PRJ',
        total: pTotal,
        completed: pCompleted,
        pending: pPending,
        overdue: pOverdue,
        rate: pRate,
      }
    })

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      completionPercentage,
      byProject,
    }
  }, [scopedTasks, scopedProjects, now])

  // Filtered lists
  const filteredProjects = useMemo(() => {
    return projectProgressReport.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.teamLead.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [projectProgressReport, searchTerm])

  const filteredDevelopers = useMemo(() => {
    return developerPerformanceReport.filter(
      (d) =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.designation.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [developerPerformanceReport, searchTerm])

  const filteredTasksByProject = useMemo(() => {
    return taskCompletionReport.byProject.filter((p) =>
      p.projectName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [taskCompletionReport, searchTerm])

  // CSV Export utility
  const exportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,'
    let filename = `HOD_${activeReport}_report_${dayjs().format('YYYY-MM-DD')}.csv`

    if (activeReport === 'project') {
      csvContent += 'Project Name,Code,Team Lead,Progress,Status,Start Date,Deadline\n'
      projectProgressReport.forEach((p) => {
        csvContent += `"${p.name}","${p.code}","${p.teamLead}","${p.progress}%","${p.status}","${p.startDate}","${p.deadline}"\n`
      })
    } else if (activeReport === 'developer') {
      csvContent += 'Developer Name,Designation,Assigned Projects,Total Tasks,Completed Tasks,Pending Tasks,Workload Status\n'
      developerPerformanceReport.forEach((d) => {
        csvContent += `"${d.name}","${d.designation}","${d.assignedProjectsCount}","${d.totalTasks}","${d.completedTasks}","${d.pendingTasks}","${d.workloadStatus}"\n`
      })
    } else {
      csvContent += 'Project Name,Total Tasks,Completed Tasks,Pending Tasks,Overdue Tasks,Completion %\n'
      taskCompletionReport.byProject.forEach((t) => {
        csvContent += `"${t.projectName}","${t.total}","${t.completed}","${t.pending}","${t.overdue}","${t.rate}%"\n`
      })
      csvContent += `\n"SUMMARY TOTALS","${taskCompletionReport.totalTasks}","${taskCompletionReport.completedTasks}","${taskCompletionReport.pendingTasks}","${taskCompletionReport.overdueTasks}","${taskCompletionReport.completionPercentage}%"\n`
    }

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Copy to clipboard
  const copyReport = () => {
    let text = ''
    if (activeReport === 'project') {
      text = projectProgressReport.map(p => `${p.name} | ${p.teamLead} | ${p.progress}% | ${p.status} | ${p.startDate} to ${p.deadline}`).join('\n')
    } else if (activeReport === 'developer') {
      text = developerPerformanceReport.map(d => `${d.name} | Projects: ${d.assignedProjectsCount} | Done: ${d.completedTasks} | Pending: ${d.pendingTasks} | Workload: ${d.workloadStatus}`).join('\n')
    } else {
      text = `Total: ${taskCompletionReport.totalTasks}\nCompleted: ${taskCompletionReport.completedTasks}\nPending: ${taskCompletionReport.pendingTasks}\nOverdue: ${taskCompletionReport.overdueTasks}\nRate: ${taskCompletionReport.completionPercentage}%`
    }

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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

      {/* 1. REPORT SWITCHER & EXPORT CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search report entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs sm:text-sm bg-background border-border/70"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyReport} className="h-9 text-xs gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </Button>

          <Button size="sm" onClick={exportCSV} className="h-9 text-xs gap-1.5 bg-foreground text-background hover:bg-foreground/90 font-medium">
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* 2. REPORT TABS */}
      <Tabs value={activeReport} onValueChange={(val) => setActiveReport(val as any)} className="w-full space-y-4">
        <TabsList className="bg-secondary/60 p-1 rounded-lg border border-border">
          <TabsTrigger value="project" className="text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-xs gap-1.5">
            <FolderKanban className="h-3.5 w-3.5 text-blue-500" />
            <span>Project Progress Report</span>
          </TabsTrigger>
          <TabsTrigger value="developer" className="text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-xs gap-1.5">
            <Users className="h-3.5 w-3.5 text-purple-500" />
            <span>Developer Performance Report</span>
          </TabsTrigger>
          <TabsTrigger value="task" className="text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-xs gap-1.5">
            <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />
            <span>Task Completion Report</span>
          </TabsTrigger>
        </TabsList>

        {/* REPORT 1: PROJECT PROGRESS REPORT */}
        <TabsContent value="project">
          <Card data-testid="report-project-progress" className="border-border bg-card rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-blue-500" />
                    <span>Project Progress Report</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Development department project delivery timelines, progress, and team leads
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {filteredProjects.length} Projects Tracked
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredProjects.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No projects found matching criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-medium">
                        <th className="py-3 px-4">Project Name</th>
                        <th className="py-3 px-4">Team Lead</th>
                        <th className="py-3 px-4 text-right">Progress %</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Start Date</th>
                        <th className="py-3 px-4">Deadline</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredProjects.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground">
                            <div>
                              <span>{p.name}</span>
                              <span className="ml-2 font-mono text-[10px] text-muted-foreground">({p.code})</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-foreground font-medium">{p.teamLead}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="font-semibold text-foreground">{p.progress}%</span>
                              <div className="w-16 bg-secondary rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${p.progress}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                          </td>
                          <td className="py-3 px-4 font-mono text-muted-foreground">{p.startDate}</td>
                          <td className="py-3 px-4 font-mono font-medium text-foreground">{p.deadline}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* REPORT 2: DEVELOPER PERFORMANCE REPORT */}
        <TabsContent value="developer">
          <Card data-testid="report-developer-performance" className="border-border bg-card rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-500" />
                    <span>Developer Performance Report</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Individual workload allocations, tasks handled, and delivery volume
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {filteredDevelopers.length} Developers
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredDevelopers.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No developers found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-medium">
                        <th className="py-3 px-4">Developer Name</th>
                        <th className="py-3 px-4 text-center">Assigned Projects</th>
                        <th className="py-3 px-4 text-center">Assigned Tasks</th>
                        <th className="py-3 px-4 text-center">Completed Tasks</th>
                        <th className="py-3 px-4 text-center">Pending Tasks</th>
                        <th className="py-3 px-4 text-center">Workload Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredDevelopers.map((dev) => (
                        <tr key={dev.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-foreground">{dev.name}</p>
                            <p className="text-[11px] text-muted-foreground">{dev.designation}</p>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-medium text-foreground">
                            {dev.assignedProjectsCount}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-semibold text-foreground">
                            {dev.totalTasks}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-medium text-emerald-600 dark:text-emerald-400">
                            {dev.completedTasks}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-medium text-foreground">
                            {dev.pendingTasks}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge
                              variant={dev.workloadStatus === 'High' ? 'destructive' : dev.workloadStatus === 'Normal' ? 'secondary' : 'outline'}
                              className="text-[10px] uppercase font-semibold px-2 py-0.5"
                            >
                              {dev.workloadStatus}
                            </Badge>
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

        {/* REPORT 3: TASK COMPLETION REPORT */}
        <TabsContent value="task">
          <Card data-testid="report-task-completion" className="border-border bg-card rounded-xl shadow-xs space-y-6">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-emerald-500" />
                    <span>Task Completion Report</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Department-wide delivery volume, pending deliverables, and overdue tasks
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-0">
              {/* Summary KPIs Row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/20 text-center space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Tasks</p>
                  <p className="text-xl font-bold font-mono text-foreground">{taskCompletionReport.totalTasks}</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-emerald-500/5 text-center space-y-1">
                  <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Completed Tasks</p>
                  <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{taskCompletionReport.completedTasks}</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-blue-500/5 text-center space-y-1">
                  <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Pending Tasks</p>
                  <p className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">{taskCompletionReport.pendingTasks}</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-destructive/5 text-center space-y-1">
                  <p className="text-[10px] font-semibold text-destructive uppercase tracking-wider">Overdue Tasks</p>
                  <p className="text-xl font-bold font-mono text-destructive">{taskCompletionReport.overdueTasks}</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-purple-500/5 text-center space-y-1 col-span-2 sm:col-span-1">
                  <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Completion %</p>
                  <p className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">{taskCompletionReport.completionPercentage}%</p>
                </div>
              </div>

              {/* Breakdown Table by Project */}
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/30 border-b border-border/60 font-semibold text-xs text-foreground">
                  Task Completion Breakdown by Project
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground font-medium">
                        <th className="py-2.5 px-4">Project</th>
                        <th className="py-2.5 px-4 text-center">Total Tasks</th>
                        <th className="py-2.5 px-4 text-center">Completed Tasks</th>
                        <th className="py-2.5 px-4 text-center">Pending Tasks</th>
                        <th className="py-2.5 px-4 text-center">Overdue Tasks</th>
                        <th className="py-2.5 px-4 text-right">Completion %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredTasksByProject.map((row) => (
                        <tr key={row.id} className="hover:bg-muted/10 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-foreground">
                            {row.projectName}
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono">{row.total}</td>
                          <td className="py-2.5 px-4 text-center font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{row.completed}</td>
                          <td className="py-2.5 px-4 text-center font-mono text-blue-600 dark:text-blue-400">{row.pending}</td>
                          <td className="py-2.5 px-4 text-center font-mono text-destructive font-semibold">{row.overdue}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">{row.rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
