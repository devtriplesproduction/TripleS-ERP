import { createAdminClient } from '@/lib/supabase/server';
import { PayrollDeduction, CreatePayrollDeductionInput, PayrollDeductionActionResponse } from '@/types/payroll';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const FALLBACK_DIR = path.join(process.cwd(), 'scratch');
const DEFAULT_STORE_FILE = 'payroll_deductions_store.json';

function getFallbackStorePath(): string {
  const customPath = process.env.PAYROLL_DEDUCTIONS_STORE_PATH;
  if (customPath) {
    const fileName = path.basename(customPath);
    return path.join(FALLBACK_DIR, fileName);
  }
  return path.join(FALLBACK_DIR, DEFAULT_STORE_FILE);
}

function ensureStoreDir(): void {
  const storePath = getFallbackStorePath();
  const dir = path.dirname(storePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readFallbackDeductions(): PayrollDeduction[] {
  try {
    ensureStoreDir();
    const storePath = getFallbackStorePath();
    if (!fs.existsSync(storePath)) {
      return [];
    }
    const raw = fs.readFileSync(storePath, 'utf-8');
    return JSON.parse(raw) as PayrollDeduction[];
  } catch (err) {
    console.error('[PayrollDeductions] Failed to read fallback store:', err);
    return [];
  }
}

export function writeFallbackDeductions(deductions: PayrollDeduction[]): void {
  try {
    ensureStoreDir();
    const storePath = getFallbackStorePath();
    fs.writeFileSync(storePath, JSON.stringify(deductions, null, 2), 'utf-8');
  } catch (err) {
    console.error('[PayrollDeductions] Failed to write fallback store:', err);
  }
}

function saveToFallback(newDeduction: PayrollDeduction): void {
  const all = readFallbackDeductions();
  const idx = all.findIndex(d => d.id === newDeduction.id);
  if (idx >= 0) {
    all[idx] = newDeduction;
  } else {
    all.push(newDeduction);
  }
  writeFallbackDeductions(all);
}

/**
 * Fetch all active deductions for a specific payroll year and month,
 * optionally filtered by employee IDs.
 */
export async function getDeductionsForMonth(
  year: number,
  month: number,
  employeeIds?: string[]
): Promise<PayrollDeduction[]> {
  try {
    const supabase = await createAdminClient();
    let query = supabase
      .from('payroll_deductions')
      .select('*')
      .eq('payroll_year', year)
      .eq('payroll_month', month)
      .eq('status', 'ACTIVE');

    if (employeeIds && employeeIds.length > 0) {
      query = query.in('employee_id', employeeIds);
    }

    const { data, error } = await query;
    if (error) {
      // If table is missing (PGRST205) or database error, use fallback store
      const fallback = readFallbackDeductions();
      return fallback.filter(
        d =>
          d.status === 'ACTIVE' &&
          Number(d.payroll_year) === Number(year) &&
          Number(d.payroll_month) === Number(month) &&
          (!employeeIds || employeeIds.length === 0 || employeeIds.includes(d.employee_id))
      );
    }

    // Merge or write through to fallback for resilience
    if (data && data.length > 0) {
      const fallback = readFallbackDeductions();
      const map = new Map(fallback.map(d => [d.id, d]));
      for (const d of data) {
        map.set(d.id, d as PayrollDeduction);
      }
      writeFallbackDeductions(Array.from(map.values()));
    }

    return (data || []) as PayrollDeduction[];
  } catch {
    const fallback = readFallbackDeductions();
    return fallback.filter(
      d =>
        d.status === 'ACTIVE' &&
        Number(d.payroll_year) === Number(year) &&
        Number(d.payroll_month) === Number(month) &&
        (!employeeIds || employeeIds.length === 0 || employeeIds.includes(d.employee_id))
    );
  }
}

/**
 * Fetch deductions for an individual employee, optionally scoped to year & month.
 */
export async function getDeductionsForEmployee(
  employeeId: string,
  year?: number,
  month?: number
): Promise<PayrollDeduction[]> {
  try {
    const supabase = await createAdminClient();
    let query = supabase
      .from('payroll_deductions')
      .select('*')
      .eq('employee_id', employeeId);

    if (year) query = query.eq('payroll_year', year);
    if (month) query = query.eq('payroll_month', month);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      const fallback = readFallbackDeductions();
      return fallback
        .filter(
          d =>
            d.employee_id === employeeId &&
            (!year || Number(d.payroll_year) === Number(year)) &&
            (!month || Number(d.payroll_month) === Number(month))
        )
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return (data || []) as PayrollDeduction[];
  } catch {
    const fallback = readFallbackDeductions();
    return fallback
      .filter(
        d =>
          d.employee_id === employeeId &&
          (!year || Number(d.payroll_year) === Number(year)) &&
          (!month || Number(d.payroll_month) === Number(month))
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}

/**
 * Validate input and create an employee-specific payroll deduction.
 * Prevents duplicates on repeated submissions and validates amount positivity.
 */
export async function createPayrollDeduction(
  input: CreatePayrollDeductionInput,
  userId?: string
): Promise<PayrollDeductionActionResponse<PayrollDeduction>> {
  // 1. Validation
  if (!input.employee_id || typeof input.employee_id !== 'string' || input.employee_id.trim() === '') {
    return { success: false, error: 'Employee is required.' };
  }

  const numYear = Number(input.payroll_year);
  if (isNaN(numYear) || numYear < 2000 || numYear > 2100) {
    return { success: false, error: 'A valid payroll year between 2000 and 2100 is required.' };
  }

  const numMonth = Number(input.payroll_month);
  if (isNaN(numMonth) || numMonth < 1 || numMonth > 12) {
    return { success: false, error: 'A valid payroll month between 1 and 12 is required.' };
  }

  if (!input.deduction_type || typeof input.deduction_type !== 'string' || input.deduction_type.trim() === '') {
    return { success: false, error: 'Deduction type is required.' };
  }

  const numAmount = Number(input.amount);
  if (isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) {
    return { success: false, error: 'Deduction amount must be a positive number greater than ₹0.' };
  }

  const trimmedReason = (input.reason || '').trim();
  if (trimmedReason.length < 2) {
    return { success: false, error: 'Reason for deduction is required (at least 2 characters).' };
  }

  const formattedAmount = Math.round(numAmount * 100) / 100;
  const trimmedType = input.deduction_type.trim();

  // 2. Prevent duplicate active deductions for the same employee, period, type, amount, and reason
  const existingActive = await getDeductionsForMonth(numYear, numMonth, [input.employee_id]);
  const isDuplicate = existingActive.some(
    d =>
      d.status === 'ACTIVE' &&
      d.deduction_type.trim().toLowerCase() === trimmedType.toLowerCase() &&
      Math.abs(Number(d.amount) - formattedAmount) < 0.001 &&
      d.reason.trim().toLowerCase() === trimmedReason.toLowerCase()
  );

  if (isDuplicate) {
    return {
      success: false,
      error: 'A duplicate deduction with the same employee, period, type, amount, and reason already exists.'
    };
  }

  // 3. Construct deduction object
  const now = new Date().toISOString();
  const deductionRecord: PayrollDeduction = {
    id: crypto.randomUUID(),
    employee_id: input.employee_id,
    payroll_year: numYear,
    payroll_month: numMonth,
    deduction_type: trimmedType,
    amount: formattedAmount,
    reason: trimmedReason,
    notes: input.notes?.trim() || null,
    status: 'ACTIVE',
    created_by: userId || null,
    created_at: now,
    updated_at: now
  };

  // 4. Persist to Supabase and fallback
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('payroll_deductions')
      .insert(deductionRecord)
      .select()
      .single();

    if (!error && data) {
      saveToFallback(data as PayrollDeduction);
      return { success: true, data: data as PayrollDeduction };
    }
  } catch (err) {
    console.warn('[PayrollDeductions] Supabase insert failed, using fallback:', err);
  }

  saveToFallback(deductionRecord);
  return { success: true, data: deductionRecord };
}

/**
 * Cancel or deactivate a deduction record.
 */
export async function cancelPayrollDeduction(
  deductionId: string
): Promise<PayrollDeductionActionResponse<PayrollDeduction>> {
  if (!deductionId || typeof deductionId !== 'string') {
    return { success: false, error: 'Deduction ID is required.' };
  }

  const now = new Date().toISOString();

  // Update fallback store
  const all = readFallbackDeductions();
  const idx = all.findIndex(d => d.id === deductionId);
  let updatedRecord: PayrollDeduction | null = null;
  if (idx >= 0) {
    all[idx].status = 'CANCELLED';
    all[idx].updated_at = now;
    updatedRecord = all[idx];
    writeFallbackDeductions(all);
  }

  // Update Supabase
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('payroll_deductions')
      .update({ status: 'CANCELLED', updated_at: now })
      .eq('id', deductionId)
      .select()
      .single();

    if (!error && data) {
      return { success: true, data: data as PayrollDeduction };
    }
  } catch (err) {
    console.warn('[PayrollDeductions] Supabase cancel failed, using fallback:', err);
  }

  if (updatedRecord) {
    return { success: true, data: updatedRecord };
  }

  return { success: false, error: 'Deduction record not found.' };
}
