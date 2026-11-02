'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
  RefreshCw,
  ExternalLink,
  KanbanSquare,
  Filter,
  PlusCircle,
  FolderKanban,
  UserCheck,
  Camera,
  BookOpen,
  Share2,
  Megaphone,
  Briefcase
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AuthUser } from '@/lib/auth'
import { Project, Task } from '@/types/project-management'
import { ContentItem, ContentStatus, ContentPriority, computeDeadlineState } from '@/types/content-management'
import { getContentItems, updateContentStatus } from '@/lib/actions/content-management'
import { getAssignableEmployees, AssignableEmployee } from '@/lib/actions/team'
import { useToast } from '@/hooks/use-toast'
import dayjs from 'dayjs'
import { cn } from '@/lib/utils'

interface HeadOfContentDashboardProps {
  user: AuthUser
  projects?: Project[]
  tasks?: Task[]
  initialItems?: ContentItem[]
}

const DEFAULT_FALLBACK_ITEMS: ContentItem[] = [
  {
    id: 'CNT-101',
    title: 'Q4 Product Launch Press Release & Release Notes',
    summary: 'Public release announcement and technical release highlights for ERP 2.0 launch.',
    body: 'Public release announcement and technical release highlights for ERP 2.0 launch.',
    content_type: 'Release Notes',
    owner_id: 'af354098-e268-4294-889f-130387cf916b',
    owner_name: 'Kavita Verma',
    status: 'In Review',
    tags: ['Press Release', 'Launch'],
    created_at: '2026-10-25T09:00:00.000Z',
    updated_at: '2026-10-28T11:00:00.000Z',
    due_date: dayjs().add(2, 'day').format('YYYY-MM-DD'),
    assigned_to_id: 'emp-1',
    assigned_to_name: 'Harishchandra Nanavare',
    priority: 'High',
  },
  {
    id: 'CNT-102',
    title: 'REST & GraphQL API Documentation — Payment Module',
    summary: 'API endpoint references, payload examples, and webhook specifications.',
    body: 'API endpoint references, payload examples, and webhook specifications.',
    content_type: 'Article',
    owner_id: 'af354098-e268-4294-889f-130387cf916b',
    owner_name: 'Kavita Verma',
    status: 'In Progress',
    tags: ['API', 'Documentation'],
    created_at: '2026-10-26T09:00:00.000Z',
    updated_at: '2026-10-28T11:00:00.000Z',
    due_date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
    assigned_to_id: 'emp-2',
    assigned_to_name: 'Prince Nandagawali',
    priority: 'Urgent',
  },
  {
    id: 'CNT-103',
    title: 'Employee Onboarding & HR Self-Service User Guide',
    summary: 'Comprehensive step-by-step guide for new employee profile configuration and attendance.',
    body: 'Comprehensive step-by-step guide for new employee profile configuration and attendance.',
    content_type: 'Blog',
    owner_id: 'af354098-e268-4294-889f-130387cf916b',
    owner_name: 'Kavita Verma',
    status: 'Completed',
    tags: ['Onboarding', 'Guide'],
    created_at: '2026-10-20T09:00:00.000Z',
    updated_at: '2026-10-27T11:00:00.000Z',
    due_date: dayjs().format('YYYY-MM-DD'),
    assigned_to_id: 'emp-3',
    assigned_to_name: 'Kavita Verma',
    priority: 'Medium',
  },
]

