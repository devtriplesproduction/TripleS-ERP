import { requireRole } from '@/lib/auth'
import { getProjects, checkEmployeeProjectAccess } from '@/lib/actions/projects'
import { getClients } from '@/lib/actions/clients'
import { getAssignableEmployees } from '@/lib/actions/team'
import { canCreateProjects } from '@/lib/permissions/project-management'
import { ProjectGrid } from '@/components/projects/ProjectGrid'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Projects | TripleS ERP',
  description: 'Manage and monitor projects, delivery pipelines, and operational milestones.',
}

export default async function ProjectsPage() {
  const user = await requireRole('/projects')

  if (user.role === 'Employee' && !user.is_hod) {
    const hasAccess = await checkEmployeeProjectAccess(user.id)
    if (!hasAccess) {
      redirect('/unauthorized')
    }
  }

  const [projectsRes, clientsRes, employeesRes] = await Promise.all([
    getProjects(),
    getClients(),
    getAssignableEmployees(),
  ])

  const canCreate = canCreateProjects(user)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <ProjectGrid
        initialProjects={projectsRes.data || []}
        stats={projectsRes.stats}
        clients={clientsRes.data || []}
        employees={employeesRes.data || []}
        canCreate={canCreate}
        currentUserId={user.id}
        currentUserDepartment={user.department}
      />
    </div>
  )
}
