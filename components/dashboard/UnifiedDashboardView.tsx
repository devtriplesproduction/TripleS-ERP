'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { AuthUser } from '@/lib/auth'
import { Project, Task } from '@/types/project-management'
import { AccountingDashboardData } from '@/types/accounting'
import { PageHeader } from '@/components/PageHeader'
import { DashboardAnnouncementReader } from '@/components/announcements/DashboardAnnouncementReader'
import { DashboardMyTasks } from '@/components/dashboard/DashboardMyTasks'
import { DashboardMyProjects } from '@/components/dashboard/DashboardMyProjects'
import { TopContributorCard } from '@/components/dashboard/TopContributorCard'
import { HeadOfContentDashboard } from '@/components/dashboard/HeadOfContentDashboard'
import { AccountingDashboardView } from '@/components/accounting/AccountingDashboardView'
import {
  LayoutDashboard,
  Code2,
  FileText,
  Landmark,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  Camera,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface UnifiedDashboardViewProps {
  user: AuthUser
  announcements: any[]
  myProjects: Project[]
  taskData: any
  topContributorData: any
  accountingData: AccountingDashboardData
  existingClients: { id: string; name: string }[]
}

export function UnifiedDashboardView({
  user,
  announcements = [],
  myProjects = [],
  taskData,
  topContributorData,
  accountingData,
  existingClients = [],
}: UnifiedDashboardViewProps) {
  const isContentHod = user.is_hod && user.department?.toLowerCase() === 'content'
  const isAdmin = user.role === 'Admin'

  const [activeDashboardTab, setActiveDashboardTab] = useState<'DEVELOPER' | 'CONTENT' | 'ACCOUNTING'>(
    isContentHod ? 'CONTENT' : 'DEVELOPER'
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Segmented Dashboard View Switcher */}
      <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-zinc-100">Enterprise Dashboard Overview</h1>
              <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-700 bg-zinc-900">
                {user.role} {user.is_hod ? '• HOD' : ''}
              </Badge>
            </div>
            <p className="text-xs text-zinc-400">
              Switch dynamically between Developer tasks, Content Operations, and Financial Intelligence.
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveDashboardTab('DEVELOPER')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeDashboardTab === 'DEVELOPER'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Developer View</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDashboardTab('CONTENT')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeDashboardTab === 'CONTENT'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Content Operations</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDashboardTab('ACCOUNTING')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeDashboardTab === 'ACCOUNTING'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Accounting Module</span>
          </button>
        </div>
      </div>

      {/* 1. DEVELOPER DASHBOARD VIEW */}
      {activeDashboardTab === 'DEVELOPER' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <PageHeader
            title="Developer Dashboard"
            subtitle="My active sprints, pending code deliverables, projects, and announcements."
            icon={Code2}
          />

          {/* Admin Dashboard: Top Contributor Card & Screen Monitoring */}
          {isAdmin && (
            <div className="flex flex-wrap gap-6 items-start">
              {topContributorData && <TopContributorCard data={topContributorData} />}
              <div className="w-full max-w-[340px] sm:w-[340px] rounded-2xl sm:rounded-3xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-100 shadow-xs shrink-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Camera className="h-5 w-5 text-zinc-100 stroke-[2.2] shrink-0" />
                      <h3 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-100 whitespace-nowrap">
                        Screen Monitoring
                      </h3>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                      Live
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                    Inspect employee desktop screenshots and active work intervals filtered by staff members and date.
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <Link
                    href="/time-tracking?tab=screenshots"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors shadow-sm"
                  >
                    <Camera size={14} />
                    <span>View Employee Screenshots</span>
                  </Link>
                  <Link
                    href="/time-tracking"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 text-zinc-200 hover:bg-zinc-900 text-xs font-semibold transition-colors"
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
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-zinc-100">
                Recent Announcements
              </h2>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {announcements.map((announcement) => (
                  <DashboardAnnouncementReader key={announcement.id} announcement={announcement} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. CONTENT MANAGEMENT OPERATIONS DASHBOARD */}
      {activeDashboardTab === 'CONTENT' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <HeadOfContentDashboard
            user={user}
            projects={myProjects}
            tasks={taskData?.todayTasks || []}
          />
        </div>
      )}

      {/* 3. ACCOUNTING & FINANCIAL DASHBOARD */}
      {activeDashboardTab === 'ACCOUNTING' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <AccountingDashboardView
            data={accountingData}
            existingClients={existingClients}
          />
        </div>
      )}
    </div>
  )
}
