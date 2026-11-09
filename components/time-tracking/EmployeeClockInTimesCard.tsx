'use client'

import React, { useMemo, useState } from 'react'
import { Clock, User, CheckCircle2, AlertCircle, Moon, Coffee, ArrowUpDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { EmployeeReportItem } from '@/lib/actions/time-tracking'

interface EmployeeClockInTimesCardProps {
  employees?: EmployeeReportItem[]
  selectedDate?: string
  className?: string
  onSelectEmployee?: (emp: EmployeeReportItem) => void
}

// Fallback staff for preview when no live items are logged
const SAMPLE_CLOCK_IN_STAFF = [
  { id: '1', name: 'Harishchandra Nanavare', department: 'Engineering', status: 'Working' as const, clockInTime: '09:59 AM' },
  { id: '2', name: 'Omkar Sawant', department: 'Operations', status: 'Clocked Out' as const, clockInTime: '09:54 AM' },
  { id: '3', name: 'Prachi', department: 'Design Team', status: 'Clocked Out' as const, clockInTime: '10:09 AM' },
  { id: '4', name: 'Aniket Limkar', department: 'Development', status: 'Clocked Out' as const, clockInTime: '10:12 AM' },
  { id: '5', name: 'Shital Rajendra Khulape', department: 'Support', status: 'Clocked Out' as const, clockInTime: '11:33 AM' },
  { id: '6', name: 'Prince Nandagawali', department: 'QA', status: 'Working' as const, clockInTime: '12:00 PM' },
  { id: '7', name: 'ADMIN', department: 'Management', status: 'Not Started' as const, clockInTime: '-' }
]

export function EmployeeClockInTimesCard({
  employees = [],
  selectedDate,
  className = '',
  onSelectEmployee
}: EmployeeClockInTimesCardProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'clocked_in'>('all')

  // Use provided employees, or fallback to sample list
  const staffList = useMemo(() => {
    if (employees && employees.length > 0) {
      return employees
    }
    return SAMPLE_CLOCK_IN_STAFF as unknown as EmployeeReportItem[]
  }, [employees])

  // Clean clock in display helper
  const getDisplayClockIn = (emp: EmployeeReportItem) => {
    if (!emp.clockInTime || emp.clockInTime === '-' || emp.clockInTime === '--' || emp.status === 'Not Started') {
      return null
    }
    const clean = emp.clockInTime.trim().toLowerCase()
    const match = clean.match(/^(\d{1,2}):(\d{2})(?:\s*([ap]m))?$/)
    if (match) {
      const hh = match[1].padStart(2, '0')
      const mm = match[2]
      const meridiem = match[3] ? ` ${match[3].toUpperCase()}` : ''
      return `${hh}:${mm}${meridiem}`
    }
    return emp.clockInTime
  }

  // Filter and sort staff by clock-in time
  const filteredStaff = useMemo(() => {
    let list = staffList.map(e => ({
      ...e,
      formattedClockIn: getDisplayClockIn(e)
    }))

    if (filterMode === 'clocked_in') {
      list = list.filter(e => e.formattedClockIn !== null)
    }

    // Sort: Clocked in employees first (earliest clock-in first), then unclocked
    return list.sort((a, b) => {
      if (a.formattedClockIn && !b.formattedClockIn) return -1
      if (!a.formattedClockIn && b.formattedClockIn) return 1
      if (a.formattedClockIn && b.formattedClockIn) {
        return a.formattedClockIn.localeCompare(b.formattedClockIn)
      }
      return a.name.localeCompare(b.name)
    })
  }, [staffList, filterMode])

  // Quick metrics
  const clockedInCount = staffList.filter(e => getDisplayClockIn(e) !== null).length
  const notStartedCount = staffList.length - clockedInCount

  const earliestClockIn = useMemo(() => {
    const times = staffList.map(e => getDisplayClockIn(e)).filter((t): t is string => t !== null)
    if (times.length === 0) return '-'
    return times.sort()[0]
  }, [staffList])

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Working':
        return (
          <Badge variant="outline" className="text-[10px] px-2 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
            Working
          </Badge>
        )
      case 'On Break':
        return (
          <Badge variant="outline" className="text-[10px] px-2 py-0 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 font-medium">
            <Coffee size={10} className="mr-1" />
            Break
          </Badge>
        )
      case 'Idle':
        return (
          <Badge variant="outline" className="text-[10px] px-2 py-0 border-slate-500/30 text-slate-600 dark:text-slate-400 bg-slate-500/10 font-medium">
            <Moon size={10} className="mr-1" />
            Idle
          </Badge>
        )
      case 'Clocked Out':
        return (
          <Badge variant="outline" className="text-[10px] px-2 py-0 border-border text-muted-foreground bg-muted font-medium">
            <CheckCircle2 size={10} className="mr-1" />
            Done
          </Badge>
        )
      case 'Not Started':
      default:
        return (
          <Badge variant="outline" className="text-[10px] px-2 py-0 border-border/60 text-muted-foreground/60 bg-muted/40 font-medium">
            Pending
          </Badge>
        )
    }
  }

  return (
    <div className={`p-4 sm:p-4.5 rounded-xl border border-border bg-card shadow-xs transition-colors flex flex-col justify-between ${className}`}>
      {/* Header with Title and Quick Filter Button */}
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Clock In Times</h3>
          <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-bold">
            {clockedInCount} Clocked In
          </Badge>
        </div>

        {/* Small Toggle Button: All vs Clocked In only */}
        <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/60">
          <Button
            size="xs"
            variant={filterMode === 'all' ? 'default' : 'ghost'}
            onClick={() => setFilterMode('all')}
            className={cn(
              "h-6 px-2 text-[11px] font-medium rounded-md transition-all cursor-pointer",
              filterMode === 'all'
                ? "bg-background text-foreground shadow-2xs font-semibold border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Show all employees"
          >
            All ({staffList.length})
          </Button>

          <Button
            size="xs"
            variant={filterMode === 'clocked_in' ? 'default' : 'ghost'}
            onClick={() => setFilterMode('clocked_in')}
            className={cn(
              "h-6 px-2 text-[11px] font-medium rounded-md transition-all cursor-pointer",
              filterMode === 'clocked_in'
                ? "bg-background text-foreground shadow-2xs font-semibold border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Show only clocked in employees"
          >
            Clocked In ({clockedInCount})
          </Button>
        </div>
      </div>

      {/* Main Table using Project's Common Table Component */}
      <div className="relative w-full max-h-[175px] overflow-y-auto rounded-lg border border-border/50 no-scrollbar my-auto">
        <Table className="text-xs">
          <TableHeader className="bg-muted/40 sticky top-0 z-10 border-b border-border text-[11px]">
            <TableRow className="hover:bg-transparent">
              <TableHead className="py-1.5 px-3 font-semibold text-muted-foreground h-8">Employee</TableHead>
              <TableHead className="py-1.5 px-2 font-semibold text-muted-foreground h-8 text-center">Status</TableHead>
              <TableHead className="py-1.5 px-3 font-semibold text-muted-foreground h-8 text-right">Clock In</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/40">
            {filteredStaff.length > 0 ? (
              filteredStaff.map((emp) => {
                const initial = (emp.name || 'U').trim().charAt(0).toUpperCase()

                return (
                  <TableRow
                    key={emp.id}
                    onClick={() => onSelectEmployee && onSelectEmployee(emp)}
                    className={cn(
                      "transition-colors",
                      onSelectEmployee ? "cursor-pointer hover:bg-muted/50" : "hover:bg-muted/30"
                    )}
                  >
                    {/* Employee Avatar + Name */}
                    <TableCell className="py-2 px-3 font-medium">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-bold text-foreground shrink-0">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-foreground truncate block leading-tight">
                            {emp.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate block">
                            {emp.department || 'Staff'}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell className="py-2 px-2 text-center whitespace-nowrap">
                      {renderStatusBadge(emp.status)}
                    </TableCell>

                    {/* Clock In Time */}
                    <TableCell className="py-2 px-3 text-right whitespace-nowrap">
                      {emp.formattedClockIn ? (
                        <span className="font-mono font-bold text-foreground text-xs inline-flex items-center gap-1 justify-end">
                          <Clock size={11} className="text-muted-foreground" />
                          {emp.formattedClockIn}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 font-mono text-[11px]">
                          --:--
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                  No employees clocked in yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer Summary Row Matching Style of Work Load Analysis */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/50">
        <div className="flex items-center gap-1">
          <span>Earliest:</span>
          <span className="font-mono font-semibold text-foreground">{earliestClockIn}</span>
        </div>

        <div className="flex items-center gap-1">
          <span>Pending:</span>
          <span className="font-semibold text-amber-600 dark:text-amber-400">{notStartedCount}</span>
        </div>

        <div className="flex items-center gap-1">
          <span>Date:</span>
          <span className="font-medium text-foreground">{selectedDate || 'Today'}</span>
        </div>
      </div>
    </div>
  )
}

