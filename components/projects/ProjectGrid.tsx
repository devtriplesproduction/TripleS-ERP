'use client'

import { useState } from 'react'
import { Project, ProjectDashboardStats, Client } from '@/types/project-management'
import { AssignableEmployee } from '@/lib/actions/team'
import { ProjectCard } from './ProjectCard'
import { ProjectModal } from './ProjectModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dropdown } from '@/components/ui/Dropdown'
import { Plus, Search, FolderKanban, SlidersHorizontal, FolderGit2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'

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

  const filterInputStyles = "!h-11 filter-control w-full !bg-card !border !border-border !rounded-xl !text-sm transition-all focus:!ring-2 focus:!ring-orange-500/20 focus:!border-orange-400 !text-foreground !shadow-sm";

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Projects"
        subtitle="Track operational milestones, client delivery pipelines, and team assignments."
        icon={FolderKanban}
        actions={
          canCreate && (
            <Button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto h-11 px-5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          )
        }
      />


      {/* Filters Section */}
      <div className="bg-card text-card-foreground border-border rounded-2xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4 text-foreground">
          <SlidersHorizontal className="w-5 h-5 text-foreground" />
          <h3 className="font-semibold">Filter Projects</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 sm:gap-4 items-end">
          <div className="space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search projects by name, client, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${filterInputStyles} !pl-9 !pr-4 !py-2`}
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
            <Dropdown
              className="!space-y-0"
              buttonClassName={`${filterInputStyles} !px-3 !py-2`}
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
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client</label>
            <Dropdown
              className="!space-y-0"
              buttonClassName={`${filterInputStyles} !px-3 !py-2`}
              value={clientFilter}
              onChange={(val) => setClientFilter(val || 'ALL')}
              options={[
                { value: 'ALL', label: 'All Clients' },
                ...clients.map(c => ({ value: c.id, label: c.name }))
              ]}
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</label>
            <Dropdown
              className="!space-y-0"
              buttonClassName={`${filterInputStyles} !px-3 !py-2`}
              value={priorityFilter}
              onChange={(val) => setPriorityFilter(val || 'ALL')}
              options={[
                { value: 'ALL', label: 'All Priorities' },
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' },
                { value: 'URGENT', label: 'Urgent' },
              ]}
            />
          </div>

          {/* Grid / List Toggle */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider invisible hidden lg:block">View</label>
            <div className="flex bg-card border border-border rounded-xl shrink-0 filter-toggle-container h-11 p-1 shadow-sm">
              <button
                onClick={() => setViewMode('GRID')}
                className={`px-4 text-sm font-medium rounded-lg transition-colors filter-toggle-btn w-full ${
                  viewMode === 'GRID' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('LIST')}
                className={`px-4 text-sm font-medium rounded-lg transition-colors filter-toggle-btn w-full ${
                  viewMode === 'LIST' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                List
              </button>
            </div>
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
