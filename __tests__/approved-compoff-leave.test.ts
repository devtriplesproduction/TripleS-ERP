import { describe, it, expect } from 'vitest'
import * as dotenv from 'dotenv'
dotenv.config()

import { buildAttendanceRecords } from '@/lib/utils/attendance-builder'
import { calculateAttendanceSummary } from '@/lib/utils/attendance-summary'
import { getAttendanceStatusConfig } from '@/components/hr/onboarding/employee-attendance-calendar'
import { classifyDay, calculateMonthlyPayroll } from '@/lib/services/payroll.service'
import { processLeaveCompOff } from '@/lib/actions/compoff'
import { createAdminClient } from '@/lib/supabase/server'

describe('Approved Comp-Off Leave & Multi-Leave Classification Regression Tests', () => {
  it('1. correctly distinguishes Comp-Off, Casual Leave, Sick Leave, and WFH in attendance records', () => {
    const leaveRequests = [
      {
        id: 'req-compoff',
        employee_id: 'emp-1',
        start_date: '2026-10-16',
        end_date: '2026-10-16',
        request_type: 'LEAVE',
        leave_type: 'Compensatory Off',
        is_half_day: false,
        status: 'Approved'
      },
      {
        id: 'req-sick',
        employee_id: 'emp-1',
        start_date: '2026-10-21',
        end_date: '2026-10-21',
        request_type: 'LEAVE',
        leave_type: 'Sick Leave',
        is_half_day: false,
        status: 'Approved'
      },
      {
        id: 'req-casual',
        employee_id: 'emp-1',
        start_date: '2026-10-22',
        end_date: '2026-10-22',
        request_type: 'LEAVE',
        leave_type: 'Casual Leave',
        is_half_day: false,
        status: 'Approved'
      },
      {
        id: 'req-wfh',
        employee_id: 'emp-1',
        start_date: '2026-10-02',
        end_date: '2026-10-03',
        request_type: 'WFH',
        leave_type: null,
        is_half_day: false,
        status: 'Approved'
      }
    ]

    const records = buildAttendanceRecords(2026, 10, [], leaveRequests, [])

    // October 16: Comp-Off
    const oct16 = records.find(r => r.date === '2026-10-16')
    expect(oct16).toBeDefined()
    expect(oct16?.status).toBe('Comp-Off')
    expect(oct16?.leave?.leave_type).toBe('Compensatory Off')

    // October 21: Sick Leave
    const oct21 = records.find(r => r.date === '2026-10-21')
    expect(oct21).toBeDefined()
    expect(oct21?.status).toBe('Sick Leave')
    expect(oct21?.leave?.leave_type).toBe('Sick Leave')

    // October 22: Casual Leave
    const oct22 = records.find(r => r.date === '2026-10-22')
    expect(oct22).toBeDefined()
    expect(oct22?.status).toBe('Casual Leave')
    expect(oct22?.leave?.leave_type).toBe('Casual Leave')

    // October 2 & 3: WFH
    const oct2 = records.find(r => r.date === '2026-10-02')
    const oct3 = records.find(r => r.date === '2026-10-03')
    expect(oct2?.status).toBe('WFH')
    expect(oct3?.status).toBe('WFH')
  })

  it('2. provides correct badge configurations for Comp-Off, Casual Leave, Sick Leave, and WFH', () => {
    const compOffCfg = getAttendanceStatusConfig('Comp-Off')
    expect(compOffCfg.label).toBe('Comp-Off')
    expect(compOffCfg.shortLabel).toBe('Comp-Off')
    expect(compOffCfg.bg).toContain('purple')

    const casualCfg = getAttendanceStatusConfig('Casual Leave')
    expect(casualCfg.label).toBe('Casual Leave')
    expect(casualCfg.shortLabel).toBe('Casual Leave')
    expect(casualCfg.bg).toContain('sky')

    const sickCfg = getAttendanceStatusConfig('Sick Leave')
    expect(sickCfg.label).toBe('Sick Leave')
    expect(sickCfg.shortLabel).toBe('Sick Leave')
    expect(sickCfg.bg).toContain('rose')

    const wfhCfg = getAttendanceStatusConfig('WFH')
    expect(wfhCfg.shortLabel).toBe('WFH')
    expect(wfhCfg.bg).toContain('blue')
  })

  it('3. counts Comp-Off, Casual Leave, and Sick Leave within Monthly Insights summary leaves', () => {
    const dummyRecords: any[] = [
      { status: 'Present', workedHours: 8, extraHours: 0, compOffMinutes: 0 },
      { status: 'Comp-Off', workedHours: 0, extraHours: 0, compOffMinutes: 0 },
      { status: 'Sick Leave', workedHours: 0, extraHours: 0, compOffMinutes: 0 },
      { status: 'Casual Leave', workedHours: 0, extraHours: 0, compOffMinutes: 0 },
      { status: 'Leave', workedHours: 0, extraHours: 0, compOffMinutes: 0 },
      { status: 'WFH', workedHours: 8, extraHours: 0, compOffMinutes: 0 },
      { status: 'Absent', workedHours: 0, extraHours: 0, compOffMinutes: 0 }
    ]

    const summary = calculateAttendanceSummary(dummyRecords)
    expect(summary.present).toBe(1)
    expect(summary.wfh).toBe(1)
    expect(summary.absent).toBe(1)
    // 4 leaves total: Comp-Off + Sick Leave + Casual Leave + generic Leave
    expect(summary.leave).toBe(4)
  })

  it('4. ensures EOD attendance and paid leave on the same date are not double-counted in payroll', () => {
    // If an employee worked on an approved leave day, payFraction from EOD must be 0
    // and worked time goes 100% to comp-off
    const classification = classifyDay(480, 'approved_leave')
    expect(classification.payFraction).toBe(0)
    expect(classification.compOffMinutes).toBe(480)
    expect(classification.status).toBe('LEAVE')
  })

  it('5. fetches and verifies Omkar Sawant October 16, 2026 approved Comp-Off request & ledger in live Supabase', async () => {
    const supabase = await createAdminClient()

    // 1. Fetch profile and onboarding for EMP-003
    const { data: prof, error: profErr } = await supabase
      .from('profiles')
      .select('id, employee_id, first_name, last_name')
      .eq('employee_id', 'EMP-003')
      .maybeSingle()

    if (profErr) console.error('profErr:', profErr)
    expect(prof).toBeDefined()
    expect(prof?.first_name).toBe('Omkar')
    expect(prof?.last_name).toBe('Sawant')

    const { data: ob } = await supabase
      .from('employee_onboarding')
      .select('id, employee_id_number')
      .eq('employee_id_number', 'EMP-003')
      .maybeSingle()

    expect(ob).toBeDefined()

    // 2. Fetch actual approved leave request for Oct 16
    const { data: leaves } = await supabase
      .from('leave_requests')
      .select('*')
      .or(`employee_id.eq.${prof!.id},employee_id.eq.${ob!.id}`)
      .eq('start_date', '2026-10-16')
      .eq('end_date', '2026-10-16')

    expect(leaves).toBeDefined()
    expect(leaves!.length).toBeGreaterThan(0)
    const oct16Leave = leaves![0]

    // Verify identification as Compensatory Off
    expect(oct16Leave.status).toBe('Approved')
    expect(oct16Leave.request_type).toBe('LEAVE')
    expect(oct16Leave.leave_type).toBe('Compensatory Off')

    // 3. Verify exactly 8 hours debited in comp_off_ledger
    const { data: ledgerEntries } = await supabase
      .from('comp_off_ledger')
      .select('*')
      .or(`employee_id.eq.${prof!.id},employee_id.eq.${ob!.id}`)
      .eq('reference_id', oct16Leave.id)

    expect(ledgerEntries).toBeDefined()
    expect(ledgerEntries!.length).toBe(1)
    expect(ledgerEntries![0].transaction_type).toBe('DEBIT')
    expect(Number(ledgerEntries![0].hours)).toBe(8)

    // 4. Test idempotency: Calling processLeaveCompOff again does not insert a duplicate debit
    await processLeaveCompOff(oct16Leave.id, ob!.id, 1, 'Approved')

    const { data: ledgerEntriesAfter } = await supabase
      .from('comp_off_ledger')
      .select('*')
      .or(`employee_id.eq.${prof!.id},employee_id.eq.${ob!.id}`)
      .eq('reference_id', oct16Leave.id)

    expect(ledgerEntriesAfter!.length).toBe(1)
    expect(Number(ledgerEntriesAfter![0].hours)).toBe(8)
  }, 90000)
})
