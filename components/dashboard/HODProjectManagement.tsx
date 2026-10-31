'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FolderKanban,
  Plus,
  Search,
  Edit2,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  ArrowUpDown,
  Filter,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dropdown } from '@/components/ui/Dropdown'
import { Project, ProjectStatus, Client } from '@/types/project-management'
import { AssignableEmployee } from '@/lib/actions/team'
import { updateProjectAction } from '@/lib/actions/projects'
import { ProjectModal } from '@/components/projects/ProjectModal'
import { toast } from 'sonner'
import dayjs from 'dayjs'

import { HODFilterBar, HODFilterValues } from '@/components/hod/HODFilterBar'
import { filterProjects } from '@/lib/utils/hod-filter-utils'

interface HODProjectManagementProps {
  projects: Project[]
  employees: AssignableEmployee[]
  clients: Client[]
  canCreate: boolean
  currentUserId?: string
  currentUserDepartment?: string | null
}

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  PLANNED: {
    label: 'Planning',
    badgeClass: 'border-border bg-secondary/80 text-foreground',
    icon: Clock,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    badgeClass: 'border-blue-500/30 bg-blue-500/10 text-blue-500 font-semibold',
    icon: Clock,
  },
  ON_HOLD: {
    label: 'On Hold',
    badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-500 font-medium',
    icon: AlertTriangle,
  },
  COMPLETED: {
    label: 'Completed',
    badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-semibold',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'Cancelled',
    badgeClass: 'border-destructive/30 bg-destructive/10 text-destructive font-medium',
    icon: AlertTriangle,
  },
}

