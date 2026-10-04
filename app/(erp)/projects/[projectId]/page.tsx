import { requireRole } from '@/lib/auth'
import { getProjectById } from '@/lib/actions/projects'
import { getTasks } from '@/lib/actions/tasks'
import { getClients } from '@/lib/actions/clients'
import { getAssignableEmployees } from '@/lib/actions/team'
import { canEditProject, canManageTasks } from '@/lib/permissions/project-management'
import { ProjectDetailsView } from '@/components/projects/details/ProjectDetailsView'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export async function generateMetadata({ params }: PageProps) {
  const { projectId } = await params
  const res = await getProjectById(projectId)
  return {
    title: res.data?.project.name ? `${res.data.project.name} | TripleS ERP` : 'Project Details | TripleS ERP',
    description: 'Detailed overview, team workload, operational timeline, and tasks.',
  }
}

export default async function ProjectDetailsPage({ params }: PageProps) {
  const user = await requireRole('/projects')
  const { projectId } = await params

  const [projectRes, tasksRes, clientsRes, employeesRes] = await Promise.all([
    getProjectById(projectId),
    getTasks({ projectId }),
    getClients(),
    getAssignableEmployees(),
  ])

  if (!projectRes.success || !projectRes.data) {
    notFound()
  }

  const { project, teamStats, activities, totalOperationalHours } = projectRes.data
  const canEdit = canEditProject(user, project.created_by)
  const canManage = canManageTasks(user)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <ProjectDetailsView
        project={project}
        tasks={tasksRes.data || []}
        teamStats={teamStats}
        activities={activities}
        totalOperationalHours={totalOperationalHours}
        clients={clientsRes.data || []}
        employees={employeesRes.data || []}
        canEdit={canEdit}
        canManageTasks={canManage}
        currentUserId={user.id}
        currentUserDepartment={user.department}
      />
    </div>
  )
}
