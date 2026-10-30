'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Plus,
  Send,
  Calendar,
  Layers,
  Sparkles,
  BarChart3,
  Check,
  XCircle,
  Eye,
  RotateCcw,
  Archive,
  History,
  UserCheck,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AuthUser } from '@/lib/auth'
import { Project, Task } from '@/types/project-management'
import dayjs from 'dayjs'

export interface DashboardApprovalItem {
  id: string
  title: string
  project: string
  author: string
  contentType: string
  submissionDate: string
  reviewer: string
  status: 'In Review' | 'Changes Requested'
  dueDate: string
}

export interface DashboardTeamWorkload {
  id: string
  name: string
  role: 'Developer' | 'Team Lead'
  assigned: number
  completed: number
  pending: number
  overdue: number
}

export interface DashboardDeadlineItem {
  id: string
  title: string
  owner: string
  dueDate: string
  status: string
  type: 'Overdue' | 'Due Soon'
}

export interface DashboardActivityItem {
  id: string
  action: 'Assigned' | 'Reassigned' | 'Submitted' | 'Changes Requested' | 'Approved' | 'Rejected' | 'Published'
  contentTitle: string
  userName: string
  details: string
  timestamp: string
}

interface HeadOfContentDashboardProps {
  user: AuthUser
  projects?: Project[]
  tasks?: Task[]
}

