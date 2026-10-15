'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Project, Task, TaskPriority, TaskStatus } from '@/types/project-management'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getProfilePhotoUrl } from '@/lib/utils/profile-photos'
import {
  ChartGantt,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  X,
  Flag,
  CalendarRange,
  Eye,
  Plus,
  HelpCircle,
  Maximize2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { updateTaskAction } from '@/lib/actions/tasks'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface ProjectGanttTabProps {
  project: Project
  tasks: Task[]
  canManageTasks?: boolean
  onTaskClick: (task: Task) => void
  onAddTask?: () => void
}

type ZoomLevel = 'day' | 'week' | 'month'

export function ProjectGanttTab({
  project,
  tasks: initialTasks,
  canManageTasks = false,
  onTaskClick,
  onAddTask,
}: ProjectGanttTabProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('day')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [isUndatedOpen, setIsUndatedOpen] = useState(true)

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Keep local tasks updated when initialTasks changes
  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  // Partition tasks into dated and undated
  const { datedTasks, undatedTasks } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const filtered = tasks.filter((t) => {
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.task_id_display.toLowerCase().includes(q) ||
        t.assignees?.some(
          (a) =>
            a.profile &&
            `${a.profile.first_name || ''} ${a.profile.last_name || ''}`.toLowerCase().includes(q)
        )
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter
      return matchesSearch && matchesStatus
    })

    const dated: Task[] = []
    const undated: Task[] = []

    filtered.forEach((t) => {
      if (t.start_date || t.due_date) {
        dated.push(t)
      } else {
        undated.push(t)
      }
    })

    // Sort dated tasks by earliest start_date or due_date
    dated.sort((a, b) => {
      const dateA = a.start_date || a.due_date || ''
      const dateB = b.start_date || b.due_date || ''
      return new Date(dateA).getTime() - new Date(dateB).getTime()
    })

    return { datedTasks: dated, undatedTasks: undated }
  }, [tasks, searchQuery, statusFilter])

  // Compute overall timeline date boundaries based on project dates, task dates, and today
  const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    const timestamps: number[] = []

    if (project.start_date) timestamps.push(dayjs(project.start_date).valueOf())
    if (project.deadline) timestamps.push(dayjs(project.deadline).valueOf())

    datedTasks.forEach((t) => {
      if (t.start_date) timestamps.push(dayjs(t.start_date).valueOf())
      if (t.due_date) timestamps.push(dayjs(t.due_date).valueOf())
    })

    // Always include Today so the user has immediate context
    timestamps.push(dayjs().valueOf())

    const minTime = Math.min(...timestamps)
    const maxTime = Math.max(...timestamps)

    let start = dayjs(minTime).startOf('day')
    let end = dayjs(maxTime).endOf('day')

    // Add padding days on both ends so bars don't hit the container edges
    if (end.diff(start, 'day') < 10) {
      start = start.subtract(3, 'day')
      end = end.add(7, 'day')
    } else {
      start = start.subtract(3, 'day')
      end = end.add(4, 'day')
    }

    const diffDays = end.diff(start, 'day') + 1
    return {
      timelineStart: start,
      timelineEnd: end,
      totalDays: Math.max(diffDays, 14),
    }
  }, [project.start_date, project.deadline, datedTasks])

  // Column width configuration based on zoom
  const columnWidth = useMemo(() => {
    switch (zoomLevel) {
      case 'day':
        return 42
      case 'week':
        return 110
      case 'month':
        return 160
    }
  }, [zoomLevel])

  // Generate days array for Day view
  const days = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => {
      const d = timelineStart.add(i, 'day')
      const isWeekend = d.day() === 0 || d.day() === 6
      const isToday = d.isSame(dayjs(), 'day')
      const isProjectStart = project.start_date && d.isSame(dayjs(project.start_date), 'day')
      const isProjectDeadline = project.deadline && d.isSame(dayjs(project.deadline), 'day')

      return {
        date: d,
        dateStr: d.format('YYYY-MM-DD'),
        dayNumber: d.date(),
        dayName: d.format('dd')[0],
        monthYear: d.format('MMMM YYYY'),
        isWeekend,
        isToday,
        isProjectStart,
        isProjectDeadline,
      }
    })
  }, [timelineStart, totalDays, project.start_date, project.deadline])

  // Group consecutive days by month for top header tier in Day view
  const monthSegments = useMemo(() => {
    const segments: { monthLabel: string; daysCount: number }[] = []
    days.forEach((d) => {
      const label = d.monthYear
      const last = segments[segments.length - 1]
      if (last && last.monthLabel === label) {
        last.daysCount++
      } else {
        segments.push({ monthLabel: label, daysCount: 1 })
      }
    })
    return segments
  }, [days])

  // Week segments for Week view
  const weekSegments = useMemo(() => {
    const totalWeeks = Math.ceil(totalDays / 7)
    return Array.from({ length: totalWeeks }, (_, wIdx) => {
      const wStart = timelineStart.add(wIdx * 7, 'day')
      const wEnd = wStart.add(6, 'day')
      const isCurrentWeek = dayjs().isAfter(wStart.subtract(1, 'day')) && dayjs().isBefore(wEnd.add(1, 'day'))
      return {
        weekIndex: wIdx,
        startDate: wStart,
        endDate: wEnd,
        label: `W${wStart.format('WW')} (${wStart.format('DD MMM')} - ${wEnd.format('DD MMM')})`,
        monthLabel: wStart.format('MMMM YYYY'),
        isCurrentWeek,
      }
    })
  }, [timelineStart, totalDays])

  // Month segments for Month view
  const monthViewSegments = useMemo(() => {
    const segments: { monthLabel: string; daysCount: number }[] = []
    days.forEach((d) => {
      const label = d.monthYear
      const last = segments[segments.length - 1]
      if (last && last.monthLabel === label) {
        last.daysCount++
      } else {
        segments.push({ monthLabel: label, daysCount: 1 })
      }
    })
    return segments
  }, [days])

  // Total timeline width in pixels
  const totalTimelineWidth = useMemo(() => {
    if (zoomLevel === 'day') {
      return totalDays * columnWidth
    } else if (zoomLevel === 'week') {
      return weekSegments.length * columnWidth
    } else {
      return monthViewSegments.length * columnWidth
    }
  }, [zoomLevel, totalDays, columnWidth, weekSegments.length, monthViewSegments.length])

  // Position of Today vertical marker
  const todayPosition = useMemo(() => {
    const today = dayjs().startOf('day')
    if (today.isBefore(timelineStart) || today.isAfter(timelineEnd)) return null
    const offsetDays = today.diff(timelineStart, 'day')

    if (zoomLevel === 'day') {
      return offsetDays * columnWidth + columnWidth / 2
    } else if (zoomLevel === 'week') {
      return (offsetDays / 7) * columnWidth + columnWidth / 4
    } else {
      return (offsetDays / 30) * columnWidth + columnWidth / 4
    }
  }, [timelineStart, timelineEnd, zoomLevel, columnWidth])

  // Position of Project Deadline marker
  const deadlinePosition = useMemo(() => {
    if (!project.deadline) return null
    const deadline = dayjs(project.deadline).startOf('day')
    if (deadline.isBefore(timelineStart) || deadline.isAfter(timelineEnd)) return null
    const offsetDays = deadline.diff(timelineStart, 'day')

    if (zoomLevel === 'day') {
      return offsetDays * columnWidth + columnWidth / 2
    } else if (zoomLevel === 'week') {
      return (offsetDays / 7) * columnWidth + columnWidth / 4
    } else {
      return (offsetDays / 30) * columnWidth + columnWidth / 4
    }
  }, [project.deadline, timelineStart, timelineEnd, zoomLevel, columnWidth])

  // Scroll to Today button handler
  const scrollToToday = () => {
    if (!scrollContainerRef.current || todayPosition === null) return
    const containerWidth = scrollContainerRef.current.clientWidth
    const target = Math.max(0, todayPosition - containerWidth / 2 + 140)
    scrollContainerRef.current.scrollTo({ left: target, behavior: 'smooth' })
  }

  // Scroll to start of project
  const scrollToProjectStart = () => {
    if (!scrollContainerRef.current) return
    if (project.start_date) {
      const offsetDays = Math.max(0, dayjs(project.start_date).diff(timelineStart, 'day'))
      const target = Math.max(0, offsetDays * columnWidth - 80)
      scrollContainerRef.current.scrollTo({ left: target, behavior: 'smooth' })
    } else {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' })
    }
  }

  // Auto-scroll near Today on initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      if (todayPosition !== null && scrollContainerRef.current) {
        const containerWidth = scrollContainerRef.current.clientWidth
        const target = Math.max(0, todayPosition - containerWidth / 3)
        scrollContainerRef.current.scrollTo({ left: target, behavior: 'smooth' })
      }
    }, 150)
    return () => clearTimeout(timer)
  }, [todayPosition])

  // Task bar calculation helper
  const getTaskBarLayout = (task: Task) => {
    const hasStart = !!task.start_date
    const hasDue = !!task.due_date

    // A task is treated as a milestone marker if it only has a due date or single day
    const isMilestone = (!hasStart && hasDue) || (hasStart && hasDue && task.start_date === task.due_date)

    const start = task.start_date
      ? dayjs(task.start_date).startOf('day')
      : dayjs(task.due_date!).startOf('day')
    const due = task.due_date
      ? dayjs(task.due_date).endOf('day')
      : dayjs(task.start_date!).endOf('day')

    const startOffsetDays = start.diff(timelineStart, 'day')
    const durationDays = Math.max(1, due.diff(start, 'day') + 1)

    let left = 0
    let width = 0

    if (zoomLevel === 'day') {
      if (isMilestone) {
        left = startOffsetDays * columnWidth + (columnWidth - 26) / 2
        width = 26
      } else {
        left = startOffsetDays * columnWidth + 2
        width = Math.max(32, durationDays * columnWidth - 4)
      }
    } else if (zoomLevel === 'week') {
      if (isMilestone) {
        left = (startOffsetDays / 7) * columnWidth + (columnWidth - 26) / 2
        width = 26
      } else {
        left = (startOffsetDays / 7) * columnWidth + 2
        width = Math.max(28, (durationDays / 7) * columnWidth - 4)
      }
    } else {
      // Month
      if (isMilestone) {
        left = (startOffsetDays / 30) * columnWidth + (columnWidth - 26) / 2
        width = 26
      } else {
        left = (startOffsetDays / 30) * columnWidth + 2
        width = Math.max(24, (durationDays / 30) * columnWidth - 4)
      }
    }

    return {
      left: Math.max(0, left),
      width,
      isMilestone,
      formattedStart: task.start_date ? dayjs(task.start_date).format('DD MMM') : null,
      formattedDue: task.due_date ? dayjs(task.due_date).format('DD MMM') : null,
    }
  }

  // Priority border accent
  const getPriorityBorder = (p: TaskPriority) => {
    switch (p) {
      case 'URGENT':
        return 'border-l-[3.5px] border-l-red-500'
      case 'HIGH':
        return 'border-l-[3.5px] border-l-orange-500'
      case 'MEDIUM':
        return 'border-l-[3.5px] border-l-amber-500'
      case 'LOW':
      default:
        return 'border-l-[3.5px] border-l-blue-500'
    }
  }

  // Status visual style matching black and white theme
  const getStatusStyle = (status: TaskStatus, isOverdue?: boolean) => {
    if (isOverdue && status !== 'DONE') {
      return 'bg-destructive/20 border-destructive/80 text-foreground ring-1 ring-destructive/40 shadow-xs'
    }
    switch (status) {
      case 'DONE':
        return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 dark:text-emerald-200'
      case 'IN_PROGRESS':
        return 'bg-foreground text-background font-medium border-foreground/90'
      case 'IN_REVIEW':
        return 'bg-blue-500/15 border-blue-500/40 text-blue-300 dark:text-blue-200'
      case 'ON_HOLD':
        return 'bg-purple-500/15 border-purple-500/40 text-purple-300 dark:text-purple-200'
      case 'TODO':
      default:
        return 'bg-secondary/90 border-border/80 text-foreground'
    }
  }

  // Drag-to-reschedule support (authorized & non-destructive)
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    if (!canManageTasks) return
    e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id }))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDropOnDay = async (e: React.DragEvent, targetDayIndex: number) => {
    if (!canManageTasks) return
    e.preventDefault()
    try {
      const dataStr = e.dataTransfer.getData('application/json')
      if (!dataStr) return
      const { taskId } = JSON.parse(dataStr)
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return

      const targetDate = timelineStart.add(targetDayIndex, 'day')
      const currentStart = task.start_date ? dayjs(task.start_date) : dayjs(task.due_date!)
      const deltaDays = targetDate.diff(currentStart, 'day')

      if (deltaDays === 0) return

      const newStart = task.start_date
        ? dayjs(task.start_date).add(deltaDays, 'day').format('YYYY-MM-DD')
        : targetDate.format('YYYY-MM-DD')
      const newDue = task.due_date
        ? dayjs(task.due_date).add(deltaDays, 'day').format('YYYY-MM-DD')
        : newStart

      // Optimistic update
      const prevTasks = [...tasks]
      setTasks((curr) =>
        curr.map((t) => (t.id === task.id ? { ...t, start_date: newStart, due_date: newDue } : t))
      )

      const res = await updateTaskAction({
        id: task.id,
        start_date: newStart,
        due_date: newDue,
      })

      if (!res.success) {
        setTasks(prevTasks)
        toast.error(res.error || 'Failed to reschedule task')
      } else {
        toast.success(`Rescheduled ${task.task_id_display} to ${dayjs(newStart).format('DD MMM')}`)
        router.refresh()
      }
    } catch (err: any) {
      toast.error('Could not reschedule task')
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="w-full bg-[#0c0c0e] border border-white/10 p-2 sm:p-2.5 rounded-2xl shadow-xs overflow-x-auto no-scrollbar">
        <div className="flex items-center justify-between gap-3 min-w-max">
          {/* Left Controls: Filter Tasks & Date Information */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Filter Tasks */}
            <div className="relative flex items-center shrink-0">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter Tasks"
                className="h-9 pl-9 pr-7 text-xs bg-[#161618] hover:bg-[#1c1c1f] focus:bg-[#1c1c1f] text-white placeholder:text-zinc-400 border border-white/10 hover:border-white/20 focus:border-white/40 focus:outline-none rounded-full transition-all w-36 sm:w-44 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 rounded-full cursor-pointer"
                  title="Clear filter"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Start Date & Deadline */}
            <div className="flex items-center gap-3 bg-[#141416] border border-white/10 px-4 h-9 rounded-full text-xs shrink-0 shadow-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">START:</span>
                <span className="font-semibold text-white">
                  {project.start_date ? dayjs(project.start_date).format('DD MMM YYYY') : 'Unset'}
                </span>
              </div>
              <div className="w-px h-3.5 bg-white/15" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">DEADLINE:</span>
                <span className="font-semibold text-white">
                  {project.deadline ? dayjs(project.deadline).format('DD MMM YYYY') : 'Unset'}
                </span>
                {project.is_overdue && (
                  <span className="bg-[#3b1219] text-[#f87171] border border-red-500/25 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                    OVERDUE
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Controls: Today & Segmented View Switcher */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="hidden sm:block w-px h-5 bg-white/10 shrink-0" />

            {/* Today Button */}
            <button
              type="button"
              onClick={scrollToToday}
              className="h-9 px-4 rounded-full bg-[#161618] hover:bg-[#202024] border border-white/10 text-white text-xs font-semibold transition-colors shrink-0 shadow-xs cursor-pointer flex items-center justify-center"
              title="Scroll timeline to current date"
            >
              Today
            </button>

            {/* Zoom Level Switcher */}
            <div className="flex items-center bg-[#141416] border border-white/10 p-0.5 rounded-full h-9 shrink-0 shadow-xs">
              {(['day', 'week', 'month'] as ZoomLevel[]).map((level) => {
                const isActive = zoomLevel === level
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setZoomLevel(level)}
                    className={cn(
                      'px-3.5 py-1 text-xs font-semibold rounded-full capitalize transition-all cursor-pointer',
                      isActive
                        ? 'bg-white text-black shadow-xs font-bold'
                        : 'text-zinc-400 hover:text-white'
                    )}
                  >
                    {level}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Gantt Chart Table Container */}
      <div className="w-full bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs flex flex-col">
        {datedTasks.length === 0 ? (
          /* Empty State for no scheduled tasks */
          <div className="py-20 px-4 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-secondary/80 border border-border/80 flex items-center justify-center text-muted-foreground">
              <CalendarRange className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-foreground">No Tasks Scheduled on Timeline</h4>
            <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
              None of the tasks in this project currently have start or due dates assigned.
              {undatedTasks.length > 0 &&
                ` You have ${undatedTasks.length} unscheduled tasks listed below. Click on any task to schedule it.`}
            </p>
            {onAddTask && (
              <Button
                size="sm"
                onClick={onAddTask}
                className="mt-2 h-9 px-4 rounded-xl bg-foreground text-background hover:bg-foreground/90 text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create New Task
              </Button>
            )}
          </div>
        ) : (
          /* Horizontal Scrollable Gantt Timeline */
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto overflow-y-hidden custom-scrollbar relative select-none"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div style={{ minWidth: `${300 + totalTimelineWidth}px` }} className="relative">
              {/* TOP HEADER: 2-Tier Dates Row */}
              <div className="flex border-b border-border/80 bg-secondary/40 sticky top-0 z-30">
                {/* Top-Left Intersection (Sticky) */}
                <div className="w-[300px] shrink-0 p-3 border-r border-border/80 bg-card/95 backdrop-blur-md sticky left-0 z-40 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Task / Assignees
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {datedTasks.length} tasks
                  </span>
                </div>

                {/* Top-Right: Date Tier Container */}
                <div className="flex flex-col flex-1">
                  {/* Tier 1: Months / Higher-level grouping */}
                  <div className="flex border-b border-border/50 bg-secondary/30">
                    {zoomLevel === 'day' &&
                      monthSegments.map((seg, idx) => (
                        <div
                          key={idx}
                          style={{ width: `${seg.daysCount * columnWidth}px` }}
                          className="py-1.5 px-3 text-xs font-bold text-foreground truncate border-r border-border/50 text-left bg-background/20"
                        >
                          {seg.monthLabel}
                        </div>
                      ))}

                    {zoomLevel === 'week' &&
                      weekSegments.map((seg) => (
                        <div
                          key={seg.weekIndex}
                          style={{ width: `${columnWidth}px` }}
                          className="py-1.5 px-2 text-xs font-bold text-foreground truncate border-r border-border/50 text-center bg-background/20"
                        >
                          {seg.monthLabel}
                        </div>
                      ))}

                    {zoomLevel === 'month' &&
                      monthViewSegments.map((seg, idx) => (
                        <div
                          key={idx}
                          style={{ width: `${columnWidth}px` }}
                          className="py-1.5 px-3 text-xs font-bold text-foreground truncate border-r border-border/50 text-center bg-background/20"
                        >
                          {seg.monthLabel}
                        </div>
                      ))}
                  </div>

                  {/* Tier 2: Days / Weeks header */}
                  <div className="flex">
                    {zoomLevel === 'day' &&
                      days.map((d, i) => (
                        <div
                          key={d.dateStr}
                          style={{ width: `${columnWidth}px` }}
                          onDragOver={(e) => canManageTasks && e.preventDefault()}
                          onDrop={(e) => canManageTasks && handleDropOnDay(e, i)}
                          className={cn(
                            'text-center py-1.5 border-r border-border/50 text-[11px] shrink-0 transition-colors',
                            d.isToday
                              ? 'bg-foreground/10 text-foreground font-bold'
                              : d.isWeekend
                              ? 'bg-secondary/40 text-muted-foreground/60'
                              : 'text-muted-foreground'
                          )}
                        >
                          <div
                            className={cn(
                              'text-xs font-semibold mx-auto w-6 h-6 flex items-center justify-center rounded-full',
                              d.isToday && 'bg-foreground text-background font-bold shadow-xs'
                            )}
                          >
                            {d.dayNumber}
                          </div>
                          <div className="text-[9px] uppercase tracking-tighter opacity-70">
                            {d.dayName}
                          </div>
                        </div>
                      ))}

                    {zoomLevel === 'week' &&
                      weekSegments.map((seg) => (
                        <div
                          key={seg.weekIndex}
                          style={{ width: `${columnWidth}px` }}
                          className={cn(
                            'text-center py-2 border-r border-border/50 text-[11px] shrink-0',
                            seg.isCurrentWeek ? 'bg-foreground/10 font-bold' : 'text-muted-foreground'
                          )}
                        >
                          {seg.label}
                        </div>
                      ))}

                    {zoomLevel === 'month' &&
                      monthViewSegments.map((seg, idx) => (
                        <div
                          key={idx}
                          style={{ width: `${columnWidth}px` }}
                          className="text-center py-2 border-r border-border/50 text-xs font-semibold text-muted-foreground shrink-0"
                        >
                          {seg.monthLabel}
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* TIMELINE ROWS CONTAINER */}
              <div className="divide-y divide-border/60 relative">
                {/* 3. Global Vertical Today & Deadline Lines */}
                {todayPosition !== null && (
                  <div
                    style={{ left: `${300 + todayPosition}px` }}
                    className="absolute top-0 bottom-0 w-[2px] bg-red-500/80 z-20 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                  >
                    <span className="absolute -top-6 -translate-x-1/2 bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow-sm z-30">
                      TODAY
                    </span>
                  </div>
                )}

                {deadlinePosition !== null && (
                  <div
                    style={{ left: `${300 + deadlinePosition}px` }}
                    className="absolute top-0 bottom-0 w-[1.5px] border-r-2 border-dashed border-destructive/80 z-20 pointer-events-none"
                    title={`Project Deadline: ${project.deadline ? dayjs(project.deadline).format('DD MMM YYYY') : ''}`}
                  >
                    <div className="absolute top-1 -translate-x-1/2 bg-destructive text-destructive-foreground text-[8px] font-bold px-1 rounded flex items-center gap-0.5">
                      <Flag className="w-2.5 h-2.5" />
                    </div>
                  </div>
                )}

                {/* TASK ROWS */}
                {datedTasks.map((task) => {
                  const bar = getTaskBarLayout(task)
                  const isCompleted = task.status === 'DONE'
                  const isOverdue = !!(task.is_overdue && !isCompleted)

                  return (
                    <div
                      key={task.id}
                      className="flex hover:bg-secondary/20 transition-colors group h-12 relative"
                    >
                      {/* Left: Sticky Task Info Column */}
                      <div
                        onClick={() => onTaskClick(task)}
                        className="w-[300px] shrink-0 p-2.5 border-r border-border/80 bg-card/95 backdrop-blur-md sticky left-0 z-20 flex items-center justify-between gap-2.5 cursor-pointer shadow-xs group-hover:bg-card transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Priority Indicator */}
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full shrink-0',
                              task.priority === 'URGENT'
                                ? 'bg-red-500'
                                : task.priority === 'HIGH'
                                ? 'bg-orange-500'
                                : task.priority === 'MEDIUM'
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                            )}
                            title={`Priority: ${task.priority}`}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] text-muted-foreground bg-secondary/80 px-1 py-0.2 rounded shrink-0">
                                {task.task_id_display}
                              </span>
                              <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                {task.title}
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                              {bar.formattedStart && bar.formattedDue
                                ? `${bar.formattedStart} – ${bar.formattedDue}`
                                : bar.formattedDue
                                ? `Due: ${bar.formattedDue}`
                                : `Starts: ${bar.formattedStart}`}
                            </div>
                          </div>
                        </div>

                        {/* Assignee Avatar stack & Status badge */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {task.assignees && task.assignees.length > 0 && (
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {task.assignees.slice(0, 2).map((a) => {
                                const photo = getProfilePhotoUrl(a.profile?.profile_photo)
                                const name = a.profile
                                  ? `${a.profile.first_name || ''} ${a.profile.last_name || ''}`.trim()
                                  : 'User'
                                return (
                                  <Avatar
                                    key={a.id}
                                    className="w-5 h-5 border border-card bg-secondary text-[8px]"
                                    title={name}
                                  >
                                    {photo && <AvatarImage src={photo} alt={name} />}
                                    <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                )
                              })}
                            </div>
                          )}
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 border-border/70 uppercase tracking-tight"
                          >
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>

                      {/* Right: Gantt Bar Row with Background Grid Lines */}
                      <div
                        style={{ width: `${totalTimelineWidth}px` }}
                        className="relative flex-1 h-full overflow-hidden"
                      >
                        {/* Background vertical day grid lines */}
                        {zoomLevel === 'day' && (
                          <div className="absolute inset-0 flex pointer-events-none">
                            {days.map((d, dIdx) => (
                              <div
                                key={d.dateStr}
                                style={{ width: `${columnWidth}px` }}
                                onDragOver={(e) => canManageTasks && e.preventDefault()}
                                onDrop={(e) => canManageTasks && handleDropOnDay(e, dIdx)}
                                className={cn(
                                  'border-r border-border/30 h-full shrink-0',
                                  d.isWeekend && 'bg-secondary/20'
                                )}
                              />
                            ))}
                          </div>
                        )}

                        {zoomLevel === 'week' && (
                          <div className="absolute inset-0 flex pointer-events-none">
                            {weekSegments.map((seg) => (
                              <div
                                key={seg.weekIndex}
                                style={{ width: `${columnWidth}px` }}
                                className="border-r border-border/30 h-full shrink-0"
                              />
                            ))}
                          </div>
                        )}

                        {zoomLevel === 'month' && (
                          <div className="absolute inset-0 flex pointer-events-none">
                            {monthViewSegments.map((seg, idx) => (
                              <div
                                key={idx}
                                style={{ width: `${columnWidth}px` }}
                                className="border-r border-border/30 h-full shrink-0"
                              />
                            ))}
                          </div>
                        )}

                        {/* Task Bar / Milestone Element */}
                        {bar.isMilestone ? (
                          /* Milestone marker (diamond / single-day marker) */
                          <div
                            style={{
                              left: `${bar.left}px`,
                              top: '11px',
                            }}
                            draggable={canManageTasks}
                            onDragStart={(e) => handleDragStart(e, task)}
                            onClick={() => onTaskClick(task)}
                            className={cn(
                              'absolute z-10 w-6 h-6 rotate-45 rounded-sm flex items-center justify-center cursor-pointer transition-transform hover:scale-110 shadow-xs border',
                              isCompleted
                                ? 'bg-emerald-500 border-emerald-600 text-white'
                                : isOverdue
                                ? 'bg-destructive border-destructive text-destructive-foreground'
                                : 'bg-foreground border-foreground text-background'
                            )}
                            title={`[Milestone] ${task.task_id_display} • ${task.title} (Due: ${bar.formattedDue || bar.formattedStart})`}
                          >
                            <div className="-rotate-45 text-[10px] font-bold">◆</div>
                          </div>
                        ) : (
                          /* Spanning Horizontal Bar */
                          <div
                            style={{
                              left: `${bar.left}px`,
                              width: `${bar.width}px`,
                              top: '8px',
                            }}
                            draggable={canManageTasks}
                            onDragStart={(e) => handleDragStart(e, task)}
                            onClick={() => onTaskClick(task)}
                            className={cn(
                              'absolute z-10 h-8 rounded-lg px-2.5 flex items-center justify-between gap-2 text-xs font-semibold shadow-xs cursor-pointer transition-all duration-150 hover:brightness-105 active:scale-[0.99] border',
                              getPriorityBorder(task.priority),
                              getStatusStyle(task.status, isOverdue)
                            )}
                            title={`${task.task_id_display}: ${task.title} (${bar.formattedStart} – ${bar.formattedDue})`}
                          >
                            {/* Title & ID */}
                            <div className="flex items-center gap-1.5 truncate min-w-0">
                              {isCompleted ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : isOverdue ? (
                                <AlertCircle className="w-3.5 h-3.5 text-destructive-foreground shrink-0" />
                              ) : null}
                              <span className="font-mono text-[10px] opacity-80 shrink-0">
                                {task.task_id_display}
                              </span>
                              <span className="truncate text-xs">{task.title}</span>
                            </div>

                            {/* Dates info if width allows */}
                            {bar.width > 140 && (
                              <div className="text-[10px] opacity-85 shrink-0 font-mono">
                                {bar.formattedDue || bar.formattedStart}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Chart Footer with Legend */}
        <div className="p-3.5 border-t border-border/80 bg-background/50 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary border border-border" />
              <span>To Do</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-foreground" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>In Review</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Done</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span>On Hold</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
              <span>Overdue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rotate-45 bg-foreground" />
              <span>Milestone</span>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground">
            {canManageTasks && <span>Tip: Drag bars horizontally to reschedule tasks. Click to view full details.</span>}
          </div>
        </div>
      </div>

      {/* 3. Undated Tasks Section (Requirement 3: Never invent fake dates) */}
      {undatedTasks.length > 0 && (
        <div className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-xs">
          {/* Header */}
          <div
            onClick={() => setIsUndatedOpen((prev) => !prev)}
            className="flex items-center justify-between p-4 sm:p-5 bg-secondary/30 cursor-pointer select-none hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center text-muted-foreground">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-foreground">
                    Undated Tasks ({undatedTasks.length})
                  </h4>
                  <Badge variant="secondary" className="text-[10px] px-2 py-0">
                    Not on timeline
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  These tasks belong to this project but do not have start or due dates assigned yet.
                </p>
              </div>
            </div>

            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
              {isUndatedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

          {/* Cards Grid */}
          {isUndatedOpen && (
            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-border/60">
              {undatedTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="flex flex-col justify-between p-3.5 rounded-xl border border-border/80 bg-card hover:bg-secondary/20 hover:border-foreground/30 transition-all cursor-pointer group space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                        {task.task_id_display}
                      </span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase">
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {task.title}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground/70">
                        Priority:
                      </span>
                      <span className="font-medium">{task.priority}</span>
                    </div>

                    <span className="text-xs font-semibold text-primary underline underline-offset-2 opacity-80 group-hover:opacity-100">
                      Set Schedule →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
