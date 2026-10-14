'use client'

import React, { useState, useMemo } from 'react'
import { Task, TaskPriority, TaskStatus } from '@/types/project-management'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react'
import dayjs from 'dayjs'

interface TaskCalendarViewProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  canManage?: boolean
}

export function TaskCalendarView({ tasks, onTaskClick }: TaskCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => dayjs().startOf('month'))

  const year = currentDate.year()
  const month = currentDate.month()

  const prevMonth = () => setCurrentDate((prev) => prev.subtract(1, 'month'))
  const nextMonth = () => setCurrentDate((prev) => prev.add(1, 'month'))
  const goToToday = () => setCurrentDate(dayjs().startOf('month'))

  // Generate 42 calendar grid cells (6 rows of 7 days) starting on Monday
  const calendarCells = useMemo(() => {
    const startOfMonth = currentDate.startOf('month')
    // Monday = 1, Sunday = 0
    const dayOfWeek = startOfMonth.day()
    const offsetDays = (dayOfWeek + 6) % 7 // Monday becomes 0, Sunday becomes 6
    const gridStart = startOfMonth.subtract(offsetDays, 'day')

    return Array.from({ length: 42 }, (_, i) => {
      const date = gridStart.add(i, 'day')
      const isCurrentMonth = date.month() === month
      const isToday = date.isSame(dayjs(), 'day')
      const isWeekend = date.day() === 0 || date.day() === 6
      const dateString = date.format('YYYY-MM-DD')

      // Find tasks whose due_date or start_date matches this date
      const dayTasks = tasks.filter((t) => {
        if (t.due_date && t.due_date.substring(0, 10) === dateString) return true
        if (!t.due_date && t.start_date && t.start_date.substring(0, 10) === dateString) return true
        return false
      })

      return {
        date,
        dayNumber: date.date(),
        isCurrentMonth,
        isToday,
        isWeekend,
        tasks: dayTasks,
      }
    })
  }, [currentDate, month, tasks])

  const getPriorityDot = (p: TaskPriority) => {
    switch (p) {
      case 'URGENT':
        return 'bg-red-500'
      case 'HIGH':
        return 'bg-orange-500'
      case 'MEDIUM':
        return 'bg-amber-500'
      case 'LOW':
      default:
        return 'bg-zinc-400'
    }
  }

  return (
    <div className="w-full bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs flex flex-col">
      {/* Calendar Header Navigation */}
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

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 border-b border-border/80 bg-secondary/30 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2.5">
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
        <div>Sun</div>
      </div>

      {/* 42-Cell Month Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-border/60 min-h-[500px]">
        {calendarCells.map((cell, idx) => {
          const visibleTasks = cell.tasks.slice(0, 3)
          const remainingCount = cell.tasks.length - 3

          return (
            <div
              key={idx}
              className={`p-1.5 sm:p-2 min-h-[90px] sm:min-h-[110px] flex flex-col justify-start transition-colors ${
                !cell.isCurrentMonth
                  ? 'bg-secondary/10 opacity-40'
                  : cell.isWeekend
                  ? 'bg-secondary/20'
                  : 'bg-card'
              }`}
            >
              {/* Day Number Row */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded-full inline-flex items-center justify-center ${
                    cell.isToday
                      ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                      : 'text-foreground/80'
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {cell.tasks.length > 0 && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {cell.tasks.length}
                  </span>
                )}
              </div>

              {/* Task Chips List */}
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[85px] custom-scrollbar">
                {visibleTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onTaskClick(task)}
                    className="w-full text-left px-1.5 py-1 rounded bg-secondary/70 hover:bg-secondary text-foreground text-[11px] truncate flex items-center gap-1.5 transition-colors border border-border/40 hover:border-foreground/30 group"
                    title={`${task.title} - ${task.status.replace('_', ' ')} (${task.priority})`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${getPriorityDot(
                        task.priority
                      )}`}
                    />
                    <span className="truncate font-medium">{task.title}</span>
                  </button>
                ))}

                {remainingCount > 0 && (
                  <span className="text-[10px] text-muted-foreground font-medium pl-1">
                    +{remainingCount} more
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
