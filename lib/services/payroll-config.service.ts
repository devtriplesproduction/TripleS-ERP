import fs from 'fs';
import path from 'path';
import { getStandardWorkingDaysInMonth } from '@/lib/utils/time';

export type PayrollDivisorPolicy = 'actual_mon_sat' | 'fixed_26';

export interface PayrollCompanyConfig {
  divisorPolicy: PayrollDivisorPolicy;
  updatedAt: string;
  updatedBy?: string;
  description?: string;
}

const CONFIG_DIR = path.join(process.cwd(), 'scratch');
const CONFIG_FILE = 'payroll_config_store.json';

const DEFAULT_CONFIG: PayrollCompanyConfig = {
  divisorPolicy: 'actual_mon_sat',
  updatedAt: new Date().toISOString(),
  description: 'Default company policy: Actual Mon–Sat calendar working days (Asia/Kolkata)'
};

function ensureStoreDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Reads the authoritative company-wide payroll divisor configuration.
 * Active ERP policy is strictly dynamic Mon–Sat working days (Asia/Kolkata calendar: calendar days minus Sundays).
 */
export async function getAuthoritativeDivisorPolicy(): Promise<PayrollDivisorPolicy> {
  return 'actual_mon_sat';
}

/**
 * Updates the authoritative company-wide payroll divisor configuration.
 * Active policy remains dynamic Mon–Sat.
 */
export async function setAuthoritativeDivisorPolicy(
  policy: PayrollDivisorPolicy,
  updatedBy?: string
): Promise<{ success: boolean; config: PayrollCompanyConfig; error?: string }> {
  const activePolicy: PayrollDivisorPolicy = 'actual_mon_sat';

  const newConfig: PayrollCompanyConfig = {
    divisorPolicy: activePolicy,
    updatedAt: new Date().toISOString(),
    updatedBy: updatedBy || 'admin',
    description: 'Active Policy: Dynamic Mon–Sat working days (Calendar Days - Sundays in Asia/Kolkata)'
  };

  try {
    ensureStoreDir();
    const filePath = path.join(CONFIG_DIR, CONFIG_FILE);
    fs.writeFileSync(filePath, JSON.stringify(newConfig, null, 2), 'utf-8');
    return { success: true, config: newConfig };
  } catch (err: any) {
    console.error('[PayrollConfig] Failed to write authoritative config store:', err);
    return { success: false, config: newConfig, error: err.message };
  }
}

/**
 * Computes the exact divisor for a given month dynamically:
 * Divisor = Total calendar days in the selected payroll month - Number of Sundays in that month.
 * Examples:
 * - October 2026 = 31 - 4 = 27 days
 * - November 2026 = 30 - 5 = 25 days
 * - December 2026 = 31 - 4 = 27 days
 * - January 2027 = 31 - 5 = 26 days
 */
export function getDivisorForMonth(
  year: number,
  month: number,
  policy?: PayrollDivisorPolicy
): number {
  if (policy === 'fixed_26') {
    return 26; // legacy historical snapshot support only
  }
  return getStandardWorkingDaysInMonth(year, month);
}

