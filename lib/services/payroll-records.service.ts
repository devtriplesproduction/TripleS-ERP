import { createAdminClient } from '@/lib/supabase/server';
import { PayrollRun, PayrollItem, PayrollResult } from '@/types/payroll';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const FALLBACK_DIR = path.join(process.cwd(), 'scratch');
const RUNS_FILE = 'payroll_runs_store.json';
const ITEMS_FILE = 'payroll_items_store.json';

function isFallbackAllowed(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  return process.env.ALLOW_PAYROLL_FILE_FALLBACK === 'true';
}

function ensureStoreDir(): void {
  if (!fs.existsSync(FALLBACK_DIR)) {
    fs.mkdirSync(FALLBACK_DIR, { recursive: true });
  }
}

function readFallbackRuns(): PayrollRun[] {
  if (!isFallbackAllowed()) return [];
  try {
    ensureStoreDir();
    const filePath = path.join(FALLBACK_DIR, RUNS_FILE);
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as PayrollRun[];
  } catch (err) {
    console.error('[PayrollRecords] Failed to read fallback runs store:', err);
    return [];
  }
}

function writeFallbackRuns(runs: PayrollRun[]): void {
  if (!isFallbackAllowed()) return;
  try {
    ensureStoreDir();
    const filePath = path.join(FALLBACK_DIR, RUNS_FILE);
    fs.writeFileSync(filePath, JSON.stringify(runs, null, 2), 'utf-8');
  } catch (err) {
    console.error('[PayrollRecords] Failed to write fallback runs store:', err);
  }
}

function readFallbackItems(): PayrollItem[] {
  if (!isFallbackAllowed()) return [];
  try {
    ensureStoreDir();
    const filePath = path.join(FALLBACK_DIR, ITEMS_FILE);
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as PayrollItem[];
  } catch (err) {
    console.error('[PayrollRecords] Failed to read fallback items store:', err);
    return [];
  }
}

function writeFallbackItems(items: PayrollItem[]): void {
  if (!isFallbackAllowed()) return;
  try {
    ensureStoreDir();
    const filePath = path.join(FALLBACK_DIR, ITEMS_FILE);
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('[PayrollRecords] Failed to write fallback items store:', err);
  }
}

export function resetPayrollRunForTesting(year: number, month: number): void {
  const allRuns = readFallbackRuns();
  const matchedRun = allRuns.find(r => Number(r.year) === Number(year) && Number(r.month) === Number(month));
  const filteredRuns = allRuns.filter(r => !(Number(r.year) === Number(year) && Number(r.month) === Number(month)));
  writeFallbackRuns(filteredRuns);

  if (matchedRun) {
    const allItems = readFallbackItems().filter(i => i.payroll_run_id !== matchedRun.id);
    writeFallbackItems(allItems);
  }
}

/**
 * Check if a payroll run for the given year and month is finalized.
 */
export async function isPayrollFinalized(year: number, month: number): Promise<boolean> {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('payroll_runs')
      .select('id, status')
      .eq('year', year)
      .eq('month', month)
      .maybeSingle();

    if (!error && data) {
      return data.status === 'FINALIZED';
    }
  } catch {
    // ignore, fall back to file store
  }

  const fallbackRuns = readFallbackRuns();
  const run = fallbackRuns.find(r => Number(r.year) === Number(year) && Number(r.month) === Number(month));
  return run?.status === 'FINALIZED';
}

/**
 * Fetch the finalized payroll snapshot for a year and month.
 * Returns null if the payroll run does not exist or is not finalized.
 */
