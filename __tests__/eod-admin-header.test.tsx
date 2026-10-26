import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ReviewDashboard } from '@/components/eod/ReviewDashboard'
import { EodTabsClient } from '@/components/eod/EodTabsClient'

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/actions/eod.actions', () => ({
  reviewEODAction: vi.fn().mockResolvedValue({ success: true }),
  batchReviewEODAction: vi.fn().mockResolvedValue({ success: true }),
  updateEODAction: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/components/ui/date-picker', () => ({
  DatePicker: ({ placeholder, value }: any) => (
    <div data-testid="date-picker">{placeholder}</div>
  ),
}))

vi.mock('@/components/eod/EodCard', () => ({
  EodCard: ({ eod }: any) => <div data-testid="eod-card">{eod.tasks_accomplished}</div>,
}))

describe('Admin-side ReviewDashboard Header & Controls', () => {
  const mockEmployees = [
    { id: 'emp-1', first_name: 'Omkar', last_name: 'Sawant', employee_id: 'EMP-001' },
    { id: 'emp-2', first_name: 'John', last_name: 'Doe', employee_id: 'EMP-002' },
  ]

  const mockEODs: any[] = [
    {
      id: 'eod-1',
      employee_id: 'emp-1',
      report_date: '2026-10-18',
      tasks_accomplished: 'Completed project tasks',
      office_hours: 8.25,
      location: 'OFFICE',
      blockers: 'None',
      tomorrows_plan: 'Continue next task',
      status: 'Pending',
      profiles: mockEmployees[0],
    },
    {
      id: 'eod-2',
      employee_id: 'emp-2',
      report_date: '2026-10-18',
      tasks_accomplished: 'Reviewed client feedback',
      office_hours: 8.0,
      location: 'OFFICE',
      blockers: 'None',
      tomorrows_plan: 'Followup',
      status: 'Approved',
      profiles: mockEmployees[1],
    },
  ]

  it('renders Review EOD as the primary page heading with KPI summary cards on the right side of header', () => {
    const html = renderToStaticMarkup(
      <ReviewDashboard
        initialEods={mockEODs}
        employees={mockEmployees}
        showHeader={true}
        todayReportsCount={2}
      />
    )

    // Primary Page Header
    expect(html).toContain('Review EOD')
    expect(html).toContain('Review employee and HR end-of-day reports.')

    // Preserved 4 summary cards on right side of header
    expect(html).toContain('Reports')
    expect(html).toContain('Approved')
    expect(html).toContain('Pending')
    expect(html).toContain('Today')
    expect(html).toContain('justify-end')

    // Preserved filters and search
    expect(html).toContain('Search by employee name, department, or ID...')
    expect(html).toContain('All Employees')
    expect(html).toContain('Start Date')
    expect(html).toContain('End Date')

    // Preserved pending banner and bulk approval button
    expect(html).toContain('pending reports in the current filter')
    expect(html).toContain('Approve All')
  })

  it('does not render duplicate Review EOD header when showHeader is false', () => {
    const html = renderToStaticMarkup(
      <ReviewDashboard
        initialEods={mockEODs}
        employees={mockEmployees}
        showHeader={false}
      />
    )

    expect(html).not.toContain('Review employee and HR end-of-day reports.')
  })

  it('renders responsive non-overlapping layout classes with shrink-0 title and flex-wrap container', () => {
    const html = renderToStaticMarkup(
      <ReviewDashboard
        initialEods={mockEODs}
        employees={mockEmployees}
        showHeader={true}
        todayReportsCount={2}
        branchSelector={<div id="test-branch-selector">All Branches</div>}
        reviewEodButton={<div id="test-review-btn">Review EOD</div>}
      />
    )

    // Verify outer container allows wrapping so wide controls/cards do not squeeze the title
    expect(html).toContain('flex-wrap')
    // Verify title block has shrink-0 to prevent word-by-word vertical squishing
    expect(html).toContain('shrink-0')
    // Verify proper gap between wrapped rows
    expect(html).toContain('gap-y-4')
  })

  it('renders identical KPI UI format, HR header text, and filters for HR side with tabs in header', () => {
    const html = renderToStaticMarkup(
      <ReviewDashboard
        initialEods={mockEODs}
        employees={mockEmployees}
        showHeader={true}
        title="EOD Reports"
        subtitle="Review team reports & daily updates."
        tabs={
          <div data-testid="hr-tabs">
            <button>Review EOD</button>
            <button>Submit EOD</button>
          </div>
        }
        todayReportsCount={2}
        showTodayKpi={false}
      />
    )

    // HR Header Text
    expect(html).toContain('EOD Reports')
    expect(html).toContain('Review team reports')
    expect(html).toContain('daily updates.')

    // HR Tabs rendered in header actions
    expect(html).toContain('data-testid="hr-tabs"')
    expect(html).toContain('Submit EOD')

    // Preserved 3 KPI cards on right side of header, Today removed for HR
    expect(html).toContain('Reports')
    expect(html).toContain('Approved')
    expect(html).toContain('Pending')
    expect(html).not.toContain('Today')
    expect(html).toContain('justify-end')

    // Exact same modern filter UI format as Admin
    expect(html).toContain('Search by employee name, department, or ID...')
    expect(html).toContain('All Employees')
    expect(html).toContain('Start Date')
    expect(html).toContain('End Date')

    // No old fallback filter box or old fallback stats section
    expect(html).not.toContain('Filter Reports')
    expect(html).not.toContain('Total Reports')
  })

  it('matches height of toggle button and KPI cards (h-[46px] sm:h-[48px])', () => {
    const html = renderToStaticMarkup(
      <ReviewDashboard
        initialEods={mockEODs}
        employees={mockEmployees}
        showHeader={true}
        title="EOD Reports"
        subtitle="Review team reports & daily updates."
        tabs={<EodTabsClient activeTab="review" isSuperAdmin={false} />}
        todayReportsCount={2}
      />
    )

    // Verify toggle button container has matching height class
    expect(html).toContain('h-[46px] sm:h-[48px]')
    // Verify Review EOD and Submit EOD buttons are present
    expect(html).toContain('Review EOD')
    expect(html).toContain('Submit EOD')
  })
})
