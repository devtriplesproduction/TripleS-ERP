'use client'

import React, { useState, useMemo } from 'react'
import {
  Search,
  ArrowLeft,
  Calendar,
  RefreshCw,
  Camera,
  Clock,
  Laptop,
  Globe,
  Video,
  MessageCircle,
  Folder,
  Scissors,
  Code,
  Building2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EmployeeReportItem } from '@/lib/actions/time-tracking'
import { EmployeeScreenshotsGallery } from './EmployeeScreenshotsGallery'
import { DatePicker } from '@/components/ui/date-picker'

interface EmployeeDetailWorkfolioViewProps {
  selectedEmployee: EmployeeReportItem
  allEmployees: EmployeeReportItem[]
  onSelectEmployee: (emp: EmployeeReportItem) => void
  onBack: () => void
  selectedDate: string
  onDateChange?: (date: string) => void
  onRefresh?: () => void
  loading?: boolean
}

// Pastel pill and donut slice colors matching Workfolio design
const APP_COLORS = [
  { bg: 'bg-[#ede7f6] dark:bg-purple-950/40', text: 'text-[#512da8] dark:text-purple-300', border: 'border-[#d1c4e9] dark:border-purple-800/40', hex: '#b39ddb' },
  { bg: 'bg-[#fce4ec] dark:bg-pink-950/40', text: 'text-[#ad1457] dark:text-pink-300', border: 'border-[#f8bbd0] dark:border-pink-800/40', hex: '#f48fb1' },
  { bg: 'bg-[#e8f5e9] dark:bg-emerald-950/40', text: 'text-[#2e7d32] dark:text-emerald-300', border: 'border-[#c8e6c9] dark:border-emerald-800/40', hex: '#a5d6a7' },
  { bg: 'bg-[#fbe9e7] dark:bg-orange-950/40', text: 'text-[#d84315] dark:text-orange-300', border: 'border-[#ffccbc] dark:border-orange-800/40', hex: '#ffab91' },
  { bg: 'bg-[#fff8e1] dark:bg-amber-950/40', text: 'text-[#b78103] dark:text-amber-300', border: 'border-[#ffecb3] dark:border-amber-800/40', hex: '#ffe082' },
  { bg: 'bg-[#e0f7fa] dark:bg-cyan-950/40', text: 'text-[#00838f] dark:text-cyan-300', border: 'border-[#b2ebf2] dark:border-cyan-800/40', hex: '#80deea' },
  { bg: 'bg-[#e8eaf6] dark:bg-indigo-950/40', text: 'text-[#3949ab] dark:text-indigo-300', border: 'border-[#c5cae9] dark:border-indigo-800/40', hex: '#9fa8da' },
  { bg: 'bg-[#f3e5f5] dark:bg-fuchsia-950/40', text: 'text-[#7b1fa2] dark:text-fuchsia-300', border: 'border-[#e1bee7] dark:border-fuchsia-800/40', hex: '#ce93d8' }
]

function formatHms(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0')
  const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0')
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0')
  return `${h}h ${m}m ${s}s`
}

function formatTimeAmPm(isoOrTimeStr: string | null | undefined): string {
  if (!isoOrTimeStr) return '-'
  try {
    const d = new Date(isoOrTimeStr)
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(d)
    }
    return isoOrTimeStr
  } catch {
    return isoOrTimeStr
  }
}

function formatFullDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-').map(Number)
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2])
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }).format(d)
    }
  } catch {
    // fallback
  }
  return dateStr
}

function formatDateShort(dateStr: string): string {
  try {
    const parts = dateStr.split('-').map(Number)
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2])
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit'
      }).format(d)
    }
  } catch {
    // fallback
  }
  return dateStr
}

