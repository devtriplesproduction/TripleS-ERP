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
import { ProjectListTab } from './ProjectListTab'
import { ProjectFilesTab } from './ProjectFilesTab'
import { ProjectModal } from '../ProjectModal'
import { TaskModal } from '@/components/tasks/TaskModal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LayoutGrid, CheckSquare, Users, Calendar, Activity, ListTodo, FileText } from 'lucide-react'

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
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)

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
        canManageTasks={canManageTasks}
        onEdit={() => setIsEditModalOpen(true)}
        onAddTask={() => setIsTaskModalOpen(true)}
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
            value="list"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs font-semibold px-4 h-9"
          >
            <ListTodo className="h-3.5 w-3.5" />
            List
          </TabsTrigger>

          <TabsTrigger
            value="kanban"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs font-semibold px-4 h-9"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Kanban
          </TabsTrigger>

          <TabsTrigger
            value="timeline"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs font-semibold px-4 h-9"
          >
            <Calendar className="h-3.5 w-3.5" />
            Timeline
          </TabsTrigger>

          <TabsTrigger
            value="team"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs font-semibold px-4 h-9"
          >
            <Users className="h-3.5 w-3.5" />
            Team
          </TabsTrigger>

          <TabsTrigger
            value="files"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs font-semibold px-4 h-9"
          >
            <FileText className="h-3.5 w-3.5" />
            Files
          </TabsTrigger>

          <TabsTrigger
            value="activity"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs font-semibold px-4 h-9"
          >
            <Activity className="h-3.5 w-3.5" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview">
          <ProjectOverviewTab project={project} totalOperationalHours={totalOperationalHours} tasks={tasks} teamStats={teamStats} activities={activities} />
        </TabsContent>

        {/* Tab 2: List */}
        <TabsContent value="list">
          <ProjectListTab tasks={tasks} />
        </TabsContent>

        {/* Tab 3: Kanban */}
        <TabsContent value="kanban">
          <KanbanBoard
            initialTasks={tasks}
            projects={[{ id: project.id, name: project.name }]}
            employees={employees}
            canManage={canManageTasks}
            defaultProjectId={project.id}
          />
        </TabsContent>

        {/* Tab 4: Timeline */}
        <TabsContent value="timeline">
          <ProjectTimelineTab project={project} tasks={tasks} />
        </TabsContent>

        {/* Tab 5: Team */}
        <TabsContent value="team">
          <ProjectTeamTab teamStats={teamStats} />
        </TabsContent>

        {/* Tab 6: Files */}
        <TabsContent value="files">
          <ProjectFilesTab projectId={project.id} />
        </TabsContent>

        {/* Tab 7: Activity */}
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

      {/* Add Task Modal */}
      {isTaskModalOpen && (
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          onSuccess={handleSuccess}
          projects={[{ id: project.id, name: project.name }]}
          employees={employees}
          defaultProjectId={project.id}
        />
      )}
    </div>
  )
}
