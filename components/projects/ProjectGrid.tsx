'use client'

import { useState } from 'react'
import { Project, ProjectDashboardStats, Client } from '@/types/project-management'
import { AssignableEmployee } from '@/lib/actions/team'
import { ProjectCard } from './ProjectCard'
import { ProjectModal } from './ProjectModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dropdown } from '@/components/ui/Dropdown'
import { Plus, Search, FolderKanban, LayoutGrid, List, FolderGit2 } from 'lucide-react'

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
  const [clientFilter, setClientFilter] = useState('ALL')
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
      p.project_id_display.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter
    const matchesPriority = priorityFilter === 'ALL' || p.priority === priorityFilter
    const matchesClient = clientFilter === 'ALL' || p.client_id === clientFilter

    return matchesSearch && matchesStatus && matchesPriority && matchesClient
  })

  const handleSuccess = () => {
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      {/* Top Header Row matching Task Board reference */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Icon, Title & Subtitle */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-card border border-border/80 flex items-center justify-center shrink-0 shadow-xs">
            <FolderKanban className="w-5 h-5 text-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight truncate">
              Projects
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-normal truncate mt-0.5">
              Track operational milestones, client delivery pipelines, and team assignments.
            </p>
          </div>
        </div>

        {/* Right: New Project Action Button */}
        {canCreate && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className="h-9 px-4 bg-foreground text-background hover:bg-foreground/90 font-medium text-xs sm:text-sm rounded-lg shadow-xs shrink-0 self-start sm:self-auto"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New Project
          </Button>
        )}
      </div>

      {/* Compact Filters Row matching Task Board page styling */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 sm:gap-3">
        {/* Left: Search input extending till filters */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects by name, client, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="!h-9 !min-h-[36px] !max-h-[36px] !pl-9 !pr-4 !text-xs rounded-lg border-border/80 bg-card font-normal shadow-xs focus-visible:ring-1 focus-visible:ring-foreground/20 text-foreground w-full placeholder:text-muted-foreground"
          />
        </div>

        {/* Right: Filters on left, then Segmented View Switcher on far right */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
          {/* All Statuses Filter */}
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
            className="w-auto space-y-0 shrink-0"
            buttonClassName="!h-9 !min-h-[36px] !max-h-[36px] !text-xs px-3 rounded-lg border-border/80 bg-card font-normal min-w-[125px] shadow-xs hover:border-foreground/30 transition-colors"
          />

          {/* All Clients Filter */}
          <Dropdown
            value={clientFilter}
            onChange={(val) => setClientFilter(val || 'ALL')}
            options={[
              { value: 'ALL', label: 'All Clients' },
              ...clients.map(c => ({ value: c.id, label: c.name }))
            ]}
            className="w-auto space-y-0 shrink-0"
            buttonClassName="!h-9 !min-h-[36px] !max-h-[36px] !text-xs px-3 rounded-lg border-border/80 bg-card font-normal min-w-[130px] shadow-xs hover:border-foreground/30 transition-colors"
          />

          {/* All Priorities Filter */}
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
            className="w-auto space-y-0 shrink-0"
            buttonClassName="!h-9 !min-h-[36px] !max-h-[36px] !text-xs px-3 rounded-lg border-border/80 bg-card font-normal min-w-[120px] shadow-xs hover:border-foreground/30 transition-colors"
          />

          {/* Segmented View Switcher: Grid | List (on right side) */}
          <div
            role="radiogroup"
            aria-label="Projects view options"
            className="flex items-center h-9 p-0.5 rounded-lg border border-border/80 bg-card shadow-xs shrink-0"
          >
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'GRID'}
              aria-label="Grid view"
              title="Grid View"
              onClick={() => setViewMode('GRID')}
              className={`h-7.5 w-8 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                viewMode === 'GRID'
                  ? 'bg-secondary text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>

            <div className="w-px h-4 bg-border/60 mx-0.5 shrink-0" aria-hidden="true" />

            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'LIST'}
              aria-label="List view"
              title="List View"
              onClick={() => setViewMode('LIST')}
              className={`h-7.5 w-8 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                viewMode === 'LIST'
                  ? 'bg-secondary text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Project Card Grid or List */}
      {filteredProjects.length === 0 ? (
        <div className="py-16 px-6 text-center text-muted-foreground bg-card border border-border/60 rounded-[14px] flex flex-col items-center justify-center space-y-4 mt-6">
          <div className="p-4 bg-secondary/50 rounded-full">
            <FolderGit2 className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h3 className="text-lg font-bold text-foreground font-sans">No projects yet</h3>
            <p className="text-[13px] leading-relaxed">
              Create your first project to start tracking delivery, tasks, and team assignments.
            </p>
          </div>
          {canCreate && (
            <Button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'GRID' 
          ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" 
          : "flex flex-col gap-3"
        }>
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} viewMode={viewMode} />
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