function AppIcon({ name }: { name: string }) {
  const lower = name.toLowerCase()
  if (lower.includes('chrome') || lower.includes('google.com') || lower.includes('brave') || lower.includes('browser')) {
    return <Globe size={13} className="shrink-0 opacity-80" />
  }
  if (lower.includes('meet') || lower.includes('zoom') || lower.includes('teams')) {
    return <Video size={13} className="shrink-0 opacity-80" />
  }
  if (lower.includes('whatsapp') || lower.includes('slack')) {
    return <MessageCircle size={13} className="shrink-0 opacity-80" />
  }
  if (lower.includes('snipping') || lower.includes('screenshot')) {
    return <Scissors size={13} className="shrink-0 opacity-80" />
  }
  if (lower.includes('code') || lower.includes('terminal') || lower.includes('git')) {
    return <Code size={13} className="shrink-0 opacity-80" />
  }
  if (lower.includes('desktop') || lower.includes('explorer') || lower.includes('shell')) {
    return <Folder size={13} className="shrink-0 opacity-80" />
  }
  return <Laptop size={13} className="shrink-0 opacity-80" />
}

/**
 * Donut Chart rendering application distribution
 */
function ApplicationsDonutChart({
  applications
}: {
  applications: Array<{ name: string; percent: number; duration: string }>
}) {
  const [hoveredApp, setHoveredApp] = useState<{ name: string; percent: number; duration: string } | null>(null)

  const radius = 68
  const strokeWidth = 34
  const circumference = 2 * Math.PI * radius

  // Calculate cumulative stroke offsets
  let accumulatedPercent = 0
  const slices = applications.map((app, idx) => {
    const dashLength = (app.percent / 100) * circumference
    const strokeDasharray = `${dashLength} ${circumference - dashLength}`
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference)
    accumulatedPercent += app.percent
    const color = APP_COLORS[idx % APP_COLORS.length]

    return {
      ...app,
      color: color.hex,
      strokeDasharray,
      strokeDashoffset
    }
  })

  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground">
        <div className="w-40 h-40 rounded-full border-8 border-muted border-dashed flex items-center justify-center">
          <span>No apps</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width="210" height="210" viewBox="0 0 210 210" className="transform -rotate-90">
        {/* Background track circle */}
        <circle
          cx="105"
          cy="105"
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />

        {/* Donut slices */}
        {slices.map((slice, idx) => (
          <circle
            key={idx}
            cx="105"
            cy="105"
            r={radius}
            fill="transparent"
            stroke={slice.color}
            strokeWidth={strokeWidth}
            strokeDasharray={slice.strokeDasharray}
            strokeDashoffset={slice.strokeDashoffset}
            className="transition-all duration-300 cursor-pointer hover:opacity-85"
            onMouseEnter={() => setHoveredApp(slice)}
            onMouseLeave={() => setHoveredApp(null)}
          />
        ))}
      </svg>

      {/* Center Hole Tooltip / Summary */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
        {hoveredApp ? (
          <div className="animate-in fade-in zoom-in-95 max-w-[120px]">
            <div className="text-xs font-bold text-foreground truncate">{hoveredApp.name}</div>
            <div className="text-sm font-extrabold text-primary">{hoveredApp.percent}%</div>
            <div className="text-[10px] text-muted-foreground">{hoveredApp.duration}</div>
          </div>
        ) : (
          <div>
            <div className="text-base font-extrabold text-foreground">{applications.length}</div>
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Apps</div>
          </div>
        )}
      </div>
    </div>
  )
}

