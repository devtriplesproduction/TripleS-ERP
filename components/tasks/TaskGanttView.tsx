'use client'

import React, { useState, useMemo } from 'react'
import { Task, TaskPriority, TaskStatus } from '@/types/project-management'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, AlertCircle } from 'lucide-react'
import dayjs from 'dayjs'

interface TaskGanttViewProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  canManage?: boolean
}

export function TaskGanttView({ tasks, onTaskClick }: TaskGanttViewProps) {
  // Navigation: current month anchor
  const [currentDate, setCurrentDate] = useState(() => dayjs().startOf('month'))

  const year = currentDate.year()
  const month = currentDate.month() // 0-indexed
  const daysInMonth = currentDate.daysInMonth()

  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = currentDate.date(i + 1)
      const isWeekend = d.day() === 0 || d.day() === 6
      const isToday = d.isSame(dayjs(), 'day')
      return {
        date: d,
        dayNumber: i + 1,
        dayName: d.format('dd')[0],
        isWeekend,
        isToday,
      }
    })
  }, [currentDate, daysInMonth])

  const prevMonth = () => setCurrentDate((prev) => prev.subtract(1, 'month'))
  const nextMonth = () => setCurrentDate((prev) => prev.add(1, 'month'))
  const goToToday = () => setCurrentDate(dayjs().startOf('month'))

  // Priority color accents
  const getPriorityBorder = (p: TaskPriority) => {
    switch (p) {
      case 'URGENT':
        return 'border-l-red-500'
      case 'HIGH':
        return 'border-l-orange-500'
      case 'MEDIUM':
        return 'border-l-amber-500'
      case 'LOW':
      default:
        return 'border-l-blue-500'
    }
  }

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'DONE':
        return 'bg-zinc-700/80 text-zinc-200 border-zinc-600'
      case 'IN_PROGRESS':
        return 'bg-zinc-800 text-white border-zinc-700'
      case 'IN_REVIEW':
        return 'bg-zinc-800/90 text-zinc-300 border-zinc-700'
      case 'ON_HOLD':
        return 'bg-zinc-900/90 text-zinc-400 border-zinc-800'
      case 'TODO':
      default:
        return 'bg-zinc-900 text-zinc-300 border-zinc-800'
    }
  }

  return (
    <div className="w-full bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs flex flex-col">
      {/* Gantt Header Navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/80 bg-background/50">
        <div className="flex items-center gap-2">
          <h2 className="text-sm sm:text-base font-semibold text-foreground">
            {currentDate.format('MMMM YYYY')}
          </h2>
          <span className="text-xs text-muted-foreground ml-2">
            ({tasks.length} {tasks.length === 1 ? 'task' : 'tasks'})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="h-8 px-2.5 text-xs rounded-md border-border/80 dark:border-zinc-800"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={prevMonth}
            aria-label="Previous month"
            className="h-8 w-8 rounded-md border-border/80 dark:border-zinc-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={nextMonth}
            aria-label="Next month"
            className="h-8 w-8 rounded-md border-border/80 dark:border-zinc-800"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          No tasks found matching the selected filters.
        </div>
      ) : (
        /* Scrollable Timeline Grid Container */
        <div className="overflow-x-auto custom-scrollbar">
          <div className="min-w-[900px]">
            {/* Days Header Row */}
            <div className="grid grid-cols-[260px_1fr] border-b border-border/80 bg-secondary/30 sticky top-0 z-10">
              <div className="p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r border-border/80 flex items-center">
                Task Info
              </div>
              <div
                className="grid"
                style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(32px, 1fr))` }}
              >
                {days.map((d) => (
                  <div
                    key={d.dayNumber}
                    className={`text-center py-2 border-r border-border/50 text-[11px] ${
                      d.isToday
                        ? 'bg-primary/10 text-primary font-bold'
                        : d.isWeekend
                        ? 'bg-secondary/40 text-muted-foreground/70'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <div className="font-semibold">{d.dayNumber}</div>
                    <div className="text-[9px] uppercase opacity-70">{d.dayName}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Task Rows */}
            <div className="divide-y divide-border/60">
              {tasks.map((task) => {
                // Calculate start and end column
                const taskStart = task.start_date ? dayjs(task.start_date) : null
                const taskDue = task.due_date ? dayjs(task.due_date) : null

                // Month bounds
                const monthStart = currentDate.startOf('month')
                const monthEnd = currentDate.endOf('month')

                let startDay = 1
                let spanDays = 1
                let hasVisibleBar = false

                if (taskStart || taskDue) {
                  const effectiveStart = taskStart || taskDue!
                  const effectiveEnd = taskDue || taskStart!

                  // Check if this task overlaps with the current month
                  if (effectiveStart.isBefore(monthEnd.add(1, 'day')) && effectiveEnd.isAfter(monthStart.subtract(1, 'day'))) {
                    hasVisibleBar = true
                    const clampedStart = effectiveStart.isBefore(monthStart) ? 1 : effectiveStart.date()
                    const clampedEnd = effectiveEnd.isAfter(monthEnd) ? daysInMonth : effectiveEnd.date()

                    startDay = clampedStart
                    spanDays = Math.max(1, clampedEnd - clampedStart + 1)
                  }
                } else {
                  // If no dates specified, show a 1-day fallback on day 1 with dashed styling
                  hasVisibleBar = true
                  startDay = 1
                  spanDays = 2
                }

                return (
                  <div
                    key={task.id}
                    className="grid grid-cols-[260px_1fr] hover:bg-secondary/20 transition-colors group cursor-pointer"
                    onClick={() => onTaskClick(task)}
                  >
                    {/* Left: Task Meta */}
                    <div className="p-3 border-r border-border/80 flex flex-col justify-center gap-1 min-w-0 bg-background/40">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground bg-secondary/80 px-1 rounded">
                          {task.task_id_display}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 border-border/60 uppercase"
                        >
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {task.title}
                      </div>
                    </div>

                    {/* Right: Gantt Timeline Row */}
                    <div
                      className="grid relative items-center py-2 px-1"
                      style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(32px, 1fr))` }}
                    >
                      {/* Vertical grid lines background */}
                      <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(32px, 1fr))` }}>
                        {days.map((d) => (
                          <div
                            key={d.dayNumber}
                            className={`border-r border-border/30 h-full ${
                              d.isToday ? 'bg-primary/5' : d.isWeekend ? 'bg-secondary/20' : ''
                            }`}
                          />
                        ))}
                      </div>

                      {/* Timeline Bar */}
                      {hasVisibleBar && (
                        <div
                          style={{
                            gridColumnStart: startDay,
                            gridColumnEnd: `span ${spanDays}`,
                          }}
                          className={`relative z-1 h-7 rounded-md border-l-4 border px-2 flex items-center justify-between text-xs font-medium truncate shadow-xs transition-transform group-hover:scale-[1.01] ${getPriorityBorder(
                            task.priority
                          )} ${getStatusColor(task.status)}`}
                          title={`${task.title} (${task.start_date || 'No start'} - ${task.due_date || 'No due'})`}
                        >
                          <span className="truncate pr-1 text-[11px] font-medium text-foreground">
                            {task.title}
                          </span>
                          {task.due_date && (
                            <span className="text-[9px] text-muted-foreground shrink-0 opacity-80 font-mono">
                              {dayjs(task.due_date).format('DD MMM')}
                            </span>
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
    </div>
  )
}
