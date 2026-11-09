import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { EmployeeReportCard } from '../components/time-tracking/EmployeeReportCard'
import { TimeTrackingAdminDashboard } from '../components/time-tracking/TimeTrackingAdminDashboard'
import { EmployeeDetailWorkfolioView } from '../components/time-tracking/EmployeeDetailWorkfolioView'
import { WorkLoadAnalysisCard } from '../components/time-tracking/WorkLoadAnalysisCard'
import { EmployeeClockInTimesCard } from '../components/time-tracking/EmployeeClockInTimesCard'
import { EmployeeScreenshotsGallery } from '../components/time-tracking/EmployeeScreenshotsGallery'
import { EmployeeMonthlyReportModal } from '../components/time-tracking/EmployeeMonthlyReportModal'
import { AttendanceList } from '../components/hr/attendance/AttendanceList'
import type { EmployeeReportItem, MonthlyEmployeeSummary } from '../lib/actions/time-tracking'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/attendance',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock subcomponents and fetch to safely render TimeTrackingAdminDashboard in server environment
vi.mock('../components/PageHeader', () => ({
  PageHeader: ({ title, subtitle, rightElement }: { title: React.ReactNode; subtitle?: React.ReactNode; rightElement?: React.ReactNode }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {rightElement}
    </div>
  )
}))

vi.mock('../components/ui/date-picker', () => ({
  DatePicker: ({ value }: { value?: unknown }) => <div data-testid="date-picker">{String(value || '')}</div>
}))