export function EmployeeDetailWorkfolioView({
  selectedEmployee,
  allEmployees,
  onSelectEmployee,
  onBack,
  selectedDate,
  onDateChange,
  onRefresh,
  loading = false
}: EmployeeDetailWorkfolioViewProps) {
  const [memberSearch, setMemberSearch] = useState('')
  const [viewTab, setViewTab] = useState<'overview' | 'screenshots'>('overview')

  // Filter members list by search query
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return allEmployees
    const q = memberSearch.toLowerCase().trim()
    return allEmployees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      (e.employee_id && e.employee_id.toLowerCase().includes(q))
    )
  }, [allEmployees, memberSearch])

  // Build Clock In & Out Summary intervals
  const summaryIntervals = useMemo(() => {
    const formattedDate = formatFullDate(selectedDate)
    const intervals: Array<{
      id: string
      date: string
      startTime: string
      endTime: string
      durationText: string
      isWork: boolean
    }> = []

    if (!selectedEmployee.sessions || selectedEmployee.sessions.length === 0) {
      if (selectedEmployee.workedMinutes > 0) {
        intervals.push({
          id: 'sess-summary',
          date: formattedDate,
          startTime: selectedEmployee.clockInTime || '09:00 AM',
          endTime: selectedEmployee.clockOutTime === 'In Progress' ? 'Working On' : (selectedEmployee.clockOutTime || '06:00 PM'),
          durationText: selectedEmployee.clockOutTime === 'In Progress' ? 'Working On' : `Worked for ${formatHms(selectedEmployee.workedMinutes * 60)}`,
          isWork: true
        })
      } else {
        intervals.push({
          id: 'empty',
          date: formattedDate,
          startTime: '-',
          endTime: '-',
          durationText: 'No clock in / clock out records',
          isWork: false
        })
      }
      return intervals
    }

    const sortedSessions = [...selectedEmployee.sessions].sort((a, b) =>
      new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime()
    )

    sortedSessions.forEach((session, sIdx) => {
      const sessionBreaks = (session.breaks || []).sort((a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )

      if (sessionBreaks.length === 0) {
        const isWorkingNow = !session.clock_out
        const durationSecs = (session.worked_minutes || 0) * 60
        intervals.push({
          id: `sess-${session.id}`,
          date: formattedDate,
          startTime: formatTimeAmPm(session.clock_in),
          endTime: isWorkingNow ? 'Working On' : (session.clock_out ? formatTimeAmPm(session.clock_out) : '-'),
          durationText: isWorkingNow ? 'Working On' : `Worked for ${formatHms(durationSecs)}`,
          isWork: true
        })
      } else {
        let currentWorkStart = session.clock_in

        sessionBreaks.forEach((brk, bIdx) => {
          const startMs = new Date(currentWorkStart).getTime()
          const breakStartMs = new Date(brk.start_time).getTime()
          const workSecs = Math.max(0, Math.round((breakStartMs - startMs) / 1000))

          if (workSecs > 10) {
            intervals.push({
              id: `sess-${session.id}-w-${bIdx}`,
              date: formattedDate,
              startTime: formatTimeAmPm(currentWorkStart),
              endTime: formatTimeAmPm(brk.start_time),
              durationText: `Worked for ${formatHms(workSecs)}`,
              isWork: true
            })
          }

          intervals.push({
            id: `sess-${session.id}-b-${bIdx}`,
            date: formattedDate,
            startTime: formatTimeAmPm(brk.start_time),
            endTime: brk.end_time ? formatTimeAmPm(brk.end_time) : 'In Progress',
            durationText: brk.reason || 'Internet interrupted',
            isWork: false
          })

          if (brk.end_time) {
            currentWorkStart = brk.end_time
          }
        })

        const lastBreak = sessionBreaks[sessionBreaks.length - 1]
        if (lastBreak.end_time) {
          if (!session.clock_out) {
            intervals.push({
              id: `sess-${session.id}-w-end`,
              date: formattedDate,
              startTime: formatTimeAmPm(lastBreak.end_time),
              endTime: 'Working On',
              durationText: '-',
              isWork: true
            })
          } else {
            const lastBreakEndMs = new Date(lastBreak.end_time).getTime()
            const sessionEndMs = new Date(session.clock_out).getTime()
            const workSecs = Math.max(0, Math.round((sessionEndMs - lastBreakEndMs) / 1000))
            intervals.push({
              id: `sess-${session.id}-w-end`,
              date: formattedDate,
              startTime: formatTimeAmPm(lastBreak.end_time),
              endTime: formatTimeAmPm(session.clock_out),
              durationText: `Worked for ${formatHms(workSecs)}`,
              isWork: true
            })
          }
        }
      }

      if (sIdx < sortedSessions.length - 1 && session.clock_out) {
        const nextSession = sortedSessions[sIdx + 1]
        intervals.push({
          id: `gap-${session.id}`,
          date: formattedDate,
          startTime: formatTimeAmPm(session.clock_out),
          endTime: formatTimeAmPm(nextSession.clock_in),
          durationText: 'Internet interrupted',
          isWork: false
        })
      }
    })

    return intervals
  }, [selectedEmployee, selectedDate])

  // Height for Activities bar (scaled to 10 hours)
  const totalWorkedHoursNum = (selectedEmployee.workedMinutes || 0) / 60
  const barHeightPercent = Math.min(100, (totalWorkedHoursNum / 10) * 100)

  // Applications list
  const appsList = selectedEmployee.applications || []

  return (
    <div className="space-y-4">
      {/* Top Action / Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border border-border bg-card shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-muted/30 hover:bg-muted text-xs font-semibold text-foreground transition-all shadow-xs"
          >
            <ArrowLeft size={14} />
            <span>Back to Dashboard</span>
          </button>
          <div className="h-4 w-px bg-border" />
          <h2 className="text-base font-bold text-foreground">{selectedEmployee.name}</h2>
          <span className="text-xs text-muted-foreground font-medium">({selectedEmployee.department})</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Screenshots Toggle */}
          {(selectedEmployee.screenshotCount || selectedEmployee.screenshots?.length || 0) > 0 && (
            <button
              onClick={() => setViewTab(v => v === 'overview' ? 'screenshots' : 'overview')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs border",
                viewTab === 'screenshots'
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/40 text-foreground hover:bg-muted border-border"
              )}
            >
              <Camera size={13} />
              <span>Screenshots ({selectedEmployee.screenshotCount || selectedEmployee.screenshots?.length || 0})</span>
            </button>
          )}

          {/* Interactive DatePicker Component */}
          <div className="w-[150px]">
            <DatePicker
              value={selectedDate}
              onChange={(d) => {
                if (d && onDateChange) {
                  onDateChange(d)
                }
              }}
              iconLeft
              formatStr="dd MMM, yyyy"
              className="h-8 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors shadow-2xs"
            />
          </div>

          {/* Refresh */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shadow-xs"
              title="Refresh"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin text-primary' : ''} />
            </button>
          )}
        </div>
      </div>

      {viewTab === 'screenshots' ? (
        <EmployeeScreenshotsGallery
          screenshots={selectedEmployee.screenshots || []}
          employeeName={selectedEmployee.name}
          selectedDate={selectedDate}
          sessions={selectedEmployee.sessions}
        />
      ) : (
        /* Workfolio 2-Pane Split Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT PANE: Member Search & Staff List */}
          <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-4 shadow-xs space-y-3">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search Members"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs rounded-xl border border-border bg-muted/20 text-foreground placeholder:text-muted-foreground outline-none focus:border-blue-500 transition-colors"
              />
              <Search size={14} className="absolute right-2.5 top-2.5 text-muted-foreground pointer-events-none" />
            </div>

            {/* Members List */}
            <div className="space-y-1 overflow-y-auto max-h-[620px] pr-1">
              {filteredMembers.map((emp) => {
                const isSelected = emp.id === selectedEmployee.id
                const initial = (emp.name || 'U').trim().charAt(0).toUpperCase()

                return (
                  <button
                    key={emp.id}
                    onClick={() => onSelectEmployee(emp)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-xs text-left rounded-xl transition-all relative group",
                      isSelected
                        ? "bg-blue-50/90 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold"
                        : "text-foreground hover:bg-muted/50"
                    )}
                  >
                    {/* Active vertical blue indicator */}
                    {isSelected && (
                      <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-600 rounded-r" />
                    )}

                    {/* Avatar Initial Circle */}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs transition-colors",
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-muted text-foreground border border-border group-hover:border-foreground/20"
                    )}>
                      {initial}
                    </div>

                    {/* Name */}
                    <span className="truncate flex-1">{emp.name}</span>
                  </button>
                )
              })}

              <div className="pt-3 text-center text-[11px] text-muted-foreground">
                No more result found
              </div>
            </div>
          </div>

          {/* RIGHT PANE: Workfolio Activity Telemetry */}
          <div className="lg:col-span-9 space-y-5">
            {/* 1. Activities Bar Chart */}
            <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-3">
              <h3 className="text-sm sm:text-base font-bold text-foreground">Activities</h3>

              <div className="pt-2">
                <div className="relative h-44 flex flex-col justify-between border-b border-border pb-1">
                  {/* Y-axis guidelines */}
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="w-14">10 hours</span>
                    <div className="flex-1 border-b border-border/40 border-dashed" />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="w-14">5 hours</span>
                    <div className="flex-1 border-b border-border/40 border-dashed" />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="w-14">0 hours</span>
                    <div className="flex-1 border-b border-border" />
                  </div>

                  {/* Activity Bar for Selected Date */}
                  <div className="absolute inset-x-0 bottom-1 flex justify-center pl-14">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-44 sm:w-72 md:w-80 rounded-t bg-[#525252] dark:bg-slate-300 transition-all duration-300 relative group cursor-pointer"
                        style={{ height: `${barHeightPercent}%`, minHeight: barHeightPercent > 0 ? '6px' : '0' }}
                      >
                        {/* Tooltip on hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-popover text-popover-foreground text-[11px] font-medium shadow-md whitespace-nowrap pointer-events-none border border-border">
                          {selectedEmployee.workedHours} worked ({selectedEmployee.activeHours} active)
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium mt-2">
                        {formatDateShort(selectedDate)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Observed Applications & Donut Chart */}
            <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Left: Apps Pill Badges List */}
                <div className="md:col-span-7 space-y-2 max-h-72 overflow-y-auto pr-2">
                  {appsList.length > 0 ? (
                    appsList.map((app, idx) => {
                      const color = APP_COLORS[idx % APP_COLORS.length]
                      return (
                        <div
                          key={idx}
                          className={cn(
                            "flex items-center justify-between px-3.5 py-2 rounded-full border text-xs transition-colors",
                            color.bg, color.text, color.border
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <AppIcon name={app.name} />
                            <span className="truncate font-medium">{app.name}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground/80 shrink-0 ml-2">
                            neutral
                          </span>
                        </div>
                      )
                    })
                  ) : (
                    <div className="py-8 text-center text-xs text-muted-foreground italic">
                      No applications recorded for this date.
                    </div>
                  )}
                </div>

                {/* Right: Donut Chart */}
                <div className="md:col-span-5 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-border/60 pt-4 md:pt-0 md:pl-4">
                  <ApplicationsDonutChart applications={appsList} />
                </div>
              </div>
            </div>

            {/* 3. Clock In & Out Summary Table */}
            <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-foreground shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-foreground">Clock In & Out Summary</h3>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Start Time</th>
                      <th className="py-3 px-4">End Time</th>
                      <th className="py-3 px-4">Activity Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {summaryIntervals.map((row) => (
                      <tr
                        key={row.id}
                        className={cn(
                          "transition-colors",
                          row.isWork
                            ? "bg-[#eaf8ec] dark:bg-emerald-950/25 text-[#1b5e20] dark:text-emerald-200 font-medium"
                            : "bg-card text-muted-foreground"
                        )}
                      >
                        <td className="py-3 px-4 whitespace-nowrap">{row.date}</td>
                        <td className="py-3 px-4 whitespace-nowrap font-medium">
                          <span className="inline-flex items-center gap-1 font-mono">
                            {row.startTime !== '-' && <Clock size={11} className="text-muted-foreground shrink-0" />}
                            <span>{row.startTime}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-medium">
                          <span className="inline-flex items-center gap-1 font-mono">
                            {row.endTime !== '-' && row.endTime !== 'Working On' && <Clock size={11} className="text-muted-foreground shrink-0" />}
                            <span>{row.endTime}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">{row.durationText}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