export function HeadOfContentDashboard({
  user,
  projects = [],
  tasks = [],
}: HeadOfContentDashboardProps) {
  const [activeNotice, setActiveNotice] = useState<string | null>(null)

  // 1. Approval Queue
  const [approvalQueue, setApprovalQueue] = useState<DashboardApprovalItem[]>([
    {
      id: 'CNT-101',
      title: 'Q4 Product Launch Press Release & Release Notes',
      project: 'Core Platform',
      author: 'Harishchandra Nanavare',
      contentType: 'Release Notes',
      submissionDate: '27 Oct 2026',
      reviewer: user.employee_name || 'Kavita Verma',
      status: 'In Review',
      dueDate: '31 Oct 2026',
    },
    {
      id: 'CNT-102',
      title: 'REST & GraphQL API Documentation — Payment Module',
      project: 'Financial Microservices',
      author: 'Prince Nandagawali',
      contentType: 'API Documentation',
      submissionDate: '27 Oct 2026',
      reviewer: user.employee_name || 'Kavita Verma',
      status: 'Changes Requested',
      dueDate: '28 Oct 2026',
    },
  ])

  // 2. Team Workload
  const teamWorkloads: DashboardTeamWorkload[] = [
    {
      id: 'emp-1',
      name: 'Harishchandra Nanavare',
      role: 'Team Lead',
      assigned: 5,
      completed: 3,
      pending: 2,
      overdue: 0,
    },
    {
      id: 'emp-2',
      name: 'Prince Nandagawali',
      role: 'Developer',
      assigned: 4,
      completed: 1,
      pending: 2,
      overdue: 1,
    },
    {
      id: 'emp-3',
      name: 'Kavita Verma',
      role: 'Team Lead',
      assigned: 6,
      completed: 5,
      pending: 1,
      overdue: 0,
    },
    {
      id: 'emp-4',
      name: 'Rahul Sharma',
      role: 'Developer',
      assigned: 3,
      completed: 2,
      pending: 1,
      overdue: 0,
    },
  ]

  // 3. Upcoming Deadlines
  const deadlines: DashboardDeadlineItem[] = [
    {
      id: 'CNT-102',
      title: 'REST & GraphQL API Documentation — Payment Module',
      owner: 'Prince Nandagawali',
      dueDate: '28 Oct 2026',
      status: 'Changes Requested',
      type: 'Overdue',
    },
    {
      id: 'CNT-101',
      title: 'Q4 Product Launch Press Release & Release Notes',
      owner: 'Harishchandra Nanavare',
      dueDate: '31 Oct 2026',
      status: 'In Review',
      type: 'Due Soon',
    },
    {
      id: 'CNT-103',
      title: 'Employee Onboarding & HR Self-Service User Guide',
      owner: 'Kavita Verma',
      dueDate: '04 Nov 2026',
      status: 'Approved',
      type: 'Due Soon',
    },
  ]

  // 4. Recent Activity
  const activities: DashboardActivityItem[] = [
    {
      id: 'act-1',
      action: 'Changes Requested',
      contentTitle: 'REST & GraphQL API Documentation — Payment Module',
      userName: user.employee_name || 'Kavita Verma',
      details: 'Requested payload response examples and 401 error specs.',
      timestamp: '29 Oct 2026, 09:00 AM',
    },
    {
      id: 'act-2',
      action: 'Approved',
      contentTitle: 'Employee Onboarding & HR Self-Service User Guide',
      userName: user.employee_name || 'Kavita Verma',
      details: 'Approved after verification by HR team.',
      timestamp: '28 Oct 2026, 04:00 PM',
    },
    {
      id: 'act-3',
      action: 'Reassigned',
      contentTitle: 'REST & GraphQL API Documentation — Payment Module',
      userName: user.employee_name || 'Kavita Verma',
      details: 'Reassigned from Rahul Sharma to Prince Nandagawali.',
      timestamp: '27 Oct 2026, 11:00 AM',
    },
    {
      id: 'act-4',
      action: 'Submitted',
      contentTitle: 'Q4 Product Launch Press Release & Release Notes',
      userName: 'Harishchandra Nanavare',
      details: 'Submitted for editorial sign-off.',
      timestamp: '27 Oct 2026, 10:00 AM',
    },
    {
      id: 'act-5',
      action: 'Published',
      contentTitle: 'TripleS ERP 2.0 Architectural Overview',
      userName: user.employee_name || 'Kavita Verma',
      details: 'Published to core technical docs repository.',
      timestamp: '24 Oct 2026, 02:30 PM',
    },
  ]

  const handleQuickDecision = (id: string, decision: string) => {
    setApprovalQueue((prev) => prev.filter((i) => i.id !== id))
    setActiveNotice(`Content ${id} marked as "${decision}".`)
    setTimeout(() => setActiveNotice(null), 3000)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 via-indigo-950/40 to-zinc-900 border border-zinc-800/80 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Department Executive
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                Content Operations
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              Welcome back, {user.employee_name || 'Head of Content'}
            </h1>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Supervising department documentation, editorial review pipelines, developer writing workloads, and publication deadlines.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href="/content-management">
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/20">
                <FileText className="w-4 h-4 mr-2" />
                Open Content Management
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {activeNotice && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs text-emerald-300 animate-in fade-in">
          <span>{activeNotice}</span>
          <button onClick={() => setActiveNotice(null)} className="text-emerald-400 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-4">
            <span className="text-xs text-indigo-400 font-medium">Pending Review</span>
            <div className="text-2xl font-bold text-indigo-300 mt-1">{approvalQueue.length}</div>
            <span className="text-[10px] text-zinc-500">Awaiting HOD sign-off</span>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-4">
            <span className="text-xs text-amber-400 font-medium">Changes Requested</span>
            <div className="text-2xl font-bold text-amber-300 mt-1">1</div>
            <span className="text-[10px] text-zinc-500">In author revision</span>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-4">
            <span className="text-xs text-teal-400 font-medium">Approved</span>
            <div className="text-2xl font-bold text-teal-300 mt-1">1</div>
            <span className="text-[10px] text-zinc-500">Ready for publish</span>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-4">
            <span className="text-xs text-emerald-400 font-medium">Published</span>
            <div className="text-2xl font-bold text-emerald-300 mt-1">1</div>
            <span className="text-[10px] text-zinc-500">Live assets</span>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-4">
            <span className="text-xs text-rose-400 font-medium">Overdue</span>
            <div className="text-2xl font-bold text-rose-300 mt-1">1</div>
            <span className="text-[10px] text-zinc-500">Passed deadline</span>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-4">
            <span className="text-xs text-blue-400 font-medium">Active Staff</span>
            <div className="text-2xl font-bold text-blue-300 mt-1">{teamWorkloads.length}</div>
            <span className="text-[10px] text-zinc-500">Developers & leads</span>
          </CardContent>
        </Card>
      </div>

      {/* Row 1: Approval Queue & Team Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: APPROVAL QUEUE */}
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardHeader className="p-4 pb-2 border-b border-zinc-800 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <CardTitle className="text-sm font-semibold text-zinc-100">
                Approval Queue ({approvalQueue.length})
              </CardTitle>
            </div>
            <Link href="/content-management" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              <span>Full Queue</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {approvalQueue.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                All submissions have been reviewed and approved!
              </div>
            ) : (
              approvalQueue.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-lg space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-semibold text-zinc-200 line-clamp-1">{item.title}</div>
                      <div className="text-zinc-500 flex items-center gap-3">
                        <span>Project: <strong className="text-zinc-400">{item.project}</strong></span>
                        <span>Author: <strong className="text-zinc-400">{item.author}</strong></span>
                      </div>
                    </div>
                    <Badge
                      className={
                        item.status === 'In Review'
                          ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-zinc-900 text-[11px] text-zinc-500">
                    <div>
                      <span>Submitted: {item.submissionDate}</span>
                      <span className="mx-2">&bull;</span>
                      <span>Reviewer: <strong className="text-zinc-400">{item.reviewer}</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleQuickDecision(item.id, 'Approved')}
                        className="px-2 py-1 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded transition-colors text-[11px] font-semibold"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleQuickDecision(item.id, 'Changes Requested')}
                        className="px-2 py-1 bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white rounded transition-colors text-[11px] font-semibold"
                      >
                        Changes
                      </button>
                      <button
                        onClick={() => handleQuickDecision(item.id, 'Rejected')}
                        className="px-2 py-1 bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white rounded transition-colors text-[11px] font-semibold"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* SECTION 2: TEAM WORKLOAD */}
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardHeader className="p-4 pb-2 border-b border-zinc-800 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <CardTitle className="text-sm font-semibold text-zinc-100">
                Team Workload Distribution
              </CardTitle>
            </div>
            <Link href="/content-management" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              <span>Reassign</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
                    <th className="pb-2 font-medium">Developer / Team Lead</th>
                    <th className="pb-2 font-medium text-center">Assigned</th>
                    <th className="pb-2 font-medium text-center">Completed</th>
                    <th className="pb-2 font-medium text-center">Pending</th>
                    <th className="pb-2 font-medium text-center">Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {teamWorkloads.map((member) => (
                    <tr key={member.id} className="hover:bg-zinc-900/40">
                      <td className="py-2.5 font-medium text-zinc-200">
                        <div>{member.name}</div>
                        <span className="text-[10px] text-zinc-500 font-mono">{member.role}</span>
                      </td>
                      <td className="py-2.5 text-center text-zinc-300 font-semibold">{member.assigned}</td>
                      <td className="py-2.5 text-center text-emerald-400 font-semibold">{member.completed}</td>
                      <td className="py-2.5 text-center text-indigo-400 font-semibold">{member.pending}</td>
                      <td className="py-2.5 text-center font-semibold">
                        <span className={member.overdue > 0 ? 'text-rose-400' : 'text-zinc-500'}>
                          {member.overdue}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Media & File Attachments Widget */}
      <Card className="bg-zinc-900/60 border-zinc-800">
        <CardHeader className="p-4 pb-2 border-b border-zinc-800 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <CardTitle className="text-sm font-semibold text-zinc-100">
              Department Media & Documentation Files
            </CardTitle>
          </div>
          <Link href="/content-management" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium">
            <span>Manage All Files (4 Assets, 8.8 MB)</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-lg flex items-center gap-3 text-xs">
              <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-zinc-200 block truncate">Architecture-Diagram.png</span>
                <span className="text-[10px] text-zinc-500">1.4 MB &bull; Image/PNG</span>
              </div>
            </div>

            <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-lg flex items-center gap-3 text-xs">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-zinc-200 block truncate">OpenAPI-Specification.json</span>
                <span className="text-[10px] text-zinc-500">350 KB &bull; JSON Schema</span>
              </div>
            </div>

            <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-lg flex items-center gap-3 text-xs">
              <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-zinc-200 block truncate">HR-Onboarding-Checklist.pdf</span>
                <span className="text-[10px] text-zinc-500">2.1 MB &bull; PDF Guide</span>
              </div>
            </div>

            <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-lg flex items-center gap-3 text-xs">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-zinc-200 block truncate">SDK-NodeJS-Bundle.zip</span>
                <span className="text-[10px] text-zinc-500">4.9 MB &bull; Archive (Private)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Row 2: Upcoming Deadlines & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 3: UPCOMING DEADLINES */}
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardHeader className="p-4 pb-2 border-b border-zinc-800 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <CardTitle className="text-sm font-semibold text-zinc-100">
                Upcoming & Overdue Deadlines
              </CardTitle>
            </div>
            <Link href="/content-management" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              <span>View Schedule</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Overdue group */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Overdue (Immediate Action Required)</span>
              </div>
              {deadlines
                .filter((d) => d.type === 'Overdue')
                .map((d) => (
                  <div
                    key={d.id}
                    className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-semibold text-zinc-200 truncate">{d.title}</div>
                      <div className="text-zinc-400 flex items-center gap-2 text-[11px]">
                        <span>Owner: <strong className="text-zinc-300">{d.owner}</strong></span>
                        <span>&bull;</span>
                        <span className="text-rose-400 font-medium">Due Date: {d.dueDate}</span>
                      </div>
                    </div>
                    <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40">
                      Overdue
                    </Badge>
                  </div>
                ))}
            </div>

            {/* Due soon group */}
            <div className="space-y-2 pt-2 border-t border-zinc-800/80">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Due Soon (Next 7 Days)</span>
              </div>
              {deadlines
                .filter((d) => d.type === 'Due Soon')
                .map((d) => (
                  <div
                    key={d.id}
                    className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-lg flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-semibold text-zinc-200 truncate">{d.title}</div>
                      <div className="text-zinc-400 flex items-center gap-2 text-[11px]">
                        <span>Owner: <strong className="text-zinc-300">{d.owner}</strong></span>
                        <span>&bull;</span>
                        <span className="text-amber-400 font-medium">Due: {d.dueDate}</span>
                      </div>
                    </div>
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40">
                      Due Soon
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* SECTION 4: RECENT ACTIVITY */}
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardHeader className="p-4 pb-2 border-b border-zinc-800 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              <CardTitle className="text-sm font-semibold text-zinc-100">
                Recent Department Activity
              </CardTitle>
            </div>
            <Link href="/content-management" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              <span>Audit Log</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {activities.map((act) => (
              <div key={act.id} className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-lg space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold ${
                        act.action === 'Approved' || act.action === 'Published'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : act.action === 'Changes Requested'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : act.action === 'Reassigned'
                          ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {act.action}
                    </span>
                    <strong className="text-zinc-200 line-clamp-1">{act.contentTitle}</strong>
                  </div>
                  <span className="text-[10px] text-zinc-500 shrink-0">{act.timestamp}</span>
                </div>
                <p className="text-zinc-400 text-xs leading-relaxed">{act.details}</p>
                <div className="text-[10px] text-zinc-500">
                  By: <strong className="text-zinc-400">{act.userName}</strong>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