describe('EmployeeReportCard UI Unit Tests', () => {
  it('renders "Yet to start work" and "0 apps used" for inactive staff with Pink card theme matching dark/light screens', () => {
    const adminEmployee: EmployeeReportItem = {
      id: 'admin-1',
      name: 'ADMIN',
      employee_id: 'EMP-000',
      department: 'Management',
      designation: 'Administrator',
      status: 'Not Started',
      clockInTime: '-',
      clockOutTime: '-',
      workedHours: '0h 00m',
      activeHours: '0h 00m',
      idleHours: '0h 00m',
      workedMinutes: 0,
      activeMinutes: 0,
      idleMinutes: 0,
      suspendedSeconds: 0,
      lastSync: '',
      lastSyncFormatted: '-',
      sessionCount: 0,
      screenshotCount: 0,
      screenshots: [],
      sessions: [],
      timeline: [],
      applications: [],
      breaks: [],
      idleIntervals: [],
      syncHealth: { isHealthy: true, lastSyncTime: null, warningMessage: null }
    }

    const html = renderToStaticMarkup(<EmployeeReportCard employee={adminEmployee} />)

    expect(html).toContain('ADMIN')
    expect(html).toContain('Yet to start work')
    expect(html).toContain('0 apps used')
    expect(html).not.toContain('Desktop app not installed')
    expect(html).toContain('0%')
    expect(html).toContain('Active Time')
    expect(html).toContain('00:00')
    expect(html).toContain('Checked-in')
    expect(html).toContain('00h 00m')
    expect(html).toContain('Hours worked')
    // Pink color theme for non-active staff matching light & black/dark screens
    expect(html).toContain('bg-pink-50/85')
    expect(html).toContain('dark:bg-pink-950/25')
    expect(html).toContain('dark:border-pink-500/40')
  })

  it('renders "Worked for 1 day", "{N} apps used", "Active" badge and Vibrant Emerald card theme for active working staff', () => {
    const workingEmployee: EmployeeReportItem = {
      id: 'emp-2',
      name: 'Harishchandra Nanavare',
      employee_id: 'EMP-002',
      department: 'Engineering',
      designation: 'Senior Developer',
      status: 'Working',
      clockInTime: '09:59 AM',
      clockOutTime: 'In Progress',
      workedHours: '8h 27m',
      activeHours: '8h 12m',
      idleHours: '0h 15m',
      workedMinutes: 507, // 8h 27m
      activeMinutes: 492, // ~97% active
      idleMinutes: 15,
      suspendedSeconds: 0,
      lastSync: '2026-10-18T10:00:00Z',
      lastSyncFormatted: '10:00 AM',
      sessionCount: 1,
      screenshotCount: 42,
      screenshots: [],
      sessions: [],
      timeline: [],
      applications: new Array(18).fill({ name: 'App' }), // 18 apps used
      breaks: [],
      idleIntervals: [],
      syncHealth: { isHealthy: true, lastSyncTime: null, warningMessage: null }
    }

    const html = renderToStaticMarkup(<EmployeeReportCard employee={workingEmployee} />)

    expect(html).toContain('Harishchandra Nanavare')
    expect(html).toContain('Worked for 1 day')
    expect(html).toContain('18 apps used')
    expect(html).toContain('97%')
    expect(html).toContain('Active Time')
    expect(html).toContain('09:59 am')
    expect(html).toContain('Checked-in')
    expect(html).toContain('08h 27m')
    expect(html).toContain('Hours worked')
    expect(html).toContain('Active')
    // Vibrant Emerald theme for active staff matching light & black/dark screens
    expect(html).toContain('bg-emerald-50/90')
    expect(html).toContain('dark:bg-emerald-950/40')
    expect(html).toContain('dark:border-emerald-500/50')
    expect(html).toContain('text-emerald-600')
  })

  it('renders Pink card theme for clocked out staff matching black & white dark screen', () => {
    const clockedOutEmployee: EmployeeReportItem = {
      id: 'emp-3',
      name: 'Aniket Limkar',
      employee_id: 'EMP-003',
      department: 'Development',
      designation: 'Fullstack Engineer',
      status: 'Clocked Out',
      clockInTime: '10:12 AM',
      clockOutTime: '07:28 PM',
      workedHours: '9h 16m',
      activeHours: '8h 31m',
      idleHours: '0h 45m',
      workedMinutes: 556, // 9h 16m
      activeMinutes: 512, // 92%
      idleMinutes: 45,
      suspendedSeconds: 0,
      lastSync: '2026-10-18T19:28:00Z',
      lastSyncFormatted: '07:28 PM',
      sessionCount: 1,
      screenshotCount: 50,
      screenshots: [],
      sessions: [],
      timeline: [],
      applications: new Array(15).fill({ name: 'App' }), // 15 apps used
      breaks: [],
      idleIntervals: [],
      syncHealth: { isHealthy: true, lastSyncTime: null, warningMessage: null }
    }

    const html = renderToStaticMarkup(<EmployeeReportCard employee={clockedOutEmployee} />)

    expect(html).toContain('Aniket Limkar')
    expect(html).toContain('Worked for 1 day')
    expect(html).toContain('15 apps used')
    expect(html).toContain('92%')
    expect(html).toContain('10:12 am')
    expect(html).toContain('09h 16m')
    // Pink theme matching light & black/dark screens
    expect(html).toContain('bg-pink-50/85')
    expect(html).toContain('dark:bg-pink-950/25')
    expect(html).toContain('dark:border-pink-500/40')
    expect(html).toContain('text-emerald-600')
    expect(html).toContain('bg-[#dff3fb]')
    expect(html).toContain('bg-sky-400')
  })

  it('verifies Hourly Active Distribution and old Filter & Search Toolbar are removed from TimeTrackingAdminDashboard', () => {
    const html = renderToStaticMarkup(<TimeTrackingAdminDashboard />)

    // Verify Hourly Active Distribution is NOT in the output
    expect(html).not.toContain('Hourly Active Distribution')
    expect(html).not.toContain('Accumulated active hours logged across authorized employees')

    // Verify old search & filter toolbar is removed
    expect(html).not.toContain('Search name, role, ID...')
    expect(html).not.toContain('All Departments')

    // Verify Daily Tracking view is present
    expect(html).toContain('Daily Tracking')
  })

  it('verifies EmployeeDetailWorkfolioView renders Workfolio layout (Members list, Activities bar, Apps & Donut chart, Clock In & Out Summary)', () => {
    const prachiEmployee: EmployeeReportItem = {
      id: 'emp-prachi',
      name: 'Prachi',
      employee_id: 'EMP-005',
      department: 'Design Team',
      designation: 'UI/UX Designer',
      status: 'Working',
      clockInTime: '10:09 AM',
      clockOutTime: 'In Progress',
      workedHours: '6h 45m',
      activeHours: '6h 10m',
      idleHours: '0h 35m',
      workedMinutes: 405,
      activeMinutes: 370,
      idleMinutes: 35,
      suspendedSeconds: 0,
      lastSync: '2026-11-04T14:06:00Z',
      lastSyncFormatted: '02:06 PM',
      sessionCount: 2,
      screenshotCount: 12,
      screenshots: [],
      sessions: [
        {
          id: 'sess-1',
          clock_in: '2026-11-04T04:39:00Z', // 10:09 AM IST
          clock_out: '2026-11-04T07:40:00Z', // 01:10 PM IST
          status: 'completed',
          worked_minutes: 181,
          active_minutes: 165,
          suspended_seconds: 0,
          breaks: []
        },
        {
          id: 'sess-2',
          clock_in: '2026-11-04T07:52:00Z', // 01:22 PM IST
          clock_out: '2026-11-04T08:29:00Z', // 01:59 PM IST
          status: 'completed',
          worked_minutes: 37,
          active_minutes: 35,
          suspended_seconds: 0,
          breaks: []
        },
        {
          id: 'sess-3',
          clock_in: '2026-11-04T08:36:00Z', // 02:06 PM IST
          clock_out: null, // Working On
          status: 'working',
          worked_minutes: 187,
          active_minutes: 170,
          suspended_seconds: 0,
          breaks: []
        }
      ],
      timeline: [],
      applications: [
        { name: 'SnippingTool', percent: 8, duration: '30m', durationMinutes: 30, sampleWindows: [] },
        { name: 'Workfolio', percent: 12, duration: '45m', durationMinutes: 45, sampleWindows: [] },
        { name: 'google.com', percent: 25, duration: '1h 35m', durationMinutes: 95, sampleWindows: [] },
        { name: 'meet.google.com', percent: 18, duration: '1h 10m', durationMinutes: 70, sampleWindows: [] },
        { name: 'chrome', percent: 22, duration: '1h 25m', durationMinutes: 85, sampleWindows: [] },
        { name: 'windows - Desktop', percent: 15, duration: '1h 00m', durationMinutes: 60, sampleWindows: [] }
      ],
      breaks: [],
      idleIntervals: [],
      syncHealth: { isHealthy: true, lastSyncTime: null, warningMessage: null }
    }

    const allStaff = [
      { id: 'emp-admin', name: 'ADMIN', department: 'Management' },
      { id: 'emp-aniket', name: 'Aniket Limkar', department: 'Development' },
      { id: 'emp-harish', name: 'Harishchandra Nanavare', department: 'Engineering' },
      { id: 'emp-omkar', name: 'Omkar Sawant', department: 'Operations' },
      prachiEmployee,
      { id: 'emp-prince', name: 'Prince Nandagawali', department: 'QA' },
      { id: 'emp-shital', name: 'Shital Rajendra Khulape', department: 'Support' }
    ]

    const html = renderToStaticMarkup(
      <EmployeeDetailWorkfolioView
        selectedEmployee={prachiEmployee}
        allEmployees={allStaff as unknown as EmployeeReportItem[]}
        onSelectEmployee={() => { }}
        onBack={() => { }}
        selectedDate="2026-11-04"
      />
    )

    // Left Member Pane
    expect(html).toContain('Search Members')
    expect(html).toContain('ADMIN')
    expect(html).toContain('Aniket Limkar')
    expect(html).toContain('Prachi')
    expect(html).toContain('Prince Nandagawali')
    expect(html).toContain('No more result found')

    // Right Pane: Activities
    expect(html).toContain('Activities')
    expect(html).toContain('10 hours')
    expect(html).toContain('5 hours')
    expect(html).toContain('0 hours')

    // Applications & Donut
    expect(html).toContain('SnippingTool')
    expect(html).toContain('google.com')
    expect(html).toContain('meet.google.com')
    expect(html).toContain('neutral')

    // Clock In & Out Summary
    expect(html).toContain('Clock In &amp; Out Summary')
    expect(html).toContain('Date')
    expect(html).toContain('Start Time')
    expect(html).toContain('End Time')
    expect(html).toContain('Activity Duration')
    expect(html).toContain('Worked for')
    expect(html).toContain('Internet interrupted')
    expect(html).toContain('Working On')
  })

  it('verifies old KPI cards (Total Staff, Working Now, Worked Hours, Active Hours) are removed and replaced with Workfolio cards (Total Team Members, Currently Working, Currently On Break, Currently Stopped Work, App Not Installed)', () => {
    const html = renderToStaticMarkup(<TimeTrackingAdminDashboard />)

    // Old cards and App Not Installed removed
    expect(html).not.toContain('Total Staff')
    expect(html).not.toContain('Working Now')
    expect(html).not.toContain('Worked Hours')
    expect(html).not.toContain('Active Hours')
    expect(html).not.toContain('Top Used Apps')
    expect(html).not.toContain('App Not Installed')

    // New Workfolio overview cards present
    expect(html).toContain('Total Team Members')
    expect(html).toContain('Currently Working')
    expect(html).toContain('Currently On Break')
    expect(html).toContain('Currently Stopped Work')

    // Work Load Analysis card present with exact labels and legend
    expect(html).toContain('Work Load Analysis')
    expect(html).toContain('Members Count')
    expect(html).toContain('Over Worked')
    expect(html).toContain('Healthy')
    expect(html).toContain('Less Utilised')
  })

  it('renders WorkLoadAnalysisCard with SVG chart, members count, 3 dates, legend, and timeframe buttons (Daily, Weekly, Monthly)', () => {
    const mockEmployees = [
      { id: '1', name: 'Alice', workedMinutes: 520, status: 'Working' }, // Over Worked (>480)
      { id: '2', name: 'Bob', workedMinutes: 360, status: 'Working' },   // Healthy (240-480)
      { id: '3', name: 'Charlie', workedMinutes: 120, status: 'Working' } // Less Utilised (<240)
    ] as unknown as EmployeeReportItem[]

    const html = renderToStaticMarkup(
      <WorkLoadAnalysisCard employees={mockEmployees} selectedDate="2026-11-04" />
    )

    expect(html).toContain('Work Load Analysis')
    expect(html).toContain('Members Count')
    expect(html).toContain('Over Worked')
    expect(html).toContain('Healthy')
    expect(html).toContain('Less Utilised')
    expect(html).toContain('04 Nov, 2026')
    expect(html).toContain('03 Nov, 2026')
    expect(html).toContain('02 Nov, 2026')
    expect(html).toContain('#F1C40F')
    expect(html).toContain('#2ECD71')
    expect(html).toContain('#E67E22')

    // Right side corner buttons
    expect(html).toContain('Daily')
    expect(html).toContain('Weekly')
    expect(html).toContain('Monthly')
  })

  it('verifies EmployeeScreenshotsGallery renders reference UI controls, 4-column cards, and common EmployeePagination', () => {
    const html = renderToStaticMarkup(
      <EmployeeScreenshotsGallery selectedDate="2026-11-04" />
    )

    // Row 1: Search and Batch Actions
    expect(html).toContain('Search by typing the app or site name')
    expect(html).toContain('Select All')
    expect(html).toContain('Export')
    expect(html).toContain('Delete')

    // Row 2: Controls
    expect(html).toContain('Today Screenshots')
    expect(html).toContain('Idle Screenshots')
    expect(html).toContain('Newest')

    // 4-Column Grid: Apps and Employees from reference images
    expect(html).toContain('Antigravity IDE')
    expect(html).toContain('brave')
    expect(html).toContain('chatgpt.com')
    expect(html).toContain('Adobe Premiere Pro')
    expect(html).toContain('Omkar Sawant')
    expect(html).toContain('Prachi')
    expect(html).toContain('Aniket Limkar')
    expect(html).toContain('Prince Nandagawali')

    // Common EmployeePagination component
    expect(html).toContain('Showing')
    expect(html).toContain('screenshots')
    expect(html).toContain('Per page:')
  })

  it('verifies EmployeeClockInTimesCard renders clock in times, common Table and Badge components, and is present beside WorkLoadAnalysisCard', () => {
    const mockEmployees = [
      { id: '1', name: 'Harishchandra Nanavare', department: 'Engineering', status: 'Working', clockInTime: '09:59 AM' },
      { id: '2', name: 'ADMIN', department: 'Management', status: 'Not Started', clockInTime: '-' }
    ] as unknown as EmployeeReportItem[]

    const htmlCard = renderToStaticMarkup(
      <EmployeeClockInTimesCard employees={mockEmployees} selectedDate="2026-11-04" />
    )

    // Verify Clock In Times title and badge
    expect(htmlCard).toContain('Clock In Times')
    expect(htmlCard).toContain('Clocked In')
    expect(htmlCard).toContain('Harishchandra Nanavare')
    expect(htmlCard).toContain('09:59 AM')
    expect(htmlCard).toContain('ADMIN')
    expect(htmlCard).toContain('--:--')
    expect(htmlCard).toContain('Working')
    expect(htmlCard).toContain('Pending')

    // Verify dashboard renders both side-by-side in daily mode
    const htmlDashboard = renderToStaticMarkup(<TimeTrackingAdminDashboard />)
    expect(htmlDashboard).toContain('Work Load Analysis')
    expect(htmlDashboard).toContain('Clock In Times')
  })

  it('verifies Monthly Summary and every employee monthly report shows with KPIs, Table, and Detail Modal', () => {
    const mockMonthlyEmp: MonthlyEmployeeSummary = {
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
    }

    const htmlModal = renderToStaticMarkup(
      <EmployeeMonthlyReportModal
        employee={mockMonthlyEmp}
        selectedMonth="2026-11"
        onClose={() => {}}
      />
    )

    // Verify modal elements
    expect(htmlModal).toContain('Harishchandra Nanavare')
    expect(htmlModal).toContain('EMP-001')
    expect(htmlModal).toContain('November 2026')
    expect(htmlModal).toContain('Senior Developer')
    expect(htmlModal).toContain('22')
    expect(htmlModal).toContain('185h 54m')
    expect(htmlModal).toContain('180h 20m')
    expect(htmlModal).toContain('8h 12m')
    expect(htmlModal).toContain('Export Report')
    expect(htmlModal).toContain('Daily Log Breakdown')
    // Verify small clock logo in modal
    expect(htmlModal).toContain('lucide-clock')
    expect(htmlModal).toContain('width="11"')
  })

  it('verifies AttendanceList renders PageHeader and supports EmployeePagination controls', () => {
    const mockEmployees = [
      {
        id: 'emp-1',
        first_name: 'John',
        last_name: 'Doe',
        employee_id: 'EMP-001',
        department: 'Engineering',
        summary: { present: 20, holidayWork: 1, wfh: 2, leave: 0, absent: 0, pending: 0 }
      },
      {
        id: 'emp-2',
        first_name: 'Jane',
        last_name: 'Smith',
        employee_id: 'EMP-002',
        department: 'Design',
        summary: { present: 19, holidayWork: 0, wfh: 3, leave: 1, absent: 0, pending: 0 }
      }
    ]

    const html = renderToStaticMarkup(<AttendanceList basePath="/attendance" initialEmployees={mockEmployees} />)

    // Page Header
    expect(html).toContain('Employee Attendance')
    expect(html).toContain('Monitor attendance across the organization')

    // Search and filters
    expect(html).toContain('Search by name or ID...')

    // Employee Cards rendered
    expect(html).toContain('John Doe')
    expect(html).toContain('Jane Smith')

    // Common EmployeePagination Component rendered
    expect(html).toContain('Showing')
    expect(html).toContain('employees')
    expect(html).toContain('Per page:')
  })

  it('verifies EmployeeReportCard renders small clock logo beside check-in and hours worked', () => {
    const emp: EmployeeReportItem = {
      id: 'emp-1',
      name: 'Harishchandra Nanavare',
      employee_id: 'EMP-001',
      department: 'Engineering',
      designation: 'Senior Developer',
      status: 'Working',
      clockInTime: '09:59 AM',
      clockOutTime: 'In Progress',
      workedHours: '8h 27m',
      activeHours: '8h 12m',
      idleHours: '0h 15m',
      workedMinutes: 507,
      activeMinutes: 492,
      idleMinutes: 15,
      suspendedSeconds: 0,
      lastSync: '2026-11-09T08:00:00Z',
      lastSyncFormatted: '08:00 AM',
      sessionCount: 1,
      screenshotCount: 10,
      screenshots: [],
      sessions: [],
      timeline: [],
      applications: [{ name: 'Antigravity IDE', duration: '4h 00m', durationMinutes: 240, percent: 50, sampleWindows: [] }],
      breaks: [],
      idleIntervals: []
    }

    const html = renderToStaticMarkup(<EmployeeReportCard employee={emp} />)
    expect(html).toContain('lucide-clock')
    expect(html).toContain('width="11"')
    expect(html).toContain('height="11"')
  })
})
