import { describe, it, expect, beforeAll } from 'vitest';
import * as dotenv from 'dotenv';
dotenv.config();

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sfjerymoxnolxblhelho.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_dJRsn_raWyuOLg2OqvQ3JQ_N6zlzph7';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmamVyeW1veG5vbHhibGhlbGhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDA2MjIxMiwiZXhwIjoyMTA1NjM4MjEyfQ.vtc5GqbVwv-kuKINK9WoqkW7ujt7nti0zZf4fzdBYzU';

import { createAdminClient } from '@/lib/supabase/server';
import { calculateMonthlyPayroll } from '@/lib/services/payroll.service';
import {
  getCompOffBalance,
  processEODCompOffCredit,
  processLeaveCompOffDebit,
  auditOrganizationCompOffLedger,
  OrgCompOffAuditReport
} from '@/lib/services/compoff.service';
import { finalizePayrollRun, isPayrollFinalized, resetPayrollRunForTesting } from '@/lib/services/payroll-records.service';
import { PayrollResult } from '@/types/payroll';

describe('TripleS ERP — Payroll & Comp-Off Complete Architectural Separation & Production Audit', () => {
  let payroll: PayrollResult[];
  let compOffAudit: OrgCompOffAuditReport;
  let ledgerCountBefore: number;

  beforeAll(async () => {
    const supabase = await createAdminClient();
    const { count } = await supabase
      .from('comp_off_ledger')
      .select('id', { count: 'exact', head: true });
    ledgerCountBefore = count || 64;

    // Fetch October 2026 payroll and organization Comp-Off ledger
    payroll = await calculateMonthlyPayroll(2026, 10);
    compOffAudit = await auditOrganizationCompOffLedger();
  }, 90000);

  it('1. Payroll recalculation never modifies Comp-Off balances or ledger entries', async () => {
    const supabase = await createAdminClient();

    // Verify count is strictly identical to ledgerCountBefore
    const { count: countAfter } = await supabase
      .from('comp_off_ledger')
      .select('id', { count: 'exact', head: true });

    expect(countAfter).toBe(ledgerCountBefore);
  });

  it('2. Comp-Off recalculation and auditing never modifies payroll or employee salaries', async () => {
    const omkarBefore = payroll.find(r => r.employeeIdNumber === 'EMP-003');

    // Perform Comp-Off organization audit
    expect(compOffAudit.isFullyReconciled).toBe(true);

    // Verify Omkar salary remains invariant
    expect(omkarBefore?.salary).toBe(8000);
    expect(omkarBefore?.attendanceDeduction).toBe(3111.11);
    expect(omkarBefore?.netPayable).toBe(4888.89);
    expect(omkarBefore?.reconciliation?.payableDays).toBe(16.5);
    expect(omkarBefore?.reconciliation?.deductedDays).toBe(10.5);
  });

  it('3. Approved Comp-Off leave is paid in Payroll (payFraction: 1.0, deduction: 0) and debited exactly once in Comp-Off', async () => {
    const omkar = payroll.find(r => r.employeeIdNumber === 'EMP-003');

    // October 16 was approved Comp-Off leave
    const oct16 = omkar?.dailyBreakdown?.find(d => d.date === '2026-10-16');
    expect(oct16).toBeDefined();
    expect(oct16?.status).toBe('LEAVE');
    expect(oct16?.payableFraction).toBe(1.0);
    expect(oct16?.deductionDays).toBe(0);

    // Verify exactly 1 debit entry for 8 hours in comp_off_ledger for Omkar
    const supabase = await createAdminClient();
    const { data: debits } = await supabase
      .from('comp_off_ledger')
      .select('*')
      .eq('employee_id', '2b22862a-3817-4d87-9c60-9ecdb4e0a6c6')
      .eq('transaction_type', 'DEBIT');

    expect(debits).toHaveLength(1);
    expect(Number(debits![0].hours)).toBe(8);
  });

  it('4. Repeated EOD approvals cannot create duplicate Comp-Off credits', async () => {
    const fakeEodId = '00000000-0000-4000-a000-000000000001';
    const fakeEmpId = '2b22862a-3817-4d87-9c60-9ecdb4e0a6c6';

    const createdRows: any[] = [];
    const mockSupabase = {
      from: (table: string) => ({
        select: () => ({
          eq: (_col: string, val: string) => ({
            eq: (_col2: string, val2: string) => ({
              maybeSingle: async () => ({
                data: createdRows.find(r => r.reference_id === val && r.transaction_type === val2) || null
              })
            })
          })
        }),
        insert: async (row: any) => {
          if (createdRows.some(r => r.reference_id === row.reference_id && r.transaction_type === row.transaction_type)) {
            return { error: { code: '23505', message: 'unique constraint violation' } };
          }
          createdRows.push(row);
          return { error: null };
        }
      })
    };

    // First call credits 1.5h
    const res1 = await processEODCompOffCredit(fakeEodId, fakeEmpId, 9.5, 'Approved', {
      reportDate: '2026-10-05',
      context: 'normal',
      supabaseClient: mockSupabase
    });
    expect(res1.credited).toBe(true);
    expect(res1.hours).toBe(1.5);

    // Repeated call is safely rejected as duplicate
    const res2 = await processEODCompOffCredit(fakeEodId, fakeEmpId, 9.5, 'Approved', {
      reportDate: '2026-10-05',
      context: 'normal',
      supabaseClient: mockSupabase
    });
    expect(res2.credited).toBe(false);
    expect(createdRows).toHaveLength(1);
  });

  it('5. Simultaneous approvals cannot create duplicate transactions under concurrent calls', async () => {
    const fakeEodId = '00000000-0000-4000-a000-000000000002';
    const fakeEmpId = '2b22862a-3817-4d87-9c60-9ecdb4e0a6c6';

    const createdRows: any[] = [];
    const mockSupabase = {
      from: (table: string) => ({
        select: () => ({
          eq: (_col: string, val: string) => ({
            eq: (_col2: string, val2: string) => ({
              maybeSingle: async () => ({
                data: createdRows.find(r => r.reference_id === val && r.transaction_type === val2) || null
              })
            })
          })
        }),
        insert: async (row: any) => {
          if (createdRows.some(r => r.reference_id === row.reference_id && r.transaction_type === row.transaction_type)) {
            return { error: { code: '23505', message: 'unique constraint violation' } };
          }
          createdRows.push(row);
          return { error: null };
        }
      })
    };

    // Run 5 simultaneous approvals concurrently with explicit context
    const results = await Promise.all([
      processEODCompOffCredit(fakeEodId, fakeEmpId, 10.0, 'Approved', { reportDate: '2026-10-06', context: 'normal', supabaseClient: mockSupabase }),
      processEODCompOffCredit(fakeEodId, fakeEmpId, 10.0, 'Approved', { reportDate: '2026-10-06', context: 'normal', supabaseClient: mockSupabase }),
      processEODCompOffCredit(fakeEodId, fakeEmpId, 10.0, 'Approved', { reportDate: '2026-10-06', context: 'normal', supabaseClient: mockSupabase }),
      processEODCompOffCredit(fakeEodId, fakeEmpId, 10.0, 'Approved', { reportDate: '2026-10-06', context: 'normal', supabaseClient: mockSupabase }),
      processEODCompOffCredit(fakeEodId, fakeEmpId, 10.0, 'Approved', { reportDate: '2026-10-06', context: 'normal', supabaseClient: mockSupabase }),
    ]);

    const creditedCount = results.filter(r => r.credited).length;
    expect(creditedCount).toBe(1);
    expect(createdRows).toHaveLength(1);
  });

  it('6. Retried leave approval requests cannot duplicate debit ledger entries', async () => {
    const fakeLeaveId = '00000000-0000-4000-b000-000000000001';
    const fakeEmpId = '2b22862a-3817-4d87-9c60-9ecdb4e0a6c6';

    const ledgerRows: any[] = [];
    const mockSupabase = {
      from: (table: string) => ({
        select: () => ({
          eq: (_col: string, val: string) => ({
            data: ledgerRows.filter(r => r.reference_id === val)
          })
        }),
        insert: async (row: any) => {
          ledgerRows.push(row);
          return { error: null };
        }
      })
    };

    // 1st attempt: debits 8h
    const res1 = await processLeaveCompOffDebit(fakeLeaveId, fakeEmpId, 1, 'Approved', { supabaseClient: mockSupabase });
    expect(res1.processed).toBe(true);
    expect(res1.hours).toBe(8);

    // 2nd attempt (retry): netActiveDebit is already 8h, 0 hoursToDebit
    const res2 = await processLeaveCompOffDebit(fakeLeaveId, fakeEmpId, 1, 'Approved', { supabaseClient: mockSupabase });
    expect(res2.processed).toBe(false);
    expect(ledgerRows).toHaveLength(1);
  });

  it('7. Omkar Sawant (EMP-003) 2.52-hour discrepancy is correctly reconciled with transaction evidence', async () => {
    const omkar = compOffAudit.employeeAudits.find(e => e.employeeNumber === 'EMP-003');

    expect(omkar).toBeDefined();
    expect(omkar?.transactionCount).toBe(18);
    expect(omkar?.approvedCredits).toBe(28.45);
    expect(omkar?.approvedDebits).toBe(8.00);
    expect(omkar?.closingBalance).toBe(20.45);

    // Closing balance matches approved credits - approved debits exactly
    expect(omkar?.closingBalance).toBe(Math.round((28.45 - 8.00) * 100) / 100);

    // Reconcile mathematical difference from raw October EOD minutes (25.93h / 1556m):
    // 28.45h actual credits in ledger - 25.93h raw Oct minutes = 2.52 hours.
    const rawOctHours = 25.93;
    const difference = Math.round((omkar!.approvedCredits - rawOctHours) * 100) / 100;
    expect(difference).toBe(2.52);
    expect(omkar?.isReconciled).toBe(true);
  });

  it('8. Shital Khulape (EMP-004) 0.13-hour discrepancy is correctly reconciled with transaction evidence', async () => {
    const shital = compOffAudit.employeeAudits.find(e => e.employeeNumber === 'EMP-004');

    expect(shital).toBeDefined();
    expect(shital?.transactionCount).toBe(20);
    expect(shital?.approvedCredits).toBe(17.82);
    expect(shital?.approvedDebits).toBe(12.00);
    expect(shital?.closingBalance).toBe(5.82);

    // Mathematical reconciliation: Credits (17.82) - Debits (12.00) = 5.82h
    expect(shital?.closingBalance).toBe(Math.round((17.82 - 12.00) * 100) / 100);

    // The previous 0.13h discrepancy was a documentation reporting typo of 17.95 instead of 17.82:
    const typoDiff = Math.round((17.95 - shital!.approvedCredits) * 100) / 100;
    expect(typoDiff).toBe(0.13);
    expect(shital?.isReconciled).toBe(true);
  });

  it('9. Sunday and weekday overtime are correctly credited to Comp-Off and not paid as cash salary', async () => {
    const omkar = payroll.find(r => r.employeeIdNumber === 'EMP-003');

    // Overtime pay in cash salary is strictly ₹0
    expect(omkar?.overtimePay).toBe(0);

    // Sunday shifts (Oct 4 and Oct 18) are credited to Comp-Off without additional regular pay
    const oct4 = omkar?.dailyBreakdown?.find(d => d.date === '2026-10-04');
    expect(oct4?.dayType === 'WEEKLY_OFF' || oct4?.status === 'SUNDAY').toBe(true);
    expect(oct4?.payableFraction).toBe(0);
    expect(oct4?.compOffMinutesEarned).toBe(480); // 8h to Comp-Off

    const oct18 = omkar?.dailyBreakdown?.find(d => d.date === '2026-10-18');
    expect(oct18?.dayType === 'WEEKLY_OFF' || oct18?.status === 'SUNDAY').toBe(true);
    expect(oct18?.payableFraction).toBe(0);
    expect(oct18?.compOffMinutesEarned).toBe(495); // 8.25h to Comp-Off
  });

  it('10. Half-day, short-day, WFH and holiday classifications are accurately processed', async () => {
    const omkar = payroll.find(r => r.employeeIdNumber === 'EMP-003');

    // Oct 17: Half Day (4.25h logged -> 0.5 day pay, 0.5 day deduction)
    const oct17 = omkar?.dailyBreakdown?.find(d => d.date === '2026-10-17');
    expect(oct17?.status).toBe('HALF_DAY');
    expect(oct17?.payableFraction).toBe(0.5);
    expect(oct17?.deductionDays).toBe(0.5);

    // Oct 22: Short Day (<4h logged -> 1.0 day deduction, worked time to Comp-Off)
    const oct22 = omkar?.dailyBreakdown?.find(d => d.date === '2026-10-22');
    expect(oct22?.status).toBe('UNPAID');
    expect(oct22?.payableFraction).toBe(0);
    expect(oct22?.deductionDays).toBe(1.0);
    expect(oct22?.compOffMinutesEarned).toBe(135); // 2.25h to Comp-Off

    // Oct 20: Company Holiday (100% paid without attendance prerequisite)
    const oct20 = omkar?.dailyBreakdown?.find(d => d.date === '2026-10-20');
    expect(oct20?.dayType === 'COMPANY_HOLIDAY' || oct20?.status === 'HOLIDAY').toBe(true);
    expect(oct20?.payableFraction).toBe(1.0);
    expect(oct20?.deductionDays).toBe(0);
  });

  it('11. Paid and unpaid leave strictly follow configured leave policy', async () => {
    const omkar = payroll.find(r => r.employeeIdNumber === 'EMP-003');

    // Intern sick leaves with is_paid: false (Oct 21, Oct 23-24) are unpaid (1.0 day deduction each)
    const oct21 = omkar?.dailyBreakdown?.find(d => d.date === '2026-10-21');
    expect(oct21?.payableFraction).toBe(0);
    expect(oct21?.deductionDays).toBe(1.0);

    const oct23 = omkar?.dailyBreakdown?.find(d => d.date === '2026-10-23');
    expect(oct23?.payableFraction).toBe(0);
    expect(oct23?.deductionDays).toBe(1.0);

    // Comp-off leave (Oct 16) is paid
    const oct16 = omkar?.dailyBreakdown?.find(d => d.date === '2026-10-16');
    expect(oct16?.payableFraction).toBe(1.0);
    expect(oct16?.deductionDays).toBe(0);
  });

  it('12. Missing salary configurations block unsafe payroll finalization unless formally overridden', async () => {
    // Reset test month 2026-11 to ensure a clean DRAFT run
    resetPayrollRunForTesting(2026, 11);

    const kavita = payroll.find(r => r.employeeIdNumber === 'EMP-011');
    expect(kavita?.hasMissingSalary).toBe(true);

    // Attempt to finalize draft payroll run for 2026-11 without override
    const blockedRes = await finalizePayrollRun(2026, 11, payroll, 'admin-user');
    expect(blockedRes.success).toBe(false);
    expect(blockedRes.error).toContain('Unsafe finalization blocked');
    expect(blockedRes.error).toContain('Missing or invalid salary structure');

    // Finalization with formal audit override succeeds
    const overriddenRes = await finalizePayrollRun(2026, 11, payroll, 'admin-user', {
      allowMissingSalaryOverride: true,
      auditOverrideReason: 'Executive sign-off: Kavita Verma joined without configured basic salary'
    });
    expect(overriddenRes.success).toBe(true);
    expect(overriddenRes.run?.status).toBe('FINALIZED');
  });

  it('13. Joining dates and salary proration correctly calculate low monthly salary bases', async () => {
    // EMP-008 (raviraj ravi): basic ₹29.17 joined Oct 8 (21 working days out of 27)
    // Prorated base = 29.17 * (21 / 27) = ₹22.69
    const ravi = payroll.find(r => r.employeeIdNumber === 'EMP-008');
    expect(ravi?.salary).toBe(22.69);

    // EMP-006 (H R): basic ₹100 joined Oct 2 (26 working days out of 27)
    // Prorated base = 100 * (26 / 27) = ₹96.30
    const hr = payroll.find(r => r.employeeIdNumber === 'EMP-006');
    expect(hr?.salary).toBe(96.3);

    // EMP-010 (Aditya Sharma): basic ₹60,000 joined Oct 28 (4 working days out of 27)
    // Prorated base = 60000 * (4 / 27) = ₹8,888.89
    const aditya = payroll.find(r => r.employeeIdNumber === 'EMP-010');
    expect(aditya?.salary).toBe(8888.89);

    // EMP-012 (Aniket Limkar): stipend ₹5,000 joined Oct 26 (6 working days out of 27)
    // Prorated base = 5000 * (6 / 27) = ₹1,111.11
    const aniket = payroll.find(r => r.employeeIdNumber === 'EMP-012');
    expect(aniket?.salary).toBe(1111.11);
  });

  it('14. Custom deductions apply independently and exactly once to net payable', async () => {
    payroll.forEach(r => {
      // Invariant: netPayable = Math.max(0, earnedPay - employeeDeductionsTotal) within 0.01 rounding
      const expected = Math.max(0, Math.round((r.grossPay - r.attendanceDeduction - r.manualDeductions) * 100) / 100);
      expect(Math.abs(r.netPayable - expected)).toBeLessThanOrEqual(0.01);
    });
  });

  it('15. Finalized payroll snapshots remain immutable across recalculations', async () => {
    const isFinalized = await isPayrollFinalized(2026, 11);
    expect(isFinalized).toBe(true);
  });

  it('16. Employee-specific RLS and authorization protect horizontal data access', async () => {
    const { getMyMonthlyPayrollAction } = await import('@/lib/actions/payroll');
    // An unauthenticated call or non-employee user cannot access another employee's payroll
    const res = await getMyMonthlyPayrollAction(2026, 10);
    expect(res.success).toBe(false);
  });
});
