import { requireRole } from '@/lib/auth'
import { getDashboardAnnouncements } from '@/lib/actions/announcements'
import { getMyTasks } from '@/lib/actions/tasks'
import { getMyProjects } from '@/lib/actions/projects'
import { getTopContributorData } from '@/lib/actions/top-contributor'
import { DashboardAnnouncementReader } from '@/components/announcements/DashboardAnnouncementReader'
import { DashboardMyTasks } from '@/components/dashboard/DashboardMyTasks'
import { DashboardMyProjects } from '@/components/dashboard/DashboardMyProjects'
import { TopContributorCard } from '@/components/dashboard/TopContributorCard'
import { HeadOfContentDashboard } from '@/components/dashboard/HeadOfContentDashboard'
import Link from 'next/link'
import { PageHeader } from '@/components/PageHeader'
import { LayoutDashboard, Camera, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const user = await requireRole('/dashboard')
  const isAdmin = user.role === 'Admin'

  const [announcementsRes, myTasksRes, myProjectsRes, topContributorRes] = await Promise.all([
    getDashboardAnnouncements(),
    getMyTasks(),
    getMyProjects(),
    isAdmin ? getTopContributorData() : Promise.resolve(null),
  ])

  const { announcements } = announcementsRes
  const taskData = myTasksRes.data
  const myProjects = myProjectsRes.data || []
  const topContributorData = topContributorRes?.data

  // If user is Head of Department for Content, render the Content HOD Dashboard
  if (user.is_hod && user.department?.toLowerCase() === 'content') {
    return (
      <HeadOfContentDashboard
        user={user}
        projects={myProjects}
        tasks={taskData?.todayTasks || []}
      />
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <PageHeader 
        title="Dashboard"
        subtitle="Welcome to TripleS ERP. Here is your overview."
        icon={LayoutDashboard}
      />

      {/* Admin Dashboard: Top Contributor Card & Screen Monitoring */}
      {isAdmin && (
        <div className="flex flex-wrap gap-6 items-start">
          {topContributorData && <TopContributorCard data={topContributorData} />}
          <div className="w-full max-w-[340px] sm:w-[340px] rounded-2xl sm:rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-xs shrink-0 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-foreground stroke-[2.2] shrink-0" />
                  <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground whitespace-nowrap">
                    Screen Monitoring
                  </h3>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                  Live
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Inspect employee desktop screenshots and active work intervals filtered by staff members and date.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <Link
                href="/time-tracking?tab=screenshots"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Camera size={14} />
                <span>View Employee Screenshots</span>
              </Link>
              <Link
                href="/time-tracking"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted/50 text-xs font-semibold transition-colors"
              >
                <Clock size={14} />
                <span>Time Tracking Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Integrated My Projects Section */}
      <DashboardMyProjects projects={myProjects} />

      {/* Integrated My Tasks Section */}
      <DashboardMyTasks
        todayTasks={taskData?.todayTasks || []}
        upcomingTasks={taskData?.upcomingTasks || []}
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
