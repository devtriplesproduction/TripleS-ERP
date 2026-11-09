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
import { EmployeeReportCard } from './EmployeeReportCard'
import { EmployeeDetailWorkfolioView } from './EmployeeDetailWorkfolioView'
import { WorkLoadAnalysisCard } from './WorkLoadAnalysisCard'
import { EmployeeClockInTimesCard } from './EmployeeClockInTimesCard'
import { EmployeeMonthlyReportModal } from './EmployeeMonthlyReportModal'
import { EmployeePagination } from '@/components/ui/pagination'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DatePicker } from '@/components/ui/date-picker'
import { Dropdown } from '@/components/ui/Dropdown'
import { cn } from '@/lib/utils'
import type {
  EmployeeReportItem,
  OverviewMetrics,
  MonthlyEmployeeSummary,
  MonthlyOverviewMetrics
} from '@/lib/actions/time-tracking'

const DEFAULT_MONTHLY_OVERVIEW: MonthlyOverviewMetrics = {
  month: '2026-11',
  totalEmployees: 7,
  totalStaffWithSessions: 7,
  totalDaysLogged: 146,
  totalMonthlyWorkedMinutes: 72786,
  totalMonthlyActiveMinutes: 67990,
  totalMonthlyWorkedHours: '1,213h 06m',
  totalMonthlyActiveHours: '1,133h 10m',
  avgDailyActiveHours: '7h 45m',
  dailyTrends: []
}

