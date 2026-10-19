'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Clock,
  Activity,
  Users,
  Search,
  Calendar,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Coffee,
  Moon,
  CheckCircle2,
  AlertTriangle,
  Laptop,
  Timer,
  ChevronRight,
  ShieldCheck,
  Building2,
  TrendingUp,
  BarChart2,
  X
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import type {
  EmployeeReportItem,
  OverviewMetrics,
  MonthlyEmployeeSummary,
  MonthlyOverviewMetrics
} from '@/lib/actions/time-tracking'

export function TimeTrackingAdminDashboard() {
  const getTodayIST = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())

  const getCurrentMonthIST = () => getTodayIST().slice(0, 7)

  const formatISTTime = (isoDate: string | null | undefined): string => {
    if (!isoDate) return '-'
    try {
      const d = new Date(isoDate)
      if (isNaN(d.getTime())) return '-'
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(d)
    } catch {
      return '-'
    }
  }

  // Mode: Daily or Monthly
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily')

  // Daily Filters
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIST())
  const [selectedDept, setSelectedDept] = useState<string>('All')
  const [selectedStatus, setSelectedStatus] = useState<string>('All')
  const [selectedEmpId, setSelectedEmpId] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Monthly Filters
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthIST())

  // Auto-refresh state (every 30 seconds)
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true)

  // Daily Data state
  const [employees, setEmployees] = useState<EmployeeReportItem[]>([])
  const [overview, setOverview] = useState<OverviewMetrics>({
    totalEmployees: 0,
    currentlyWorking: 0,
    onBreak: 0,
    currentlyIdle: 0,
    clockedOut: 0,
    notStarted: 0,
    totalWorkedMinutes: 0,
    totalActiveMinutes: 0,
    totalWorkedHoursFormatted: '0h 00m',
    totalActiveHoursFormatted: '0h 00m',
    activeEfficiencyPercent: 0,
    hourlyData: []
  })

  // Monthly Data state
  const [monthlyEmployees, setMonthlyEmployees] = useState<MonthlyEmployeeSummary[]>([])
  const [monthlyOverview, setMonthlyOverview] = useState<MonthlyOverviewMetrics>({
    month: getCurrentMonthIST(),
    totalEmployees: 0,
    totalStaffWithSessions: 0,
    totalDaysLogged: 0,
    totalMonthlyWorkedMinutes: 0,
    totalMonthlyActiveMinutes: 0,
    totalMonthlyWorkedHours: '0h 00m',
    totalMonthlyActiveHours: '0h 00m',
    avgDailyActiveHours: '0h 00m',
    dailyTrends: []
  })

  // Drilldown Detail state
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeReportItem | null>(null)
  const [detailTab, setDetailTab] = useState<'timeline' | 'applications' | 'sessions' | 'sync'>('timeline')

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch Daily Reports
  const fetchDailyReports = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const url = `/api/time-tracking/admin/reports?mode=daily&date=${encodeURIComponent(selectedDate)}&department=${encodeURIComponent(selectedDept)}&status=${encodeURIComponent(selectedStatus)}&employeeId=${encodeURIComponent(selectedEmpId)}`
      const res = await fetch(url)

      if (!res.ok) {
        if (res.status === 403) {
          setError('Access Denied: Only authenticated Admin users are authorized to view time tracking data.')
          return
        }
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || `Server returned HTTP ${res.status}`)
      }

      const data = await res.json()
      if (data.success) {
        setEmployees(data.employees || [])
        setOverview(data.overview || {
          totalEmployees: 0,
          currentlyWorking: 0,
          onBreak: 0,
          currentlyIdle: 0,
          clockedOut: 0,
          notStarted: 0,
          totalWorkedMinutes: 0,
          totalActiveMinutes: 0,
          totalWorkedHoursFormatted: '0h 00m',
          totalActiveHoursFormatted: '0h 00m',
          activeEfficiencyPercent: 0,
          hourlyData: []
        })

        if (selectedEmployee) {
          const updatedEmp = (data.employees || []).find((e: EmployeeReportItem) => e.id === selectedEmployee.id)
          if (updatedEmp) {
            setSelectedEmployee(updatedEmp)
          }
        }
      } else {
        throw new Error(data.error || 'Failed to load daily tracking data')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching tracking reports')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [selectedDate, selectedDept, selectedStatus, selectedEmpId, selectedEmployee])

  // Fetch Monthly Reports
  const fetchMonthlyReports = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const url = `/api/time-tracking/admin/reports?mode=monthly&month=${encodeURIComponent(selectedMonth)}&department=${encodeURIComponent(selectedDept)}`
      const res = await fetch(url)

      if (!res.ok) {
        if (res.status === 403) {
          setError('Access Denied: Only authenticated Admin users are authorized to view time tracking data.')
          return
        }
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || `Server returned HTTP ${res.status}`)
      }

      const data = await res.json()
      if (data.success) {
        setMonthlyEmployees(data.employees || [])
        setMonthlyOverview(data.overview || {
          month: selectedMonth,
          totalEmployees: 0,
          totalStaffWithSessions: 0,
          totalDaysLogged: 0,
          totalMonthlyWorkedMinutes: 0,
          totalMonthlyActiveMinutes: 0,
          totalMonthlyWorkedHours: '0h 00m',
          totalMonthlyActiveHours: '0h 00m',
          avgDailyActiveHours: '0h 00m',
          dailyTrends: []
        })
      } else {
        throw new Error(data.error || 'Failed to load monthly summary')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching monthly summary')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [selectedMonth, selectedDept])

  // Trigger fetch when mode or filters change
  useEffect(() => {
    if (viewMode === 'daily') {
      fetchDailyReports()
    } else {
      fetchMonthlyReports()
    }
  }, [viewMode, selectedDate, selectedMonth, selectedDept, selectedStatus, selectedEmpId])

  // Auto-refresh interval (every 30 seconds for live telemetry)
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      if (viewMode === 'daily') {
        fetchDailyReports(true)
      } else {
        fetchMonthlyReports(true)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh, viewMode, fetchDailyReports, fetchMonthlyReports])

  // Quick date pickers for Daily Mode
  const setQuickDate = (type: 'today' | 'yesterday') => {
    if (type === 'today') {
      setSelectedDate(getTodayIST())
    } else {
      const d = new Date()
      d.setDate(d.getDate() - 1)
      const yesterday = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(d)
      setSelectedDate(yesterday)
    }
  }

  // Filtered employees for text search
  const filteredDailyEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees
    const q = searchQuery.toLowerCase()
    return employees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.designation.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q) ||
      (e.employee_id && e.employee_id.toLowerCase().includes(q))
    )
  }, [employees, searchQuery])

  const filteredMonthlyEmployees = useMemo(() => {
    if (!searchQuery.trim()) return monthlyEmployees
    const q = searchQuery.toLowerCase()
    return monthlyEmployees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.designation.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q) ||
      (e.employee_id && e.employee_id.toLowerCase().includes(q))
    )
  }, [monthlyEmployees, searchQuery])

  // Distinct departments for dropdown
  const departmentOptions = useMemo(() => {
    const set = new Set<string>()
    employees.forEach(e => {
      if (e.department && e.department !== 'General') set.add(e.department)
    })
    return ['All', 'Development', 'Content', 'Management', ...Array.from(set).filter(d => !['Development', 'Content', 'Management'].includes(d))]
  }, [employees])

  // Restrained Status Badge Component
  const renderStatusBadge = (status: EmployeeReportItem['status']) => {
    switch (status) {
      case 'Working':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Working
          </span>
        )
      case 'On Break':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Coffee size={12} className="text-amber-500" />
            On Break
          </span>
        )
      case 'Idle':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border border-zinc-500/20">
            <Moon size={12} className="text-zinc-500" />
            Idle
          </span>
        )
      case 'Clocked Out':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
            <CheckCircle2 size={12} className="text-muted-foreground" />
            Clocked Out
          </span>
        )
      case 'Not Started':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted/40 text-muted-foreground border border-border/60">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
            Not Started
          </span>
        )
    }
  }

  // -------------------------------------------------------------
  // DETAIL DRILLDOWN VIEW FOR INDIVIDUAL EMPLOYEE
  // -------------------------------------------------------------
  if (selectedEmployee) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in">
        {/* Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => setSelectedEmployee(null)}
            className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted/50 shadow-sm w-fit"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-medium text-foreground shadow-sm">
              <Calendar size={14} className="text-muted-foreground" />
              <span>{selectedDate}</span>
            </div>

            <button
              onClick={() => fetchDailyReports()}
              disabled={loading}
              className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shadow-sm"
              title="Refresh Telemetry"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Employee Header Profile Card */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* Monochrome Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-muted text-foreground font-bold text-xl flex items-center justify-center border border-border shadow-sm shrink-0">
              {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{selectedEmployee.name}</h1>
                {renderStatusBadge(selectedEmployee.status)}
                {selectedEmployee.employee_id && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-muted text-muted-foreground border border-border">
                    {selectedEmployee.employee_id}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                <span>{selectedEmployee.designation}</span>
                <span>•</span>
                <span>{selectedEmployee.department}</span>
              </p>
            </div>
          </div>

          {/* Metric Cards Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
            <div className="p-3.5 rounded-xl border border-border bg-muted/30 min-w-[130px]">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                <Clock size={14} className="text-muted-foreground" />
                <span>Worked Time</span>
              </div>
              <span className="text-lg font-bold text-foreground mt-1 block font-mono">
                {selectedEmployee.workedHours}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-muted/30 min-w-[130px]">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                <Activity size={14} className="text-muted-foreground" />
                <span>Active Time</span>
              </div>
              <span className="text-lg font-bold text-foreground mt-1 block font-mono">
                {selectedEmployee.activeHours}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-muted/30 min-w-[130px]">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                <Moon size={14} className="text-muted-foreground" />
                <span>Idle Time</span>
              </div>
              <span className="text-lg font-bold text-foreground mt-1 block font-mono">
                {selectedEmployee.idleHours}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-muted/30 min-w-[130px]">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                <ShieldCheck size={14} className="text-muted-foreground" />
                <span>Sleep / Suspend</span>
              </div>
              <span className="text-lg font-bold text-foreground mt-1 block font-mono">
                {Math.round(selectedEmployee.suspendedSeconds / 60)}m
              </span>
            </div>
          </div>
        </div>

        {/* Sync & Health Alert Warning if any */}
        {selectedEmployee.syncHealth.warningMessage && (
          <div className="p-4 rounded-xl bg-muted border border-border text-foreground flex items-center gap-3 text-sm">
            <AlertTriangle size={18} className="shrink-0 text-muted-foreground" />
            <div>
              <span className="font-semibold">Telemetry Notice: </span>
              <span className="text-muted-foreground">{selectedEmployee.syncHealth.warningMessage}</span>
            </div>
          </div>
        )}

        {/* Drilldown Tabbed Content */}
        <div className="border border-border rounded-2xl bg-card shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setDetailTab('timeline')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  detailTab === 'timeline'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                Activity Timeline ({selectedEmployee.timeline.length})
              </button>

              <button
                onClick={() => setDetailTab('applications')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  detailTab === 'applications'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                Observed Applications ({selectedEmployee.applications.length})
              </button>

              <button
                onClick={() => setDetailTab('sessions')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  detailTab === 'sessions'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                Sessions & Breaks ({selectedEmployee.sessionCount})
              </button>

              <button
                onClick={() => setDetailTab('sync')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  detailTab === 'sync'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                Sync & Telemetry
              </button>
            </div>

            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span>Last Sync:</span>
              <span className="font-semibold text-foreground">{selectedEmployee.lastSyncFormatted}</span>
            </div>
          </div>

          {/* TAB 1: Chronological Activity Timeline */}
          {detailTab === 'timeline' && (
            <div>
              {selectedEmployee.timeline.length > 0 ? (
                <div className="relative pl-7 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {selectedEmployee.timeline.map((event) => {
                    const isClockIn = event.type === 'clock_in'
                    const isClockOut = event.type === 'clock_out'
                    const isBreak = event.type === 'break_start' || event.type === 'break_end'

                    return (
                      <div key={event.id} className="relative flex items-start gap-4 group">
                        <div
                          className={`absolute -left-7 top-1 w-3.5 h-3.5 rounded-full border-2 border-card ${
                            isClockIn
                              ? 'bg-foreground'
                              : isClockOut
                              ? 'bg-muted-foreground'
                              : isBreak
                              ? 'bg-amber-500/80'
                              : 'bg-muted-foreground/60'
                          }`}
                        />
                        <span className="text-xs font-mono font-bold text-muted-foreground shrink-0 w-20 pt-0.5">
                          {event.time}
                        </span>
                        <div className="flex-1 bg-muted/20 border border-border rounded-xl p-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-foreground">{event.title}</h4>
                            {event.duration && (
                              <span className="text-[11px] font-mono font-medium text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded">
                                {event.duration}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{event.subtitle}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Clock size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No activity intervals recorded for this employee on {selectedDate}.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Foreground Applications Breakdown */}
          {detailTab === 'applications' && (
            <div>
              {selectedEmployee.applications.length > 0 ? (
                <div className="space-y-4">
                  {selectedEmployee.applications.map((app, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 font-semibold text-foreground">
                          <Laptop size={16} className="text-muted-foreground" />
                          <span>{app.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground font-mono">{app.duration}</span>
                          <span className="text-xs font-bold text-foreground">{app.percent}%</span>
                        </div>
                      </div>

                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden border border-border/40">
                        <div
                          className="h-full bg-foreground dark:bg-white rounded-full transition-all duration-500"
                          style={{ width: `${app.percent}%` }}
                        />
                      </div>

                      {app.sampleWindows && app.sampleWindows.length > 0 && (
                        <div className="pt-1 flex flex-wrap gap-1.5">
                          {app.sampleWindows.map((win, wIdx) => (
                            <span key={wIdx} className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border truncate max-w-md">
                              {win}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Laptop size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No application window telemetry logged for this employee on {selectedDate}.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Sessions & Breaks Detailed Intervals */}
          {detailTab === 'sessions' && (
            <div className="space-y-6">
              {/* Sessions Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Sessions on {selectedDate} ({selectedEmployee.sessions.length})
                </h4>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="py-2.5 px-4">Session ID</th>
                        <th className="py-2.5 px-4">Clock In</th>
                        <th className="py-2.5 px-4">Clock Out</th>
                        <th className="py-2.5 px-4">Worked</th>
                        <th className="py-2.5 px-4">Active</th>
                        <th className="py-2.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedEmployee.sessions.map((s) => (
                        <tr key={s.id} className="hover:bg-muted/20">
                          <td className="py-2.5 px-4 font-mono text-muted-foreground">{s.id.slice(0, 8)}...</td>
                          <td className="py-2.5 px-4 font-medium text-foreground">{formatISTTime(s.clock_in)}</td>
                          <td className="py-2.5 px-4 text-muted-foreground">{s.clock_out ? formatISTTime(s.clock_out) : 'In Progress'}</td>
                          <td className="py-2.5 px-4 font-mono font-medium text-foreground">{Math.floor(s.worked_minutes / 60)}h {(s.worked_minutes % 60).toString().padStart(2, '0')}m</td>
                          <td className="py-2.5 px-4 font-mono font-medium text-foreground">{Math.floor(s.active_minutes / 60)}h {(s.active_minutes % 60).toString().padStart(2, '0')}m</td>
                          <td className="py-2.5 px-4 font-medium capitalize text-muted-foreground">{s.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Breaks Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Registered Break Intervals ({selectedEmployee.breaks.length})
                </h4>
                {selectedEmployee.breaks.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                        <tr>
                          <th className="py-2.5 px-4">Reason</th>
                          <th className="py-2.5 px-4">Start Time</th>
                          <th className="py-2.5 px-4">End Time</th>
                          <th className="py-2.5 px-4">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selectedEmployee.breaks.map((b) => (
                          <tr key={b.id} className="hover:bg-muted/20">
                            <td className="py-2.5 px-4 font-semibold text-foreground">{b.reason}</td>
                            <td className="py-2.5 px-4 text-muted-foreground">{b.startTime}</td>
                            <td className="py-2.5 px-4 text-muted-foreground">{b.endTime}</td>
                            <td className="py-2.5 px-4 font-mono font-medium text-foreground">{b.duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No break intervals recorded today.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Telemetry & Sync Health */}
          {detailTab === 'sync' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${selectedEmployee.syncHealth.isHealthy ? 'bg-foreground' : 'bg-amber-500 animate-pulse'}`} />
                  <h4 className="text-sm font-bold text-foreground">
                    Telemetry Status: {selectedEmployee.syncHealth.isHealthy ? 'Healthy & Synchronized' : 'Telemetry Attention Recommended'}
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                  <div>
                    <span className="text-muted-foreground block">Last Successful Telemetry Sync:</span>
                    <span className="font-semibold text-foreground font-mono">{selectedEmployee.lastSyncFormatted}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Session Security & Isolation:</span>
                    <span className="font-semibold text-foreground">Verified (Canonical profiles.id bound)</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Sleep & Suspend Tracking:</span>
                    <span className="font-semibold text-foreground font-mono">{selectedEmployee.suspendedSeconds} seconds detected</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Recorded Activity Logs:</span>
                    <span className="font-semibold text-foreground font-mono">{selectedEmployee.timeline.filter(t => t.type === 'activity').length} logs synced</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // MAIN DASHBOARD VIEW
  // -------------------------------------------------------------
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Page Header & View Mode Switcher */}
      <PageHeader
        title="Time Tracking & Activity Analytics"
        subtitle="Real-time employee desktop time tracking and verified activity intervals (Admin Only)"
        icon={Clock}
        iconClassName="text-foreground"
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            {/* Mode Toggle: Daily vs Monthly */}
            <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'daily'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Daily Tracking
              </button>
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'monthly'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly Summary
              </button>
            </div>

            {/* Date Picker (Daily) or Month Picker (Monthly) */}
            {viewMode === 'daily' ? (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-medium text-foreground outline-none cursor-pointer shadow-sm hover:border-foreground/30 focus:border-foreground transition-colors"
                />
                <div className="hidden sm:flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border">
                  <button
                    onClick={() => setQuickDate('today')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      selectedDate === getTodayIST()
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setQuickDate('yesterday')}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    Yesterday
                  </button>
                </div>
              </div>
            ) : (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-medium text-foreground outline-none cursor-pointer shadow-sm hover:border-foreground/30 focus:border-foreground transition-colors"
              />
            )}

            {/* Auto-Refresh Indicator / Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-medium text-foreground hover:bg-muted/50 transition-colors shadow-sm"
              title={autoRefresh ? 'Auto-refresh active (30s)' : 'Auto-refresh paused'}
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-foreground animate-pulse' : 'bg-muted-foreground/40'}`} />
              <span className="hidden md:inline text-muted-foreground">Auto-Sync</span>
            </button>

            {/* Manual Refresh Button */}
            <button
              onClick={() => viewMode === 'daily' ? fetchDailyReports() : fetchMonthlyReports()}
              disabled={loading}
              className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shadow-sm"
              title="Refresh Data"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        }
      />

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-3 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DAILY VIEW MODE */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'daily' && (
        <>
          {/* 6 Top Overview KPI Cards: Real Aggregations */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* Total Active Staff */}
            <div className="p-4 rounded-2xl border border-border bg-card shadow-sm hover:border-foreground/20 transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Total Staff</span>
                <Users size={16} className="text-muted-foreground" />
              </div>
              <span className="text-2xl font-extrabold text-foreground mt-2 block font-mono">{overview.totalEmployees}</span>
              <span className="text-[11px] text-muted-foreground">Authorized staff</span>
            </div>

            {/* Currently Working */}
            <div className="p-4 rounded-2xl border border-border bg-card shadow-sm hover:border-foreground/20 transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Working Now</span>
                <Activity size={16} className="text-muted-foreground" />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-2xl font-extrabold text-foreground font-mono">{overview.currentlyWorking}</span>
                {overview.currentlyWorking > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">Active telemetry</span>
            </div>

            {/* On Break */}
            <div className="p-4 rounded-2xl border border-border bg-card shadow-sm hover:border-foreground/20 transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">On Break</span>
                <Coffee size={16} className="text-muted-foreground" />
              </div>
              <span className="text-2xl font-extrabold text-foreground mt-2 block font-mono">{overview.onBreak}</span>
              <span className="text-[11px] text-muted-foreground font-medium">Paused intervals</span>
            </div>

            {/* Currently Idle */}
            <div className="p-4 rounded-2xl border border-border bg-card shadow-sm hover:border-foreground/20 transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Idle</span>
                <Moon size={16} className="text-muted-foreground" />
              </div>
              <span className="text-2xl font-extrabold text-foreground mt-2 block font-mono">{overview.currentlyIdle}</span>
              <span className="text-[11px] text-muted-foreground font-medium">Inactivity &gt; 5m</span>
            </div>

            {/* Total Worked Hours */}
            <div className="p-4 rounded-2xl border border-border bg-card shadow-sm hover:border-foreground/20 transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Worked Hours</span>
                <Clock size={16} className="text-muted-foreground" />
              </div>
              <span className="text-2xl font-extrabold text-foreground mt-2 block font-mono">
                {overview.totalWorkedHoursFormatted}
              </span>
              <span className="text-[11px] text-muted-foreground">All sessions today</span>
            </div>

            {/* Total Active Hours */}
            <div className="p-4 rounded-2xl border border-border bg-card shadow-sm hover:border-foreground/20 transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Active Hours</span>
                <Timer size={16} className="text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-extrabold text-foreground font-mono">
                  {overview.totalActiveHoursFormatted}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {overview.activeEfficiencyPercent}% efficiency
              </span>
            </div>
          </div>

          {/* Real Hourly Active Distribution Bar Chart */}
          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <BarChart2 size={18} className="text-foreground" />
                  <span>Hourly Active Distribution ({selectedDate})</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Accumulated active hours logged across authorized employees per business hour (IST)
                </p>
              </div>

              {/* Department Quick Filter */}
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-muted-foreground" />
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="text-xs font-medium px-3 py-1.5 rounded-xl border border-border bg-card text-foreground outline-none cursor-pointer hover:border-foreground/30 focus:border-foreground shadow-sm transition-colors"
                >
                  {departmentOptions.map(dept => (
                    <option key={dept} value={dept}>{dept === 'All' ? 'All Departments' : dept}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bar Chart Visualization in Monochrome */}
            <div className="pt-2">
              <div className="h-44 flex items-end justify-between gap-2 sm:gap-4 border-b border-border pb-2">
                {(overview.hourlyData || []).map((item, idx) => {
                  const maxVal = Math.max(1, ...overview.hourlyData.map(h => h.active))
                  const heightPercent = Math.min(100, (item.active / maxVal) * 100)

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      <div className="w-full flex items-end justify-center h-full">
                        <div
                          className="w-3.5 sm:w-7 bg-foreground/85 hover:bg-foreground dark:bg-white/85 dark:hover:bg-white rounded-t-sm transition-all duration-300 relative cursor-pointer"
                          style={{ height: `${heightPercent > 0 ? heightPercent : 3}%` }}
                          title={`${item.hour}: ${item.active} hrs active`}
                        />
                      </div>
                      <span className="text-[11px] font-mono font-medium text-muted-foreground shrink-0">{item.hour}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Employee Time Reports Section */}
          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-5">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Employee Time Reports</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Verified tracking sessions and telemetry breakdown for {selectedDate}
                </p>
              </div>

              {/* Multi-Filters Bar */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                  <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search name, role, ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-all shadow-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="text-xs font-medium px-3 py-1.5 rounded-xl border border-border bg-card text-foreground outline-none cursor-pointer hover:border-foreground/30 focus:border-foreground shadow-sm transition-colors"
                >
                  <option value="All">All Statuses</option>
                  <option value="Working">Working</option>
                  <option value="On Break">On Break</option>
                  <option value="Idle">Idle</option>
                  <option value="Clocked Out">Clocked Out</option>
                  <option value="Not Started">Not Started</option>
                </select>

                {/* Employee Selector */}
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="text-xs font-medium px-3 py-1.5 rounded-xl border border-border bg-card text-foreground outline-none cursor-pointer max-w-[180px] truncate hover:border-foreground/30 focus:border-foreground shadow-sm transition-colors"
                >
                  <option value="All">All Staff</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Designation & Dept</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Clock In</th>
                    <th className="py-3 px-4">Clock Out</th>
                    <th className="py-3 px-4">Worked Hours</th>
                    <th className="py-3 px-4">Active Hours</th>
                    <th className="py-3 px-4">Last Sync</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDailyEmployees.length > 0 ? (
                    filteredDailyEmployees.map((emp) => (
                      <tr
                        key={emp.id}
                        onClick={() => setSelectedEmployee(emp)}
                        className="hover:bg-muted/30 cursor-pointer transition-colors group"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted text-foreground font-bold flex items-center justify-center shrink-0 border border-border text-xs">
                              {emp.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <span className="font-semibold text-foreground block">{emp.name}</span>
                              {emp.employee_id && (
                                <span className="text-[10px] text-muted-foreground font-mono">{emp.employee_id}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="text-foreground font-medium block">{emp.designation}</span>
                          <span className="text-[11px] text-muted-foreground">{emp.department}</span>
                        </td>

                        <td className="py-3 px-4">{renderStatusBadge(emp.status)}</td>
                        <td className="py-3 px-4 font-medium text-foreground">{emp.clockInTime}</td>
                        <td className="py-3 px-4 text-muted-foreground">{emp.clockOutTime}</td>
                        <td className="py-3 px-4 font-mono font-medium text-foreground">{emp.workedHours}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-foreground">{emp.activeHours}</td>
                        <td className="py-3 px-4 text-muted-foreground">{emp.lastSyncFormatted}</td>

                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedEmployee(emp)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
                            title="View Details"
                          >
                            <span>View Details</span>
                            <ChevronRight size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-muted-foreground">
                        {loading ? 'Querying verified time records...' : 'No employee records found matching criteria.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MONTHLY SUMMARY VIEW MODE */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'monthly' && (
        <>
          {/* Monthly Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-border bg-card shadow-sm hover:border-foreground/20 transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Total Monthly Worked</span>
                <Clock size={18} className="text-muted-foreground" />
              </div>
              <span className="text-2xl font-extrabold text-foreground mt-2 block font-mono">
                {monthlyOverview.totalMonthlyWorkedHours}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 block">{monthlyOverview.totalDaysLogged} total team days</span>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card shadow-sm hover:border-foreground/20 transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Total Monthly Active</span>
                <Activity size={18} className="text-muted-foreground" />
              </div>
              <span className="text-2xl font-extrabold text-foreground mt-2 block font-mono">
                {monthlyOverview.totalMonthlyActiveHours}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 block">Verified keystroke/mouse activity</span>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card shadow-sm hover:border-foreground/20 transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Active Staff Participating</span>
                <Users size={18} className="text-muted-foreground" />
              </div>
              <span className="text-2xl font-extrabold text-foreground mt-2 block font-mono">
                {monthlyOverview.totalStaffWithSessions} / {monthlyOverview.totalEmployees}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 block">Staff with desktop sessions</span>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card shadow-sm hover:border-foreground/20 transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Avg Daily Active Hours</span>
                <TrendingUp size={18} className="text-muted-foreground" />
              </div>
              <span className="text-2xl font-extrabold text-foreground mt-2 block font-mono">
                {monthlyOverview.avgDailyActiveHours}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 block">Per worked employee day</span>
            </div>
          </div>

          {/* Monthly Employee Summary Table */}
          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Monthly Employee Summaries ({selectedMonth})</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Aggregated hours and days worked per employee for the month
                </p>
              </div>

              {/* Search */}
              <div className="relative max-w-xs w-full">
                <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search staff, designation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Designation & Dept</th>
                    <th className="py-3 px-4">Days Worked</th>
                    <th className="py-3 px-4">Total Worked</th>
                    <th className="py-3 px-4">Total Active</th>
                    <th className="py-3 px-4">Avg Active / Day</th>
                    <th className="py-3 px-4">Total Sessions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredMonthlyEmployees.length > 0 ? (
                    filteredMonthlyEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted text-foreground font-bold flex items-center justify-center shrink-0 border border-border text-xs">
                              {emp.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <span className="font-semibold text-foreground block">{emp.name}</span>
                              {emp.employee_id && (
                                <span className="text-[10px] text-muted-foreground font-mono">{emp.employee_id}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="text-foreground font-medium block">{emp.designation}</span>
                          <span className="text-[11px] text-muted-foreground">{emp.department}</span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-semibold text-foreground px-2 py-0.5 rounded bg-muted border border-border">
                            {emp.daysWorked} days
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono font-medium text-foreground">{emp.totalWorkedHours}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-foreground">{emp.totalActiveHours}</td>
                        <td className="py-3 px-4 font-mono font-medium text-foreground">{emp.avgActivePerDayHours}</td>
                        <td className="py-3 px-4 text-muted-foreground">{emp.totalSessions}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        {loading ? 'Calculating monthly aggregations...' : 'No monthly records found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
