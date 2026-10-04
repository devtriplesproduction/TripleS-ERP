import { requireRole } from '@/lib/auth'
import { getTasks } from '@/lib/actions/tasks'
import { getProjects } from '@/lib/actions/projects'
import { getAssignableEmployees } from '@/lib/actions/team'
import { canManageTasks } from '@/lib/permissions/project-management'
import { KanbanBoard } from '@/components/tasks/KanbanBoard'

export const metadata = {
  title: 'Tasks & Kanban | TripleS ERP',
  description: 'Interactive Kanban board for operational task workflows.',
}

export default async function TasksPage() {
  const user = await requireRole('/tasks')

  const [tasksRes, projectsRes, employeesRes] = await Promise.all([
    getTasks(),
    getProjects(),
    getAssignableEmployees(),
  ])

  const canManage = canManageTasks(user)
  const projectList = (projectsRes.data || []).map((p) => ({ id: p.id, name: p.name }))

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <KanbanBoard
        initialTasks={tasksRes.data || []}
        projects={projectList}
        employees={employeesRes.data || []}
        canManage={canManage}
      />
    </div>
  )
}
