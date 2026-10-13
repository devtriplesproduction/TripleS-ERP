import { requireRole } from '@/lib/auth'
import { getMyTasks } from '@/lib/actions/tasks'
import { getProjects } from '@/lib/actions/projects'
import { MyTasksView } from '@/components/tasks/MyTasksView'

export const metadata = {
  title: 'My Tasks | TripleS ERP',
  description: 'Personal daily task schedule, upcoming milestones, and assigned deliverables.',
}

export default async function MyTasksPage() {
  const user = await requireRole('/my-tasks')
  const [tasksRes, projectsRes] = await Promise.all([
    getMyTasks(),
    getProjects(),
  ])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <MyTasksView
        userRole={user.role}
        isHod={user.is_hod || false}
        todayTasks={tasksRes.data?.todayTasks || []}
        upcomingTasks={tasksRes.data?.upcomingTasks || []}
        pendingTasks={tasksRes.data?.pendingTasks || []}
        overdueTasks={tasksRes.data?.overdueTasks || []}
        recentlyAssignedTasks={tasksRes.data?.recentlyAssignedTasks || []}
        completedTasks={tasksRes.data?.completedTasks || []}
        userProjects={tasksRes.data?.userProjects || []}
        projects={projectsRes.data || []}
      />
    </div>
  )
}
