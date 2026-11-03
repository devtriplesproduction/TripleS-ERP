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
  ChevronLeft,
  ShieldCheck,
  Building2,
  TrendingUp,
  BarChart2,
  X,
  Camera,
  Download,
  ArrowUpDown,
  Filter,
  Eye,
  SlidersHorizontal,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Monitor,
  RotateCcw,
  User,
  Check,
  LayoutDashboard
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { EmployeeScreenshotsGallery } from './EmployeeScreenshotsGallery'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
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

  // View Mode: Daily, Screenshots, or Monthly
  const [viewMode, setViewMode] = useState<'daily' | 'screenshots' | 'monthly'>('daily')

  // Daily Filters
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIST())
  const [selectedDept, setSelectedDept] = useState<string>('All')
  const [selectedStatus, setSelectedStatus] = useState<string>('All')
  const [selectedEmpId, setSelectedEmpId] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Sorting
  const [sortBy, setSortBy] = useState<'worked' | 'active' | 'name' | 'status' | 'sync'>('worked')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Pagination for Daily Table
  const [dailyPage, setDailyPage] = useState<number>(1)
  const [dailyPageSize, setDailyPageSize] = useState<number>(10)

  // Monthly Filters & Pagination
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthIST())
  const [monthlyPage, setMonthlyPage] = useState<number>(1)
  const [monthlyPageSize, setMonthlyPageSize] = useState<number>(10)

  // Auto-refresh state (every 30 seconds)
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date())

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
    totalScreenshots: 0,
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
  const [detailTab, setDetailTab] = useState<'timeline' | 'applications' | 'screenshots' | 'sessions' | 'sync'>('timeline')

  // Hover state for hourly chart bar
  const [hoveredHourIndex, setHoveredHourIndex] = useState<number | null>(null)

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Step Date forward or backward by N days
  const stepDate = (days: number) => {
    try {
      const parts = selectedDate.split('-').map(Number)
      const d = new Date(parts[0], parts[1] - 1, parts[2])
      d.setDate(d.getDate() + days)
      const newDateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(d)
      setSelectedDate(newDateStr)
      setDailyPage(1)
    } catch {
      // ignore
    }
  }

  // Step Month forward or backward by N months
  const stepMonth = (months: number) => {
    try {
      const parts = selectedMonth.split('-').map(Number)
      const d = new Date(parts[0], parts[1] - 1 + months, 1)
      const newMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      setSelectedMonth(newMonthStr)
      setMonthlyPage(1)
    } catch {
      // ignore
    }
  }

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return searchQuery.trim() !== '' || selectedStatus !== 'All' || selectedDept !== 'All' || selectedEmpId !== 'All'
  }, [searchQuery, selectedStatus, selectedDept, selectedEmpId])

  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedStatus('All')
    setSelectedDept('All')
    setSelectedEmpId('All')
    setSortBy('worked')
    setSortOrder('desc')
    setDailyPage(1)
  }

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
          totalScreenshots: 0,
          hourlyData: []
        })
        setLastRefreshedAt(new Date())

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
        setLastRefreshedAt(new Date())
      } else {
        throw new Error(data.error || 'Failed to load monthly summary')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching monthly summary')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [selectedMonth, selectedDept])

  // Read URL query params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search)
      const tabParam = sp.get('tab') || sp.get('mode')
      if (tabParam === 'screenshots') {
        setViewMode('screenshots')
      }
      const empParam = sp.get('employeeId')
      if (empParam) {
        setSelectedEmpId(empParam)
      }
      const dateParam = sp.get('date')
      if (dateParam) {
        setSelectedDate(dateParam)
      }
    }
  }, [])

  // Trigger fetch when mode or filters change
  useEffect(() => {
    if (viewMode === 'daily' || viewMode === 'screenshots') {
      fetchDailyReports()
    } else {
      fetchMonthlyReports()
    }
  }, [viewMode, selectedDate, selectedMonth, selectedDept, selectedStatus, selectedEmpId])

  // Auto-refresh interval (every 30 seconds for live telemetry)
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      if (viewMode === 'daily' || viewMode === 'screenshots') {
        fetchDailyReports(true)
      } else {
        fetchMonthlyReports(true)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh, viewMode, fetchDailyReports, fetchMonthlyReports])

  // Distinct departments for dropdown
  const departmentOptions = useMemo(() => {
    const set = new Set<string>()
    employees.forEach(e => {
      if (e.department && e.department !== 'General') set.add(e.department)
    })
    return ['All', 'Development', 'Content', 'Management', ...Array.from(set).filter(d => !['Development', 'Content', 'Management'].includes(d))]
  }, [employees])

  // Status counts for status filter pills
  const statusCounts = useMemo(() => {
    const counts = {
      All: employees.length,
      Working: 0,
      'On Break': 0,
      Idle: 0,
      'Clocked Out': 0,
      'Not Started': 0
    }
    employees.forEach(e => {
      if (e.status in counts) {
        counts[e.status as keyof typeof counts]++
      }
    })
    return counts
  }, [employees])

  // Filtered and sorted employees for Daily View
  const filteredDailyEmployees = useMemo(() => {
    let list = employees

    // Status filter
    if (selectedStatus !== 'All') {
      list = list.filter(e => e.status === selectedStatus)
    }

    // Department filter
    if (selectedDept !== 'All') {
      list = list.filter(e => e.department.toLowerCase() === selectedDept.toLowerCase())
    }

    // Employee ID filter
    if (selectedEmpId !== 'All') {
      list = list.filter(e => e.id === selectedEmpId)
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        (e.employee_id && e.employee_id.toLowerCase().includes(q))
      )
    }

    // Sorting
    return [...list].sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'worked':
          comparison = (b.workedMinutes || 0) - (a.workedMinutes || 0)
          break
        case 'active':
          comparison = (b.activeMinutes || 0) - (a.activeMinutes || 0)
          break
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'sync': {
          const syncA = a.lastSync ? new Date(a.lastSync).getTime() : 0
          const syncB = b.lastSync ? new Date(b.lastSync).getTime() : 0
          comparison = syncB - syncA
          break
        }
        default:
          comparison = 0
      }
      return sortOrder === 'desc' ? comparison : -comparison
    })
  }, [employees, selectedStatus, selectedDept, selectedEmpId, searchQuery, sortBy, sortOrder])

  // Paginated daily employees
  const totalDailyPages = Math.ceil(filteredDailyEmployees.length / dailyPageSize) || 1
  const paginatedDailyEmployees = useMemo(() => {
    const start = (dailyPage - 1) * dailyPageSize
    return filteredDailyEmployees.slice(start, start + dailyPageSize)
  }, [filteredDailyEmployees, dailyPage, dailyPageSize])

  // Filtered and sorted monthly employees
  const filteredMonthlyEmployees = useMemo(() => {
    let list = monthlyEmployees

    // Department filter
    if (selectedDept !== 'All') {
      list = list.filter(e => e.department.toLowerCase() === selectedDept.toLowerCase())
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        (e.employee_id && e.employee_id.toLowerCase().includes(q))
      )
    }

    return list
  }, [monthlyEmployees, selectedDept, searchQuery])

  // Paginated monthly employees
  const totalMonthlyPages = Math.ceil(filteredMonthlyEmployees.length / monthlyPageSize) || 1
  const paginatedMonthlyEmployees = useMemo(() => {
    const start = (monthlyPage - 1) * monthlyPageSize
    return filteredMonthlyEmployees.slice(start, start + monthlyPageSize)
  }, [filteredMonthlyEmployees, monthlyPage, monthlyPageSize])

  // Find peak hour in hourly data
  const peakHour = useMemo(() => {
    if (!overview.hourlyData || overview.hourlyData.length === 0) return null
    let peak = overview.hourlyData[0]
    for (const h of overview.hourlyData) {
      if (h.active > peak.active) {
        peak = h
      }
    }
    return peak.active > 0 ? peak : null
  }, [overview.hourlyData])

  // Client-side CSV Exporters
  const exportDailyCSV = () => {
    const headers = [
      'Employee ID',
      'Name',
      'Department',
      'Designation',
      'Status',
      'Clock In',
      'Clock Out',
      'Worked Hours',
      'Active Hours',
      'Idle Hours',
      'Screenshots',
      'Last Sync'
    ]
    const rows = filteredDailyEmployees.map(e => {
      return [
        `"${e.employee_id || ''}"`,
        `"${e.name}"`,
        `"${e.department}"`,
        `"${e.designation}"`,
        `"${e.status}"`,
        `"${e.clockInTime}"`,
        `"${e.clockOutTime}"`,
        `"${e.workedHours}"`,
        `"${e.activeHours}"`,
        `"${e.idleHours}"`,
        `"${e.screenshotCount || 0}"`,
        `"${e.lastSyncFormatted}"`
      ].join(',')
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `time-tracking-daily-${selectedDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportMonthlyCSV = () => {
    const headers = [
      'Employee ID',
      'Name',
      'Department',
      'Designation',
      'Days Worked',
      'Total Worked Hours',
      'Total Active Hours',
      'Avg Active / Day',
      'Total Sessions'
    ]
    const rows = filteredMonthlyEmployees.map(e => [
      `"${e.employee_id || ''}"`,
      `"${e.name}"`,
      `"${e.department}"`,
      `"${e.designation}"`,
      `"${e.daysWorked}"`,
      `"${e.totalWorkedHours}"`,
      `"${e.totalActiveHours}"`,
      `"${e.avgActivePerDayHours}"`,
      `"${e.totalSessions}"`
    ].join(','))

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `timesheet-summary-${selectedMonth}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Restrained Status Badge Component
  const renderStatusBadge = (status: EmployeeReportItem['status']) => {
    switch (status) {
      case 'Working':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Working
          </span>
        )
      case 'On Break':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs">
            <Coffee size={12} className="text-amber-500" />
            On Break
          </span>
        )
      case 'Idle':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20 shadow-xs">
            <Moon size={12} className="text-slate-500" />
            Idle (&gt;5m)
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
    // Find current employee index for next/prev stepping
    const currentIndex = filteredDailyEmployees.findIndex(e => e.id === selectedEmployee.id)
    const prevEmployee = currentIndex > 0 ? filteredDailyEmployees[currentIndex - 1] : null
    const nextEmployee = currentIndex < filteredDailyEmployees.length - 1 ? filteredDailyEmployees[currentIndex + 1] : null

    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
        {/* Navigation & Toolbar Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-3 sm:p-4 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedEmployee(null)}
              className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-xl border border-border bg-muted/30 hover:bg-muted/70 shadow-xs"
            >
              <ArrowLeft size={16} />
              <span>Back to Dashboard</span>
            </button>

            {/* Quick Next/Prev Employee Stepper */}
            <div className="flex items-center gap-1 border-l border-border pl-2 ml-1">
              <button
                onClick={() => prevEmployee && setSelectedEmployee(prevEmployee)}
                disabled={!prevEmployee}
                className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors shadow-xs"
                title={prevEmployee ? `Previous: ${prevEmployee.name}` : 'No previous employee'}
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-[11px] font-mono text-muted-foreground px-1.5">
                {currentIndex + 1} of {filteredDailyEmployees.length}
              </span>
              <button
                onClick={() => nextEmployee && setSelectedEmployee(nextEmployee)}
                disabled={!nextEmployee}
                className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors shadow-xs"
                title={nextEmployee ? `Next: ${nextEmployee.name}` : 'No next employee'}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-muted/20 text-xs font-medium text-foreground shadow-xs">
              <Calendar size={13} className="text-muted-foreground" />
              <span className="font-mono">{selectedDate}</span>
            </div>

            <button
              onClick={() => fetchDailyReports()}
              disabled={loading}
              className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shadow-xs"
              title="Refresh Telemetry"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-primary' : ''} />
            </button>
          </div>
        </div>

        {/* Employee Header Profile Card */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* Dynamic Avatar with Initial */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-muted border border-primary/20 text-primary font-bold text-xl flex items-center justify-center shadow-xs shrink-0">
              {selectedEmployee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
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
                <span className="font-medium text-foreground">{selectedEmployee.designation}</span>
                <span>•</span>
                <span>{selectedEmployee.department}</span>
              </p>
            </div>
          </div>

          {/* Metric Cards Header */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 w-full lg:w-auto">
            {/* Worked Time */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/20 min-w-[110px]">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
                <Clock size={13} className="text-violet-500" />
                <span>Worked Hours</span>
              </div>
              <span className="text-lg font-bold text-foreground mt-1 block font-mono">
                {selectedEmployee.workedHours}
              </span>
            </div>

            {/* Active Time */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/20 min-w-[110px]">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
                <Activity size={13} className="text-emerald-500" />
                <span>Active Hours</span>
              </div>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1 block font-mono">
                {selectedEmployee.activeHours}
              </span>
            </div>

            {/* Idle Time */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/20 min-w-[110px]">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
                <Moon size={13} className="text-slate-500" />
                <span>Idle Hours</span>
              </div>
              <span className="text-lg font-bold text-foreground mt-1 block font-mono">
                {selectedEmployee.idleHours}
              </span>
            </div>

            {/* Suspend */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/20 min-w-[110px]">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
                <ShieldCheck size={13} className="text-violet-500" />
                <span>Suspend</span>
              </div>
              <span className="text-lg font-bold text-foreground mt-1 block font-mono">
                {Math.round(selectedEmployee.suspendedSeconds / 60)}m
              </span>
            </div>

            {/* Screenshots */}
            <div
              onClick={() => setDetailTab('screenshots')}
              className={cn(
                "p-3.5 rounded-xl border cursor-pointer transition-all min-w-[110px]",
                detailTab === 'screenshots'
                  ? "border-primary bg-primary/10 text-primary shadow-xs"
                  : "border-border bg-muted/20 text-muted-foreground hover:border-primary/50"
              )}
              title="Click to view desktop screenshots"
            >
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <Camera size={13} className="text-rose-500" />
                <span>Screenshots</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-bold text-foreground font-mono">
                  {selectedEmployee.screenshotCount || selectedEmployee.screenshots?.length || 0}
                </span>
                {(selectedEmployee.screenshotCount || 0) > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-semibold">
                    View
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sync & Health Alert Warning if any */}
        {selectedEmployee.syncHealth.warningMessage && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-center gap-3 text-sm">
            <AlertTriangle size={18} className="shrink-0 text-amber-500" />
            <div>
              <span className="font-semibold">Telemetry Notice: </span>
              <span>{selectedEmployee.syncHealth.warningMessage}</span>
            </div>
          </div>
        )}

        {/* Drilldown Tabbed Content */}
        <div className="border border-border rounded-2xl bg-card shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setDetailTab('timeline')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all",
                  detailTab === 'timeline'
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                Activity Timeline ({selectedEmployee.timeline.length})
              </button>

              <button
                onClick={() => setDetailTab('applications')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all",
                  detailTab === 'applications'
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                Observed Applications ({selectedEmployee.applications.length})
              </button>

              <button
                onClick={() => setDetailTab('screenshots')}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all",
                  detailTab === 'screenshots'
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Camera size={14} />
                <span>Screenshots ({selectedEmployee.screenshotCount || selectedEmployee.screenshots?.length || 0})</span>
              </button>

              <button
                onClick={() => setDetailTab('sessions')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all",
                  detailTab === 'sessions'
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                Sessions & Breaks ({selectedEmployee.sessionCount})
              </button>

              <button
                onClick={() => setDetailTab('sync')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all",
                  detailTab === 'sync'
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                Sync & Telemetry
              </button>
            </div>

            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span>Last Sync:</span>
              <span className="font-semibold text-foreground font-mono">{selectedEmployee.lastSyncFormatted}</span>
            </div>
          </div>

          {/* TAB 1: Chronological Activity Timeline */}
          {detailTab === 'timeline' && (
            <div>
              {selectedEmployee.timeline.length > 0 ? (
                <div className="relative pl-7 space-y-5 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {selectedEmployee.timeline.map((event) => {
                    const isClockIn = event.type === 'clock_in'
                    const isClockOut = event.type === 'clock_out'
                    const isBreakStart = event.type === 'break_start'
                    const isBreakEnd = event.type === 'break_end'

                    return (
                      <div key={event.id} className="relative flex items-start gap-4 group">
                        <div
                          className={cn(
                            "absolute -left-7 top-1 w-4 h-4 rounded-full border-2 border-card flex items-center justify-center text-white",
                            isClockIn ? "bg-emerald-500" :
                            isClockOut ? "bg-slate-500" :
                            (isBreakStart || isBreakEnd) ? "bg-amber-500" :
                            "bg-blue-500"
                          )}
                        />
                        <span className="text-xs font-mono font-bold text-muted-foreground shrink-0 w-20 pt-0.5">
                          {event.time}
                        </span>
                        <div className="flex-1 bg-muted/20 border border-border rounded-xl p-3.5 hover:border-foreground/20 transition-colors">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                              {isClockIn && <CheckCircle2 size={14} className="text-emerald-500" />}
                              {isClockOut && <CheckCircle2 size={14} className="text-slate-500" />}
                              {(isBreakStart || isBreakEnd) && <Coffee size={14} className="text-amber-500" />}
                              {!isClockIn && !isClockOut && !isBreakStart && !isBreakEnd && (
                                <Activity size={14} className="text-blue-500" />
                              )}
                              <span>{event.title}</span>
                            </h4>
                            {event.duration && (
                              <span className="text-[11px] font-mono font-semibold text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-md">
                                {event.duration}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{event.subtitle}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Clock size={36} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No activity intervals recorded for this employee on {selectedDate}.</p>
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
                        <div className="flex items-center gap-2.5 font-semibold text-foreground">
                          <div className="p-1.5 rounded-lg bg-card border border-border text-primary">
                            <Laptop size={14} />
                          </div>
                          <span>{app.name}</span>
                        </div>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-xs text-muted-foreground">{app.duration}</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-card border border-border text-foreground">
                            {app.percent}%
                          </span>
                        </div>
                      </div>

                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden border border-border/40">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${app.percent}%` }}
                        />
                      </div>

                      {app.sampleWindows && app.sampleWindows.length > 0 && (
                        <div className="pt-1 flex flex-wrap gap-1.5">
                          {app.sampleWindows.map((win, wIdx) => (
                            <span key={wIdx} className="text-[11px] px-2.5 py-0.5 rounded-md bg-card text-muted-foreground border border-border truncate max-w-md" title={win}>
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
                  <Laptop size={36} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No application window telemetry logged for this employee on {selectedDate}.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Desktop Screenshots Gallery */}
          {detailTab === 'screenshots' && (
            <EmployeeScreenshotsGallery
              screenshots={selectedEmployee.screenshots || []}
              employeeName={selectedEmployee.name}
              selectedDate={selectedDate}
              sessions={selectedEmployee.sessions}
            />
          )}

          {/* TAB 4: Sessions & Breaks Detailed Intervals */}
          {detailTab === 'sessions' && (
            <div className="space-y-6">
              {/* Sessions Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Layers size={14} />
                  <span>Sessions on {selectedDate} ({selectedEmployee.sessions.length})</span>
                </h4>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="py-3 px-4">Session ID</th>
                        <th className="py-3 px-4">Clock In</th>
                        <th className="py-3 px-4">Clock Out</th>
                        <th className="py-3 px-4">Worked</th>
                        <th className="py-3 px-4">Active</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedEmployee.sessions.map((s) => (
                        <tr key={s.id} className="hover:bg-muted/20">
                          <td className="py-3 px-4 font-mono text-muted-foreground">{s.id.slice(0, 8)}...</td>
                          <td className="py-3 px-4 font-medium text-foreground">{formatISTTime(s.clock_in)}</td>
                          <td className="py-3 px-4 text-muted-foreground">{s.clock_out ? formatISTTime(s.clock_out) : 'In Progress'}</td>
                          <td className="py-3 px-4 font-mono font-medium text-foreground">{Math.floor(s.worked_minutes / 60)}h {(s.worked_minutes % 60).toString().padStart(2, '0')}m</td>
                          <td className="py-3 px-4 font-mono font-semibold text-emerald-600 dark:text-emerald-400">{Math.floor(s.active_minutes / 60)}h {(s.active_minutes % 60).toString().padStart(2, '0')}m</td>
                          <td className="py-3 px-4 font-medium capitalize text-muted-foreground">{s.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Breaks Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Coffee size={14} />
                  <span>Registered Break Intervals ({selectedEmployee.breaks.length})</span>
                </h4>
                {selectedEmployee.breaks.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                        <tr>
                          <th className="py-3 px-4">Reason</th>
                          <th className="py-3 px-4">Start Time</th>
                          <th className="py-3 px-4">End Time</th>
                          <th className="py-3 px-4">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selectedEmployee.breaks.map((b) => (
                          <tr key={b.id} className="hover:bg-muted/20">
                            <td className="py-3 px-4 font-semibold text-foreground">{b.reason}</td>
                            <td className="py-3 px-4 text-muted-foreground">{b.startTime}</td>
                            <td className="py-3 px-4 text-muted-foreground">{b.endTime}</td>
                            <td className="py-3 px-4 font-mono font-medium text-foreground">{b.duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic bg-muted/20 p-4 rounded-xl border border-border">
                    No break intervals recorded today.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Telemetry & Sync Health */}
          {detailTab === 'sync' && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl border border-border bg-muted/20 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={cn("w-3 h-3 rounded-full", selectedEmployee.syncHealth.isHealthy ? "bg-emerald-500" : "bg-amber-500 animate-pulse")} />
                  <h4 className="text-sm font-bold text-foreground">
                    Telemetry Status: {selectedEmployee.syncHealth.isHealthy ? 'Healthy & Synchronized' : 'Telemetry Attention Recommended'}
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-2">
                  <div className="p-3 bg-card border border-border rounded-xl">
                    <span className="text-muted-foreground block mb-1">Last Sync Timestamp:</span>
                    <span className="font-semibold text-foreground font-mono">{selectedEmployee.lastSyncFormatted}</span>
                  </div>
                  <div className="p-3 bg-card border border-border rounded-xl">
                    <span className="text-muted-foreground block mb-1">Session Security:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Canonical Profile Bound</span>
                  </div>
                  <div className="p-3 bg-card border border-border rounded-xl">
                    <span className="text-muted-foreground block mb-1">Sleep & Suspend Logged:</span>
                    <span className="font-semibold text-foreground font-mono">{selectedEmployee.suspendedSeconds}s detected</span>
                  </div>
                  <div className="p-3 bg-card border border-border rounded-xl">
                    <span className="text-muted-foreground block mb-1">Activity Heartbeats:</span>
                    <span className="font-semibold text-foreground font-mono">
                      {selectedEmployee.timeline.filter(t => t.type === 'activity').length} synced
                    </span>
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
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Top Telemetry Header & Actions */}
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span>Time Tracking & Activity Analytics</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hidden sm:inline-flex items-center gap-1.5 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Telemetry
            </span>
          </div>
        }
        subtitle="Real-time employee desktop time tracking, activity telemetry, and verified screen captures (Admin Only)"
        icon={Clock}
        iconClassName="text-foreground"
        actions={
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            {/* Auto-Refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all shadow-xs",
                autoRefresh
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
              title={autoRefresh ? 'Live Auto-Sync active (30s interval)' : 'Auto-Sync paused'}
            >
              <span className={cn("w-2 h-2 rounded-full", autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40")} />
              <span className="hidden md:inline font-semibold">{autoRefresh ? 'Live' : 'Paused'}</span>
            </button>

            {/* Manual Refresh Button */}
            <button
              onClick={() => (viewMode === 'daily' || viewMode === 'screenshots') ? fetchDailyReports() : fetchMonthlyReports()}
              disabled={loading}
              className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shadow-xs"
              title="Refresh Data"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-primary' : ''} />
            </button>

            {/* Export CSV Button */}
            <button
              onClick={viewMode === 'monthly' ? exportMonthlyCSV : exportDailyCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted/50 text-xs font-semibold text-foreground transition-all shadow-xs"
              title="Export Timesheet CSV"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        }
      />

      {/* Segmented View Mode & Date Navigation Toolbar */}
      <div className="p-3 sm:p-4 bg-card border border-border rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        {/* Left: Mode Toggle */}
        <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border shadow-xs overflow-x-auto">
          <button
            onClick={() => setViewMode('daily')}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
              viewMode === 'daily'
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock size={13} />
            <span>Daily Tracking</span>
          </button>

          <button
            onClick={() => setViewMode('screenshots')}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
              viewMode === 'screenshots'
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Camera size={13} />
            <span>Screenshots</span>
            {(overview.totalScreenshots || 0) > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-primary/15 text-primary">
                {overview.totalScreenshots}
              </span>
            )}
          </button>

          <button
            onClick={() => setViewMode('monthly')}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
              viewMode === 'monthly'
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BarChart2 size={13} />
            <span>Monthly Summary</span>
          </button>
        </div>

        {/* Right: Date Navigation */}
        <div className="flex items-center justify-end gap-2">
          {viewMode === 'daily' || viewMode === 'screenshots' ? (
            <div className="flex items-center gap-1 bg-muted/30 border border-border p-1 rounded-xl shadow-xs">
              <button
                onClick={() => stepDate(-1)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                title="Previous Day"
              >
                <ChevronLeft size={14} />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  setDailyPage(1)
                }}
                className="px-2 py-1 bg-transparent text-xs font-medium text-foreground outline-none cursor-pointer border-none font-mono"
              />
              <button
                onClick={() => stepDate(1)}
                disabled={selectedDate >= getTodayIST()}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 transition-colors"
                title="Next Day"
              >
                <ChevronRight size={14} />
              </button>
              {selectedDate !== getTodayIST() && (
                <button
                  onClick={() => {
                    setSelectedDate(getTodayIST())
                    setDailyPage(1)
                  }}
                  className="px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors ml-1"
                >
                  Today
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-muted/30 border border-border p-1 rounded-xl shadow-xs">
              <button
                onClick={() => stepMonth(-1)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft size={14} />
              </button>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value)
                  setMonthlyPage(1)
                }}
                className="px-2 py-1 bg-transparent text-xs font-medium text-foreground outline-none cursor-pointer border-none font-mono"
              />
              <button
                onClick={() => stepMonth(1)}
                disabled={selectedMonth >= getCurrentMonthIST()}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 transition-colors"
                title="Next Month"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-3 text-sm shadow-xs">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DAILY VIEW MODE */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'daily' && (
        <>
          {/* Top 7 Overview KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-3.5">
            {/* Total Staff */}
            <div className="p-4 rounded-2xl border border-border bg-card shadow-xs hover:border-foreground/20 transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Total Staff</span>
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Users size={14} />
                </div>
              </div>
              <span className="text-2xl font-extrabold text-foreground mt-2 block font-mono">{overview.totalEmployees}</span>
              <span className="text-[11px] text-muted-foreground">Authorized staff</span>
            </div>

            {/* Currently Working */}
            <div className="p-4 rounded-2xl border border-border bg-card shadow-xs hover:border-foreground/20 transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Working Now</span>
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Activity size={14} />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{overview.currentlyWorking}</span>
                {overview.currentlyWorking > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">Active telemetry</span>
            </div>

            {/* On Break */}
            <div className="p-4 rounded-2xl border border-border bg-card shadow-xs hover:border-foreground/20 transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">On Break</span>
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Coffee size={14} />
                </div>
              </div>
              <span className="text-2xl font-extrabold text-foreground mt-2 block font-mono">{overview.onBreak}</span>
              <span className="text-[11px] text-muted-foreground font-medium">Paused intervals</span>
            </div>

            {/* Currently Idle */}
            <div className="p-4 rounded-2xl border border-border bg-card shadow-xs hover:border-foreground/20 transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Idle</span>
                <div className="p-1.5 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400">
                  <Moon size={14} />
                </div>
              </div>
              <span className="text-2xl font-extrabold text-foreground mt-2 block font-mono">{overview.currentlyIdle}</span>
              <span className="text-[11px] text-muted-foreground font-medium">Inactivity &gt; 5m</span>
            </div>

            {/* Total Worked Hours */}
            <div className="p-4 rounded-2xl border border-border bg-card shadow-xs hover:border-foreground/20 transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Worked Hours</span>
                <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Clock size={14} />
                </div>
              </div>
              <span className="text-2xl font-extrabold text-foreground mt-2 block font-mono">
                {overview.totalWorkedHoursFormatted}
              </span>
              <span className="text-[11px] text-muted-foreground">All sessions today</span>
            </div>

            {/* Total Active Hours */}
            <div className="p-4 rounded-2xl border border-border bg-card shadow-xs hover:border-foreground/20 transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Active Hours</span>
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <Timer size={14} />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-extrabold text-foreground font-mono">
                  {overview.totalActiveHoursFormatted}
                </span>
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Active telemetry today
              </span>
            </div>

            {/* Desktop Screenshots */}
            <div
              onClick={() => setViewMode('screenshots')}
              className="p-4 rounded-2xl border border-border bg-card shadow-xs hover:border-primary/50 transition-all cursor-pointer group"
              title="Click to view all desktop screenshots"
            >
              <div className="flex items-center justify-between text-muted-foreground group-hover:text-primary transition-colors">
                <span className="text-xs font-semibold">Screenshots</span>
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <Camera size={14} />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-2xl font-extrabold text-foreground font-mono group-hover:text-primary transition-colors">
                  {overview.totalScreenshots || 0}
                </span>
                {(overview.totalScreenshots || 0) > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold">
                    View
                  </span>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground">Captured frames</span>
            </div>
          </div>

          {/* Hourly Active Distribution Bar Chart */}
          <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <BarChart2 size={18} className="text-foreground" />
                  <h3 className="text-base font-bold text-foreground">
                    Hourly Active Distribution ({selectedDate})
                  </h3>
                  {peakHour && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      <Sparkles size={11} />
                      Peak: {peakHour.hour} ({peakHour.active}h)
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Accumulated active hours logged across authorized employees per business hour (IST)
                </p>
              </div>

              {/* Department Selector */}
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-muted-foreground" />
                <select
                  value={selectedDept}
                  onChange={(e) => {
                    setSelectedDept(e.target.value)
                    setDailyPage(1)
                  }}
                  className="text-xs font-medium px-3 py-1.5 rounded-xl border border-border bg-card text-foreground outline-none cursor-pointer hover:border-foreground/30 focus:border-foreground shadow-xs transition-colors"
                >
                  {departmentOptions.map(dept => (
                    <option key={dept} value={dept}>{dept === 'All' ? 'All Departments' : dept}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Interactive Bar Chart Visualization */}
            <div className="pt-2 relative">
              <div className="h-44 flex items-end justify-between gap-2 sm:gap-4 border-b border-border pb-2 relative">
                {/* Horizontal reference guidelines */}
                <div className="absolute inset-x-0 top-0 border-b border-border/30 border-dashed pointer-events-none" />
                <div className="absolute inset-x-0 top-1/2 border-b border-border/30 border-dashed pointer-events-none" />

                {(overview.hourlyData || []).map((item, idx) => {
                  const maxVal = Math.max(1, ...overview.hourlyData.map(h => h.active))
                  const heightPercent = Math.min(100, (item.active / maxVal) * 100)
                  const isPeak = peakHour && peakHour.hour === item.hour && item.active > 0
                  const isHovered = hoveredHourIndex === idx

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative"
                      onMouseEnter={() => setHoveredHourIndex(idx)}
                      onMouseLeave={() => setHoveredHourIndex(null)}
                    >
                      {/* Tooltip Card on Hover */}
                      {isHovered && (
                        <div className="absolute -top-12 z-20 px-2.5 py-1.5 rounded-xl bg-popover text-popover-foreground border border-border shadow-lg text-[11px] font-mono whitespace-nowrap animate-in fade-in zoom-in-95 pointer-events-none">
                          <div className="font-bold">{item.hour}</div>
                          <div className="text-muted-foreground">{item.active} hrs active logged</div>
                        </div>
                      )}

                      <div className="w-full flex items-end justify-center h-full">
                        <div
                          className={cn(
                            "w-3.5 sm:w-7 rounded-t-sm transition-all duration-300 relative cursor-pointer",
                            isPeak
                              ? "bg-emerald-500 hover:bg-emerald-400 dark:bg-emerald-500"
                              : "bg-foreground/85 hover:bg-foreground dark:bg-white/85 dark:hover:bg-white"
                          )}
                          style={{ height: `${heightPercent > 0 ? heightPercent : 3}%` }}
                        />
                      </div>
                      <span className={cn(
                        "text-[11px] font-mono font-medium shrink-0 transition-colors",
                        isPeak ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-muted-foreground"
                      )}>
                        {item.hour}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Empty state hint if all hours are 0 */}
              {(overview.hourlyData || []).every(h => h.active === 0) && (
                <div className="mt-3 text-center text-xs text-muted-foreground">
                  No active telemetry logged for this date yet. Graph bars will populate as employees work.
                </div>
              )}
            </div>
          </div>

          {/* Employee Time Reports Section */}
          <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-5">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Employee Time Reports</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Verified tracking sessions and telemetry breakdown for {selectedDate}
                </p>
              </div>

              {/* Status Segmented Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(['All', 'Working', 'On Break', 'Idle', 'Clocked Out', 'Not Started'] as const).map((status) => {
                  const isActive = selectedStatus === status
                  const count = statusCounts[status] || 0

                  return (
                    <button
                      key={status}
                      onClick={() => {
                        setSelectedStatus(status)
                        setDailyPage(1)
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shadow-xs",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-border/60"
                      )}
                    >
                      {status === 'Working' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                      {status === 'On Break' && <Coffee size={11} className="text-amber-500" />}
                      {status === 'Idle' && <Moon size={11} className="text-slate-500" />}
                      {status === 'Clocked Out' && <CheckCircle2 size={11} className="text-muted-foreground" />}
                      <span>{status}</span>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                        isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Multi-Filters & Sorting Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/60">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                {/* Search */}
                <div className="relative flex-1 sm:flex-initial min-w-[220px]">
                  <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search name, role, ID..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setDailyPage(1)
                    }}
                    className="w-full pl-8 pr-8 py-1.5 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-all shadow-xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setDailyPage(1)
                      }}
                      className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Department Filter */}
                <select
                  value={selectedDept}
                  onChange={(e) => {
                    setSelectedDept(e.target.value)
                    setDailyPage(1)
                  }}
                  className="text-xs font-medium px-3 py-1.5 rounded-xl border border-border bg-card text-foreground outline-none cursor-pointer hover:border-foreground/30 focus:border-foreground shadow-xs transition-colors"
                >
                  {departmentOptions.map(dept => (
                    <option key={dept} value={dept}>{dept === 'All' ? 'All Departments' : dept}</option>
                  ))}
                </select>

                {/* Staff Selector */}
                <select
                  value={selectedEmpId}
                  onChange={(e) => {
                    setSelectedEmpId(e.target.value)
                    setDailyPage(1)
                  }}
                  className="text-xs font-medium px-3 py-1.5 rounded-xl border border-border bg-card text-foreground outline-none cursor-pointer max-w-[180px] truncate hover:border-foreground/30 focus:border-foreground shadow-xs transition-colors"
                >
                  <option value="All">All Staff ({employees.length})</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>

                {/* Reset Filters Shortcut */}
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shadow-xs"
                    title="Reset all active filters"
                  >
                    <RotateCcw size={12} />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Sorting Controls */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:inline">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-border bg-card text-foreground outline-none cursor-pointer hover:border-foreground/30 focus:border-foreground shadow-xs transition-colors"
                >
                  <option value="worked">Worked Time</option>
                  <option value="active">Active Time</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="status">Status</option>
                  <option value="sync">Last Sync</option>
                </select>

                <button
                  onClick={() => setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
                  className="p-1.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-colors shadow-xs"
                  title={`Sort direction: currently ${sortOrder === 'desc' ? 'Descending' : 'Ascending'}`}
                >
                  <ArrowUpDown size={14} />
                </button>
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
                    <th className="py-3 px-4">Screenshots</th>
                    <th className="py-3 px-4">Last Sync</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedDailyEmployees.length > 0 ? (
                    paginatedDailyEmployees.map((emp) => {
                      return (
                        <tr
                          key={emp.id}
                          onClick={() => setSelectedEmployee(emp)}
                          className="hover:bg-muted/30 cursor-pointer transition-colors group"
                        >
                          {/* Employee */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">
                                {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <div>
                                <span className="font-semibold text-foreground block group-hover:text-primary transition-colors">
                                  {emp.name}
                                </span>
                                {emp.employee_id && (
                                  <span className="text-[10px] text-muted-foreground font-mono">{emp.employee_id}</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Designation & Dept */}
                          <td className="py-3 px-4">
                            <span className="text-foreground font-medium block">{emp.designation}</span>
                            <span className="text-[11px] text-muted-foreground">{emp.department}</span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">{renderStatusBadge(emp.status)}</td>

                          {/* Clock In */}
                          <td className="py-3 px-4 font-mono font-medium text-foreground">{emp.clockInTime}</td>

                          {/* Clock Out */}
                          <td className="py-3 px-4 font-mono text-muted-foreground">
                            {emp.clockOutTime === 'In Progress' ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-sans text-xs">
                                In Progress
                              </span>
                            ) : (
                              emp.clockOutTime
                            )}
                          </td>

                          {/* Worked Hours */}
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-mono text-xs font-semibold px-2.5 py-1 gap-1.5 border-border shadow-2xs",
                                emp.workedMinutes > 0
                                  ? "bg-muted/40 text-foreground"
                                  : "bg-muted/20 text-muted-foreground opacity-60"
                              )}
                            >
                              <Clock size={12} className={cn("shrink-0", emp.workedMinutes > 0 ? "text-violet-500" : "text-muted-foreground")} />
                              <span>{emp.workedHours}</span>
                            </Badge>
                          </td>

                          {/* Active Hours */}
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-mono text-xs font-semibold px-2.5 py-1 gap-1.5 shadow-2xs",
                                emp.activeMinutes > 0
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                  : "border-border bg-muted/20 text-muted-foreground opacity-60"
                              )}
                            >
                              <Activity size={12} className={cn("shrink-0", emp.activeMinutes > 0 ? "text-emerald-500" : "text-muted-foreground")} />
                              <span>{emp.activeHours}</span>
                            </Badge>
                          </td>

                          {/* Screenshots */}
                          <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                            {(emp.screenshotCount || 0) > 0 ? (
                              <button
                                onClick={() => {
                                  setSelectedEmployee(emp)
                                  setDetailTab('screenshots')
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all shadow-xs"
                                title={`View ${emp.screenshotCount} screenshots for ${emp.name}`}
                              >
                                <Camera size={12} />
                                <span>{emp.screenshotCount}</span>
                              </button>
                            ) : (
                              <span className="text-muted-foreground text-xs pl-2">-</span>
                            )}
                          </td>

                          {/* Last Sync */}
                          <td className="py-3 px-4 font-mono text-muted-foreground">{emp.lastSyncFormatted}</td>

                          {/* Action Button */}
                          <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedEmployee(emp)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
                              title="Inspect Details"
                            >
                              <span>Inspect</span>
                              <ChevronRight size={13} />
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-muted-foreground">
                        {loading ? (
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw size={20} className="animate-spin text-primary" />
                            <span>Querying verified telemetry records...</span>
                          </div>
                        ) : hasActiveFilters ? (
                          <div className="space-y-3">
                            <p className="font-medium text-foreground">No employee records match the active filters.</p>
                            <button
                              onClick={handleResetFilters}
                              className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-primary transition-colors shadow-xs"
                            >
                              Reset All Filters
                            </button>
                          </div>
                        ) : (
                          'No employee records found for this date.'
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer & Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground pt-1 border-t border-border/40">
              <div className="flex items-center gap-2">
                <span>
                  Showing <strong className="text-foreground">{Math.min(filteredDailyEmployees.length, (dailyPage - 1) * dailyPageSize + 1)}</strong>-
                  <strong className="text-foreground">{Math.min(filteredDailyEmployees.length, dailyPage * dailyPageSize)}</strong> of{' '}
                  <strong className="text-foreground">{filteredDailyEmployees.length}</strong> employees
                </span>

                {/* Page Size Selector */}
                <div className="flex items-center gap-1 border-l border-border pl-2 ml-1">
                  <span className="text-[11px] text-muted-foreground">Per page:</span>
                  <select
                    value={dailyPageSize}
                    onChange={(e) => {
                      setDailyPageSize(Number(e.target.value))
                      setDailyPage(1)
                    }}
                    className="text-[11px] font-medium px-2 py-0.5 rounded-lg border border-border bg-card text-foreground outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {/* Page Controls */}
              {totalDailyPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setDailyPage(p => Math.max(1, p - 1))}
                    disabled={dailyPage <= 1}
                    className="px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-30 transition-colors shadow-xs"
                  >
                    Previous
                  </button>

                  <span className="px-2 font-mono text-[11px]">
                    Page {dailyPage} of {totalDailyPages}
                  </span>

                  <button
                    onClick={() => setDailyPage(p => Math.min(totalDailyPages, p + 1))}
                    disabled={dailyPage >= totalDailyPages}
                    className="px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-30 transition-colors shadow-xs"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SCREENSHOTS GALLERY VIEW MODE */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'screenshots' && (
        <EmployeeScreenshotsGallery
          screenshots={selectedEmpId !== 'All'
            ? (employees.find(e => e.id === selectedEmpId)?.screenshots || [])
            : employees.flatMap(e => e.screenshots || [])}
          availableEmployees={employees.map(e => ({
            id: e.id,
            name: e.name,
            count: e.screenshotCount || 0
          }))}
          selectedEmployeeId={selectedEmpId}
          onEmployeeChange={setSelectedEmpId}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          isLoading={loading}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* MONTHLY SUMMARY VIEW MODE */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'monthly' && (
        <>
          {/* Monthly Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-border bg-card shadow-xs hover:border-foreground/20 transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Total Monthly Worked</span>
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Clock size={16} />
                </div>
              </div>
              <span className="text-2xl font-extrabold text-foreground mt-2 block font-mono">
                {monthlyOverview.totalMonthlyWorkedHours}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 block">{monthlyOverview.totalDaysLogged} total team days</span>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card shadow-xs hover:border-foreground/20 transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Total Monthly Active</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Activity size={16} />
                </div>
              </div>
              <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 block font-mono">
                {monthlyOverview.totalMonthlyActiveHours}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 block">Verified keystroke/mouse activity</span>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card shadow-xs hover:border-foreground/20 transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Active Staff Participating</span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Users size={16} />
                </div>
              </div>
              <span className="text-2xl font-extrabold text-foreground mt-2 block font-mono">
                {monthlyOverview.totalStaffWithSessions} / {monthlyOverview.totalEmployees}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 block">Staff with desktop sessions</span>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card shadow-xs hover:border-foreground/20 transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Avg Daily Active Hours</span>
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <TrendingUp size={16} />
                </div>
              </div>
              <span className="text-2xl font-extrabold text-foreground mt-2 block font-mono">
                {monthlyOverview.avgDailyActiveHours}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 block">Per worked employee day</span>
            </div>
          </div>

          {/* Monthly Employee Summary Table */}
          <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Monthly Employee Summaries ({selectedMonth})</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Aggregated hours and days worked per employee for the month
                </p>
              </div>

              {/* Search & Export */}
              <div className="flex items-center gap-2">
                <div className="relative max-w-xs w-full">
                  <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search staff, designation..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setMonthlyPage(1)
                    }}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-all shadow-xs"
                  />
                </div>

                <button
                  onClick={exportMonthlyCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted/50 text-xs font-semibold text-foreground transition-all shadow-xs shrink-0"
                >
                  <Download size={13} />
                  <span>Export</span>
                </button>
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
                  {paginatedMonthlyEmployees.length > 0 ? (
                    paginatedMonthlyEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">
                              {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
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
                          <span className="font-semibold text-foreground px-2 py-0.5 rounded-md bg-muted border border-border">
                            {emp.daysWorked} days
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono font-medium text-foreground">{emp.totalWorkedHours}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-emerald-600 dark:text-emerald-400">{emp.totalActiveHours}</td>
                        <td className="py-3 px-4 font-mono font-medium text-foreground">{emp.avgActivePerDayHours}</td>
                        <td className="py-3 px-4 text-muted-foreground font-mono">{emp.totalSessions}</td>
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

            {/* Monthly Pagination */}
            {totalMonthlyPages > 1 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                <span>
                  Showing {Math.min(filteredMonthlyEmployees.length, (monthlyPage - 1) * monthlyPageSize + 1)}-
                  {Math.min(filteredMonthlyEmployees.length, monthlyPage * monthlyPageSize)} of{' '}
                  {filteredMonthlyEmployees.length} employees
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setMonthlyPage(p => Math.max(1, p - 1))}
                    disabled={monthlyPage <= 1}
                    className="px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-30 transition-colors shadow-xs"
                  >
                    Previous
                  </button>

                  <span className="px-2 font-mono text-[11px]">
                    Page {monthlyPage} of {totalMonthlyPages}
                  </span>

                  <button
                    onClick={() => setMonthlyPage(p => Math.min(totalMonthlyPages, p + 1))}
                    disabled={monthlyPage >= totalMonthlyPages}
                    className="px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-30 transition-colors shadow-xs"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