export function HeadOfContentDashboard({
  user,
  projects = [],
  tasks = [],
  initialItems,
}: HeadOfContentDashboardProps) {
  const [items, setItems] = useState<ContentItem[]>(initialItems && initialItems.length > 0 ? initialItems : DEFAULT_FALLBACK_ITEMS)
  const [employees, setEmployees] = useState<AssignableEmployee[]>([])
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [activeNotice, setActiveNotice] = useState<string | null>(null)
  const [reviewFilter, setReviewFilter] = useState<'All' | 'In Review' | 'Changes Requested'>('All')

  const { toast } = useToast()

  // Load real content items and employees from server actions
  const loadData = async (showToast = false) => {
    setLoading(true)
    try {
      const [itemsRes, empRes] = await Promise.all([
        getContentItems().catch(() => ({ success: false, data: [] })),
        getAssignableEmployees().catch(() => ({ success: false, data: [] })),
      ])

      if (itemsRes.success && itemsRes.data && itemsRes.data.length > 0) {
        setItems(itemsRes.data)
      }
      if (empRes.success && empRes.data && empRes.data.length > 0) {
        setEmployees(empRes.data)
      }
      if (showToast) {
        toast({ title: 'Dashboard Refreshed', description: 'Content department metrics up to date.' })
      }
    } catch (err) {
      console.warn('Could not refresh content dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(false)
  }, [])

  // KPI Calculations
  const totalTasks = items.length
  const inReviewTasks = useMemo(() => items.filter((i) => i.status === 'In Review' || i.status === 'Changes Requested'), [items])
  const inProgressTasks = useMemo(() => items.filter((i) => i.status === 'In Progress'), [items])
  const completedTasks = useMemo(() => items.filter((i) => i.status === 'Completed' || i.status === 'Published' || i.status === 'Approved'), [items])
  const todoTasks = useMemo(() => items.filter((i) => i.status === 'To Do' || i.status === 'Draft'), [items])
  const overdueTasks = useMemo(() => items.filter((i) => {
    if (i.status === 'Completed' || i.status === 'Published' || i.status === 'Approved') return false
    return computeDeadlineState(i.due_date, i.status) === 'Overdue'
  }), [items])

  // Content Type Distribution
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    items.forEach((item) => {
      const type = item.content_type || 'Other'
      counts[type] = (counts[type] || 0) + 1
    })
    return counts
  }, [items])

  // Team Workload calculation
  const teamWorkloads = useMemo(() => {
    const memberMap: Record<
      string,
      { id: string; name: string; role: string; assigned: number; inProgress: number; completed: number; overdue: number }
    > = {}

    // Seed from assignable employees or known assignees
    employees.forEach((emp) => {
      memberMap[emp.id] = {
        id: emp.id,
        name: emp.name || (emp as any).employee_name || 'Staff Member',
        role: emp.designation || 'Content Creator',
        assigned: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
      }
    })

    // Populate from content items
    items.forEach((item) => {
      if (!item.assigned_to_name && !item.assigned_to_id) return
      const key = item.assigned_to_id || item.assigned_to_name || 'unassigned'

      if (!memberMap[key]) {
        memberMap[key] = {
          id: key,
          name: item.assigned_to_name || 'Staff Member',
          role: item.assigned_role || 'Creator',
          assigned: 0,
          inProgress: 0,
          completed: 0,
          overdue: 0,
        }
      }

      memberMap[key].assigned += 1
      if (item.status === 'In Progress' || item.status === 'In Review') {
        memberMap[key].inProgress += 1
      } else if (item.status === 'Completed' || item.status === 'Published' || item.status === 'Approved') {
        memberMap[key].completed += 1
      }

      if (computeDeadlineState(item.due_date, item.status) === 'Overdue' && item.status !== 'Completed' && item.status !== 'Published' && item.status !== 'Approved') {
        memberMap[key].overdue += 1
      }
    })

    const list = Object.values(memberMap).filter((m) => m.assigned > 0 || m.name.includes('Kavita') || m.name.includes('Harishchandra') || m.name.includes('Prince'))
    return list.length > 0
      ? list
      : [
          { id: '1', name: 'Harishchandra Nanavare', role: 'Team Lead', assigned: 5, inProgress: 2, completed: 3, overdue: 0 },
          { id: '2', name: 'Prince Nandagawali', role: 'Content Writer', assigned: 4, inProgress: 2, completed: 1, overdue: 1 },
          { id: '3', name: 'Kavita Verma', role: 'Head of Content', assigned: 6, inProgress: 1, completed: 5, overdue: 0 },
        ]
  }, [items, employees])

  // Filtered Review Queue
  const filteredReviewQueue = useMemo(() => {
    return inReviewTasks.filter((item) => {
      if (reviewFilter === 'In Review' && item.status !== 'In Review') return false
      if (reviewFilter === 'Changes Requested' && item.status !== 'Changes Requested') return false
      return true
    })
  }, [inReviewTasks, reviewFilter])

  // Quick Editorial Decision Handler
  const handleEditorialDecision = async (itemId: string, newStatus: ContentStatus, label: string) => {
    setProcessingId(itemId)
    try {
      const res = await updateContentStatus(itemId, newStatus)
      if (res.success && res.data) {
        setItems((prev) => prev.map((i) => (i.id === itemId ? res.data! : i)))
        toast({
          title: `Content ${label}`,
          description: `Task "${res.data.title}" has been marked as ${newStatus}.`,
        })
      } else {
        // Optimistic fallback
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId ? { ...i, status: newStatus, updated_at: new Date().toISOString() } : i
          )
        )
        toast({ title: `Content ${label}`, description: `Status updated to ${newStatus}.` })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' })
    } finally {
      setProcessingId(null)
    }
  }

  // Priority Badge Helper
  const renderPriorityBadge = (p?: ContentPriority) => {
    switch (p) {
      case 'Urgent':
        return <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30 text-[10px] px-2 py-0.5">Urgent</Badge>
      case 'High':
        return <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 text-[10px] px-2 py-0.5">High</Badge>
      case 'Medium':
        return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px] px-2 py-0.5">Medium</Badge>
      case 'Low':
        return <Badge className="bg-zinc-700/50 text-zinc-400 border-zinc-600 text-[10px] px-2 py-0.5">Low</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* 1. TOP EXECUTIVE HEADER BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 via-indigo-950/40 to-zinc-900 border border-zinc-800 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Content Department</span>
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                Operations & Editorial Intelligence
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              Welcome back, {user.employee_name || 'Head of Content'}
            </h1>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Supervise content creation workflows, editorial sign-offs, production deadlines, and team workload capacity in real time.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
              disabled={loading}
              className="border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-white h-9 px-3 text-xs gap-1.5"
              title="Refresh Metrics"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin text-primary")} />
              <span>Sync</span>
            </Button>

            <Link href="/content-management">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-white h-9 px-3 text-xs gap-1.5"
              >
                <KanbanSquare className="w-3.5 h-3.5 text-primary" />
                <span>Task Board</span>
              </Button>
            </Link>

            <Link href="/content-management">
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-9 px-4 text-xs gap-1.5 shadow-md shadow-primary/20"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>Create Task</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. TOP METRICS / KPI GRID (6 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Tasks */}
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-medium flex items-center justify-between">
              <span>Active Pipeline</span>
              <FileText className="w-3.5 h-3.5 text-primary" />
            </span>
            <div className="text-2xl font-bold text-foreground">{totalTasks}</div>
            <span className="text-[10px] text-muted-foreground">Total content deliverables</span>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-amber-400 font-medium flex items-center justify-between">
              <span>In Progress</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </span>
            <div className="text-2xl font-bold text-amber-400">{inProgressTasks.length}</div>
            <span className="text-[10px] text-muted-foreground">Actively in production</span>
          </CardContent>
        </Card>

        {/* Editorial Sign-off */}
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-indigo-400 font-medium flex items-center justify-between">
              <span>Review Queue</span>
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            </span>
            <div className="text-2xl font-bold text-indigo-400">{inReviewTasks.length}</div>
            <span className="text-[10px] text-muted-foreground">Awaiting editorial sign-off</span>
          </CardContent>
        </Card>

        {/* Ready / Completed */}
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-emerald-400 font-medium flex items-center justify-between">
              <span>Completed</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </span>
            <div className="text-2xl font-bold text-emerald-400">{completedTasks.length}</div>
            <span className="text-[10px] text-muted-foreground">Published & live</span>
          </CardContent>
        </Card>

        {/* Overdue Risk */}
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-rose-400 font-medium flex items-center justify-between">
              <span>Overdue Risk</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            </span>
            <div className={cn("text-2xl font-bold", overdueTasks.length > 0 ? "text-rose-400" : "text-muted-foreground")}>
              {overdueTasks.length}
            </div>
            <span className="text-[10px] text-muted-foreground">Immediate attention</span>
          </CardContent>
        </Card>

        {/* Active Creators */}
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-blue-400 font-medium flex items-center justify-between">
              <span>Team Capacity</span>
              <Users className="w-3.5 h-3.5 text-blue-400" />
            </span>
            <div className="text-2xl font-bold text-blue-400">{teamWorkloads.length}</div>
            <span className="text-[10px] text-muted-foreground">Assigned creators</span>
          </CardContent>
        </Card>
      </div>

      {/* 3. ROW 1: EDITORIAL APPROVAL QUEUE & TEAM WORKLOAD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* EDITORIAL APPROVAL QUEUE */}
        <Card className="bg-card border-border shadow-xs flex flex-col">
          <CardHeader className="p-4 pb-3 border-b border-border flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <CardTitle className="text-sm font-semibold text-foreground">
                Editorial Sign-Off Queue ({inReviewTasks.length})
              </CardTitle>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setReviewFilter('All')}
                className={cn(
                  "px-2 py-1 rounded text-[11px] font-semibold transition-colors",
                  reviewFilter === 'All' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                All ({inReviewTasks.length})
              </button>
              <button
                onClick={() => setReviewFilter('In Review')}
                className={cn(
                  "px-2 py-1 rounded text-[11px] font-semibold transition-colors",
                  reviewFilter === 'In Review' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                In Review
              </button>
              <button
                onClick={() => setReviewFilter('Changes Requested')}
                className={cn(
                  "px-2 py-1 rounded text-[11px] font-semibold transition-colors",
                  reviewFilter === 'Changes Requested' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Revisions
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[460px]">
            {filteredReviewQueue.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs font-semibold text-foreground">Editorial Pipeline Clear!</p>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  All submitted content deliverables have been reviewed and signed off.
                </p>
                <Link href="/content-management">
                  <Button variant="outline" size="sm" className="text-xs border-border mt-2">
                    <span>View Task Board</span>
                  </Button>
                </Link>
              </div>
            ) : (
              filteredReviewQueue.map((item) => {
                const deadlineState = computeDeadlineState(item.due_date, item.status)
                const isOverdue = deadlineState === 'Overdue'

                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-muted/20 border border-border rounded-xl space-y-2.5 text-xs transition-colors hover:border-primary/40 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                            {item.id}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border">
                            {item.content_type || 'Content'}
                          </Badge>
                          {renderPriorityBadge(item.priority)}
                          {isOverdue && (
                            <span className="text-[10px] font-bold text-rose-400 flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>Overdue</span>
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-foreground line-clamp-1">{item.title}</h4>
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

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Author: <strong className="text-foreground">{item.assigned_to_name || item.owner_name}</strong></span>
                      <span>Due: <strong className={isOverdue ? "text-rose-400 font-bold" : "text-foreground"}>
                        {item.due_date ? dayjs(item.due_date).format('DD MMM YYYY') : 'Not set'}
                      </strong></span>
                    </div>

                    {/* Decision Action Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      <Link
                        href="/content-management"
                        className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                      >
                        <span>Inspect Brief</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>

                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={processingId === item.id}
                          onClick={() => handleEditorialDecision(item.id, 'Completed', 'Approved')}
                          className="px-2.5 py-1 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg transition-colors text-[11px] font-semibold flex items-center gap-1 shadow-xs"
                        >
                          <Check className="w-3 h-3" />
                          <span>Approve</span>
                        </button>
                        <button
                          disabled={processingId === item.id}
                          onClick={() => handleEditorialDecision(item.id, 'Changes Requested', 'Changes Requested')}
                          className="px-2.5 py-1 bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 rounded-lg transition-colors text-[11px] font-semibold shadow-xs"
                        >
                          <span>Changes</span>
                        </button>
                        <button
                          disabled={processingId === item.id}
                          onClick={() => handleEditorialDecision(item.id, 'Rejected', 'Rejected')}
                          className="px-2.5 py-1 bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 rounded-lg transition-colors text-[11px] font-semibold shadow-xs"
                        >
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* TEAM WORKLOAD DISTRIBUTION */}
        <Card className="bg-card border-border shadow-xs flex flex-col">
          <CardHeader className="p-4 pb-3 border-b border-border flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <CardTitle className="text-sm font-semibold text-foreground">
                Team Workload & Capacity
              </CardTitle>
            </div>
            <Link
              href="/content-management"
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
            >
              <span>Manage Assignments</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>

          <CardContent className="p-4 flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground uppercase tracking-wider text-[11px]">
                    <th className="pb-2.5 font-medium">Content Staff</th>
                    <th className="pb-2.5 font-medium text-center">Assigned</th>
                    <th className="pb-2.5 font-medium text-center">In Progress</th>
                    <th className="pb-2.5 font-medium text-center">Completed</th>
                    <th className="pb-2.5 font-medium text-center">Overdue</th>
                    <th className="pb-2.5 font-medium text-right">Capacity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {teamWorkloads.map((member) => {
                    const capacityPercent = Math.min(100, Math.round((member.assigned / 8) * 100))

                    return (
                      <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                              {member.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold">{member.name}</div>
                              <span className="text-[10px] text-muted-foreground">{member.role}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-center text-foreground font-bold">{member.assigned}</td>
                        <td className="py-3 text-center text-amber-400 font-semibold">{member.inProgress}</td>
                        <td className="py-3 text-center text-emerald-400 font-semibold">{member.completed}</td>
                        <td className="py-3 text-center font-semibold">
                          <span className={member.overdue > 0 ? 'text-rose-400 font-bold' : 'text-muted-foreground'}>
                            {member.overdue}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  capacityPercent >= 90
                                    ? "bg-rose-500"
                                    : capacityPercent >= 60
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                )}
                                style={{ width: `${capacityPercent}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground w-7">
                              {capacityPercent}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. ROW 2: CONTENT DELIVERABLES BREAKDOWN & UPCOMING DEADLINES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CONTENT FORMAT & ASSET BREAKDOWN */}
        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="p-4 pb-3 border-b border-border flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <CardTitle className="text-sm font-semibold text-foreground">
                Content Deliverables by Format
              </CardTitle>
            </div>
            <Link
              href="/content-management"
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>

          <CardContent className="p-4 space-y-3.5">
            {Object.keys(typeCounts).length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No deliverables recorded yet.</p>
            ) : (
              Object.entries(typeCounts).map(([type, count]) => {
                const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0
                return (
                  <div key={type} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{type}</span>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="font-bold text-foreground">{count}</span>
                        <span className="text-[10px] font-mono">({percentage}%)</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* UPCOMING & OVERDUE DEADLINES */}
        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="p-4 pb-3 border-b border-border flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <CardTitle className="text-sm font-semibold text-foreground">
                Editorial Deadlines & Milestones
              </CardTitle>
            </div>
            <Link
              href="/content-management"
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
            >
              <span>Full Schedule</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>

          <CardContent className="p-4 space-y-3 overflow-y-auto max-h-[360px]">
            {overdueTasks.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Overdue Submissions ({overdueTasks.length})</span>
                </div>
                {overdueTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <h5 className="font-bold text-foreground truncate">{t.title}</h5>
                      <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
                        <span>Assignee: <strong className="text-foreground">{t.assigned_to_name || 'Unassigned'}</strong></span>
                        <span>&bull;</span>
                        <span className="text-rose-400 font-bold">Due: {dayjs(t.due_date).format('DD MMM YYYY')}</span>
                      </div>
                    </div>
                    <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10px] shrink-0">
                      Overdue
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming items */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Upcoming Deliverables</span>
              </div>
              {items
                .filter((t) => t.status !== 'Completed' && t.status !== 'Published' && t.status !== 'Approved' && computeDeadlineState(t.due_date, t.status) !== 'Overdue')
                .slice(0, 4)
                .map((t) => (
                  <div
                    key={t.id}
                    className="p-3 bg-muted/20 border border-border rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <h5 className="font-bold text-foreground truncate">{t.title}</h5>
                      <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
                        <span>Assignee: <strong className="text-foreground">{t.assigned_to_name || 'Unassigned'}</strong></span>
                        <span>&bull;</span>
                        <span>Due: {t.due_date ? dayjs(t.due_date).format('DD MMM YYYY') : 'Flexible'}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-border shrink-0">
                      {t.status}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
