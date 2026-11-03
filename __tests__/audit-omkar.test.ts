import { describe, it, expect } from 'vitest'
import * as dotenv from 'dotenv'
dotenv.config()

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sfjerymoxnolxblhelho.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_dJRsn_raWyuOLg2OqvQ3JQ_N6zlzph7'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmamVyeW1veG5vbHhibGhlbGhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDA2MjIxMiwiZXhwIjoyMTA1NjM4MjEyfQ.vtc5GqbVwv-kuKINK9WoqkW7ujt7nti0zZf4fzdBYzU'

import { calculateMonthlyPayroll } from '@/lib/services/payroll.service'

describe('Audit Omkar Sawant October 2026', () => {
  it('reconciles Omkar Sawant payroll calculation with dynamic actual_mon_sat divisor (27 days)', async () => {
    const results = await calculateMonthlyPayroll(2026, 10, ['2b22862a-3817-4d87-9c60-9ecdb4e0a6c6'], { divisorMode: 'actual_mon_sat' })
    expect(results).toHaveLength(1)
    const omkar = results[0]

    // 1. Employee structure & salary
    expect(omkar.name).toBe('Omkar Sawant')
    expect(omkar.salary).toBe(8000)
    expect(omkar.grossPay).toBe(8000)

    // 2. Standard hours: 27 days * 8h = 216 hours
    expect(omkar.standardHours).toBe(216)

    // 3. Raw actual worked hours from approved EODs
    expect(omkar.actualWorkedHours).toBe(142.18)

    // 4. Paid leave hours (4 days * 8h = 32 hours)
    expect(omkar.creditedLeaveHours).toBe(32)

    // 5. Paid holiday hours (1 holiday * 8h = 8 hours: Dusshera Oct 20)
    expect(omkar.paidHolidayHours).toBe(8)

    // 6. Approved WFH hours (Oct 2-3 = 16 hours)
    expect(omkar.wfhHours).toBe(16)

    // 7. Full days, Half days, Unpaid short-days, Unexcused absences
    expect(omkar.daysFullDay).toBe(14)
    expect(omkar.daysHalfDay).toBe(1)
    expect(omkar.daysUnpaidLeaveEod).toBe(1)
    expect(omkar.daysAbsent).toBe(6)

    // 8. Regular payable hours
    expect(omkar.payableWorkedHours).toBe(116)
    expect(omkar.payableHours).toBe(156)

    // 9. Total deducted days = 1 (unpaid short-day) + (1 * 0.5) (half-day shortfall) + 6 (unexcused absences) = 7.5 days
    // Daily rate = 8000 / 27 = 296.30
    // Attendance deduction = 7.5 * 296.30 = 2222.25
    expect(omkar.attendanceDeduction).toBe(2222.25)
    expect(omkar.totalDeductions).toBe(2222.25)

    // 10. Net payable = 8000 - 2222.25 = 5777.75
    expect(omkar.netPayable).toBe(5777.75)

    // 11. Comp-off earned:
    // Sundays: Oct 4 (480 mins) + Oct 18 (495 mins) = 975 mins
    // Short-day (<4h): Oct 22 (135 mins)
    // Overtime on 14 full days: 446 mins
    // Total Comp-Off = 975 + 135 + 446 = 1556 minutes (25.93 hours)
    expect(omkar.compOffMinutesEarned).toBe(1556)
    expect(omkar.extraHours).toBe(25.93)

    // 12. Date-wise payroll calculation breakdown: exactly 31 days
    expect(omkar.dailyBreakdown).toBeDefined()
    expect(omkar.dailyBreakdown).toHaveLength(31)

    // Key dates
    const oct01 = omkar.dailyBreakdown?.find(d => d.date === '2026-10-01')
    expect(oct01?.status).toBe('FULL_DAY')
    expect(oct01?.payableFraction).toBe(1)
    expect(oct01?.compOffMinutesEarned).toBe(167)

    const oct02 = omkar.dailyBreakdown?.find(d => d.date === '2026-10-02')
    expect(oct02?.status).toBe('FULL_DAY')
    expect(oct02?.payableFraction).toBe(1)
    expect(oct02?.compOffMinutesEarned).toBe(15)

    const oct03 = omkar.dailyBreakdown?.find(d => d.date === '2026-10-03')
    expect(oct03?.status).toBe('FULL_DAY')
    expect(oct03?.payableFraction).toBe(1)
    expect(oct03?.compOffMinutesEarned).toBe(5)

    const oct04 = omkar.dailyBreakdown?.find(d => d.date === '2026-10-04')
    expect(oct04?.status).toBe('SUNDAY')
    expect(oct04?.compOffMinutesEarned).toBe(480)

    const oct16 = omkar.dailyBreakdown?.find(d => d.date === '2026-10-16')
    expect(oct16?.status).toBe('LEAVE')
    expect(oct16?.payableFraction).toBe(1)
    expect(oct16?.deductionDays).toBe(0)

    const oct17 = omkar.dailyBreakdown?.find(d => d.date === '2026-10-17')
    expect(oct17?.status).toBe('HALF_DAY')
    expect(oct17?.payableFraction).toBe(0.5)
    expect(oct17?.deductionDays).toBe(0.5)

    const oct20 = omkar.dailyBreakdown?.find(d => d.date === '2026-10-20')
    expect(oct20?.status).toBe('HOLIDAY')
    expect(oct20?.payableFraction).toBe(1)

    const oct22 = omkar.dailyBreakdown?.find(d => d.date === '2026-10-22')
    expect(oct22?.status).toBe('UNPAID')
    expect(oct22?.deductionDays).toBe(1)
    expect(oct22?.compOffMinutesEarned).toBe(135)

    // 13. Automated reconciliation checks
    expect(omkar.reconciliation).toBeDefined()
    expect(omkar.reconciliation?.isScheduledDaysReconciled).toBe(true)
    expect(omkar.reconciliation?.scheduledWorkingDays).toBe(27)
    expect(omkar.reconciliation?.payableDays).toBe(19.5)
    expect(omkar.reconciliation?.deductedDays).toBe(7.5)
    expect(omkar.reconciliation?.isFinancialReconciled).toBe(true)
    expect(omkar.reconciliation?.baseSalary).toBe(8000)
    expect(omkar.reconciliation?.netPayable).toBe(5777.75)
    expect(omkar.reconciliation?.totalDeductions).toBe(2222.25)
    expect(omkar.reconciliation?.divisorMode).toBe('actual_mon_sat')
    expect(omkar.reconciliation?.dailyRate).toBe(296.30)
    expect(omkar.reconciliation?.status).toBe('RECONCILED')
  }, 90000)

  it('reconciles Omkar Sawant payroll calculation with fixed_26 divisor (26 days)', async () => {
    const results = await calculateMonthlyPayroll(2026, 10, ['2b22862a-3817-4d87-9c60-9ecdb4e0a6c6'], { divisorMode: 'fixed_26' })
    expect(results).toHaveLength(1)
    const omkar = results[0]

    expect(omkar.standardHours).toBe(208)
    expect(omkar.attendanceDeduction).toBe(2307.68)
    expect(omkar.totalDeductions).toBe(2307.68)
    expect(omkar.netPayable).toBe(5692.32)

    expect(omkar.reconciliation?.isFinancialReconciled).toBe(true)
    expect(omkar.reconciliation?.baseSalary).toBe(8000)
    expect(omkar.reconciliation?.netPayable).toBe(5692.32)
    expect(omkar.reconciliation?.totalDeductions).toBe(2307.68)
    expect(omkar.reconciliation?.divisorMode).toBe('fixed_26')
    expect(omkar.reconciliation?.dailyRate).toBe(307.69)
  }, 90000)
})
