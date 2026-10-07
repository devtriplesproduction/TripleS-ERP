import { requireRole } from '@/lib/auth'
import { getMyTasks } from '@/lib/actions/tasks'
import { MyTasksView } from '@/components/tasks/MyTasksView'

export const metadata = {
  title: 'My Tasks | TripleS ERP',
  description: 'Personal daily task schedule, upcoming milestones, and assigned deliverables.',
}

export default async function MyTasksPage() {
  const user = await requireRole('/my-tasks')
  const { data } = await getMyTasks()

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <MyTasksView
        userRole={user.role}
        isHod={user.is_hod || false}
        todayTasks={data?.todayTasks || []}
        pendingTasks={data?.pendingTasks || []}
        overdueTasks={data?.overdueTasks || []}
        recentlyAssignedTasks={data?.recentlyAssignedTasks || []}
        completedTasks={data?.completedTasks || []}
        userProjects={data?.userProjects || []}
      />
    </div>
  )
}
