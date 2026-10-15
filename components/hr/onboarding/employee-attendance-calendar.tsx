'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Briefcase,
  Home,
  CalendarDays,
  UserX,
  AlertCircle,
  Info,
  Loader2,
  FileText,
  RotateCcw,
  Sparkles,
  CheckCircle2
} from 'lucide-react'
import { Employee } from '@/lib/supabase/types'
import { getEmployeeAttendance, DerivedAttendance, AttendanceStatus } from '@/lib/actions/attendance'
import { calculateAttendanceSummary } from '@/lib/utils/attendance-summary'
import { getISTDateString, formatMinutesAsHHMM, formatOfficeHoursAsHHMM } from '@/lib/utils/time'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface EmployeeAttendanceCalendarProps {
  employee: Employee
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export const getAttendanceStatusConfig = (status: string, holidayName?: string) => {
  switch (status) {
    case 'Present':
      return {
        label: 'Present',
        shortLabel: 'Present',
        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
        dot: 'bg-emerald-400',
        color: 'text-emerald-400'
      }
    case 'WFH':
      return {
        label: 'Work From Home',
        shortLabel: 'WFH',
        bg: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
        dot: 'bg-blue-400',
        color: 'text-blue-400'
      }
    case 'Leave':
    case 'Unpaid Leave':
      return {
        label: 'Leave',
        shortLabel: 'Leave',
        bg: 'bg-orange-500/10 text-orange-400 border-orange-500/25',
        dot: 'bg-orange-400',
        color: 'text-orange-400'
      }
    case 'Half Day':
    case 'Half Day + Present':
    case 'Half Day + WFH':
      return {
        label: 'Half Day',
        shortLabel: 'Half Day',
        bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25',
        dot: 'bg-yellow-400',
        color: 'text-yellow-400'
      }
    case 'Absent':
      return {
        label: 'Absent',
        shortLabel: 'Absent',
        bg: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
        dot: 'bg-rose-400',
        color: 'text-rose-400'
      }
    case 'Pending':
      return {
        label: 'Pending EOD',
        shortLabel: 'Pending',
        bg: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
        dot: 'bg-amber-400',
        color: 'text-amber-400'
      }
    case 'Holiday':
      if (holidayName === 'Sunday') {
        return {
          label: 'Sunday',
          shortLabel: 'Sunday',
          bg: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
          dot: 'bg-zinc-400',
          color: 'text-zinc-400'
        }
      }
      return {
        label: holidayName ? `Holiday (${holidayName})` : 'Holiday',
        shortLabel: 'Holiday',
        bg: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
        dot: 'bg-slate-300',
        color: 'text-slate-300'
      }
    case 'Holiday Work':
      return {
        label: 'Holiday Work',
        shortLabel: 'Holiday Work',
        bg: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
        dot: 'bg-purple-400',
        color: 'text-purple-400'
      }
    default:
      return {
        label: status || 'Not Marked',
        shortLabel: status || 'Not Marked',
        bg: 'bg-transparent text-muted-foreground border-transparent',
        dot: 'bg-muted-foreground',
        color: 'text-muted-foreground'
      }
  }
}

export function EmployeeAttendanceCalendar({ employee }: EmployeeAttendanceCalendarProps) {
  // Current IST business date
  const todayIST = getISTDateString()
  const [todayYear, todayMonth] = todayIST.split('-').map(Number)

  const [currentYear, setCurrentYear] = useState<number>(todayYear)
  const [currentMonth, setCurrentMonth] = useState<number>(todayMonth)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayIST)

  const [attendance, setAttendance] = useState<DerivedAttendance[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Generate Year options around current year (e.g. 2023 to 2030)
  const years = useMemo(() => {
    const list: number[] = []
    const startYear = Math.min(todayYear - 3, 2023)
    const endYear = Math.max(todayYear + 3, 2030)
    for (let y = startYear; y <= endYear; y++) {
      list.push(y)
    }
    return list
  }, [todayYear])

  // Fetch attendance for the selected employee, month, and year
  const fetchAttendance = useCallback(async (empId: string, m: number, y: number) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getEmployeeAttendance(empId, m, y)
      setAttendance(data || [])
    } catch (err: any) {
      console.error('Error fetching employee attendance:', err)
      setError(err.message || 'Failed to load attendance records.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (employee?.id) {
      fetchAttendance(employee.id, currentMonth, currentYear)
    }
  }, [employee?.id, currentMonth, currentYear, fetchAttendance])

  // Month navigation helpers that also sync selected date
  const changeMonthYear = (newMonth: number, newYear: number) => {
    setCurrentMonth(newMonth)
    setCurrentYear(newYear)
    if (newYear === todayYear && newMonth === todayMonth) {
      setSelectedDateStr(todayIST)
    } else {
      setSelectedDateStr(`${newYear}-${String(newMonth).padStart(2, '0')}-01`)
    }
  }

  const handlePrevMonth = () => {
    let newM = currentMonth - 1
    let newY = currentYear
    if (newM === 0) {
      newM = 12
      newY -= 1
    }
    changeMonthYear(newM, newY)
  }

  const handleNextMonth = () => {
    let newM = currentMonth + 1
    let newY = currentYear
    if (newM === 13) {
      newM = 1
      newY += 1
    }
    changeMonthYear(newM, newY)
  }

  const handleToday = () => {
    const [y, m] = todayIST.split('-').map(Number)
    changeMonthYear(m, y)
    setSelectedDateStr(todayIST)
  }

  // Monday-Sunday calendar grid construction
  const calendarCells = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
    // In JS: 0=Sun, 1=Mon, ..., 6=Sat
    const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay()
    // Monday-start offset: Mon(1)->0, Tue(2)->1, ..., Sun(0)->6
    const mondayStartOffset = (firstDayIndex + 6) % 7

    const cells: (number | null)[] = []
    for (let i = 0; i < mondayStartOffset; i++) {
      cells.push(null)
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(d)
    }
    const totalCells = Math.ceil(cells.length / 7) * 7
    while (cells.length < totalCells) {
      cells.push(null)
    }
    return cells
  }, [currentYear, currentMonth])

  // Attendance lookup map by date string (YYYY-MM-DD)
  const attendanceMap = useMemo(() => {
    const map = new Map<string, DerivedAttendance>()
    attendance.forEach(a => {
      map.set(a.date, a)
    })
    return map
  }, [attendance])

  // Selected date's record
  const selectedAtt = useMemo(() => {
    return attendanceMap.get(selectedDateStr)
  }, [attendanceMap, selectedDateStr])

  // Monthly Summary Insights
  const summary = useMemo(() => {
    return calculateAttendanceSummary(attendance)
  }, [attendance])

  // Check if month has any active records
  const hasMonthlyActivity = useMemo(() => {
    return attendance.some(a =>
      a.status === 'Present' ||
      a.status === 'Holiday Work' ||
      a.status === 'WFH' ||
      a.status === 'Leave' ||
      a.status === 'Pending' ||
      a.status === 'Half Day' ||
      a.status === 'Half Day + Present' ||
      a.status === 'Half Day + WFH' ||
      a.status === 'Absent'
    )
  }, [attendance])

  // Formatted selected date label
  const formattedSelectedDate = useMemo(() => {
    if (!selectedDateStr) return ''
    try {
      const [y, m, d] = selectedDateStr.split('-').map(Number)
      const dateObj = new Date(y, m - 1, d)
      return dateObj.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return selectedDateStr
    }
  }, [selectedDateStr])

  return (
    <div className="space-y-5">
      {/* Top Header Card: Employee Info & Navigation Controls */}
      <div className="bg-card/40 dark:bg-zinc-950/40 border border-border/40 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Employee Meta */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base md:text-lg text-foreground leading-tight truncate">
                {employee.first_name} {employee.last_name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                <span className="font-mono">{employee.employee_id_number || 'N/A'}</span>
                {employee.department && (
                  <>
                    <span>•</span>
                    <span className="truncate">{employee.department}</span>
                  </>
                )}
                {employee.designation && (
                  <>
                    <span>•</span>
                    <span className="truncate">{employee.designation}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Month Selector */}
            <Select
              value={String(currentMonth)}
              onValueChange={val => changeMonthYear(Number(val), currentYear)}
            >
              <SelectTrigger className="h-8 w-[125px] text-xs bg-card/60 dark:bg-zinc-900/60 border-border/60">
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(m => (
                  <SelectItem key={m.value} value={String(m.value)} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Year Selector */}
            <Select
              value={String(currentYear)}
              onValueChange={val => changeMonthYear(currentMonth, Number(val))}
            >
              <SelectTrigger className="h-8 w-[95px] text-xs bg-card/60 dark:bg-zinc-900/60 border-border/60 font-mono">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={String(y)} className="text-xs font-mono">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Prev & Next Buttons */}
            <div className="flex items-center border border-border/60 rounded-xl bg-card/60 dark:bg-zinc-900/60 overflow-hidden">
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Previous Month"
                className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-border/60" />
              <button
                type="button"
                onClick={handleNextMonth}
                title="Next Month"
                className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Today Button */}
            <button
              type="button"
              onClick={handleToday}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-border/60 hover:border-border/90 bg-card/60 dark:bg-zinc-900/60 hover:bg-muted/40 text-xs font-medium text-foreground transition-all cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3 h-3 text-muted-foreground" />
              <span>Today</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Calendar on Left, Details & Insights on Right */}
      <div className="flex flex-col xl:flex-row gap-5 items-start">
        {/* Left Column: Calendar & Legend */}
        <div className="flex-1 w-full space-y-4">
          <div className="bg-card/40 dark:bg-zinc-950/40 border border-border/40 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-sm overflow-hidden">
            {/* Header info / Month Title */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg text-foreground">
                  {MONTHS[currentMonth - 1]?.label} {currentYear}
                </span>
                {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-2" />}
              </div>

              {/* Status Indicator for Current Month */}
              {!loading && !hasMonthlyActivity && (
                <span className="text-[11px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md border border-border/40">
                  No activity records for this month
                </span>
              )}
            </div>

            {/* Error Message if fetch failed */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fetchAttendance(employee.id, currentMonth, currentYear)}
                  className="h-7 text-xs"
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Monday - Sunday Calendar Grid */}
            <div className="border border-border/40 dark:border-zinc-800/80 rounded-xl overflow-hidden bg-card/20">
              {/* Weekday Header */}
              <div className="grid grid-cols-7 border-b border-border/40 dark:border-zinc-800/80 bg-muted/20 dark:bg-zinc-900/40">
                {WEEKDAYS.map((day, idx) => (
                  <div
                    key={day}
                    className={cn(
                      "py-2.5 text-center text-[11px] font-semibold tracking-wider select-none",
                      idx === 6 ? "text-muted-foreground/70" : "text-muted-foreground"
                    )}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Date Cells */}
              <div className="grid grid-cols-7 divide-x divide-y divide-border/30 dark:divide-zinc-800/60">
                {calendarCells.map((dayNum, idx) => {
                  if (!dayNum) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="min-h-[85px] sm:min-h-[92px] bg-muted/5 dark:bg-zinc-950/20"
                      />
                    )
                  }

                  const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                  const att = attendanceMap.get(dateStr)
                  const isSelected = selectedDateStr === dateStr
                  const isToday = todayIST === dateStr
                  const isSunday = new Date(currentYear, currentMonth - 1, dayNum).getDay() === 0

                  const statusConfig = att && att.status ? getAttendanceStatusConfig(att.status, att.holiday?.name) : null
                  const shouldShowBadge = att && att.status !== 'Not Marked' && att.status !== 'Weekend'

                  return (
                    <div
                      key={dateStr}
                      onClick={() => setSelectedDateStr(dateStr)}
                      className={cn(
                        "min-h-[85px] sm:min-h-[92px] p-2 sm:p-2.5 flex flex-col justify-between transition-all duration-150 cursor-pointer relative select-none group",
                        isSelected
                          ? "bg-muted/60 dark:bg-zinc-900/80 ring-2 ring-foreground/70 dark:ring-zinc-400 ring-inset z-10"
                          : isToday
                          ? "bg-muted/30 dark:bg-zinc-900/40 ring-1 ring-border/80 dark:ring-zinc-700 ring-inset hover:bg-muted/50"
                          : isSunday
                          ? "bg-muted/10 dark:bg-zinc-950/30 hover:bg-muted/30 dark:hover:bg-zinc-900/40"
                          : "hover:bg-muted/30 dark:hover:bg-zinc-900/40"
                      )}
                    >
                      {/* Top Row: Date Number & Today Indicator */}
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={cn(
                            "text-xs font-semibold leading-none",
                            isToday
                              ? "text-foreground font-bold"
                              : isSelected
                              ? "text-foreground font-bold"
                              : isSunday
                              ? "text-muted-foreground/80"
                              : "text-foreground/90"
                          )}
                        >
                          {dayNum}
                        </span>

                        {isToday && (
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-md bg-foreground text-background">
                            Today
                          </span>
                        )}
                      </div>

                      {/* Bottom / Middle: Status Pill Badge */}
                      <div className="mt-auto pt-1 w-full flex justify-center">
                        {shouldShowBadge && statusConfig ? (
                          <div
                            title={
                              att.holiday?.name
                                ? `${statusConfig.label} (${att.holiday.name})`
                                : att.leave?.reason
                                ? `${statusConfig.label} - ${att.leave.reason}`
                                : statusConfig.label
                            }
                            className={cn(
                              "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] sm:text-[10.5px] font-medium tracking-tight whitespace-nowrap max-w-full truncate shadow-xs",
                              statusConfig.bg
                            )}
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusConfig.dot)} />
                            <span className="truncate">
                              {att.status.startsWith('Half Day')
                                ? 'Half Day'
                                : statusConfig.shortLabel || statusConfig.label}
                            </span>
                          </div>
                        ) : isSunday ? (
                          <span className="text-[10px] text-muted-foreground/60 font-medium">Off</span>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Attendance Legend */}
            <div className="mt-4 pt-4 border-t border-border/40 dark:border-zinc-800/80">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                Attendance Status Legend
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  'Present',
                  'Absent',
                  'Pending',
                  'Half Day',
                  'Leave',
                  'WFH',
                  'Holiday',
                  'Holiday Work'
                ].map(statusKey => {
                  const cfg = getAttendanceStatusConfig(statusKey)
                  return (
                    <div
                      key={statusKey}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium shadow-2xs",
                        cfg.bg
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
                      <span>{cfg.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Selected-Day Details & Monthly Insights */}
        <div className="w-full xl:w-[340px] shrink-0 space-y-4">
          {/* Selected-Day Details Card */}
          <div className="bg-card/40 dark:bg-zinc-950/40 border border-border/40 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-foreground">Day Details</h4>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {selectedDateStr}
              </span>
            </div>

            {/* Date subtitle */}
            <div className="text-xs font-medium text-muted-foreground mb-3 pb-2.5 border-b border-border/40 dark:border-zinc-800/80">
              {formattedSelectedDate}
            </div>

            {selectedAtt ? (
              <div className="space-y-3 text-xs">
                {/* Primary Status Banner */}
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/40 bg-card/60 dark:bg-zinc-900/50">
                  <span className="text-muted-foreground font-medium">Status</span>
                  {(() => {
                    const cfg = getAttendanceStatusConfig(selectedAtt.status, selectedAtt.holiday?.name)
                    return (
                      <div className={cn("flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-semibold", cfg.bg)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
                        <span>{cfg.label}</span>
                      </div>
                    )
                  })()}
                </div>

                {/* Key Metrics Grid */}
                <div className="space-y-2 pt-1">
                  {/* Worked Hours */}
                  <div className="flex items-center justify-between py-1 border-b border-border/30 dark:border-zinc-800/60">
                    <span className="text-muted-foreground">Worked Hours</span>
                    <span className="font-semibold text-foreground">
                      {selectedAtt.workedHours > 0
                        ? `${formatOfficeHoursAsHHMM(selectedAtt.workedHours)} hrs`
                        : '0.00 hrs'}
                    </span>
                  </div>

                  {/* Comp-Off Credit if applicable */}
                  {selectedAtt.compOffMinutes > 0 && (
                    <div className="flex items-center justify-between py-1 border-b border-border/30 dark:border-zinc-800/60">
                      <span className="text-muted-foreground">Comp-Off Credit</span>
                      <span className="font-semibold text-purple-400">
                        +{formatMinutesAsHHMM(selectedAtt.compOffMinutes)} hrs
                      </span>
                    </div>
                  )}

                  {/* EOD Status */}
                  <div className="flex items-center justify-between py-1 border-b border-border/30 dark:border-zinc-800/60">
                    <span className="text-muted-foreground">EOD Report</span>
                    <span className="font-medium">
                      {selectedAtt.eod ? (
                        <span
                          className={cn(
                            "font-semibold",
                            selectedAtt.eod.status === 'Approved'
                              ? 'text-emerald-400'
                              : selectedAtt.eod.status === 'Pending'
                              ? 'text-amber-400'
                              : selectedAtt.eod.status === 'Rejected'
                              ? 'text-rose-400'
                              : 'text-foreground'
                          )}
                        >
                          {selectedAtt.eod.status}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Not Submitted</span>
                      )}
                    </span>
                  </div>

                  {/* Holiday / Leave / WFH Info */}
                  <div className="flex items-start justify-between py-1 border-b border-border/30 dark:border-zinc-800/60 gap-2">
                    <span className="text-muted-foreground shrink-0">Schedule / Notes</span>
                    <span className="font-medium text-right break-words max-w-[190px]">
                      {selectedAtt.holiday ? (
                        <span className="text-purple-400">
                          {selectedAtt.holiday.name}{' '}
                          {selectedAtt.holiday.name === 'Sunday' ? '(Weekly Off)' : '(Holiday)'}
                        </span>
                      ) : selectedAtt.leave ? (
                        <span className="text-orange-400">
                          {selectedAtt.leave.request_type || 'Leave'}
                          {selectedAtt.leave.is_half_day ? ' (Half Day)' : ''}
                          {selectedAtt.leave.reason ? ` - ${selectedAtt.leave.reason}` : ''}
                        </span>
                      ) : selectedAtt.wfh ? (
                        <span className="text-blue-400">
                          Work From Home{selectedAtt.wfh.is_half_day ? ' (Half Day)' : ''}
                          {selectedAtt.wfh.reason ? ` - ${selectedAtt.wfh.reason}` : ''}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Standard Working Day</span>
                      )}
                    </span>
                  </div>

                  {/* EOD Tasks Accomplished Snippet if present */}
                  {selectedAtt.eod?.tasks_accomplished && (
                    <div className="pt-2">
                      <span className="text-muted-foreground font-medium block mb-1.5 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" /> Tasks Accomplished
                      </span>
                      <div className="p-2.5 rounded-xl border border-border/40 bg-muted/10 text-muted-foreground text-[11px] leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap font-sans">
                        {selectedAtt.eod.tasks_accomplished}
                      </div>
                    </div>
                  )}

                  {/* Rejection Reason if present */}
                  {selectedAtt.eod?.rejection_reason && (
                    <div className="pt-2">
                      <span className="text-rose-400 font-medium block mb-1">Rejection Note:</span>
                      <div className="p-2 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-300 text-[11px]">
                        {selectedAtt.eod.rejection_reason}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Click any calendar date to view its breakdown.
              </div>
            )}
          </div>

          {/* Monthly Insights Card */}
          <div className="bg-card/40 dark:bg-zinc-950/40 border border-border/40 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-foreground">Monthly Insights</h4>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Present */}
              <div className="p-2.5 rounded-xl border border-border/40 bg-card/60 dark:bg-zinc-900/40 flex flex-col justify-between">
                <span className="text-[11px] text-muted-foreground">Present</span>
                <span className="text-lg font-bold text-emerald-400 mt-1">{summary.present}</span>
              </div>

              {/* Holiday Work */}
              <div className="p-2.5 rounded-xl border border-border/40 bg-card/60 dark:bg-zinc-900/40 flex flex-col justify-between">
                <span className="text-[11px] text-muted-foreground">Holiday Work</span>
                <span className="text-lg font-bold text-purple-400 mt-1">{summary.holidayWork}</span>
              </div>

              {/* WFH */}
              <div className="p-2.5 rounded-xl border border-border/40 bg-card/60 dark:bg-zinc-900/40 flex flex-col justify-between">
                <span className="text-[11px] text-muted-foreground">WFH</span>
                <span className="text-lg font-bold text-blue-400 mt-1">{summary.wfh}</span>
              </div>

              {/* Leave */}
              <div className="p-2.5 rounded-xl border border-border/40 bg-card/60 dark:bg-zinc-900/40 flex flex-col justify-between">
                <span className="text-[11px] text-muted-foreground">Leave</span>
                <span className="text-lg font-bold text-orange-400 mt-1">{summary.leave}</span>
              </div>

              {/* Half Days */}
              <div className="p-2.5 rounded-xl border border-border/40 bg-card/60 dark:bg-zinc-900/40 flex flex-col justify-between">
                <span className="text-[11px] text-muted-foreground">Half Day</span>
                <span className="text-lg font-bold text-yellow-400 mt-1">{summary.halfDay}</span>
              </div>

              {/* Absent */}
              <div className="p-2.5 rounded-xl border border-border/40 bg-card/60 dark:bg-zinc-900/40 flex flex-col justify-between">
                <span className="text-[11px] text-muted-foreground">Absent</span>
                <span className="text-lg font-bold text-rose-400 mt-1">{summary.absent}</span>
              </div>

              {/* Pending EOD */}
              <div className="p-2.5 rounded-xl border border-border/40 bg-card/60 dark:bg-zinc-900/40 col-span-2 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Pending Review</span>
                  <span className="text-xs text-muted-foreground/70">Awaiting HR/Admin</span>
                </div>
                <span className="text-lg font-bold text-amber-400">{summary.pending}</span>
              </div>

              {/* Total Worked Hours */}
              <div className="p-2.5 rounded-xl border border-border/40 bg-card/60 dark:bg-zinc-900/40 col-span-2 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Total Month Hours</span>
                <span className="text-sm font-bold text-foreground">
                  {formatMinutesAsHHMM(Math.round(summary.workedHours * 60))} hrs
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
