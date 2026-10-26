import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PayrollDetailModal } from '@/components/hr/payroll/PayrollDetailModal'
import { AddDeductionModal } from '@/components/hr/payroll/AddDeductionModal'
import { PayrollClientPage } from '@/components/hr/payroll/PayrollClientPage'
import { PayrollResult } from '@/lib/services/payroll.service'
import { vi } from 'vitest'

// Mock Dialog to render inline in static markup without portal
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog-root">{children}</div> : null,
  DialogContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  DialogHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  DialogTitle: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
  DialogFooter: ({ children, className }: any) => <div className={className}>{children}</div>,
}))

// Mock Select to render inline
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}))

describe('Payroll Deductions UI Components', () => {
  const samplePayroll: PayrollResult = {
    employeeId: 'emp-001',
    name: 'Omkar Sawant',
    department: 'Development',
    salary: 8000,
    standardHours: 216,
    actualWorkedHours: 133.68,
    creditedLeaveHours: 0,
    unpaidLeaveHours: 0,
    paidHolidayHours: 0,
    wfhHours: 0,
    extraHours: 0,
    shortHours: 0,
    daysHalfDay: 1,
    daysUnpaidLeaveEod: 1,
    compOffMinutesEarned: 0,
    overtimePay: 0,
    unpaidLeaveDeduction: 3571.43,
    shortHoursDeduction: 0,
    manualDeductions: 500.0,
    deductionsCount: 1,
    deductionsList: [
      {
        id: 'ded-1',
        employee_id: 'emp-001',
        payroll_year: 2026,
        payroll_month: 10,
        deduction_type: 'Damage Recovery',
        amount: 500,
        reason: 'Broken keyboard & USB hub replacement',
        notes: 'HR approval ref #4412',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    totalPaidHours: 133.68,
    grossPay: 8000,
    totalDeductions: 4071.43,
    netPayable: 3928.57,
    hasPayrollData: true,
  }

  const sampleEmployees = [
    {
      id: 'emp-001',
      first_name: 'Omkar',
      last_name: 'Sawant',
      department: 'Development',
      employee_id_number: 'EMP-001',
    },
    {
      id: 'emp-002',
      first_name: 'Harishchandra',
      last_name: 'Nanavare',
      department: 'Content',
      employee_id_number: 'EMP-002',
    },
  ]

  it('renders PayrollDetailModal with financial breakdown including employee deductions', () => {
    const html = renderToStaticMarkup(
      <PayrollDetailModal
        isOpen={true}
        onClose={() => {}}
        payroll={samplePayroll}
        onAddDeductionClick={() => {}}
      />
    )

    // Check title and employee info
    expect(html).toContain('Payroll Detail: Omkar Sawant')
    expect(html).toContain('Development')

    // Check financial breakdown items
    expect(html).toContain('Monthly Gross (Base)')
    expect(html).toContain('₹8000.00')
    expect(html).toContain('Unpaid Leave / Absence (-)')
    expect(html).toContain('₹3571.43')
    expect(html).toContain('Employee Deductions (-)')
    expect(html).toContain('₹500.00')
    expect(html).toContain('Total Deductions (-)')
    expect(html).toContain('₹4071.43')
    expect(html).toContain('Net Payable')
    expect(html).toContain('₹3928.57')

    // Check itemized deduction section
    expect(html).toContain('Employee-Specific Deductions (1)')
    expect(html).toContain('Damage Recovery')
    expect(html).toContain('-₹500.00')
    expect(html).toContain('Broken keyboard &amp; USB hub replacement')
    expect(html).toContain('Note: HR approval ref #4412')

    // Check Add Deduction button
    expect(html).toContain('Add Deduction')
  })

  it('renders AddDeductionModal with required form fields and labels', () => {
    const html = renderToStaticMarkup(
      <AddDeductionModal
        isOpen={true}
        onClose={() => {}}
        employees={sampleEmployees}
        currentMonth={10}
        currentYear={2026}
        preselectedEmployeeId="emp-001"
        onDeductionAdded={() => {}}
      />
    )

    expect(html).toContain('Add Employee Deduction')
    expect(html).toContain('Employee')
    expect(html).toContain('Omkar Sawant (Development)')
    expect(html).toContain('Payroll Month')
    expect(html).toContain('October')
    expect(html).toContain('Year')
    expect(html).toContain('2026')
    expect(html).toContain('Deduction Type')
    expect(html).toContain('Amount (₹)')
    expect(html).toContain('Reason')
    expect(html).toContain('Notes (Optional)')
    expect(html).toContain('Save Deduction')
    expect(html).toContain('Cancel')
  })

  it('renders PayrollClientPage with Add Deduction action button in overview header', () => {
    const html = renderToStaticMarkup(
      <PayrollClientPage title="Payroll Management" initialEmployees={sampleEmployees} />
    )

    expect(html).toContain('Payroll Management')
    expect(html).toContain('Calculate Monthly Payroll')
    expect(html).toContain('Payroll Overview')
    expect(html).toContain('Add Deduction')
  })
})