export function HODProjectManagement({
  projects: initialProjects,
  employees,
  clients,
  canCreate,
  currentUserId,
  currentUserDepartment,
}: HODProjectManagementProps) {
  const router = useRouter()
  const [projectsList, setProjectsList] = useState<Project[]>(initialProjects)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<HODFilterValues>({
    startDate: '',
    endDate: '',
    projectId: 'ALL',
    projectStatus: 'ALL',
  })
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)

  // Keep projectsList in sync if initialProjects changes from server
  React.useEffect(() => {
    setProjectsList(initialProjects)
  }, [initialProjects])

  // Filter projects by HOD filter bar (Date Range, Project, Status) and search query
  const filteredProjects = React.useMemo(() => {
    const hodFiltered = filterProjects(projectsList, filters)

    if (!search.trim()) return hodFiltered

    const q = search.toLowerCase()
    return hodFiltered.filter((p) => {
      const leadName = getTeamLeadName(p, employees)
      return (
        p.name.toLowerCase().includes(q) ||
        (p.client_name || '').toLowerCase().includes(q) ||
        p.project_id_display.toLowerCase().includes(q) ||
        leadName.toLowerCase().includes(q)
      )
    })
  }, [projectsList, filters, search, employees])

  // Format date helper: 01 Oct 2026
  function formatDate(dateStr?: string | null) {
    if (!dateStr) return 'Not Set'
    const d = dayjs(dateStr)
    return d.isValid() ? d.format('DD MMM YYYY') : dateStr
  }

  // Resolve assigned Team Lead name
  function getTeamLeadName(project: Project, empList: AssignableEmployee[]): string {
    if (project.project_manager_name) return project.project_manager_name
    if (project.project_manager_id) {
      const emp = empList.find((e) => e.id === project.project_manager_id)
      if (emp) return emp.name
    }
    return 'Unassigned'
  }

  // Quick inline status update
  const handleStatusChange = async (projectId: string, newStatus: ProjectStatus) => {
    try {
      setUpdatingStatusId(projectId)
      const res = await updateProjectAction({
        id: projectId,
        status: newStatus,
      })

      if (res.success) {
        toast.success(`Project status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`)
        setProjectsList((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p))
        )
        router.refresh()
      } else {
        toast.error(res.error || 'Failed to update project status')
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating status')
    } finally {
      setUpdatingStatusId(null)
    }
  }

  const handleModalSuccess = () => {
    setIsCreateModalOpen(false)
    setEditingProject(null)
    router.refresh()
  }

  return (
    <Card className="border-border bg-card shadow-xs rounded-xl overflow-hidden">
      <CardHeader className="p-5 sm:p-6 border-b border-border/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
                <FolderKanban className="h-4 w-4" />
              </div>
              <CardTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                Project Management
              </CardTitle>
              <Badge variant="secondary" className="text-xs font-mono">
                {projectsList.length} Projects
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Monitor development pipelines, assign team leads, track delivery milestones, and update project schedules.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {canCreate && (
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="h-9 px-3.5 bg-foreground text-background hover:bg-foreground/90 font-medium text-xs sm:text-sm rounded-lg shadow-xs"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                New Project
              </Button>
            )}
          </div>
        </div>

        {/* HOD Reusable Filter Bar: Date Range, Project, Project Status */}
        <div className="mt-4 space-y-2.5">
          <HODFilterBar
            projects={projectsList}
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

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects by name, team lead, client, or PRJ ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 pr-4 text-xs rounded-lg border-border/80 bg-background shadow-xs focus-visible:ring-1 text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {filteredProjects.length === 0 ? (
          <div className="py-14 px-4 text-center">
            <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
              <FolderKanban className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">No development projects found</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {search || filters.startDate || filters.endDate || filters.projectId !== 'ALL' || filters.projectStatus !== 'ALL'
                ? 'No projects match your filter criteria. Try adjusting or clearing your filters.'
                : 'There are currently no active projects recorded for the Development team.'}
            </p>
            {(search || filters.startDate || filters.endDate || filters.projectId !== 'ALL' || filters.projectStatus !== 'ALL') ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setFilters({
                    startDate: '',
                    endDate: '',
                    projectId: 'ALL',
                    projectStatus: 'ALL',
                  })
                }}
                className="mt-3.5 h-8 text-xs font-medium"
              >
                Reset All Filters
              </Button>
            ) : canCreate ? (
              <Button
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 h-8 text-xs bg-foreground text-background"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Create First Project
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4 sm:px-6">Project Name</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Team Lead</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Start Date</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                {filteredProjects.map((project) => {
                  const teamLead = getTeamLeadName(project, employees)
                  const isOverdue = project.is_overdue && project.status !== 'COMPLETED'
                  const statusInfo = STATUS_CONFIG[project.status] || STATUS_CONFIG.PLANNED
                  const isUpdating = updatingStatusId === project.id

                  return (
                    <tr
                      key={project.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* 1. Project Name */}
                      <td className="py-3.5 px-4 sm:px-6 align-middle">
                        <div className="min-w-[170px]">
                          <span className="font-semibold text-foreground text-sm line-clamp-1">
                            {project.name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                            <span className="font-mono">{project.project_id_display}</span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Client */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="min-w-[120px]">
                          <p className="font-medium text-foreground truncate max-w-[150px]">
                            {project.client_name || 'Internal'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Client Record</p>
                        </div>
                      </td>

                      {/* 3. Team Lead */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-2 min-w-[130px]">
                          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[11px] font-semibold text-secondary-foreground shrink-0 border border-border/60">
                            {teamLead.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {teamLead}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {teamLead === 'Unassigned' ? 'Not Assigned' : 'Team Lead'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 3. Progress (%) */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="space-y-1.5 min-w-[110px]">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-foreground">{project.progress || 0}%</span>
                            <span className="text-[10px] text-muted-foreground">
                              {project.task_summary?.done || 0}/{project.task_summary?.total || 0} tasks
                            </span>
                          </div>
                          <div className="w-24 sm:w-28 bg-secondary rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 rounded-full ${
                                project.progress === 100 ? 'bg-emerald-500' : 'bg-foreground'
                              }`}
                              style={{ width: `${Math.max(0, Math.min(100, project.progress || 0))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 4. Status (with Quick Status Changer) */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="min-w-[125px]">
                          {isUpdating ? (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Updating...</span>
                            </div>
                          ) : (
                            <Dropdown
                              value={project.status}
                              onChange={(val) => handleStatusChange(project.id, val as ProjectStatus)}
                              options={[
                                { value: 'PLANNED', label: 'Planning' },
                                { value: 'IN_PROGRESS', label: 'In Progress' },
                                { value: 'ON_HOLD', label: 'On Hold' },
                                { value: 'COMPLETED', label: 'Completed' },
                                { value: 'CANCELLED', label: 'Cancelled' },
                              ]}
                              className="w-auto space-y-0"
                              buttonClassName={`!h-7 !min-h-[28px] !max-h-[28px] !text-[11px] px-2.5 rounded-md font-semibold tracking-wide border shadow-2xs ${statusInfo.badgeClass}`}
                            />
                          )}
                        </div>
                      </td>

                      {/* 5. Start Date */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-1.5 text-muted-foreground min-w-[105px]">
                          <Calendar className="w-3.5 h-3.5 shrink-0 opacity-70" />
                          <span className="font-medium text-foreground/90">
                            {formatDate(project.start_date)}
                          </span>
                        </div>
                      </td>

                      {/* 6. Deadline */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex flex-col gap-0.5 min-w-[110px]">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5 shrink-0 opacity-70" />
                            <span className={`font-medium ${isOverdue ? 'text-destructive font-semibold' : 'text-foreground/90'}`}>
                              {formatDate(project.deadline)}
                            </span>
                          </div>
                          {isOverdue && (
                            <span className="text-[10px] text-destructive font-medium uppercase tracking-wider">
                              Overdue
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 7. Actions */}
                      <td className="py-3.5 px-4 sm:px-6 align-middle text-right">
                        <div className="flex items-center justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingProject(project)}
                            title="Edit Project Details"
                            className="h-8 px-3 text-xs font-semibold text-foreground hover:bg-secondary gap-1.5 rounded-lg border-border shadow-2xs"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Project Modal: Handles Both Create and Edit */}
      {(isCreateModalOpen || !!editingProject) && (
        <ProjectModal
          isOpen={isCreateModalOpen || !!editingProject}
          onClose={() => {
            setIsCreateModalOpen(false)
            setEditingProject(null)
          }}
          onSuccess={handleModalSuccess}
          clients={clients}
          employees={employees}
          projectToEdit={editingProject}
          currentUserId={currentUserId}
          currentUserDepartment={currentUserDepartment}
        />
      )}
    </Card>
  )
}
