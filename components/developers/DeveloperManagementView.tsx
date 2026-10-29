'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Users,
  Code2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Briefcase,
  Search,
  Filter,
  Eye,
  ArrowRight,
  TrendingUp,
  FolderKanban,
  CheckSquare,
  UserCheck,
  Zap,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
  X,
  UserPlus,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Task, Project, TaskStatus, TaskPriority } from '@/types/project-management'
import { AssignableEmployee } from '@/lib/actions/team'
import { TaskDetailsModal } from '@/components/tasks/TaskDetailsModal'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'
import { cn } from '@/lib/utils'
import dayjs from 'dayjs'

import { HODFilterBar, HODFilterValues } from '@/components/hod/HODFilterBar'

export type WorkloadStatus = 'Low' | 'Normal' | 'High'

export interface DeveloperRecord {
  id: string
  name: string
  employee_id: string | null
  department: string | null
  designation: string | null
  profile_photo: string | null
  assignedProjects: Array<{
    id: string
    name: string
    status: string
    progress?: number
    start_date?: string | null
    deadline?: string | null
    priority?: string
  }>
  assignedTasks: Task[]
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  overdueTasks: number
  workload: WorkloadStatus
  completionRate: number
}

interface DeveloperManagementViewProps {
  developers: DeveloperRecord[]
  allProjects: Project[]
  allTasks: Task[]
  allEmployees: AssignableEmployee[]
  canManage: boolean
}

