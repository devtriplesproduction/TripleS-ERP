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
        tasks={tasks}
        teamStats={teamStats}
        totalOperationalHours={totalOperationalHours}
        canEdit={canEdit}
        canManageTasks={canManageTasks}
        onEdit={() => setIsEditModalOpen(true)}
        onAddTask={() => setIsTaskModalOpen(true)}
      />

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="border-b border-border">
          <TabsList className="bg-transparent border-0 p-0 w-full justify-start overflow-x-auto flex-nowrap h-auto space-x-6">
            <TabsTrigger
              value="overview"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent text-muted-foreground hover:text-foreground text-sm font-medium py-3 px-1 transition-none"
            >
              Overview
            </TabsTrigger>

            <TabsTrigger
              value="list"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent text-muted-foreground hover:text-foreground text-sm font-medium py-3 px-1 transition-none"
            >
              List
            </TabsTrigger>

            <TabsTrigger
              value="kanban"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent text-muted-foreground hover:text-foreground text-sm font-medium py-3 px-1 transition-none"
            >
              Kanban
            </TabsTrigger>

            <TabsTrigger
              value="timeline"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent text-muted-foreground hover:text-foreground text-sm font-medium py-3 px-1 transition-none"
            >
              Timeline
            </TabsTrigger>

            <TabsTrigger
              value="team"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent text-muted-foreground hover:text-foreground text-sm font-medium py-3 px-1 transition-none"
            >
              Team
            </TabsTrigger>

            <TabsTrigger
              value="files"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent text-muted-foreground hover:text-foreground text-sm font-medium py-3 px-1 transition-none"
            >
              Files
            </TabsTrigger>

            <TabsTrigger
              value="activity"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent text-muted-foreground hover:text-foreground text-sm font-medium py-3 px-1 transition-none"
            >
              Activity
            </TabsTrigger>
          </TabsList>
        </div>

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