export async function getFinalizedPayroll(
  year: number,
  month: number,
  employeeIds?: string[]
): Promise<PayrollResult[] | null> {
  let run: PayrollRun | null = null;
  let items: PayrollItem[] = [];

  try {
    const supabase = await createAdminClient();
    const { data: runData, error: runErr } = await supabase
      .from('payroll_runs')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .maybeSingle();

    if (!runErr && runData && runData.status === 'FINALIZED') {
      run = runData as PayrollRun;
      let itemsQuery = supabase
        .from('payroll_items')
        .select('*')
        .eq('payroll_run_id', run.id);

      if (employeeIds && employeeIds.length > 0) {
        itemsQuery = itemsQuery.in('employee_id', employeeIds);
      }

      const { data: itemsData, error: itemsErr } = await itemsQuery;
      if (!itemsErr && itemsData) {
        items = itemsData as PayrollItem[];
      }
    }
  } catch (err) {
    console.warn('[PayrollRecords] Supabase lookup error, checking fallback store:', err);
  }

  // Fallback check if not loaded from Supabase
  if (!run || run.status !== 'FINALIZED' || items.length === 0) {
    const fallbackRuns = readFallbackRuns();
    const matchedRun = fallbackRuns.find(
      r => Number(r.year) === Number(year) && Number(r.month) === Number(month) && r.status === 'FINALIZED'
    );
    if (!matchedRun) {
      return null;
    }
    run = matchedRun;
    const allItems = readFallbackItems();
    items = allItems.filter(
      item =>
        item.payroll_run_id === run!.id &&
        (!employeeIds || employeeIds.length === 0 || employeeIds.includes(item.employee_id))
    );
  }

  if (!run || run.status !== 'FINALIZED') {
    return null;
  }

  // Convert snapshot PayrollItem back into PayrollResult format for consumers
  return items.map(item => ({
    employeeId: item.employee_id,
    name: item.name || 'Employee',
    department: item.department || 'General',
    salary: item.salary,
    standardHours: item.standard_hours,
    actualWorkedHours: item.actual_worked_hours,
    creditedLeaveHours: item.credited_leave_hours,
    unpaidLeaveHours: item.unpaid_leave_hours,
    paidHolidayHours: item.paid_holiday_hours,
    wfhHours: item.wfh_hours,
    extraHours: item.extra_hours,
    shortHours: item.short_hours,

    daysFullDay: item.days_full_day ?? 0,
    daysHalfDay: item.days_half_day,
    daysUnpaidLeaveEod: item.days_unpaid_leave_eod,
    daysAbsent: item.days_absent ?? 0,
    payableWorkedHours: item.payable_worked_hours,
    payableHours: item.payable_hours,
    compOffMinutesEarned: item.comp_off_minutes_earned,

    overtimePay: item.overtime_pay,
    unpaidLeaveDeduction: item.attendance_deduction ?? item.unpaid_leave_deduction,
    shortHoursDeduction: item.short_hours_deduction,
    manualDeductions: item.manual_deductions,
    deductionsCount: item.metadata?.deductionsList?.length || 0,
    deductionsList: item.metadata?.deductionsList || [],

    totalPaidHours: item.total_paid_hours,
    grossPay: item.gross_pay,
    totalDeductions: item.total_deductions,
    netPayable: item.net_payable,

    hasPayrollData: item.has_payroll_data,
    isLocked: item.is_locked,
    prorationDetail: item.metadata?.proration,
    dailyBreakdown: item.metadata?.dailyBreakdown,
    reconciliation: item.metadata?.reconciliation
  }));
}

/**
 * Finalizes the payroll run for a given year and month.
 * Persists an immutable historical snapshot of all employee payroll calculations.
 * Prevents double finalization.
 */
