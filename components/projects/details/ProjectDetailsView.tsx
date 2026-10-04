'use client'

import { useState } from 'react'
import {
  Project,
  Task,
  ProjectTeamMemberStats,
  ProjectActivity,
  Client,
} from '@/types/project-management'
import { AssignableEmployee } from '@/lib/actions/team'
import { ProjectHeader } from './ProjectHeader'
import { ProjectOverviewTab } from './ProjectOverviewTab'
import { ProjectTeamTab } from './ProjectTeamTab'
import { ProjectTimelineTab } from './ProjectTimelineTab'
import { ProjectActivityTab } from './ProjectActivityTab'
import { KanbanBoard } from '@/components/tasks/KanbanBoard'
import { ProjectModal } from '../ProjectModal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LayoutGrid, CheckSquare, Users, Calendar, Activity } from 'lucide-react'

interface ProjectDetailsViewProps {
  project: Project
  tasks: Task[]
  teamStats: ProjectTeamMemberStats[]
  activities: ProjectActivity[]
  totalOperationalHours: number
  clients: Client[]
  employees: AssignableEmployee[]
  canEdit: boolean
  canManageTasks: boolean
  currentUserId?: string
  currentUserDepartment?: string | null
}

export function ProjectDetailsView({
  project,
  tasks,
  teamStats,
  activities,
  totalOperationalHours,
  clients,
  employees,
  canEdit,
  canManageTasks,
  currentUserId,
  currentUserDepartment,
}: ProjectDetailsViewProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const handleSuccess = () => {
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <ProjectHeader
        project={project}
        totalOperationalHours={totalOperationalHours}
        canEdit={canEdit}
        onEdit={() => setIsEditModalOpen(true)}
      />

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-card border border-border p-1 w-full justify-start overflow-x-auto flex-nowrap h-12">
          <TabsTrigger
            value="overview"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs font-semibold px-4 h-9"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Overview
          </TabsTrigger>

          <TabsTrigger
            value="tasks"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs font-semibold px-4 h-9"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Tasks ({tasks.length})
          </TabsTrigger>

          <TabsTrigger
            value="team"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs font-semibold px-4 h-9"
          >
            <Users className="h-3.5 w-3.5" />
            Team ({teamStats.length})
          </TabsTrigger>

          <TabsTrigger
            value="timeline"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs font-semibold px-4 h-9"
          >
            <Calendar className="h-3.5 w-3.5" />
            Timeline
          </TabsTrigger>

          <TabsTrigger
            value="activity"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs font-semibold px-4 h-9"
          >
            <Activity className="h-3.5 w-3.5" />
            Activity ({activities.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview">
          <ProjectOverviewTab project={project} totalOperationalHours={totalOperationalHours} />
        </TabsContent>

        {/* Tab 2: Tasks */}
        <TabsContent value="tasks">
          <KanbanBoard
            initialTasks={tasks}
            projects={[{ id: project.id, name: project.name }]}
            employees={employees}
            canManage={canManageTasks}
            defaultProjectId={project.id}
          />
        </TabsContent>

        {/* Tab 3: Team */}
        <TabsContent value="team">
          <ProjectTeamTab teamStats={teamStats} />
        </TabsContent>

        {/* Tab 4: Timeline */}
        <TabsContent value="timeline">
          <ProjectTimelineTab project={project} tasks={tasks} />
        </TabsContent>

        {/* Tab 5: Activity */}
        <TabsContent value="activity">
          <ProjectActivityTab activities={activities} />
        </TabsContent>
      </Tabs>

      {/* Edit Project Modal */}
      {isEditModalOpen && (
        <ProjectModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleSuccess}
          clients={clients}
          employees={employees}
          projectToEdit={project}
          currentUserId={currentUserId}
          currentUserDepartment={currentUserDepartment}
        />
      )}
    </div>
  )
}
