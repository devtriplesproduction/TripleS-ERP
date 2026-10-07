import { getDashboardAnnouncements } from '@/lib/actions/announcements'
import { getMyTasks } from '@/lib/actions/tasks'
import { getMyProjects } from '@/lib/actions/projects'
import { DashboardAnnouncementReader } from '@/components/announcements/DashboardAnnouncementReader'
import { DashboardMyTasks } from '@/components/dashboard/DashboardMyTasks'
import { DashboardMyProjects } from '@/components/dashboard/DashboardMyProjects'

export default async function DashboardPage() {
  const [announcementsRes, myTasksRes, myProjectsRes] = await Promise.all([
    getDashboardAnnouncements(),
    getMyTasks(),
    getMyProjects(),
  ])

  const { announcements } = announcementsRes
  const taskData = myTasksRes.data
  const myProjects = myProjectsRes.data || []

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome to TripleS ERP. Here is your overview.</p>
      </div>

      {/* Integrated My Projects Section */}
      <DashboardMyProjects projects={myProjects} />

      {/* Integrated My Tasks Section */}
      <DashboardMyTasks
        todayTasks={taskData?.todayTasks || []}
        pendingTasks={taskData?.pendingTasks || []}
        overdueTasks={taskData?.overdueTasks || []}
        recentlyAssignedTasks={taskData?.recentlyAssignedTasks || []}
        userProjectsCount={(taskData?.userProjects || []).length}
      />

      {announcements.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight">Recent Announcements</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {announcements.map((announcement) => (
              <DashboardAnnouncementReader key={announcement.id} announcement={announcement} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

