'use client'

import React, { useState, useMemo } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  Sparkles,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  GitCommit,
  GitBranch,
  Timer
} from 'lucide-react'
import { ContentItem, ContentStatus, ContentPriority, computeDeadlineState } from '@/types/content-management'
import { AssignableEmployee } from '@/lib/actions/team'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import dayjs from 'dayjs'
import { cn } from '@/lib/utils'

interface ContentGanttChartProps {
  items: ContentItem[]
  employees?: AssignableEmployee[]
  onItemClick?: (item: ContentItem) => void
  onStatusChange?: (itemId: string, status: ContentStatus) => Promise<void> | void
}

export function ContentGanttChart({
  items,
  employees = [],
  onItemClick,
}: ContentGanttChartProps) {
  // Navigation: Anchor date for timeline
  const [currentDate, setCurrentDate] = useState<dayjs.Dayjs>(dayjs())
  const [viewWindow, setViewWindow] = useState<14 | 30>(30)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  // Calculate timeline start & end based on viewWindow
  const rangeStart = useMemo(() => {
    return currentDate.startOf('month')
  }, [currentDate])

  const daysInMonth = useMemo(() => {
    return rangeStart.daysInMonth()
  }, [rangeStart])

  const totalDays = useMemo(() => {
    return viewWindow === 14 ? 14 : daysInMonth
  }, [viewWindow, daysInMonth])

  const daysArray = useMemo(() => {
    const list: dayjs.Dayjs[] = []
    for (let i = 0; i < totalDays; i++) {
      list.push(rangeStart.add(i, 'day'))
    }
    return list
  }, [rangeStart, totalDays])

  // Detect overlapping tasks for the same assignee
  const overlappingTaskIds = useMemo(() => {
    const overlapping = new Set<string>()
    const byAssignee: Record<string, ContentItem[]> = {}

    items.forEach((item) => {
      const assignee = item.assigned_to_id || item.assigned_to_name
      if (!assignee) return
      if (!byAssignee[assignee]) byAssignee[assignee] = []
      byAssignee[assignee].push(item)
    })

    Object.values(byAssignee).forEach((taskList) => {
      if (taskList.length < 2) return
      for (let i = 0; i < taskList.length; i++) {
        const a = taskList[i]
        const aStart = dayjs(a.start_date || a.created_at)
        const aDue = dayjs(a.due_date || aStart.add(3, 'day'))

        for (let j = i + 1; j < taskList.length; j++) {
          const b = taskList[j]
          const bStart = dayjs(b.start_date || b.created_at)
          const bDue = dayjs(b.due_date || bStart.add(3, 'day'))

          // Check interval overlap: max(aStart, bStart) <= min(aDue, bDue)
          const overlap = aStart.isBefore(bDue.add(1, 'day')) && bStart.isBefore(aDue.add(1, 'day'))
          if (overlap && a.status !== 'Completed' && b.status !== 'Completed') {
            overlapping.add(a.id)
            overlapping.add(b.id)
          }
        }
      }
    })

    return overlapping
  }, [items])

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (assigneeFilter !== 'All' && item.assigned_to_id !== assigneeFilter) return false
      if (statusFilter !== 'All' && item.status !== statusFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = item.title.toLowerCase().includes(q)
        const matchesAssignee = (item.assigned_to_name || '').toLowerCase().includes(q)
        const matchesType = (item.content_type || '').toLowerCase().includes(q)
        if (!matchesTitle && !matchesAssignee && !matchesType) return false
      }
      return true
    })
  }, [items, assigneeFilter, statusFilter, searchQuery])

  // Today indicator string
  const todayStr = useMemo(() => dayjs().format('YYYY-MM-DD'), [])

  // Priority Badge Helper
  const getPriorityBadge = (p?: ContentPriority) => {
    switch (p) {
      case 'Urgent':
        return <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30 text-[9px] px-1.5 py-0">Urgent</Badge>
      case 'High':
        return <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 text-[9px] px-1.5 py-0">High</Badge>
      case 'Medium':
        return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[9px] px-1.5 py-0">Med</Badge>
      case 'Low':
        return <Badge className="bg-zinc-700/50 text-zinc-400 border-zinc-600 text-[9px] px-1.5 py-0">Low</Badge>
      default:
        return null
    }
  }

  // Step Month / Window
  const stepMonth = (offset: number) => {
    setCurrentDate((prev) => prev.add(offset, 'month'))
  }

  return (
    <div className="space-y-4">
      {/* Gantt Header & Controls Bar */}
      <div className="p-4 bg-card border border-border rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        {/* Left: Date Navigator */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-muted/40 border border-border p-1 rounded-xl shadow-xs">
            <button
              onClick={() => stepMonth(-1)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-foreground font-mono">
              {rangeStart.format('MMMM YYYY')}
            </span>
            <button
              onClick={() => stepMonth(1)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(dayjs())}
              className="px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors ml-1"
            >
              Today
            </button>
          </div>

          {/* View Zoom Toggle */}
          <div className="flex items-center bg-muted/40 border border-border p-1 rounded-xl">
            <button
              onClick={() => setViewWindow(14)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all",
                viewWindow === 14 ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              14 Days
            </button>
            <button
              onClick={() => setViewWindow(30)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all",
                viewWindow === 30 ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Full Month
            </button>
          </div>
        </div>

        {/* Right: Search & Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-[160px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search schedule..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/30 border-border"
            />
          </div>

          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="h-8 px-2 rounded-lg text-xs bg-muted/40 border border-border text-foreground font-medium outline-none cursor-pointer max-w-[130px] truncate"
          >
            <option value="All">All Staff</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name || (e as any).employee_name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2 rounded-lg text-xs bg-muted/40 border border-border text-foreground font-medium outline-none cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="In Review">In Review</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Gantt Chart Container */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
            {/* Header: Task Metadata on Left (360px), Timeline Grid on Right */}
            <div className="flex border-b border-border bg-muted/30 text-[11px] font-semibold text-muted-foreground">
              {/* Left Column Header */}
              <div className="w-[360px] shrink-0 p-3 border-r border-border flex items-center justify-between">
                <span>Deliverable & Assignee</span>
                <span>Schedule & Duration</span>
              </div>

              {/* Right Column Header: Days */}
              <div className="flex-1 flex">
                {daysArray.map((day) => {
                  const isToday = day.format('YYYY-MM-DD') === todayStr
                  const isWeekend = day.day() === 0 || day.day() === 6

                  return (
                    <div
                      key={day.format('YYYY-MM-DD')}
                      className={cn(
                        "flex-1 text-center py-2 px-0.5 border-r border-border/40 min-w-[28px] flex flex-col items-center justify-center",
                        isWeekend && "bg-muted/40 text-muted-foreground/60",
                        isToday && "bg-primary/10 text-primary font-bold border-b-2 border-b-primary"
                      )}
                    >
                      <span className="text-[9px] uppercase tracking-tighter">
                        {day.format('dd')}
                      </span>
                      <span className={cn("text-xs leading-none font-mono", isToday && "text-primary font-bold")}>
                        {day.format('D')}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Task Rows */}
            <div className="divide-y divide-border/60">
              {filteredItems.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground">
                  No tasks found for the selected timeline and filter.
                </div>
              ) : (
                filteredItems.map((item) => {
                  // Calculate start & due relative to timeline range
                  const itemStart = item.start_date
                    ? dayjs(item.start_date)
                    : dayjs(item.created_at || rangeStart)
                  const itemDue = item.due_date
                    ? dayjs(item.due_date)
                    : itemStart.add(3, 'day')

                  const totalDurationDays = Math.max(1, itemDue.diff(itemStart, 'day') + 1)
                  const diffStart = itemStart.diff(rangeStart, 'day')

                  // Percentage placement within timeline
                  const startOffset = Math.max(0, diffStart)
                  const visibleDuration = Math.min(
                    totalDays - startOffset,
                    totalDurationDays - (diffStart < 0 ? Math.abs(diffStart) : 0)
                  )

                  const leftPercent = Math.min(100, Math.max(0, (startOffset / totalDays) * 100))
                  const widthPercent = Math.min(100 - leftPercent, Math.max(2.5, (visibleDuration / totalDays) * 100))

                  const isVisible = diffStart < totalDays && itemDue.diff(rangeStart, 'day') >= 0

                  const progress = typeof item.progress === 'number'
                    ? item.progress
                    : item.status === 'Completed' || item.status === 'Published' || item.status === 'Approved'
                    ? 100
                    : item.status === 'In Review'
                    ? 75
                    : item.status === 'In Progress'
                    ? 40
                    : 0

                  const deadlineState = computeDeadlineState(item.due_date, item.status)
                  const isOverdue = deadlineState === 'Overdue' && item.status !== 'Completed'
                  const isOverlapping = overlappingTaskIds.has(item.id)

                  // Bar color styling
                  let barGradient = 'from-zinc-600 to-zinc-500'
                  if (item.status === 'Completed' || item.status === 'Published' || item.status === 'Approved') {
                    barGradient = 'from-emerald-600 to-teal-500'
                  } else if (item.status === 'In Review') {
                    barGradient = 'from-indigo-600 to-violet-500'
                  } else if (item.status === 'In Progress' || item.status === 'Changes Requested') {
                    barGradient = 'from-amber-600 to-orange-500'
                  }

                  return (
                    <div
                      key={item.id}
                      className="flex hover:bg-muted/20 transition-colors group"
                      onClick={() => onItemClick && onItemClick(item)}
                    >
                      {/* Left: Metadata info (360px) */}
                      <div className="w-[360px] shrink-0 p-3 border-r border-border flex flex-col justify-between cursor-pointer space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-primary px-1.5 py-0.2 rounded bg-primary/10">
                            {item.id}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {item.content_type || 'Content'}
                          </span>
                          {getPriorityBadge(item.priority)}
                          {isOverdue && (
                            <span className="text-[9px] font-bold text-rose-400 flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>Overdue</span>
                            </span>
                          )}
                          {isOverlapping && (
                            <span className="text-[9px] font-bold text-amber-400 flex items-center gap-0.5 bg-amber-500/10 px-1 py-0.2 rounded">
                              <Timer className="w-2.5 h-2.5" />
                              <span>Overlap</span>
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {item.title}
                        </h4>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                          <div className="flex items-center gap-1 truncate max-w-[160px]">
                            <User className="w-3 h-3 text-primary shrink-0" />
                            <span className="truncate">{item.assigned_to_name || 'Unassigned'}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[10px]">
                            <span>{totalDurationDays}d</span>
                            <span>&bull;</span>
                            <span>
                              {item.start_date ? dayjs(item.start_date).format('DD MMM') : '-'} &rarr;{' '}
                              {item.due_date ? dayjs(item.due_date).format('DD MMM') : '-'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Gantt Bar Timeline Area */}
                      <div className="flex-1 relative flex items-center min-h-[58px]">
                        {/* Day Grid Lines */}
                        <div className="absolute inset-0 flex pointer-events-none">
                          {daysArray.map((day) => {
                            const isToday = day.format('YYYY-MM-DD') === todayStr
                            const isWeekend = day.day() === 0 || day.day() === 6
                            return (
                              <div
                                key={day.format('YYYY-MM-DD')}
                                className={cn(
                                  "flex-1 border-r border-border/30",
                                  isWeekend && "bg-muted/15",
                                  isToday && "bg-primary/5 border-r-primary/40"
                                )}
                              />
                            )
                          })}
                        </div>

                        {/* Visual Gantt Bar */}
                        {isVisible ? (
                          <div
                            className="absolute z-10 h-7 rounded-lg overflow-hidden cursor-pointer shadow-xs transition-all hover:brightness-110 flex items-center px-2 border border-white/10"
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                            }}
                            title={`${item.title} | ${item.status} | Duration: ${totalDurationDays} days | ${progress}% Complete`}
                          >
                            {/* Gradient Background */}
                            <div className={cn("absolute inset-0 bg-gradient-to-r", barGradient, isOverdue && "ring-2 ring-rose-500")} />

                            {/* Inner Progress Shading */}
                            <div
                              className="absolute left-0 top-0 bottom-0 bg-black/25 transition-all"
                              style={{ width: `${progress}%` }}
                            />

                            {/* Text Label on Bar */}
                            <span className="relative z-10 text-[11px] font-bold text-white truncate drop-shadow-sm flex items-center gap-1.5">
                              <span>{item.title}</span>
                              <span className="text-[9px] opacity-80 font-mono">({progress}%)</span>
                            </span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-muted-foreground px-4 italic">
                            Scheduled outside current month window
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Gantt Legend & Summary Bar */}
        <div className="p-3 bg-muted/20 border-t border-border flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-semibold text-foreground">Timeline Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-500" />
              <span>In Review</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-zinc-600" />
              <span>To Do</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border-2 border-rose-500 bg-rose-500/30" />
              <span>Overdue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-400" />
              <span>Overlapping</span>
            </div>
          </div>

          <div className="text-[11px]">
            Showing <strong className="text-foreground">{filteredItems.length}</strong> tasks on timeline
          </div>
        </div>
      </div>
    </div>
  )
}