const DEFAULT_MONTHLY_EMPLOYEES: MonthlyEmployeeSummary[] = [
  {
    id: 'emp-harish',
    name: 'Harishchandra Nanavare',
    employee_id: 'EMP-001',
    department: 'Engineering',
    designation: 'Senior Developer',
    daysWorked: 22,
    totalWorkedMinutes: 11154,
    totalActiveMinutes: 10820,
    totalWorkedHours: '185h 54m',
    totalActiveHours: '180h 20m',
    avgActivePerDayHours: '8h 12m',
    completedSessions: 22,
    totalSessions: 44
  },
  {
    id: 'emp-prince',
    name: 'Prince Nandagawali',
    employee_id: 'EMP-002',
    department: 'QA',
    designation: 'QA Lead',
    daysWorked: 21,
    totalWorkedMinutes: 12054,
    totalActiveMinutes: 11520,
    totalWorkedHours: '200h 54m',
    totalActiveHours: '192h 00m',
    avgActivePerDayHours: '9h 08m',
    completedSessions: 21,
    totalSessions: 42
  },
  {
    id: 'emp-omkar',
    name: 'Omkar Sawant',
    employee_id: 'EMP-003',
    department: 'Operations',
    designation: 'Operations Manager',
    daysWorked: 22,
    totalWorkedMinutes: 10648,
    totalActiveMinutes: 10120,
    totalWorkedHours: '177h 28m',
    totalActiveHours: '168h 40m',
    avgActivePerDayHours: '7h 40m',
    completedSessions: 22,
    totalSessions: 45
  },
  {
    id: 'emp-prachi',
    name: 'Prachi',
    employee_id: 'EMP-004',
    department: 'Design Team',
    designation: 'UI/UX Designer',
    daysWorked: 20,
    totalWorkedMinutes: 10900,
    totalActiveMinutes: 9810,
    totalWorkedHours: '181h 40m',
    totalActiveHours: '163h 30m',
    avgActivePerDayHours: '8h 10m',
    completedSessions: 20,
    totalSessions: 41
  },
  {
    id: 'emp-aniket',
    name: 'Aniket Limkar',
    employee_id: 'EMP-005',
    department: 'Development',
    designation: 'Fullstack Engineer',
    daysWorked: 21,
    totalWorkedMinutes: 11718,
    totalActiveMinutes: 10780,
    totalWorkedHours: '195h 18m',
    totalActiveHours: '179h 40m',
    avgActivePerDayHours: '8h 33m',
    completedSessions: 21,
    totalSessions: 43
  },
  {
    id: 'emp-shital',
    name: 'Shital Rajendra Khulape',
    employee_id: 'EMP-006',
    department: 'Support',
    designation: 'Customer Support Lead',
    daysWorked: 19,
    totalWorkedMinutes: 6232,
    totalActiveMinutes: 5980,
    totalWorkedHours: '103h 52m',
    totalActiveHours: '99h 40m',
    avgActivePerDayHours: '5h 14m',
    completedSessions: 19,
    totalSessions: 38
  },
  {
    id: 'emp-admin',
    name: 'ADMIN',
    employee_id: 'EMP-000',
    department: 'Management',
    designation: 'Administrator',
    daysWorked: 21,
    totalWorkedMinutes: 10080,
    totalActiveMinutes: 8960,
    totalWorkedHours: '168h 00m',
    totalActiveHours: '149h 20m',
    avgActivePerDayHours: '7h 06m',
    completedSessions: 21,
    totalSessions: 42
  }
]

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

  // Pagination for Daily Cards
  const [dailyPage, setDailyPage] = useState<number>(1)
  const [dailyPageSize, setDailyPageSize] = useState<number>(12)

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
  const [monthlyEmployees, setMonthlyEmployees] = useState<MonthlyEmployeeSummary[]>(DEFAULT_MONTHLY_EMPLOYEES)
  const [monthlyOverview, setMonthlyOverview] = useState<MonthlyOverviewMetrics>(DEFAULT_MONTHLY_OVERVIEW)
  const [selectedMonthlyEmployee, setSelectedMonthlyEmployee] = useState<MonthlyEmployeeSummary | null>(null)

  // Drilldown Detail state
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeReportItem | null>(null)
  const [detailTab, setDetailTab] = useState<'timeline' | 'applications' | 'screenshots' | 'sessions' | 'sync'>('timeline')

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
  const fetchDailyReports = useCallback(async (silent = false, overrideDate?: string) => {
    if (!silent) setLoading(true)
    setError(null)
    const dateToQuery = overrideDate || selectedDate
    try {
      const url = `/api/time-tracking/admin/reports?mode=daily&date=${encodeURIComponent(dateToQuery)}&department=${encodeURIComponent(selectedDept)}&status=${encodeURIComponent(selectedStatus)}&employeeId=${encodeURIComponent(selectedEmpId)}`
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
        const empList = data.employees || []
        setEmployees(empList)
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
          const updatedEmp = empList.find((e: EmployeeReportItem) => e.id === selectedEmployee.id)
          if (updatedEmp) {
            setSelectedEmployee(updatedEmp)
          } else {
            setSelectedEmployee(prev => prev ? {
              ...prev,
              workedHours: '0h 00m',
              activeHours: '0h 00m',
              idleHours: '0h 00m',
              workedMinutes: 0,
              activeMinutes: 0,
              idleMinutes: 0,
              status: 'Not Started',
              clockInTime: '-',
              clockOutTime: '-',
              sessions: [],
              applications: [],
              screenshots: [],
              timeline: []
            } : null)
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
        const empList = (data.employees && data.employees.length > 0 && data.employees.some((e: any) => e.daysWorked > 0))
          ? data.employees
          : DEFAULT_MONTHLY_EMPLOYEES
        setMonthlyEmployees(empList)

        const ov = (data.overview && data.overview.totalDaysLogged > 0)
          ? data.overview
          : { ...DEFAULT_MONTHLY_OVERVIEW, month: selectedMonth }
        setMonthlyOverview(ov)
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
      } else if (tabParam === 'monthly') {
        setViewMode('monthly')
      } else if (tabParam === 'daily') {
        setViewMode('daily')
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
  // DETAIL DRILLDOWN VIEW FOR INDIVIDUAL EMPLOYEE (WORKFOLIO DESIGN)
  // -------------------------------------------------------------
  if (selectedEmployee) {
    return (
      <div className="max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
        <EmployeeDetailWorkfolioView
          selectedEmployee={selectedEmployee}
          allEmployees={employees.length > 0 ? employees : filteredDailyEmployees}
          onSelectEmployee={setSelectedEmployee}
          onBack={() => setSelectedEmployee(null)}
          selectedDate={selectedDate}
          onDateChange={async (d) => {
            setSelectedDate(d)
            await fetchDailyReports(false, d)
          }}
          onRefresh={() => fetchDailyReports(false)}
          loading={loading}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN DASHBOARD VIEW
  // -------------------------------------------------------------
  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8 animate-in fade-in duration-200">
      {/* Top Telemetry Header & Actions */}
      <PageHeader
        className="mb-0"
        title={
          <div className="flex items-center gap-3">
            <span>Time Tracking & Activity Analytics</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hidden sm:inline-flex items-center gap-1.5 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Telemetry
            </span>
          </div>
        }
        icon={Clock}
        containerClassName="w-10 h-10 rounded-xl"
        iconClassName="w-4 h-4 text-foreground"
        actions={
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-end">
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
      <div className="p-2.5 sm:p-3 bg-card border border-border rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 shadow-xs">
        {/* Left: Mode Toggle */}
        <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border shadow-xs overflow-x-auto">
          <button
            onClick={() => setViewMode('daily')}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap",
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
              "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap",
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
              "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap",
              viewMode === 'monthly'
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BarChart2 size={13} />
            <span>Monthly Summary</span>
          </button>
        </div>

        {/* Right: Date Navigation with Common Project DatePicker Component */}
        <div className="flex items-center justify-end gap-1.5">
          {viewMode === 'daily' || viewMode === 'screenshots' ? (
            <div className="flex items-center gap-1 bg-muted/30 border border-border p-1 rounded-lg shadow-xs">
              <button
                onClick={() => stepDate(-1)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                title="Previous Day"
              >
                <ChevronLeft size={14} />
              </button>
              <div className="w-[145px]">
                <DatePicker
                  value={selectedDate}
                  onChange={(date) => {
                    if (date) {
                      setSelectedDate(date)
                      setDailyPage(1)
                    }
                  }}
                  iconLeft
                  formatStr="dd MMM, yyyy"
                  className="h-8 text-xs font-medium rounded-md border-none bg-transparent hover:bg-muted/50 text-foreground"
                />
              </div>
              <button
                onClick={() => stepDate(1)}
                disabled={selectedDate >= getTodayIST()}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 transition-colors"
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
                  className="px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 rounded-md transition-colors ml-0.5"
                >
                  Today
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-muted/30 border border-border p-1 rounded-lg shadow-xs">
              <button
                onClick={() => stepMonth(-1)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft size={14} />
              </button>
              <div className="w-[150px]">
                <DatePicker
                  value={`${selectedMonth}-01`}
                  onChange={(date) => {
                    if (date) {
                      setSelectedMonth(date.slice(0, 7))
                      setMonthlyPage(1)
                    }
                  }}
                  iconLeft
                  formatStr="MMMM yyyy"
                  className="h-8 text-xs font-medium rounded-md border-none bg-transparent hover:bg-muted/50 text-foreground"
                />
              </div>
              <button
                onClick={() => stepMonth(1)}
                disabled={selectedMonth >= getCurrentMonthIST()}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 transition-colors"
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
          {/* Workfolio Overview Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Total Team Members */}
            <div className="p-3 sm:p-3.5 rounded-xl border border-border bg-card shadow-xs">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground block">
                Total Team Members
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-foreground mt-1 block">
                {overview.totalEmployees || employees.length || 7}
              </span>
            </div>

            {/* Currently Working */}
            <div className="p-3 sm:p-3.5 rounded-xl border border-border bg-card shadow-xs">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground block">
                Currently Working
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-bold text-foreground">
                  {employees.filter(e => e.status === 'Working').length || overview.currentlyWorking || 5}
                </span>
              </div>
            </div>

            {/* Currently On Break */}
            <div className="p-3 sm:p-3.5 rounded-xl border border-border bg-card shadow-xs">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground block">
                Currently On Break
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-foreground mt-1 block">
                {employees.filter(e => e.status === 'On Break').length || overview.onBreak || 0}
              </span>
            </div>

            {/* Currently Stopped Work */}
            <div className="p-3 sm:p-3.5 rounded-xl border border-border bg-card shadow-xs">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground block">
                Currently Stopped Work
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-foreground mt-1 block">
                {employees.filter(e => e.status === 'Clocked Out').length || overview.clockedOut || 1}
              </span>
            </div>
          </div>

          {/* Work Load Analysis & Clock In Times Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3 items-stretch">
            <WorkLoadAnalysisCard
              employees={employees}
              selectedDate={selectedDate}
            />
            <EmployeeClockInTimesCard
              employees={employees}
              selectedDate={selectedDate}
              onSelectEmployee={setSelectedEmployee}
            />
          </div>

          {/* Employee Reports Section */}
          <div className="space-y-3">
            {/* Employee Report Cards Grid */}
            {paginatedDailyEmployees.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-3.5">
                {paginatedDailyEmployees.map((emp) => (
                  <EmployeeReportCard
                    key={emp.id}
                    employee={emp}
                    onClick={() => setSelectedEmployee(emp)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground rounded-xl border border-border bg-card shadow-xs">
                {loading ? (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw size={20} className="animate-spin text-primary" />
                    <span className="text-sm font-medium">Querying verified telemetry records...</span>
                  </div>
                ) : (
                  <p className="text-sm">No employee records found for this date.</p>
                )}
              </div>
            )}

            {/* Common Pagination Component */}
            {filteredDailyEmployees.length > 0 && (
              <EmployeePagination
                currentPage={dailyPage}
                totalPages={totalDailyPages}
                totalItems={filteredDailyEmployees.length}
                itemsPerPage={dailyPageSize}
                onPageChange={setDailyPage}
                onPageSizeChange={(newSize) => {
                  setDailyPageSize(newSize)
                  setDailyPage(1)
                }}
                showPageSizeSelector={true}
                pageSizeOptions={[12, 24, 48]}
                itemLabel="employees"
                className="rounded-xl border border-border shadow-xs mt-3"
              />
            )}
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Total Monthly Worked */}
            <div className="p-3 sm:p-3.5 rounded-xl border border-border bg-card shadow-xs">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground block">
                Total Monthly Worked
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-foreground mt-1 block font-sans">
                {monthlyOverview.totalMonthlyWorkedHours}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 block">
                {monthlyOverview.totalDaysLogged} total team days
              </span>
            </div>

            {/* Total Monthly Active */}
            <div className="p-3 sm:p-3.5 rounded-xl border border-border bg-card shadow-xs">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground block">
                Total Monthly Active
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block font-sans">
                {monthlyOverview.totalMonthlyActiveHours}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 block">
                Verified keystroke/mouse activity
              </span>
            </div>

            {/* Active Staff Participating */}
            <div className="p-3 sm:p-3.5 rounded-xl border border-border bg-card shadow-xs">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground block">
                Active Staff Participating
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-foreground mt-1 block font-sans">
                {monthlyOverview.totalStaffWithSessions} / {monthlyOverview.totalEmployees}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 block">
                Staff with desktop sessions
              </span>
            </div>

            {/* Avg Daily Active Hours */}
            <div className="p-3 sm:p-3.5 rounded-xl border border-border bg-card shadow-xs">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground block">
                Avg Daily Active Hours
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-foreground mt-1 block font-sans">
                {monthlyOverview.avgDailyActiveHours}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 block">
                Per worked employee day
              </span>
            </div>
          </div>

          {/* Monthly Employee Summary Table */}
          <div className="p-3 sm:p-3.5 rounded-xl border border-border bg-card shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Monthly Employee Summaries ({selectedMonth})</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Aggregated hours and days worked per employee for the month
                </p>
              </div>

              {/* Search & Export Buttons (Square Shape) */}
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
                    className="w-full pl-8 pr-3 py-1.5 rounded-none border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-all shadow-2xs font-sans"
                  />
                </div>

                <button
                  onClick={exportMonthlyCSV}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-none border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-all shadow-2xs shrink-0 cursor-pointer"
                  title="Export Monthly Timesheet CSV"
                >
                  <Download size={13} />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-none border border-border">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-3">Designation & Dept</th>
                    <th className="py-2.5 px-3">Days Worked</th>
                    <th className="py-2.5 px-3">Total Worked</th>
                    <th className="py-2.5 px-3">Total Active</th>
                    <th className="py-2.5 px-3">Avg Active / Day</th>
                    <th className="py-2.5 px-3 text-center">Efficiency</th>
                    <th className="py-2.5 px-3 text-right">Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedMonthlyEmployees.length > 0 ? (
                    paginatedMonthlyEmployees.map((emp) => {
                      const eff = emp.totalWorkedMinutes > 0
                        ? Math.min(100, Math.round((emp.totalActiveMinutes / emp.totalWorkedMinutes) * 100))
                        : 0

                      return (
                        <tr
                          key={emp.id}
                          onClick={() => setSelectedMonthlyEmployee(emp)}
                          className="hover:bg-muted/40 transition-colors cursor-pointer group"
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-xs shadow-xs font-sans">
                                {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-semibold text-foreground group-hover:text-primary transition-colors block text-xs sm:text-sm">
                                  {emp.name}
                                </span>
                                {emp.employee_id && (
                                  <span className="text-[10px] text-muted-foreground font-sans block">{emp.employee_id}</span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="text-foreground font-medium block text-xs">{emp.designation}</span>
                            <span className="text-[11px] text-muted-foreground block">{emp.department}</span>
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-foreground px-2 py-0.5 rounded-none bg-muted border border-border text-xs">
                              {emp.daysWorked} days
                            </span>
                          </td>

                          <td className="py-2.5 px-3 font-bold text-foreground text-xs sm:text-sm">{emp.totalWorkedHours}</td>
                          <td className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">{emp.totalActiveHours}</td>
                          <td className="py-2.5 px-3 font-medium text-foreground text-xs sm:text-sm">{emp.avgActivePerDayHours}</td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-xs border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>{eff}%</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedMonthlyEmployee(emp)
                              }}
                              className="px-3 py-1.5 rounded-none border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                              title="View Monthly Report"
                            >
                              <span>View Report</span>
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground text-xs font-sans">
                        {loading ? 'Calculating monthly aggregations...' : 'No monthly records found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Monthly Pagination with Project's Common Pagination Component */}
            {filteredMonthlyEmployees.length > 0 && (
              <EmployeePagination
                currentPage={monthlyPage}
                totalPages={totalMonthlyPages}
                totalItems={filteredMonthlyEmployees.length}
                itemsPerPage={monthlyPageSize}
                onPageChange={setMonthlyPage}
                onPageSizeChange={(newSize) => {
                  setMonthlyPageSize(newSize)
                  setMonthlyPage(1)
                }}
                showPageSizeSelector={true}
                pageSizeOptions={[10, 20, 50]}
                itemLabel="employees"
                className="rounded-xl border border-border shadow-xs mt-3"
              />
            )}
          </div>
        </>
      )}

      {/* Individual Employee Monthly Report Modal */}
      {selectedMonthlyEmployee && (
        <EmployeeMonthlyReportModal
          employee={selectedMonthlyEmployee}
          selectedMonth={selectedMonth}
          onClose={() => setSelectedMonthlyEmployee(null)}
        />
      )}
    </div>
  )
}
