import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { LeaveForm } from '@/components/hr/leave/LeaveForm'

// Mock dependencies
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/cert.pdf' } }),
      })),
    },
  })),
}))

vi.mock('@/actions/leave.actions', () => ({
  submitLeaveAction: vi.fn().mockResolvedValue({ success: true, data: { id: 'leave-123' } }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/components/ui/date-picker', () => ({
  DatePicker: ({ placeholder }: any) => <div data-testid="date-picker">{placeholder}</div>,
}))

describe('LeaveForm Component - Requirements Verification', () => {
  it('displays Leave Duration when Request Type is LEAVE', () => {
    const html = renderToStaticMarkup(
      <LeaveForm
        currentEmployeeId="emp-123"
        onCancel={() => {}}
        onSuccess={() => {}}
        initialRequestType="LEAVE"
      />
    )

    expect(html).toContain('Leave Duration')
    expect(html).not.toContain('WFH Duration')
  })

  it('displays WFH Duration when Request Type is WFH', () => {
    const html = renderToStaticMarkup(
      <LeaveForm
        currentEmployeeId="emp-123"
        onCancel={() => {}}
        onSuccess={() => {}}
        initialRequestType="WFH"
      />
    )

    expect(html).toContain('WFH Duration')
    expect(html).not.toContain('Leave Duration')
    // When WFH is selected, Leave Type field is not rendered
    expect(html).not.toContain('Leave Type')
    // Single column layout for request type row when WFH is selected
    expect(html).toContain('grid gap-4 sm:gap-5 grid-cols-1')
    expect(html).not.toContain('grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2')
  })

  it('arranges Request Type and Leave Type in one horizontal row on desktop when Request Type is LEAVE', () => {
    const html = renderToStaticMarkup(
      <LeaveForm
        currentEmployeeId="emp-123"
        onCancel={() => {}}
        onSuccess={() => {}}
        initialRequestType="LEAVE"
      />
    )

    expect(html).toContain('Request Type')
    expect(html).toContain('Leave Type')
    // Two-column responsive layout with 16-20px gap (gap-4 sm:gap-5)
    expect(html).toContain('grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2')
  })

  it('displays Medical Certificate upload field ONLY for Sick Leave', () => {
    const html = renderToStaticMarkup(
      <LeaveForm
        currentEmployeeId="emp-123"
        onCancel={() => {}}
        onSuccess={() => {}}
        initialRequestType="LEAVE"
        initialLeaveType="Sick Leave"
      />
    )

    expect(html).toContain('Medical Certificate')
    expect(html).toContain('PDF, JPG, PNG up to 3MB')
    expect(html).toContain('Sick leave is unpaid until a certificate is verified')
  })

  it('hides Medical Certificate upload field for Casual Leave', () => {
    const html = renderToStaticMarkup(
      <LeaveForm
        currentEmployeeId="emp-123"
        onCancel={() => {}}
        onSuccess={() => {}}
        initialRequestType="LEAVE"
        initialLeaveType="Casual Leave"
      />
    )

    expect(html).not.toContain('Medical Certificate')
    expect(html).not.toContain('PDF, JPG, PNG up to 3MB')
  })

  it('hides Medical Certificate upload field for WFH', () => {
    const html = renderToStaticMarkup(
      <LeaveForm
        currentEmployeeId="emp-123"
        onCancel={() => {}}
        onSuccess={() => {}}
        initialRequestType="WFH"
        initialLeaveType="Sick Leave"
      />
    )

    expect(html).not.toContain('Medical Certificate')
    expect(html).not.toContain('PDF, JPG, PNG up to 3MB')
  })

  it('preserves ERP theme, typography, and action buttons', () => {
    const html = renderToStaticMarkup(
      <LeaveForm
        currentEmployeeId="emp-123"
        onCancel={() => {}}
        onSuccess={() => {}}
      />
    )

    expect(html).toContain('bg-card border border-border')
    expect(html).toContain('Submit Application')
    expect(html).toContain('Cancel')
  })
})
