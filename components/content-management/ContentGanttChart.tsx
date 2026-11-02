'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  AlertTriangle,
  Search,
  Timer,
  GripVertical,
  Pencil,
  CheckCircle2
} from 'lucide-react'
import { ContentItem, ContentStatus, ContentPriority, computeDeadlineState, computeDeadlineCategory } from '@/types/content-management'
import { AssignableEmployee } from '@/lib/actions/team'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import dayjs from 'dayjs'
import { cn } from '@/lib/utils'

interface ContentGanttChartProps {
  items: ContentItem[]
  employees?: AssignableEmployee[]
  onItemClick?: (item: ContentItem) => void
  onEditItem?: (item: ContentItem) => void
  onStatusChange?: (itemId: string, status: ContentStatus) => Promise<void> | void
  onReassignTask?: (itemId: string, newEmployeeId: string) => Promise<void> | void
  onDateChange?: (itemId: string, newStartDate: string, newDueDate: string) => Promise<void> | void
}

export function ContentGanttChart({
  items,
  employees = [],
  onItemClick,
  onEditItem,
  onStatusChange,
  onReassignTask,
  onDateChange,
}: ContentGanttChartProps) {
  // Navigation: Anchor date for timeline
  const [currentDate, setCurrentDate] = useState<dayjs.Dayjs>(dayjs())
  const [viewWindow, setViewWindow] = useState<14 | 30>(30)

  // Search Filter
  const [searchQuery, setSearchQuery] = useState('')

  // Ref for the timeline container (to calculate day width in px)
  const timelineContainerRef = useRef<HTMLDivElement>(null)

  // Drag and Resize Interaction State
  const [dragState, setDragState] = useState<{
    item: ContentItem
    mode: 'move' | 'resize-left' | 'resize-right'
    startX: number
    initialStartDate: string
    initialDueDate: string
    deltaDays: number
  } | null>(null)

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
      const assigneeKey = (item.assigned_to_name || item.assigned_to_id || '').trim().toLowerCase()
      if (!assigneeKey || assigneeKey === 'unassigned') return
      if (!byAssignee[assigneeKey]) byAssignee[assigneeKey] = []
      byAssignee[assigneeKey].push(item)
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

  // Filter items (Search only; unwanted filters removed)
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    const q = searchQuery.toLowerCase()
    return items.filter((item) => {
      const matchesTitle = item.title.toLowerCase().includes(q)
      const matchesAssignee = (item.assigned_to_name || '').toLowerCase().includes(q)
      const matchesType = (item.content_type || '').toLowerCase().includes(q)
      return matchesTitle || matchesAssignee || matchesType
    })
  }, [items, searchQuery])

  // Global mousemove & mouseup listeners for drag/resize
  useEffect(() => {
    if (!dragState) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineContainerRef.current) return
      const rect = timelineContainerRef.current.getBoundingClientRect()
      const dayWidthPx = rect.width / totalDays
      const deltaPx = e.clientX - dragState.startX
      const deltaDays = Math.round(deltaPx / (dayWidthPx > 0 ? dayWidthPx : 30))

      setDragState((prev) => (prev ? { ...prev, deltaDays } : null))
    }

    const handleMouseUp = () => {
      if (!dragState) return

      const { item, mode, initialStartDate, initialDueDate, deltaDays } = dragState
      setDragState(null)

      if (deltaDays === 0) {
        // Was a simple click without drag
        if (onItemClick) {
          onItemClick(item)
        }
        return
      }

      let newStartDate = initialStartDate
      let newDueDate = initialDueDate

      if (mode === 'move') {
        newStartDate = dayjs(initialStartDate).add(deltaDays, 'day').format('YYYY-MM-DD')
        newDueDate = dayjs(initialDueDate).add(deltaDays, 'day').format('YYYY-MM-DD')
      } else if (mode === 'resize-left') {
        newStartDate = dayjs(initialStartDate).add(deltaDays, 'day').format('YYYY-MM-DD')
        // Ensure start date cannot exceed due date
        if (dayjs(newStartDate).isAfter(dayjs(initialDueDate))) {
          newStartDate = initialDueDate
        }
      } else if (mode === 'resize-right') {
        newDueDate = dayjs(initialDueDate).add(deltaDays, 'day').format('YYYY-MM-DD')
        // Ensure due date cannot precede start date
        if (dayjs(newDueDate).isBefore(dayjs(initialStartDate))) {
          newDueDate = initialStartDate
        }
      }

      if (onDateChange) {
        onDateChange(item.id, newStartDate, newDueDate)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState, totalDays, onDateChange, onItemClick])

  // Start drag interaction
  const handleStartBarInteraction = (
    e: React.MouseEvent,
    item: ContentItem,
    mode: 'move' | 'resize-left' | 'resize-right'
  ) => {
    e.preventDefault()
    e.stopPropagation()

    const todayDefault = dayjs().format('YYYY-MM-DD')
    const itemStart = item.start_date || (item.created_at ? item.created_at.slice(0, 10) : todayDefault)
    const itemDue = item.due_date || dayjs(itemStart).add(3, 'day').format('YYYY-MM-DD')

    setDragState({
      item,
      mode,
      startX: e.clientX,
      initialStartDate: itemStart,
      initialDueDate: itemDue,
      deltaDays: 0,
    })
  }

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
        return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[9px] px-1.5 py-0">Med</Badge>
      case 'Low':
        return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px] px-1.5 py-0">Low</Badge>
      default:
        return null
    }
  }

  // Step Month / Timeline Window
  const stepMonth = (offset: number) => {
    setCurrentDate((prev) => prev.add(offset, 'month'))
  }

  return (
    <div className="space-y-4">
      {/* Gantt Header & Controls Bar */}
      <div className="p-4 bg-card border border-border rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        {/* Left: Date Navigator & Horizontal Navigation */}
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

          {/* View Zoom Toggle (14 Days vs Full Month) */}
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

        {/* Right: Search Input */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search schedule..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/30 border-border"
            />
          </div>
        </div>
      </div>

      {/* Gantt Chart Container */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
            {/* Header: Task Metadata on Left (340px), Timeline Grid on Right */}
            <div className="flex border-b border-border bg-muted/30 text-[11px] font-semibold text-muted-foreground">
              {/* Left Column Header */}
              <div className="w-[340px] shrink-0 p-3 border-r border-border flex items-center justify-between">
                <span>Deliverable & Assignee</span>
                <span>Schedule & Duration</span>
              </div>

              {/* Right Column Header: Days */}
              <div ref={timelineContainerRef} className="flex-1 flex">
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
                  // Check if this item is currently being dragged or resized
                  const isDraggingThis = dragState?.item.id === item.id
                  const deltaDays = isDraggingThis ? dragState.deltaDays : 0

                  // Calculate start & due relative to timeline range with safe local date parsing
                  let rawStart = dayjs(
                    item.start_date
                      ? item.start_date.slice(0, 10)
                      : item.created_at
                      ? item.created_at.slice(0, 10)
                      : rangeStart.format('YYYY-MM-DD')
                  ).startOf('day')
                  let rawDue = item.due_date
                    ? dayjs(item.due_date.slice(0, 10)).startOf('day')
                    : rawStart.add(3, 'day')

                  // Apply drag / resize delta preview
                  if (isDraggingThis) {
                    if (dragState.mode === 'move') {
                      rawStart = rawStart.add(deltaDays, 'day')
                      rawDue = rawDue.add(deltaDays, 'day')
                    } else if (dragState.mode === 'resize-left') {
                      rawStart = rawStart.add(deltaDays, 'day')
                      if (rawStart.isAfter(rawDue)) rawStart = rawDue
                    } else if (dragState.mode === 'resize-right') {
                      rawDue = rawDue.add(deltaDays, 'day')
                      if (rawDue.isBefore(rawStart)) rawDue = rawStart
                    }
                  }

                  const totalDurationDays = Math.max(1, rawDue.diff(rawStart, 'day') + 1)
                  const diffStart = rawStart.diff(rangeStart, 'day')

                  // Percentage placement within timeline
                  const startOffset = Math.max(0, diffStart)
                  const visibleDuration = Math.min(
                    totalDays - startOffset,
                    totalDurationDays - (diffStart < 0 ? Math.abs(diffStart) : 0)
                  )

                  const leftPercent = Math.min(100, Math.max(0, (startOffset / totalDays) * 100))
                  const widthPercent = Math.min(100 - leftPercent, Math.max(2.5, (visibleDuration / totalDays) * 100))

                  const isVisible = diffStart < totalDays && rawDue.diff(rangeStart, 'day') >= 0

                  const progress = typeof item.progress === 'number'
                    ? item.progress
                    : item.status === 'Completed' || item.status === 'Published' || item.status === 'Approved'
                    ? 100
                    : item.status === 'In Review'
                    ? 75
                    : item.status === 'In Progress'
                    ? 40
                    : 0

                  const isOverdue = computeDeadlineCategory(item.due_date, item.status) === 'Overdue'
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

                  // Match assigned employee for inline dropdown
                  const matchingEmp = employees.find(
                    (e) =>
                      e.id === item.assigned_to_id ||
                      (e.name &&
                        item.assigned_to_name &&
                        e.name.toLowerCase() === item.assigned_to_name.toLowerCase())
                  )
                  const selectedEmpId = matchingEmp ? matchingEmp.id : (item.assigned_to_id || '')

                  return (
                    <div
                      key={item.id}
                      className="flex hover:bg-muted/20 transition-colors group"
                    >
                      {/* Left: Metadata info (340px) */}
                      <div
                        className="w-[340px] shrink-0 p-3 border-r border-border flex flex-col justify-between space-y-1.5"
                      >
                        {/* Top: Badges and In-Place Status Selector */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            onClick={() => onItemClick && onItemClick(item)}
                            className="text-[10px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 hover:bg-primary/20 cursor-pointer transition-colors"
                            title="Click to view task details"
                          >
                            {item.id}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {item.content_type || 'Content'}
                          </span>
                          {getPriorityBadge(item.priority)}

                          {/* In-place Status Selector */}
                          <div onClick={(e) => e.stopPropagation()} className="inline-block">
                            <select
                              value={item.status}
                              onChange={(e) => {
                                e.stopPropagation()
                                if (onStatusChange) {
                                  onStatusChange(item.id, e.target.value as ContentStatus)
                                }
                              }}
                              className={cn(
                                "text-[9px] font-semibold px-1 py-0.5 rounded border outline-none cursor-pointer transition-colors",
                                item.status === 'Completed' || item.status === 'Published' || item.status === 'Approved'
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                  : item.status === 'In Review'
                                  ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                                  : item.status === 'In Progress' || item.status === 'Changes Requested'
                                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                  : "bg-muted text-muted-foreground border-border"
                              )}
                              title="Change task status"
                            >
                              <option value="To Do" className="bg-popover text-popover-foreground">To Do</option>
                              <option value="In Progress" className="bg-popover text-popover-foreground">In Progress</option>
                              <option value="In Review" className="bg-popover text-popover-foreground">In Review</option>
                              <option value="Completed" className="bg-popover text-popover-foreground">Completed</option>
                            </select>
                          </div>

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

                        {/* Title & Edit Button */}
                        <div className="flex items-center justify-between gap-1">
                          <h4
                            onClick={() => onItemClick && onItemClick(item)}
                            className="text-xs font-bold text-foreground truncate hover:text-primary cursor-pointer transition-colors flex-1"
                            title={item.title}
                          >
                            {item.title}
                          </h4>
                          {onEditItem && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onEditItem(item)
                              }}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                              title="Edit task details"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Assignee Reassignment & Timeline Dates */}
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5 gap-2">
                          <div className="flex items-center gap-1.5 min-w-0" onClick={(e) => e.stopPropagation()}>
                            <User className="w-3 h-3 text-primary shrink-0" />
                            <select
                              value={selectedEmpId}
                              onChange={(e) => {
                                e.stopPropagation()
                                if (onReassignTask) {
                                  onReassignTask(item.id, e.target.value)
                                }
                              }}
                              className="text-[11px] font-medium bg-muted/40 hover:bg-muted text-foreground border border-border/60 hover:border-border rounded px-1.5 py-0.5 outline-none cursor-pointer max-w-[130px] truncate transition-colors"
                              title="Change assigned employee"
                            >
                              <option value="" className="bg-popover text-popover-foreground">
                                {item.assigned_to_name && !employees.some((e) => e.id === item.assigned_to_id)
                                  ? item.assigned_to_name
                                  : 'Unassigned'}
                              </option>
                              {employees.map((emp) => (
                                <option key={emp.id} value={emp.id} className="bg-popover text-popover-foreground">
                                  {emp.name || (emp as any).employee_name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div
                            onClick={() => onItemClick && onItemClick(item)}
                            className="flex items-center gap-1.5 font-mono text-[10px] shrink-0 cursor-pointer hover:text-foreground transition-colors"
                            title={`Duration: ${totalDurationDays} days (${rawStart.format('DD MMM YYYY')} – ${rawDue.format('DD MMM YYYY')})`}
                          >
                            <span className="font-semibold text-foreground/80">{totalDurationDays}d</span>
                            <span>&bull;</span>
                            <span>
                              {rawStart.format('DD MMM')} &rarr; {rawDue.format('DD MMM')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Gantt Bar Timeline Area */}
                      <div
                        className="flex-1 relative flex items-center min-h-[58px]"
                      >
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

                        {/* Interactive Gantt Bar (Drag to Shift Dates & Resize Handles) */}
                        {isVisible ? (
                          <div
                            className={cn(
                              "absolute z-10 h-7 rounded-lg shadow-xs transition-all flex items-center border border-white/10 group/bar select-none",
                              isDraggingThis
                                ? "ring-2 ring-primary brightness-110 shadow-md cursor-grabbing"
                                : "cursor-grab hover:brightness-110"
                            )}
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                            }}
                            onMouseDown={(e) => handleStartBarInteraction(e, item, 'move')}
                            title={`${item.title} | ${rawStart.format('DD MMM')} → ${rawDue.format('DD MMM')} | Drag center to move, drag edges to resize`}
                          >
                            {/* Left Resize Handle */}
                            <div
                              className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-white/40 z-30 flex items-center justify-center transition-colors rounded-l-lg"
                              onMouseDown={(e) => handleStartBarInteraction(e, item, 'resize-left')}
                              title="Drag to adjust Start Date"
                            />

                            {/* Gradient Background */}
                            <div className={cn("absolute inset-0 bg-gradient-to-r rounded-lg", barGradient, isOverdue && "ring-2 ring-rose-500")} />

                            {/* Inner Progress Shading */}
                            <div
                              className="absolute left-0 top-0 bottom-0 bg-black/25 rounded-l-lg transition-all"
                              style={{ width: `${progress}%` }}
                            />

                            {/* Text Label on Bar */}
                            <span className="relative z-10 text-[11px] font-bold text-white truncate drop-shadow-sm flex items-center gap-1.5 px-3 pointer-events-none">
                              <span>{item.title}</span>
                              <span className="text-[9px] opacity-80 font-mono">({progress}%)</span>
                            </span>

                            {/* Live Date Preview Tooltip during Drag */}
                            {isDraggingThis && deltaDays !== 0 && (
                              <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-40 px-2 py-0.5 rounded bg-black/90 text-white text-[10px] font-mono whitespace-nowrap shadow-lg border border-border">
                                {rawStart.format('DD MMM')} &rarr; {rawDue.format('DD MMM')} ({totalDurationDays}d)
                              </div>
                            )}

                            {/* Right Resize Handle */}
                            <div
                              className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-white/40 z-30 flex items-center justify-center transition-colors rounded-r-lg"
                              onMouseDown={(e) => handleStartBarInteraction(e, item, 'resize-right')}
                              title="Drag to adjust Deadline"
                            />
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground px-4 flex items-center gap-2">
                            <span className="italic">
                              Scheduled for {rawStart.format('MMM YYYY')} ({rawStart.format('DD MMM')} – {rawDue.format('DD MMM')})
                            </span>
                            <button
                              type="button"
                              onClick={() => setCurrentDate(rawStart)}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 hover:bg-primary/20 text-primary transition-colors flex items-center gap-1"
                              title={`Jump timeline to ${rawStart.format('MMMM YYYY')}`}
                            >
                              <Calendar className="w-3 h-3" />
                              <span>Jump to {rawStart.format('MMM YYYY')}</span>
                            </button>
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
          <div className="flex items-center gap-4 flex-wrap text-[11px]">
            <span className="font-semibold text-foreground">Timeline Guide:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-zinc-600 to-zinc-500 inline-block" />
              <span>To Do</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-amber-600 to-orange-500 inline-block" />
              <span>In Progress</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-indigo-600 to-violet-500 inline-block" />
              <span>In Review</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-emerald-600 to-teal-500 inline-block" />
              <span>Completed</span>
            </span>
          </div>

          <div className="text-[11px] text-muted-foreground italic flex items-center gap-1">
            <span>Tip: Drag task bars to shift dates; drag edges to adjust start/deadlines.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
