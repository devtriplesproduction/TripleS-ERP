'use client'

import React, { useState, useMemo } from 'react'
import {
  Calendar as CalendarIcon,
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
  ArrowRight,
  Eye,
  Check,
  CalendarDays
} from 'lucide-react'
import { ContentItem, ContentStatus, ContentPriority, computeDeadlineState } from '@/types/content-management'
import { AssignableEmployee } from '@/lib/actions/team'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import isoWeek from 'dayjs/plugin/isoWeek'
import { cn } from '@/lib/utils'

dayjs.extend(isBetween)
dayjs.extend(isoWeek)

interface ContentCalendarViewProps {
  items: ContentItem[]
  employees?: AssignableEmployee[]
  onItemClick?: (item: ContentItem) => void
  onStatusChange?: (itemId: string, status: ContentStatus) => Promise<void> | void
  onDateChange?: (itemId: string, newStartDate: string, newDueDate: string) => Promise<void> | void
}

type CalendarMode = 'MONTH' | 'WEEK' | 'DAY'

export function ContentCalendarView({
  items,
  employees = [],
  onItemClick,
  onStatusChange,
  onDateChange,
}: ContentCalendarViewProps) {
  const [mode, setMode] = useState<CalendarMode>('MONTH')
  // Anchor date locked to noon (12:00:00) to eliminate any Daylight Saving Time / UTC midnight shifting
  const [currentDate, setCurrentDate] = useState<dayjs.Dayjs>(() => dayjs().hour(12).minute(0).second(0).millisecond(0))
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)

  // Search Filter
  const [searchQuery, setSearchQuery] = useState('')

  const todayStr = useMemo(() => dayjs().format('YYYY-MM-DD'), [])

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

  // Stepping navigation based on mode (preserves noon anchor)
  const stepDate = (amount: number) => {
    if (mode === 'MONTH') {
      setCurrentDate((prev) => prev.add(amount, 'month').hour(12).minute(0).second(0))
    } else if (mode === 'WEEK') {
      setCurrentDate((prev) => prev.add(amount, 'week').hour(12).minute(0).second(0))
    } else {
      setCurrentDate((prev) => prev.add(amount, 'day').hour(12).minute(0).second(0))
    }
  }

  // Display label for current anchor
  const displayLabel = useMemo(() => {
    if (mode === 'MONTH') {
      return currentDate.format('MMMM YYYY')
    } else if (mode === 'WEEK') {
      const start = currentDate.startOf('isoWeek')
      const end = currentDate.endOf('isoWeek')
      return `${start.format('D MMM')} – ${end.format('D MMM YYYY')}`
    } else {
      return currentDate.format('dddd, D MMMM YYYY')
    }
  }, [mode, currentDate])

  // Month grid calculations (immunized against DST shifts with noon anchor)
  const monthGridDays = useMemo(() => {
    const startOfMonth = currentDate.startOf('month').hour(12).minute(0).second(0).millisecond(0)
    const startDayOfWeek = startOfMonth.day() // 0 = Sunday
    // Adjust to Monday start (0 = Mon, 6 = Sun)
    const offset = (startDayOfWeek + 6) % 7

    const startDate = startOfMonth.subtract(offset, 'day').hour(12).minute(0).second(0).millisecond(0)
    const days: dayjs.Dayjs[] = []
    for (let i = 0; i < 42; i++) {
      days.push(startDate.add(i, 'day').hour(12))
    }
    return days
  }, [currentDate])

  // Week days (7 days Mon to Sun, immunized against DST shifts with noon anchor)
  const weekDays = useMemo(() => {
    const startOfWeek = currentDate.startOf('isoWeek').hour(12).minute(0).second(0).millisecond(0)
    const list: dayjs.Dayjs[] = []
    for (let i = 0; i < 7; i++) {
      list.push(startOfWeek.add(i, 'day').hour(12))
    }
    return list
  }, [currentDate])

  // Check if a task is scheduled on a given date (matches exact due_date/deadline or start_date)
  const getTasksForDate = (day: dayjs.Dayjs): ContentItem[] => {
    const dateStr = day.format('YYYY-MM-DD')
    return filteredItems.filter((item) => {
      // Direct YYYY-MM-DD string match without timezone skew
      const taskDue = item.due_date ? item.due_date.substring(0, 10) : null
      if (taskDue) {
        return taskDue === dateStr
      }
      const taskStart = item.start_date ? item.start_date.substring(0, 10) : null
      if (taskStart) {
        return taskStart === dateStr
      }
      return false
    })
  }

  // Handle dropping a task onto a specific calendar date with exact target assignment
  const handleTaskDropOnDate = (taskId: string, targetDateStr: string) => {
    if (!taskId || !targetDateStr || !onDateChange) return
    // Validate target date string format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDateStr)) return

    const task = items.find((t) => t.id === taskId)
    if (!task) return

    // Assign the task to the exact target date where dropped (no previous/next day shifting)
    const newDueDate = targetDateStr
    const newStartDate = targetDateStr

    onDateChange(taskId, newStartDate, newDueDate)
  }

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

  // Status color pill helper
  const getStatusColor = (status: ContentStatus) => {
    switch (status) {
      case 'Completed':
      case 'Published':
      case 'Approved':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
      case 'In Review':
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/25'
      case 'In Progress':
      case 'Changes Requested':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
      case 'To Do':
      case 'Draft':
      default:
        return 'bg-zinc-700/40 text-zinc-300 border-zinc-600/50 hover:bg-zinc-700/60'
    }
  }

  return (
    <div className="space-y-4">
      {/* Calendar Controls & Navigation Bar */}
      <div className="p-3 bg-card border border-border/80 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        {/* Left: Date Navigator */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-card border border-border/80 p-0.5 rounded-lg shadow-xs">
            <button
              onClick={() => stepDate(-1)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors cursor-pointer"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-foreground font-mono whitespace-nowrap min-w-[140px] text-center">
              {displayLabel}
            </span>
            <button
              onClick={() => stepDate(1)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors cursor-pointer"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(dayjs().hour(12).minute(0).second(0).millisecond(0))}
              className="h-7 px-2.5 text-[11px] font-semibold rounded-md border-border/80 bg-card hover:bg-secondary/50 text-foreground ml-1 shadow-xs"
            >
              Today
            </Button>
          </div>

          {/* Mode Switcher: Daily vs Weekly vs Monthly */}
          <div className="flex items-center bg-card border border-border/80 p-0.5 rounded-lg shadow-xs">
            <button
              onClick={() => setMode('DAY')}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                mode === 'DAY' ? "bg-secondary text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              Daily
            </button>
            <button
              onClick={() => setMode('WEEK')}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                mode === 'WEEK' ? "bg-secondary text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              Weekly
            </button>
            <button
              onClick={() => setMode('MONTH')}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                mode === 'MONTH' ? "bg-secondary text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Right: Search Input */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search calendar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/30 border-border/80 text-foreground rounded-lg shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. MONTHLY VIEW                                           */}
      {/* ========================================================= */}
      {mode === 'MONTH' && (
        <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/30 text-center text-xs font-bold text-muted-foreground py-2.5">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span className="text-muted-foreground/60">Sat</span>
            <span className="text-muted-foreground/60">Sun</span>
          </div>

          {/* 7x6 Day Cells Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-border/60">
            {monthGridDays.map((day) => {
              const dayStr = day.format('YYYY-MM-DD')
              const isCurrentMonth = day.month() === currentDate.month()
              const isToday = dayStr === todayStr
              const isWeekend = day.day() === 0 || day.day() === 6
              const dayTasks = getTasksForDate(day)
              const isOverDrop = dragOverDate === dayStr

              return (
                <div
                  key={dayStr}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    if (dragOverDate !== dayStr) setDragOverDate(dayStr)
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget === e.target) {
                      setDragOverDate(null)
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setDragOverDate(null)
                    const taskId = e.dataTransfer.getData('text/plain')
                    handleTaskDropOnDate(taskId, dayStr)
                  }}
                  className={cn(
                    "min-h-[110px] p-2 flex flex-col justify-between transition-all",
                    !isCurrentMonth && "bg-muted/10 opacity-40",
                    isWeekend && isCurrentMonth && "bg-muted/15",
                    isToday && "bg-primary/5 ring-1 ring-inset ring-primary/40",
                    isOverDrop && "ring-2 ring-primary ring-inset bg-primary/10 shadow-inner"
                  )}
                  onClick={() => {
                    setCurrentDate(day)
                    setMode('DAY')
                  }}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between pb-1">
                    <span
                      className={cn(
                        "text-xs font-mono font-semibold w-6 h-6 rounded-full flex items-center justify-center",
                        isToday ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"
                      )}
                    >
                      {day.format('D')}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                    )}
                  </div>

                  {/* Tasks List inside Day Cell */}
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[80px]">
                    {dayTasks.slice(0, 3).map((task) => {
                      const deadlineState = computeDeadlineState(task.due_date, task.status)
                      const isOverdue = deadlineState === 'Overdue' && task.status !== 'Completed'

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation()
                            e.dataTransfer.setData('text/plain', task.id)
                            e.dataTransfer.effectAllowed = 'move'
                          }}
                          onDragEnd={() => setDragOverDate(null)}
                          onClick={(e) => {
                            e.stopPropagation()
                            onItemClick && onItemClick(task)
                          }}
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-medium border truncate cursor-grab active:cursor-grabbing transition-all flex items-center justify-between gap-1 shadow-2xs hover:scale-[1.02]",
                            getStatusColor(task.status)
                          )}
                          title={`Drag to reschedule deadline. ${task.title} (${task.status}) - ${task.assigned_to_name || 'Unassigned'}`}
                        >
                          <span className="truncate">{task.title}</span>
                          {isOverdue && <AlertTriangle className="w-2.5 h-2.5 text-rose-400 shrink-0" />}
                        </div>
                      )
                    })}
                    {dayTasks.length > 3 && (
                      <span className="text-[9px] text-primary font-semibold block text-center">
                        +{dayTasks.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. WEEKLY VIEW                                            */}
      {/* ========================================================= */}
      {mode === 'WEEK' && (
        <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
            {weekDays.map((day) => {
              const dayStr = day.format('YYYY-MM-DD')
              const isToday = dayStr === todayStr
              const isWeekend = day.day() === 0 || day.day() === 6
              const dayTasks = getTasksForDate(day)
              const isOverDrop = dragOverDate === dayStr

              return (
                <div
                  key={dayStr}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    if (dragOverDate !== dayStr) setDragOverDate(dayStr)
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget === e.target) {
                      setDragOverDate(null)
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setDragOverDate(null)
                    const taskId = e.dataTransfer.getData('text/plain')
                    handleTaskDropOnDate(taskId, dayStr)
                  }}
                  className={cn(
                    "min-h-[450px] p-3 flex flex-col space-y-2.5 transition-all",
                    isWeekend && "bg-muted/15",
                    isToday && "bg-primary/5 ring-1 ring-inset ring-primary/40",
                    isOverDrop && "ring-2 ring-primary ring-inset bg-primary/10 shadow-inner"
                  )}
                >
                  {/* Day Column Header */}
                  <div className="border-b border-border pb-2 text-center space-y-0.5">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      {day.format('ddd')}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-mono font-bold inline-block px-2 py-0.5 rounded-full",
                        isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                      )}
                    >
                      {day.format('D MMM')}
                    </span>
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {dayTasks.length === 0 ? (
                      <div className="py-8 text-center text-[11px] text-muted-foreground italic">
                        No tasks scheduled
                      </div>
                    ) : (
                      dayTasks.map((task) => {
                        const deadlineState = computeDeadlineState(task.due_date, task.status)
                        const isOverdue = deadlineState === 'Overdue' && task.status !== 'Completed'

                        return (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation()
                              e.dataTransfer.setData('text/plain', task.id)
                              e.dataTransfer.effectAllowed = 'move'
                            }}
                            onDragEnd={() => setDragOverDate(null)}
                            onClick={() => onItemClick && onItemClick(task)}
                            className="p-2.5 rounded-xl bg-card border border-border hover:border-primary/50 transition-all cursor-grab active:cursor-grabbing space-y-1.5 shadow-xs hover:shadow-sm"
                            title="Drag to reschedule to another day"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-mono font-bold text-primary px-1 py-0.2 bg-primary/10 rounded">
                                {task.id}
                              </span>
                              {getPriorityBadge(task.priority)}
                            </div>

                            <h5 className="text-xs font-bold text-foreground line-clamp-2 leading-tight">
                              {task.title}
                            </h5>

                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/60">
                              <span className="truncate max-w-[90px]">{task.assigned_to_name || 'Unassigned'}</span>
                              <Badge className={cn("text-[9px] px-1 py-0", getStatusColor(task.status))}>
                                {task.status}
                              </Badge>
                            </div>

                            {isOverdue && (
                              <div className="text-[9px] font-bold text-rose-400 flex items-center gap-1 pt-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>Deadline Passed</span>
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. DAILY VIEW                                             */}
      {/* ========================================================= */}
      {mode === 'DAY' && (
        <div className="space-y-4">
          <Card
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              const dayStr = currentDate.format('YYYY-MM-DD')
              if (dragOverDate !== dayStr) setDragOverDate(dayStr)
            }}
            onDragLeave={(e) => {
              if (e.currentTarget === e.target) {
                setDragOverDate(null)
              }
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setDragOverDate(null)
              const taskId = e.dataTransfer.getData('text/plain')
              const dayStr = currentDate.format('YYYY-MM-DD')
              handleTaskDropOnDate(taskId, dayStr)
            }}
            className={cn(
              "bg-card border-border shadow-xs transition-all",
              dragOverDate === currentDate.format('YYYY-MM-DD') && "ring-2 ring-primary ring-inset bg-primary/5"
            )}
          >
            <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm font-bold text-foreground">
                  Daily Content Schedule for {currentDate.format('dddd, D MMMM YYYY')}
                </CardTitle>
              </div>
              <Badge variant="outline" className="border-border text-xs font-mono">
                {getTasksForDate(currentDate).length} Deliverables Active
              </Badge>
            </CardHeader>

            <CardContent className="p-6">
              {getTasksForDate(currentDate).length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-sm font-semibold text-foreground">No tasks scheduled for this day.</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Use the calendar controls or view switcher to navigate across dates.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getTasksForDate(currentDate).map((task) => {
                    const deadlineState = computeDeadlineState(task.due_date, task.status)
                    const isOverdue = deadlineState === 'Overdue' && task.status !== 'Completed'

                    return (
                      <div
                        key={task.id}
                        onClick={() => onItemClick && onItemClick(task)}
                        className="p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all cursor-pointer space-y-3 shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                              {task.id}
                            </span>
                            <Badge variant="outline" className="text-[10px] border-border">
                              {task.content_type || 'Content'}
                            </Badge>
                            {getPriorityBadge(task.priority)}
                          </div>
                          <Badge className={cn("text-[10px]", getStatusColor(task.status))}>
                            {task.status}
                          </Badge>
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-foreground leading-snug">{task.title}</h4>
                          {task.summary && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                              {task.summary}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-primary" />
                            <span>{task.assigned_to_name || 'Unassigned'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Due: {task.due_date ? dayjs(task.due_date).format('DD MMM') : 'None'}</span>
                          </div>
                        </div>

                        {isOverdue && (
                          <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-semibold flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>Deadline overdue &mdash; needs immediate attention</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

