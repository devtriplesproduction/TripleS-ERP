'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { ProjectGanttTab } from './ProjectGanttTab'
import { ProjectActivityTab } from './ProjectActivityTab'
import { KanbanBoard } from '@/components/tasks/KanbanBoard'
import { ProjectListTab } from './ProjectListTab'
import { ProjectFilesTab } from './ProjectFilesTab'
import { ProjectModal } from '../ProjectModal'
import { EditProjectMembersModal } from './EditProjectMembersModal'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'
import { TaskDetailsModal } from '@/components/tasks/TaskDetailsModal'
import { Tabs, TabsContent } from '@/components/ui/tabs'

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
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)
  const [projectTasks, setProjectTasks] = useState<Task[]>(tasks)

  useEffect(() => {
    setProjectTasks(tasks)
  }, [tasks])

  const handleTaskSuccess = (updatedOrNewTask?: Task) => {
    if (updatedOrNewTask) {
      setProjectTasks((prev) => {
        const exists = prev.some((t) => t.id === updatedOrNewTask.id)
        if (exists) {
          return prev.map((t) => (t.id === updatedOrNewTask.id ? { ...t, ...updatedOrNewTask } : t))
        }
        return [updatedOrNewTask, ...prev]
      })
      if (selectedTask?.id === updatedOrNewTask.id) {
        setSelectedTask(updatedOrNewTask)
      }
    }
    router.refresh()
  }

  const handleModalSuccess = () => {
    router.refresh()
  }

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      alert('Delete functionality needs to be wired to the API backend.')
    }
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <ProjectHeader
          project={project}
          tasks={projectTasks}
          teamStats={teamStats}
          totalOperationalHours={totalOperationalHours}
          canEdit={canEdit}
          canManageTasks={canManageTasks}
          onEdit={() => setIsEditModalOpen(true)}
          onAddTask={() => {
            setTaskToEdit(null)
            setIsTaskModalOpen(true)
          }}
          onDelete={handleDelete}
        />

        {/* Tab 1: Overview */}
        <TabsContent value="overview">
          <ProjectOverviewTab
            project={project}
            totalOperationalHours={totalOperationalHours}
            tasks={projectTasks}
            teamStats={teamStats}
            activities={activities}
            canEdit={canEdit}
            onEditMembers={() => setIsMembersModalOpen(true)}
            onSelectTab={setActiveTab}
            onTaskClick={(t: Task) => {
              setSelectedTask(t)
              setIsTaskDetailsOpen(true)
            }}
          />
        </TabsContent>

        {/* Tab 2: List */}
        <TabsContent value="list">
          <ProjectListTab
            tasks={projectTasks}
            onTaskClick={(t: Task) => {
              setSelectedTask(t)
              setIsTaskDetailsOpen(true)
            }}
          />
        </TabsContent>

        {/* Tab 3: Kanban */}
        <TabsContent value="kanban">
          <KanbanBoard
            initialTasks={projectTasks}
            projects={[{ id: project.id, name: project.name }]}
            employees={employees}
            canManage={canManageTasks}
            defaultProjectId={project.id}
          />
        </TabsContent>

        {/* Tab 4: Gantt Chart */}
        <TabsContent value="gantt">
          <ProjectGanttTab
            project={project}
            tasks={projectTasks}
            canManageTasks={canManageTasks}
            onTaskClick={(t: Task) => {
              setSelectedTask(t)
              setIsTaskDetailsOpen(true)
            }}
            onAddTask={() => {
              setTaskToEdit(null)
              setIsTaskModalOpen(true)
            }}
          />
        </TabsContent>

        {/* Backward-compatible fallback for timeline tab value */}
        <TabsContent value="timeline">
          <ProjectGanttTab
            project={project}
            tasks={projectTasks}
            canManageTasks={canManageTasks}
            onTaskClick={(t: Task) => {
              setSelectedTask(t)
              setIsTaskDetailsOpen(true)
            }}
            onAddTask={() => {
              setTaskToEdit(null)
              setIsTaskModalOpen(true)
            }}
          />
        </TabsContent>

        {/* Tab 5: Team */}
        <TabsContent value="team">
          <ProjectTeamTab
            teamStats={teamStats}
            canEdit={canEdit}
            onEditMembers={() => setIsMembersModalOpen(true)}
          />
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

      {/* Task Details Modal */}
      {isTaskDetailsOpen && (
        <TaskDetailsModal
          isOpen={isTaskDetailsOpen}
          onClose={() => {
            setIsTaskDetailsOpen(false)
            setSelectedTask(null)
          }}
          task={selectedTask}
          canManage={canManageTasks}
          onUpdate={handleTaskSuccess}
          onEditTask={(t) => {
            setSelectedTask(null)
            setIsTaskDetailsOpen(false)
            setTaskToEdit(t)
            setIsTaskModalOpen(true)
          }}
        />
      )}

      {/* Edit Project Members Modal */}
      {isMembersModalOpen && (
        <EditProjectMembersModal
          isOpen={isMembersModalOpen}
          onClose={() => setIsMembersModalOpen(false)}
          onSuccess={handleModalSuccess}
          projectId={project.id}
          projectName={project.name}
          projectIdDisplay={project.project_id_display}
          currentMembers={project.members || []}
          employees={employees}
        />
      )}

      {/* Edit Project Modal */}
      {isEditModalOpen && (
        <ProjectModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleModalSuccess}
          clients={clients}
          employees={employees}
          projectToEdit={project}
          currentUserId={currentUserId}
          currentUserDepartment={currentUserDepartment}
        />
      )}

      {/* Add / Edit Task Modal */}
      {isTaskModalOpen && (
        <TaskFormModal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false)
            setTaskToEdit(null)
          }}
          onSuccess={handleTaskSuccess}
          projects={[{ id: project.id, name: project.name }]}
          employees={employees}
          defaultProjectId={project.id}
          taskToEdit={taskToEdit}
        />
      )}
    </div>
  )
}