export async function finalizePayrollRun(
  year: number,
  month: number,
  results: PayrollResult[],
  finalizedBy: string,
  options?: {
    allowMissingSalaryOverride?: boolean;
    auditOverrideReason?: string;
  }
): Promise<{ success: boolean; run?: PayrollRun; error?: string }> {
  // 1. Prevent duplicate finalization
  const alreadyFinalized = await isPayrollFinalized(year, month);
  if (alreadyFinalized) {
    return { success: false, error: `Payroll for ${year}-${String(month).padStart(2, '0')} is already finalized and locked.` };
  }

  // 2. Block unsafe finalization if any employee has missing/invalid salary configuration
  const missingSalaryEmployees = results.filter(r => r.hasMissingSalary);
  if (missingSalaryEmployees.length > 0 && !options?.allowMissingSalaryOverride) {
    const names = missingSalaryEmployees.map(e => `${e.name || (e as any).employeeName || 'Unknown'} (${e.employeeIdNumber})`).join(', ');
    return {
      success: false,
      error: `Cannot finalize payroll: Unsafe finalization blocked. Missing or invalid salary structure detected for: ${names}. Resolve salary structures or provide a formal audit override.`
    };
  }

  const now = new Date().toISOString();
  const runId = crypto.randomUUID();
  const totalEmployees = results.filter(r => r.hasPayrollData).length;
  const totalPayout = Math.round(results.filter(r => r.hasPayrollData).reduce((sum, r) => sum + r.netPayable, 0) * 100) / 100;

  const payrollRun: PayrollRun = {
    id: runId,
    year,
    month,
    status: 'FINALIZED',
    total_employees: totalEmployees,
    total_payout: totalPayout,
    created_at: now,
    updated_at: now,
    finalized_at: now,
    finalized_by: finalizedBy
  };

  const payrollItems: PayrollItem[] = results.map(r => ({
    id: crypto.randomUUID(),
    payroll_run_id: runId,
    employee_id: r.employeeId,
    name: r.name,
    department: r.department,
    salary: r.salary,
    standard_hours: r.standardHours,
    actual_worked_hours: r.actualWorkedHours,
    credited_leave_hours: r.creditedLeaveHours,
    unpaid_leave_hours: r.unpaidLeaveHours,
    paid_holiday_hours: r.paidHolidayHours,
    wfh_hours: r.wfhHours,
    extra_hours: r.extraHours,
    short_hours: r.shortHours,
    total_paid_hours: r.totalPaidHours,
    days_full_day: r.daysFullDay ?? 0,
    days_half_day: r.daysHalfDay,
    days_unpaid_leave_eod: r.daysUnpaidLeaveEod,
    days_absent: r.daysAbsent ?? 0,
    payable_worked_hours: r.payableWorkedHours,
    payable_hours: r.payableHours,
    comp_off_minutes_earned: r.compOffMinutesEarned,
    overtime_pay: r.overtimePay,
    attendance_deduction: r.unpaidLeaveDeduction,
    unpaid_leave_deduction: r.unpaidLeaveDeduction,
    manual_deductions: r.manualDeductions,
    short_hours_deduction: r.shortHoursDeduction,
    gross_pay: r.grossPay,
    total_deductions: r.totalDeductions,
    net_payable: r.netPayable,
    is_locked: true,
    has_payroll_data: r.hasPayrollData,
    metadata: {
      proration: r.prorationDetail,
      deductionsList: r.deductionsList,
      dailyBreakdown: r.dailyBreakdown,
      reconciliation: r.reconciliation,
      overrideReason: options?.auditOverrideReason || null
    },
    created_at: now,
    updated_at: now
  }));

  // 2. Persist to Supabase if tables exist
  let supabaseSuccess = false;
  try {
    const supabase = await createAdminClient();
    const { error: runErr } = await supabase
      .from('payroll_runs')
      .upsert(payrollRun);

    if (!runErr) {
      const { error: itemsErr } = await supabase
        .from('payroll_items')
        .insert(payrollItems);

      if (!itemsErr) {
        supabaseSuccess = true;
      } else {
        console.warn('[PayrollRecords] Failed to insert payroll_items in Supabase:', itemsErr);
      }
    } else {
      console.warn('[PayrollRecords] Failed to upsert payroll_runs in Supabase:', runErr);
    }
  } catch (err) {
    console.warn('[PayrollRecords] Supabase finalization error:', err);
  }

  // If in production and Supabase failed, do not silently fallback to ephemeral local disk
  if (!supabaseSuccess && !isFallbackAllowed()) {
    console.error('[CRITICAL SECURITY ERROR] Payroll persistence failed in Supabase. Local file fallback is disallowed in production. Please run migration 20261102000000_complete_payroll_system.sql.');
    return {
      success: false,
      error: 'Production database persistence failed. Payroll tables are not ready in Supabase. Please apply migration 20261102000000_complete_payroll_system.sql.'
    };
  }

  // 3. Write through to fallback stores for persistence guarantee (test/dev environments)
  const allRuns = readFallbackRuns();
  const runIdx = allRuns.findIndex(r => Number(r.year) === Number(year) && Number(r.month) === Number(month));
  if (runIdx >= 0) {
    allRuns[runIdx] = payrollRun;
  } else {
    allRuns.push(payrollRun);
  }
  writeFallbackRuns(allRuns);

  const allItems = readFallbackItems().filter(i => i.payroll_run_id !== runId);
  allItems.push(...payrollItems);
  writeFallbackItems(allItems);

  return { success: true, run: payrollRun };
}

/**
 * Apply an audited adjustment to a finalized payroll item without silently rewriting history.
 */
export async function adjustPayrollItem(
  year: number,
  month: number,
  employeeId: string,
  adjustmentAmount: number,
  reason: string,
  adjustedBy: string
): Promise<{ success: boolean; error?: string }> {
  if (!reason || reason.trim().length < 3) {
    return { success: false, error: 'Adjustment reason is required (at least 3 characters).' };
  }

  const finalized = await isPayrollFinalized(year, month);
  if (!finalized) {
    return { success: false, error: 'Cannot adjust unfinalized payroll. Calculate and review in Draft mode instead.' };
  }

  const now = new Date().toISOString();
  const allItems = readFallbackItems();
  const item = allItems.find(i => i.employee_id === employeeId);
  if (!item) {
    return { success: false, error: 'Finalized payroll item not found for this employee.' };
  }

  // Update in fallback store
  const adjustments = item.metadata?.adjustments || [];
  adjustments.push({
    amount: adjustmentAmount,
    reason: reason.trim(),
    adjustedBy,
    adjustedAt: now
  });

  item.net_payable = Math.max(0, Math.round((item.net_payable + adjustmentAmount) * 100) / 100);
  item.updated_at = now;
  item.metadata = {
    ...item.metadata,
    adjustments
  };

  writeFallbackItems(allItems);

  // Attempt update in Supabase
  try {
    const supabase = await createAdminClient();
    await supabase
      .from('payroll_items')
      .update({
        net_payable: item.net_payable,
        updated_at: now,
        metadata: item.metadata
      })
      .eq('id', item.id);
  } catch (err) {
    console.warn('[PayrollRecords] Supabase adjustment update error:', err);
  }

  return { success: true };
}
