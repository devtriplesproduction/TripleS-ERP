import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ReviewDashboard } from '@/components/eod/ReviewDashboard'

// Mock dependencies
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

  it('renders Review EOD as the primary page heading with summary cards and admin controls', () => {
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

    // Primary Page Header
    expect(html).toContain('Review EOD')
    expect(html).toContain('Review employee and HR end-of-day reports.')

    // Preserved 4 summary cards
    expect(html).toContain('Reports')
    expect(html).toContain('Approved')
    expect(html).toContain('Pending')
    expect(html).toContain('Today')

    // Preserved admin controls (branch selector & review EOD button)
    expect(html).toContain('id="test-branch-selector"')
    expect(html).toContain('id="test-review-btn"')

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
})
