'use client'

import React from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EmployeeReportItem } from '@/lib/actions/time-tracking'

interface EmployeeReportCardProps {
  employee: EmployeeReportItem
  onClick?: () => void
}

/**
 * EmployeeReportCard component
 * Displays an individual employee time tracking summary card with:
 * - Color-coded themes (Vibrant Emerald for active/working staff, Pink for other/clocked out)
 * - Harmonized for both light screens (white theme) and black/dark screens
 * - Circular avatar with uppercase initial and pulsing online indicator for active staff
 * - Name with high-visibility "Active" badge and subtitle ("Yet to start work" or "Worked for 1 day")
 * - Active percentage and "Active Time" label in bold emerald
 * - Middle pill badge ("{N} apps used")
 * - Bottom row with Checked-in time, shift progress bar, and Hours worked
 */
export function EmployeeReportCard({ employee, onClick }: EmployeeReportCardProps) {
  // 1. Calculate active time percentage
  // Active time % = activeMinutes / workedMinutes * 100
  const activePct = employee.workedMinutes > 0
    ? Math.min(100, Math.round((employee.activeMinutes / employee.workedMinutes) * 100))
    : 0

  // 2. Subtitle: "Yet to start work" (if 0 workedMinutes or Not Started) or "Worked for 1 day"
  const isYetToStart = employee.status === 'Not Started' || (employee.workedMinutes === 0 && employee.activeMinutes === 0)
  const subtitle = isYetToStart ? 'Yet to start work' : 'Worked for 1 day'

  // 3. Middle badge: "{N} apps used"
  const appCount = employee.applications?.length || 0

  // 4. Formatted check-in time (e.g. "10:12 am", "09:59 am", "00:00")
  let displayClockIn = '00:00'
  if (!isYetToStart && employee.clockInTime && employee.clockInTime !== '-' && employee.clockInTime !== '--') {
    const clean = employee.clockInTime.trim().toLowerCase()
    const match = clean.match(/^(\d{1,2}):(\d{2})(?:\s*([ap]m))?$/)
    if (match) {
      const hh = match[1].padStart(2, '0')
      const mm = match[2]
      const meridiem = match[3] ? ` ${match[3]}` : ''
      displayClockIn = `${hh}:${mm}${meridiem}`
    } else {
      displayClockIn = clean
    }
  }

  // 5. Formatted 2-digit worked hours (e.g. "09h 16m", "08h 27m", "00h 00m")
  const h = Math.floor((employee.workedMinutes || 0) / 60)
  const m = (employee.workedMinutes || 0) % 60
  const displayWorkedHours = isYetToStart
    ? '00h 00m'
    : `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`

  // 6. Progress percentage for 9-hour workday shift (540 minutes)
  const progressPercent = isYetToStart
    ? 0
    : Math.min(100, Math.max(0, Math.round((employee.workedMinutes / 540) * 100)))

  // 7. Status Category & Harmonized Color Schemes for White and Black Themes:
  // - Active Employee (Working): Vibrant high-contrast Emerald Green wash on white, glowing rich emerald on black
  // - Other Employees (Clocked Out, Not Started, Break, Idle): Soft Pink wash on white, deep pink-tinted charcoal on black
  const isActive = employee.status?.toLowerCase() === 'working'

  const themeStyles = {
    active: {
      card: "bg-emerald-50/90 border-emerald-300/90 hover:border-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-500/50 dark:hover:border-emerald-400 shadow-xs hover:shadow-md dark:shadow-[0_0_16px_rgba(16,185,129,0.14)]",
      avatar: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200 dark:border-emerald-600/70",
      activeText: "text-emerald-600 dark:text-emerald-400",
      pillBadge: "bg-emerald-100/90 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700/60",
      progressBar: "bg-emerald-500 dark:bg-emerald-400 border border-emerald-400/80 dark:border-emerald-300/40"
    },
    other: {
      card: "bg-pink-50/85 border-pink-200/90 hover:border-pink-400 dark:bg-pink-950/25 dark:border-pink-500/40 dark:hover:border-pink-400 dark:shadow-[0_0_15px_rgba(244,114,182,0.06)]",
      avatar: "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/50 dark:text-pink-200 dark:border-pink-700/50",
      activeText: isYetToStart ? "text-neutral-500 dark:text-neutral-400" : "text-emerald-600 dark:text-emerald-400",
      pillBadge: "bg-[#dff3fb] text-[#0284c7] border-[#bae6fd] dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60",
      progressBar: isYetToStart ? "bg-neutral-300 dark:bg-neutral-700 border border-neutral-400/40" : "bg-sky-400 dark:bg-sky-400 border border-sky-300/80 dark:border-sky-300/40"
    }
  }

  const currentTheme = isActive ? themeStyles.active : themeStyles.other
  const initial = (employee.name || 'U').trim().charAt(0).toUpperCase()

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3 sm:p-3.5 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between select-none group min-h-[148px] sm:min-h-[154px]",
        currentTheme.card
      )}
    >
      {/* Top Section */}
      <div className="flex items-start justify-between gap-2.5">
        {/* Left: Avatar + Name + Subtitle */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn(
            "w-9 h-9 sm:w-10 sm:h-10 rounded-full border font-bold flex items-center justify-center shrink-0 text-xs sm:text-sm shadow-2xs font-sans relative",
            currentTheme.avatar
          )}>
            {initial}
            {isActive && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background ring-1 ring-emerald-400 animate-pulse" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-bold text-neutral-900 dark:text-neutral-100 text-xs sm:text-sm leading-tight truncate group-hover:text-primary transition-colors font-sans">
                {employee.name}
              </h4>
              {isActive && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 font-medium mt-0.5 truncate font-sans">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right: Active percentage */}
        <div className="text-right shrink-0">
          <div className={cn(
            "text-xl sm:text-2xl font-extrabold tracking-tight leading-none font-sans",
            currentTheme.activeText
          )}>
            {activePct}%
          </div>
          <div className="text-[10px] text-neutral-600 dark:text-neutral-400 font-medium mt-0.5 font-sans">
            Active Time
          </div>
        </div>
      </div>

      {/* Middle: Pill Badge */}
      <div className="flex justify-center my-2 sm:my-2.5">
        <span className={cn(
          "inline-flex items-center px-3 py-0.5 rounded-lg text-xs font-semibold shadow-2xs font-sans border",
          currentTheme.pillBadge
        )}>
          {appCount} apps used
        </span>
      </div>

      {/* Bottom Section: Check-in, Progress Bar, Hours worked */}
      <div className="space-y-1 font-sans">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Check-in time with small clock logo */}
          <div className="text-left shrink-0 flex items-center gap-1">
            <Clock size={11} className="text-neutral-500 dark:text-neutral-400 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 whitespace-nowrap leading-none font-sans">
              {displayClockIn}
            </span>
          </div>

          {/* Progress Timeline Bar */}
          <div className="flex-1 min-w-[50px] px-0.5">
            <div className="h-3 sm:h-3.5 w-full rounded-sm bg-neutral-300/80 dark:bg-neutral-800 overflow-hidden relative border border-neutral-400/30 dark:border-neutral-700/50">
              <div
                className={cn("h-full rounded-sm transition-all duration-300", currentTheme.progressBar)}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Hours worked with small clock logo */}
          <div className="text-right shrink-0 flex items-center gap-1 justify-end">
            <Clock size={11} className="text-neutral-500 dark:text-neutral-400 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 whitespace-nowrap leading-none font-sans">
              {displayWorkedHours}
            </span>
          </div>
        </div>

        {/* Labels row directly below times */}
        <div className="flex items-center justify-between text-[11px] text-neutral-600 dark:text-neutral-400 font-medium font-sans">
          <span>Checked-in</span>
          <span>Hours worked</span>
        </div>
      </div>
    </div>
  )
}
