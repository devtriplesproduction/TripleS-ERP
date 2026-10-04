'use client'

import { useState } from 'react'
import { Project, ProjectDashboardStats, Client } from '@/types/project-management'
import { AssignableEmployee } from '@/lib/actions/team'
import { ProjectCard } from './ProjectCard'
import { ProjectStatsOverview } from './ProjectDashboardStats'
import { ProjectModal } from './ProjectModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dropdown } from '@/components/ui/Dropdown'
import { Plus, Search, FolderKanban, SlidersHorizontal } from 'lucide-react'

interface ProjectGridProps {
  initialProjects: Project[]
  stats: ProjectDashboardStats
  clients: Client[]
  employees: AssignableEmployee[]
  canCreate: boolean
  currentUserId?: string
  currentUserDepartment?: string | null
}

export function ProjectGrid({
  initialProjects,
  stats,
  clients,
  employees,
  canCreate,
  currentUserId,
  currentUserDepartment,
}: ProjectGridProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
      p.project_id_display.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter
    const matchesPriority = priorityFilter === 'ALL' || p.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  const handleSuccess = () => {
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FolderKanban className="h-7 w-7 text-foreground" />
            Projects
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track operational milestones, client delivery pipelines, and team assignments.
          </p>
        </div>

        {canCreate && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto h-11 px-5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        )}
      </div>

      {/* Project Metrics Overview */}
      <ProjectStatsOverview stats={stats} />

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects by name, client, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border h-11"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="w-full sm:w-44">
            <Dropdown
              value={statusFilter}
              onChange={(val) => setStatusFilter(val || 'ALL')}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'PLANNING', label: 'Planning' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'ON_HOLD', label: 'On Hold' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
              buttonClassName="bg-card border-border h-11 text-xs"
              className="w-full"
            />
          </div>

          <div className="w-full sm:w-40">
            <Dropdown
              value={priorityFilter}
              onChange={(val) => setPriorityFilter(val || 'ALL')}
              options={[
                { value: 'ALL', label: 'All Priorities' },
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' },
                { value: 'URGENT', label: 'Urgent' },
              ]}
              buttonClassName="bg-card border-border h-11 text-xs"
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Responsive Project Card Grid: 1 col on mobile, 2 col on tablet, 3-4 col on desktop */}
      {filteredProjects.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground bg-card border border-border rounded-lg space-y-2">
          <FolderKanban className="h-10 w-10 mx-auto text-muted-foreground/60" />
          <h3 className="font-semibold text-foreground">No projects found</h3>
          <p className="text-xs">Try adjusting your search criteria or create a new project.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {isModalOpen && (
        <ProjectModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSuccess}
          clients={clients}
          employees={employees}
          currentUserId={currentUserId}
          currentUserDepartment={currentUserDepartment}
        />
      )}
    </div>
  )
}