export function DeveloperManagementView({
  developers: initialDevelopers,
  allProjects,
  allTasks: initialAllTasks,
  allEmployees,
  canManage,
}: DeveloperManagementViewProps) {
  const router = useRouter()
  const [developers, setDevelopers] = useState<DeveloperRecord[]>(initialDevelopers)
  const [allTasks, setAllTasks] = useState<Task[]>(initialAllTasks)
  const [searchQuery, setSearchQuery] = useState('')
  const [workloadFilter, setWorkloadFilter] = useState<'ALL' | WorkloadStatus>('ALL')
  const [filters, setFilters] = useState<HODFilterValues>({
    projectId: 'ALL',
    developerId: 'ALL',
  })
  const [selectedDeveloper, setSelectedDeveloper] = useState<DeveloperRecord | null>(null)
  const [taskDetailTarget, setTaskDetailTarget] = useState<Task | null>(null)
  const [taskEditTarget, setTaskEditTarget] = useState<Task | null>(null)
  const [taskFilterStatus, setTaskFilterStatus] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'OVERDUE'>('ALL')

  // Keep selected developer synchronized if tasks change
  const currentSelectedDev = useMemo(() => {
    if (!selectedDeveloper) return null
    return developers.find((d) => d.id === selectedDeveloper.id) || selectedDeveloper
  }, [developers, selectedDeveloper])

  // Overview summary metrics
  const totalDevelopersCount = developers.length
  const highWorkloadCount = developers.filter((d) => d.workload === 'High').length
  const normalWorkloadCount = developers.filter((d) => d.workload === 'Normal').length
  const lowWorkloadCount = developers.filter((d) => d.workload === 'Low').length

  // Filtered developers list
  const filteredDevelopers = useMemo(() => {
    return developers.filter((dev) => {
      // 1. Search Query
      const matchesSearch =
        searchQuery.trim() === '' ||
        dev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dev.designation && dev.designation.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (dev.employee_id && dev.employee_id.toLowerCase().includes(searchQuery.toLowerCase()))

      // 2. Workload
      const matchesWorkload =
        workloadFilter === 'ALL' || dev.workload === workloadFilter

      // 3. Project Filter
      const matchesProject =
        !filters.projectId ||
        filters.projectId === 'ALL' ||
        dev.assignedProjects.some((p) => p.id === filters.projectId) ||
        dev.assignedTasks.some((t) => t.project_id === filters.projectId)

      // 4. Developer Filter
      const matchesDeveloper =
        !filters.developerId ||
        filters.developerId === 'ALL' ||
        dev.id === filters.developerId

      return matchesSearch && matchesWorkload && matchesProject && matchesDeveloper
    })
  }, [developers, searchQuery, workloadFilter, filters])

  // Tasks of selected developer filtered by task status tab
  const developerFilteredTasks = useMemo(() => {
    if (!currentSelectedDev) return []
    const now = new Date()
    return currentSelectedDev.assignedTasks.filter((t) => {
      const isDone = ['DONE', 'COMPLETED'].includes((t.status || '').toUpperCase())
      const isOverdue = !isDone && t.due_date && new Date(t.due_date) < now

      if (taskFilterStatus === 'COMPLETED') return isDone
      if (taskFilterStatus === 'PENDING') return !isDone
      if (taskFilterStatus === 'OVERDUE') return isOverdue
      return true
    })
  }, [currentSelectedDev, taskFilterStatus])

  // Re-calculate developer metrics when tasks change
  const handleTaskUpdated = (updatedTask?: Task) => {
    if (!updatedTask) return
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* 1. EXECUTIVE SUMMARY STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Developers */}
        <Card
          onClick={() => {
            setWorkloadFilter('ALL')
            setProjectFilter('ALL')
          }}
          className={cn(
            'cursor-pointer transition-all border-border bg-card hover:border-primary/50 shadow-xs',
            workloadFilter === 'ALL' && 'ring-1 ring-primary/40'
          )}
          data-testid="stat-total-developers"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Total Developers</p>
              <p className="text-2xl font-bold tracking-tight text-foreground">{totalDevelopersCount}</p>
              <p className="text-[11px] text-muted-foreground">Development Team</p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Code2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* High Workload / Overloaded */}
        <Card
          onClick={() => setWorkloadFilter(workloadFilter === 'High' ? 'ALL' : 'High')}
          className={cn(
            'cursor-pointer transition-all border-border bg-card hover:border-amber-500/50 shadow-xs',
            workloadFilter === 'High' && 'ring-1 ring-amber-500'
          )}
          data-testid="stat-high-workload"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">High Workload</p>
              <p className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                {highWorkloadCount}
              </p>
              <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80">Overloaded (6+ pending)</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Normal Workload / Balanced */}
        <Card
          onClick={() => setWorkloadFilter(workloadFilter === 'Normal' ? 'ALL' : 'Normal')}
          className={cn(
            'cursor-pointer transition-all border-border bg-card hover:border-blue-500/50 shadow-xs',
            workloadFilter === 'Normal' && 'ring-1 ring-blue-500'
          )}
          data-testid="stat-normal-workload"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Normal Workload</p>
              <p className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                {normalWorkloadCount}
              </p>
              <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80">Balanced capacity (3-5 pending)</p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Low Workload / Available Capacity */}
        <Card
          onClick={() => setWorkloadFilter(workloadFilter === 'Low' ? 'ALL' : 'Low')}
          className={cn(
            'cursor-pointer transition-all border-border bg-card hover:border-emerald-500/50 shadow-xs',
            workloadFilter === 'Low' && 'ring-1 ring-emerald-500'
          )}
          data-testid="stat-low-workload"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Available Capacity</p>
              <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {lowWorkloadCount}
              </p>
              <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">Available (≤2 pending)</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Zap className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. HOD FILTER BAR & SEARCH CONTROLS */}
      <div className="space-y-3">
        <HODFilterBar
          projects={allProjects}
          developers={developers.map((d) => ({ id: d.id, name: d.name, department: d.department }))}
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

        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Search Input */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search developer by name, designation, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs bg-background"
                  data-testid="developer-search-input"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Workload Filter Tabs */}
              <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/40 text-xs">
                <button
                  type="button"
                  onClick={() => setWorkloadFilter('ALL')}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-colors font-medium',
                    workloadFilter === 'ALL'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  All ({totalDevelopersCount})
                </button>
                <button
                  type="button"
                  onClick={() => setWorkloadFilter('High')}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-colors font-medium',
                    workloadFilter === 'High'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-amber-600'
                  )}
                >
                  High ({highWorkloadCount})
                </button>
                <button
                  type="button"
                  onClick={() => setWorkloadFilter('Normal')}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-colors font-medium',
                    workloadFilter === 'Normal'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-blue-600'
                  )}
                >
                  Normal ({normalWorkloadCount})
                </button>
                <button
                  type="button"
                  onClick={() => setWorkloadFilter('Low')}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-colors font-medium',
                    workloadFilter === 'Low'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-emerald-600'
                  )}
                >
                  Low ({lowWorkloadCount})
                </button>
              </div>

              {(searchQuery || workloadFilter !== 'ALL' || filters.projectId !== 'ALL' || filters.developerId !== 'ALL') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('')
                    setWorkloadFilter('ALL')
                    setFilters({ projectId: 'ALL', developerId: 'ALL' })
                  }}
                  className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. DEVELOPERS MANAGEMENT TABLE */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-semibold text-foreground">
                Development Team Workload & Assignments
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time tracking of assigned projects, pending tasks, and developer capacity.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-normal">
              Showing {filteredDevelopers.length} of {developers.length} developers
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="developers-management-table">
              <thead className="bg-muted/40 text-xs font-semibold uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3 px-4">Developer</th>
                  <th className="py-3 px-4 text-center">Assigned Projects</th>
                  <th className="py-3 px-4 text-center">Assigned Tasks</th>
                  <th className="py-3 px-4 text-center">Completed Tasks</th>
                  <th className="py-3 px-4 text-center">Pending Tasks</th>
                  <th className="py-3 px-4 text-center">Workload Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredDevelopers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                      <Code2 className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                      No developers match the specified filters.
                    </td>
                  </tr>
                ) : (
                  filteredDevelopers.map((dev) => (
                    <tr
                      key={dev.id}
                      className="hover:bg-muted/30 transition-colors group cursor-pointer"
                      onClick={() => setSelectedDeveloper(dev)}
                      data-testid={`developer-row-${dev.id}`}
                    >
                      {/* Developer Name & Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border/60">
                            <AvatarImage src={dev.profile_photo || ''} alt={dev.name} />
                            <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
                              {dev.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
                              {dev.name}
                              {dev.employee_id && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono">
                                  {dev.employee_id}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {dev.designation || 'Developer'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Projects */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-xs font-semibold rounded-md border',
                            dev.assignedProjects.length > 0
                              ? 'bg-secondary/70 text-foreground border-border'
                              : 'bg-muted/40 text-muted-foreground border-transparent'
                          )}
                        >
                          {dev.assignedProjects.length}
                        </span>
                      </td>

                      {/* Assigned Tasks */}
                      <td className="py-3.5 px-4 text-center font-medium">
                        <span className="text-foreground">{dev.totalTasks}</span>
                      </td>

                      {/* Completed Tasks */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            {dev.completedTasks}
                          </span>
                          {dev.totalTasks > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              ({dev.completionRate}%)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Pending Tasks */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={cn(
                              'font-semibold',
                              dev.pendingTasks > 5
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-foreground'
                            )}
                          >
                            {dev.pendingTasks}
                          </span>
                          {dev.overdueTasks > 0 && (
                            <Badge
                              variant="destructive"
                              className="text-[10px] h-4 px-1 py-0"
                              title={`${dev.overdueTasks} overdue task(s)`}
                            >
                              {dev.overdueTasks} overdue
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Workload Status */}
                      <td className="py-3.5 px-4 text-center">
                        {dev.workload === 'High' && (
                          <Badge
                            variant="secondary"
                            className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-medium"
                          >
                            High (Overloaded)
                          </Badge>
                        )}
                        {dev.workload === 'Normal' && (
                          <Badge
                            variant="secondary"
                            className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 text-xs font-medium"
                          >
                            Normal (Balanced)
                          </Badge>
                        )}
                        {dev.workload === 'Low' && (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-medium"
                          >
                            Low (Available)
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedDeveloper(dev)
                          }}
                          className="h-8 text-xs gap-1.5"
                          data-testid={`btn-view-details-${dev.id}`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Details</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 4. DEVELOPER DETAILS MODAL / DRAWER */}
      <Dialog
        open={!!currentSelectedDev}
        onOpenChange={(open) => !open && setSelectedDeveloper(null)}
      >
        <DialogContent
          className="max-w-4xl max-h-[90vh] overflow-y-auto p-0"
          data-testid="developer-details-modal"
        >
          {currentSelectedDev && (
            <div className="space-y-6">
              {/* Header Profile Section */}
              <div className="p-6 pb-4 border-b border-border/60 bg-muted/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 border-2 border-border/60">
                      <AvatarImage
                        src={currentSelectedDev.profile_photo || ''}
                        alt={currentSelectedDev.name}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary text-base font-bold">
                        {currentSelectedDev.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <DialogTitle className="text-xl font-bold text-foreground">
                          {currentSelectedDev.name}
                        </DialogTitle>
                        {currentSelectedDev.workload === 'High' && (
                          <Badge className="bg-amber-500 text-white text-xs">High Workload</Badge>
                        )}
                        {currentSelectedDev.workload === 'Normal' && (
                          <Badge className="bg-blue-600 text-white text-xs">Normal Workload</Badge>
                        )}
                        {currentSelectedDev.workload === 'Low' && (
                          <Badge className="bg-emerald-600 text-white text-xs">Available Capacity</Badge>
                        )}
                      </div>
                      <DialogDescription className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                        <span>{currentSelectedDev.designation || 'Developer'}</span>
                        <span>•</span>
                        <span>Development Department</span>
                        {currentSelectedDev.employee_id && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-foreground font-semibold">
                              {currentSelectedDev.employee_id}
                            </span>
                          </>
                        )}
                      </DialogDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <Link href="/tasks">
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                        <CheckSquare className="h-3.5 w-3.5" />
                        <span>Tasks Board</span>
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Workload Capacity Meter */}
                <div className="mt-5 p-4 rounded-xl border border-border/80 bg-background/80 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                      Workload Capacity Utilization
                    </span>
                    <span className="text-muted-foreground">
                      {currentSelectedDev.pendingTasks} pending / {currentSelectedDev.totalTasks} total tasks (
                      {currentSelectedDev.completionRate}% completed)
                    </span>
                  </div>
                  <Progress value={currentSelectedDev.completionRate} className="h-2" />

                  {/* Stat Tiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-center">
                    <div className="p-2 rounded-lg bg-secondary/60">
                      <p className="text-base font-bold text-foreground">
                        {currentSelectedDev.assignedProjects.length}
                      </p>
                      <p className="text-[10px] uppercase font-medium text-muted-foreground">Projects</p>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary/60">
                      <p className="text-base font-bold text-foreground">
                        {currentSelectedDev.totalTasks}
                      </p>
                      <p className="text-[10px] uppercase font-medium text-muted-foreground">Total Tasks</p>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                        {currentSelectedDev.completedTasks}
                      </p>
                      <p className="text-[10px] uppercase font-medium text-emerald-600/80">Completed</p>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                        {currentSelectedDev.pendingTasks}
                      </p>
                      <p className="text-[10px] uppercase font-medium text-blue-600/80">Pending</p>
                    </div>
                    <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 col-span-2 sm:col-span-1">
                      <p className="text-base font-bold text-destructive">
                        {currentSelectedDev.overdueTasks}
                      </p>
                      <p className="text-[10px] uppercase font-medium text-destructive/80">Overdue</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs Section: Projects & Tasks */}
              <div className="px-6 pb-6">
                <Tabs defaultValue="tasks" className="w-full">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <TabsList className="grid grid-cols-2 w-[240px]">
                      <TabsTrigger value="tasks" className="text-xs">
                        Tasks ({currentSelectedDev.totalTasks})
                      </TabsTrigger>
                      <TabsTrigger value="projects" className="text-xs">
                        Projects ({currentSelectedDev.assignedProjects.length})
                      </TabsTrigger>
                    </TabsList>

                    {/* Quick indicator */}
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      HOD Management View
                    </span>
                  </div>

                  {/* TAB 1: TASKS */}
                  <TabsContent value="tasks" className="pt-4 space-y-4">
                    {/* Task sub-filters */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Button
                        variant={taskFilterStatus === 'ALL' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setTaskFilterStatus('ALL')}
                        className="h-7 text-xs px-2.5"
                      >
                        All ({currentSelectedDev.totalTasks})
                      </Button>
                      <Button
                        variant={taskFilterStatus === 'PENDING' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setTaskFilterStatus('PENDING')}
                        className="h-7 text-xs px-2.5"
                      >
                        Pending ({currentSelectedDev.pendingTasks})
                      </Button>
                      <Button
                        variant={taskFilterStatus === 'COMPLETED' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setTaskFilterStatus('COMPLETED')}
                        className="h-7 text-xs px-2.5"
                      >
                        Completed ({currentSelectedDev.completedTasks})
                      </Button>
                      {currentSelectedDev.overdueTasks > 0 && (
                        <Button
                          variant={taskFilterStatus === 'OVERDUE' ? 'destructive' : 'ghost'}
                          size="sm"
                          onClick={() => setTaskFilterStatus('OVERDUE')}
                          className="h-7 text-xs px-2.5 text-destructive"
                        >
                          Overdue ({currentSelectedDev.overdueTasks})
                        </Button>
                      )}
                    </div>

                    {/* Tasks List */}
                    {developerFilteredTasks.length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-border rounded-lg text-xs text-muted-foreground">
                        No tasks match this filter.
                      </div>
                    ) : (
                      <div className="divide-y divide-border/60 border border-border rounded-lg overflow-hidden bg-card">
                        {developerFilteredTasks.map((task) => {
                          const isDone = ['DONE', 'COMPLETED'].includes(
                            (task.status || '').toUpperCase()
                          )
                          const isOverdue =
                            !isDone && task.due_date && new Date(task.due_date) < new Date()

                          return (
                            <div
                              key={task.id}
                              className="p-3.5 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
                                    onClick={() => setTaskDetailTarget(task)}
                                  >
                                    {task.title}
                                  </span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                    {task.task_id_display || 'TASK'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                                  {task.project_name && (
                                    <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                      <FolderKanban className="h-3 w-3 text-muted-foreground" />
                                      {task.project_name}
                                    </span>
                                  )}
                                  {task.due_date && (
                                    <>
                                      <span>•</span>
                                      <span
                                        className={cn(
                                          'inline-flex items-center gap-1',
                                          isOverdue ? 'text-destructive font-semibold' : ''
                                        )}
                                      >
                                        <Clock className="h-3 w-3" />
                                        Due {dayjs(task.due_date).format('MMM D, YYYY')}
                                        {isOverdue && ' (Overdue)'}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {/* Status badge */}
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px] uppercase font-semibold',
                                    isDone
                                      ? 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10'
                                      : 'text-foreground'
                                  )}
                                >
                                  {task.status}
                                </Badge>

                                {/* Priority badge */}
                                {task.priority && (
                                  <Badge
                                    variant="secondary"
                                    className={cn(
                                      'text-[10px] uppercase font-semibold',
                                      task.priority === 'URGENT' || task.priority === 'HIGH'
                                        ? 'bg-amber-500/10 text-amber-600'
                                        : 'bg-muted text-muted-foreground'
                                    )}
                                  >
                                    {task.priority}
                                  </Badge>
                                )}

                                {/* Action Buttons */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setTaskDetailTarget(task)}
                                  className="h-7 text-xs px-2"
                                  title="View Task Details"
                                >
                                  View
                                </Button>
                                {canManage && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setTaskEditTarget(task)}
                                    className="h-7 text-xs px-2"
                                    title="Edit or Reassign Task"
                                  >
                                    Reassign
                                  </Button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB 2: PROJECTS */}
                  <TabsContent value="projects" className="pt-4 space-y-3">
                    {currentSelectedDev.assignedProjects.length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-border rounded-lg text-xs text-muted-foreground">
                        This developer is not explicitly assigned to any project yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {currentSelectedDev.assignedProjects.map((project) => (
                          <Card
                            key={project.id}
                            className="border-border bg-card hover:border-primary/40 transition-all p-3.5 space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-sm text-foreground">{project.name}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  Status: <span className="font-medium text-foreground">{project.status}</span>
                                </p>
                              </div>
                              <Badge variant="outline" className="text-[10px]">
                                {project.status}
                              </Badge>
                            </div>

                            {project.progress !== undefined && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                  <span>Progress</span>
                                  <span className="font-semibold text-foreground">
                                    {project.progress}%
                                  </span>
                                </div>
                                <Progress value={project.progress} className="h-1.5" />
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                              <span>
                                {project.deadline
                                  ? `Deadline: ${dayjs(project.deadline).format('MMM D, YYYY')}`
                                  : 'No deadline'}
                              </span>
                              <Link
                                href="/projects"
                                className="text-primary hover:underline inline-flex items-center gap-0.5"
                              >
                                View Project &rarr;
                              </Link>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 5. REUSED TASK DETAILS MODAL */}
      <TaskDetailsModal
        task={taskDetailTarget}
        isOpen={!!taskDetailTarget}
        onClose={() => setTaskDetailTarget(null)}
        canManage={canManage}
        onUpdate={handleTaskUpdated}
        onEditTask={(task) => {
          setTaskDetailTarget(null)
          setTaskEditTarget(task)
        }}
      />

      {/* 6. REUSED TASK REASSIGN / EDIT FORM MODAL */}
      {taskEditTarget && (
        <TaskFormModal
          isOpen={!!taskEditTarget}
          onClose={() => setTaskEditTarget(null)}
          onSuccess={(task) => {
            setTaskEditTarget(null)
            handleTaskUpdated(task)
          }}
          projects={allProjects.map((p) => ({ id: p.id, name: p.name }))}
          employees={allEmployees}
          taskToEdit={taskEditTarget}
        />
      )}
    </div>
  )
}
