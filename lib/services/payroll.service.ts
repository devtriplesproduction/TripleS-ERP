import { createAdminClient } from '@/lib/supabase/server';
import {
  STANDARD_WORK_MINUTES,
  HALF_DAY_THRESHOLD,
  FULL_DAY_MINUTES,
  isWorkingDay,
  isSunday,
  canonicalOfficeHoursToMinutes,
  getStandardWorkingDaysInMonth,
} from '@/lib/utils/time';
import { calculateMonthlyBasicSalary, resolveSalaryForPeriod, PeriodSalaryResolution } from '@/lib/utils/salary';
import { SalaryProrationDetail, DayPayrollBreakdown, PayrollReconciliation } from '@/types/payroll';
import { getAuthoritativeDivisorPolicy, getDivisorForMonth, PayrollDivisorPolicy } from '@/lib/services/payroll-config.service';

// ─── Types ──────────────────────────────────────────────────────────

export interface PayrollResult {
  employeeId: string;
  name: string;
  department: string;
  designation?: string;
  employeeIdNumber?: string;
  salary: number;
  standardHours: number;
  actualWorkedHours: number;
  creditedLeaveHours: number;
  unpaidLeaveHours: number;
  paidHolidayHours: number;
  wfhHours: number;
  extraHours: number;
  shortHours: number;

  /** Number of full-day (8h+) working days */
  daysFullDay?: number;
  /** Number of half-day (4h-7h59m) working days */
  daysHalfDay: number;
  /** Number of <4h unpaid leave days (excluded from payroll) */
  daysUnpaidLeaveEod: number;
  /** Number of unexcused missing/absent working days */
  daysAbsent?: number;
  /** Payable worked regular hours (excluding comp-off/unpaid/overtime) */
  payableWorkedHours?: number;
  /** Total payable hours (worked + paid leave + paid holiday) */
  payableHours?: number;
  /** Total comp off minutes earned this month (informational, not inserted into ledger during calculation) */
  compOffMinutesEarned: number;

  overtimePay: number;
  unpaidLeaveDeduction: number;
  attendanceDeduction?: number;
  shortHoursDeduction: number;

  /** Total employee-specific manual/fixed deductions */
  manualDeductions: number;
  /** Number of employee-specific deductions recorded */
  deductionsCount: number;
  /** Detailed list of employee-specific deductions */
  deductionsList?: any[];

  totalPaidHours: number;
  grossPay: number;
  totalDeductions: number;
  netPayable: number;

  /** Whether this employee has any payroll-relevant data for the selected month */
  hasPayrollData: boolean;
  /** Whether the payroll run for this employee is finalized/locked */
  isLocked?: boolean;
  /** Detailed breakdown if salary was prorated due to mid-month join/exit/hike */
  prorationDetail?: SalaryProrationDetail;
  /** Whether this employee has missing/unconfigured salary or stipend structure */
  hasMissingSalary?: boolean;
  /** Human-readable validation warning if salary structure is missing or calculation has issues */
  validationWarning?: string;
  /** Explicit error message if individual calculation encountered a fatal failure */
  calculationError?: string;

  /** Date-wise payroll calculation breakdown for all calendar days in the month */
  dailyBreakdown?: DayPayrollBreakdown[];
  /** Automated reconciliation checks between attendance baseline and financial totals */
  reconciliation?: PayrollReconciliation;
}

// ─── Leave Policy Helper ───────────────────────────────────────────

/**
 * Determines whether an approved leave request is eligible for salary payment.
 *
 * Rules:
 * - WFH is remote work (handled as working day, not absence leave).
 * - Approved Comp-Off leave is ALWAYS fully paid (debited from comp-off ledger exactly once).
 * - Explicit unpaid leaves ('Unpaid', 'Unpaid Leave') are unpaid.
 * - If request has explicit `is_paid === true`, it is paid; if `is_paid === false`, it is unpaid.
 * - Intern Leave Policy: Interns on stipend do not receive paid sick/casual leave allocations.
 *   Only Comp-Off and Company Holidays are paid for interns unless explicitly authorized (`is_paid === true`).
 * - Full-time / regular employees: standard approved leaves (Casual, Sick, Paid) are paid.
 */
export function isLeavePaid(leave: any, employee?: any): boolean {
  if (!leave) return false;
  if (leave.request_type === 'WFH') return false;
  const lType = (leave.leave_type || '').toLowerCase();
  if (lType.includes('comp')) return true;
  if (lType.includes('unpaid')) return false;
  if (leave.is_paid === false) return false;
  if (leave.is_paid === true) return true;

  const isIntern = employee?.employment_type?.toLowerCase() === 'intern' ||
    Boolean(employee?.stipend && (!employee?.basic_salary || Number(employee?.basic_salary) === 0));
  if (isIntern) {
    return false;
  }
  return true;
}

// ─── Day context for classification ─────────────────────────────────

type DayContext = 'normal' | 'sunday' | 'paid_holiday' | 'approved_leave';

function _getDayContext(
  dateStr: string,
  paidHolidayDates: Set<string>,
  approvedLeaveDates?: Set<string>
): DayContext {
  if (isSunday(dateStr)) return 'sunday';
  if (paidHolidayDates.has(dateStr)) return 'paid_holiday';
  if (approvedLeaveDates?.has(dateStr)) return 'approved_leave';
  return 'normal';
}

// ─── Day classification ─────────────────────────────────────────────

interface DayClassification {
  /** Payroll pay fraction for this day: 0 = unpaid, 0.5 = half day, 1 = full day */
  payFraction: number;
  /** Minutes to credit as Comp Off */
  compOffMinutes: number;
  /** Classification label */
  status: 'UNPAID' | 'HALF_DAY' | 'FULL_DAY' | 'HOLIDAY' | 'SUNDAY' | 'LEAVE';
}

/**
 * Classify a single day's work for payroll purposes.
 *
 * Master Rules:
 * - Sunday: ALL worked hours → Comp Off. No payroll pay from work.
 * - Paid Holiday: Full daily pay regardless. ALL worked hours → Comp Off without 8h overtime deduction.
 * - Approved Leave: Handled by leave quota. ALL worked hours → Comp Off.
 * - Normal <4h: Unpaid day in payroll. ALL worked hours → Comp Off.
 * - Normal 4h–<8h: Half Day = 50% daily pay. 0 Comp Off.
 * - Normal 8h: Full Day = 100% daily pay. 0 Comp Off.
 * - Normal >8h: Full Day = 100% daily pay. Extra hours above 8h → Comp Off.
 */
export function classifyDay(workedMinutes: number, context: DayContext): DayClassification {
  const wm = Math.max(0, Math.round(workedMinutes));

  if (context === 'sunday') {
    // Sunday: ALL worked time → Comp Off. No payroll pay from working.
    return { payFraction: 0, compOffMinutes: wm, status: 'SUNDAY' };
  }

  if (context === 'approved_leave') {
    // Approved Leave Day: ALL worked time → Comp Off. Leave pay handled by leave system.
    return { payFraction: 0, compOffMinutes: wm, status: 'LEAVE' };
  }

  if (context === 'paid_holiday') {
    // Paid Holiday: Full daily pay + ALL worked hours → Comp Off.
    // Employee gets full daily pay whether or not they work.
    // If they DO work, 100% of worked hours are additional Comp Off without 8h deduction.
    return { payFraction: 1, compOffMinutes: wm, status: 'HOLIDAY' };
  }

  // Normal working day (Mon–Sat)
  if (wm < HALF_DAY_THRESHOLD) {
    // <4h: Unpaid day in payroll. ALL worked hours credited to Comp-Off.
    return { payFraction: 0, compOffMinutes: wm, status: 'UNPAID' };
  }

  if (wm < FULL_DAY_MINUTES) {
    // 4h–<8h: Half Day
    return { payFraction: 0.5, compOffMinutes: 0, status: 'HALF_DAY' };
  }

  if (wm === FULL_DAY_MINUTES) {
    // Exactly 8h: Full Day
    return { payFraction: 1, compOffMinutes: 0, status: 'FULL_DAY' };
  }

  // >8h: Full Day + extra hours above 8h → Comp Off
  return { payFraction: 1, compOffMinutes: wm - FULL_DAY_MINUTES, status: 'FULL_DAY' };
}

export interface CalculatePayrollOptions {
  divisorMode?: 'actual_mon_sat' | 'fixed_26';
}

// ─── Main Payroll Calculation ───────────────────────────────────────

export async function calculateMonthlyPayroll(
  year: number,
  month: number,
  employeeIds?: string[],
  options?: CalculatePayrollOptions
): Promise<PayrollResult[]> {
  const supabase = await createAdminClient();

  // 1. Determine date range
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  // 2. Fetch employees from employee_onboarding (without non-existent deactivated_at column)
  let query = supabase
    .from('employee_onboarding')
    .select('id, first_name, last_name, department, designation, salary, basic_salary, employee_id_number, employment_type, stipend, joining_date, employment_status');

  if (employeeIds && employeeIds.length > 0) {
    query = query.in('id', employeeIds);
  }
  const { data: rawEmployees, error: empErr } = await query;
  if (empErr) {
    console.error('Error fetching employees for payroll:', empErr);
    throw new Error(`Failed to fetch employees for payroll: ${empErr.message}`);
  }
  if (!rawEmployees || rawEmployees.length === 0) return [];

  // Filter out employees who were not eligible for any part of this month (Rule 6)
  const employees = rawEmployees.filter((emp: any) => {
    // Joined after this month
    if (emp.joining_date && emp.joining_date > endDate) return false;
    // Offboarded before this month (if deactivation timestamp exists)
    const deact = (emp as any).deactivated_at;
    if (deact && deact < startDate) return false;
    // Inactive without deactivation date or deactivated before month
    if (emp.employment_status === 'Inactive' && deact && deact < startDate) {
      return false;
    }
    return true;
  });

  if (employees.length === 0) return [];

  // 3. Fetch profiles to map employee_onboarding -> profiles (by employee_id_number)
  const empNumbers = employees.map((e: any) => e.employee_id_number).filter(Boolean);
  const { data: profiles, error: profErr } = empNumbers.length > 0
    ? await supabase.from('profiles').select('id, employee_id').in('employee_id', empNumbers)
    : { data: [], error: null };

  if (profErr) {
    console.error('Error fetching profiles for payroll:', profErr);
    throw new Error(`Failed to fetch profiles for payroll: ${profErr.message}`);
  }

  // Map each employee to all candidate IDs they might be identified by across tables (profiles.id, onboarding.id, employee_id_number)
  const empCandidateIdsMap = new Map<string, Set<string>>();
  const allCandidateIds = new Set<string>();

  for (const e of employees) {
    const idSet = new Set<string>();
    idSet.add(e.id);
    const prof = profiles?.find(p => p.employee_id === e.employee_id_number);
    if (prof) idSet.add(prof.id);
    empCandidateIdsMap.set(e.id, idSet);
    idSet.forEach(id => allCandidateIds.add(id));
  }

  const queryIds = Array.from(allCandidateIds);

  // 4, 5, 6. Concurrently fetch EOD reports, Holidays, Leaves, and Salary History
  const [eodsRes, holidaysRes, leavesRes, salaryHistoryRes] = await Promise.all([
    queryIds.length > 0
      ? supabase
        .from('eod_reports')
        .select('id, employee_id, office_hours, report_date, status')
        .eq('status', 'Approved')
        .gte('report_date', startDate)
        .lte('report_date', endDate)
        .in('employee_id', queryIds)
      : { data: [], error: null },
    supabase
      .from('holidays')
      .select('id, name, date, is_optional, holiday_type')
      .gte('date', startDate)
      .lte('date', endDate),
    queryIds.length > 0
      ? supabase
        .from('leave_requests')
        .select('id, employee_id, start_date, end_date, is_half_day, request_type, leave_type, status, is_paid')
        .in('status', ['Approved', 'Approved HR', 'Approved (Auto)'])
        .lte('start_date', endDate)
        .gte('end_date', startDate)
        .in('employee_id', queryIds)
      : { data: [], error: null },
    queryIds.length > 0
      ? (() => {
        const q = supabase
          .from('salary_history')
          .select('id, employee_id, previous_salary, new_salary, increment_percentage, effective_date, created_at')
          .in('employee_id', queryIds);
        return typeof (q as any).order === 'function' ? (q as any).order('effective_date', { ascending: true }) : q;
      })()
      : { data: [], error: null }
  ]);

  if (eodsRes.error) {
    console.error('Error fetching EOD reports for payroll:', eodsRes.error);
    throw new Error(`Failed to fetch EOD reports: ${eodsRes.error.message}`);
  }
  if (holidaysRes.error) {
    console.error('Error fetching holidays for payroll:', holidaysRes.error);
    throw new Error(`Failed to fetch holidays: ${holidaysRes.error.message}`);
  }
  if (leavesRes.error) {
    console.error('Error fetching leaves for payroll:', leavesRes.error);
    throw new Error(`Failed to fetch leaves: ${leavesRes.error.message}`);
  }
  if (salaryHistoryRes.error) {
    console.error('Error fetching salary history for payroll:', salaryHistoryRes.error);
    throw new Error(`Failed to fetch salary history: ${salaryHistoryRes.error.message}`);
  }

  const eods = eodsRes.data || [];
  const holidays = holidaysRes.data || [];
  const leaves = leavesRes.data || [];
  const allSalaryHistory = salaryHistoryRes.data || [];

  // Group salary history by candidate IDs
  const salaryHistoryByEmp = new Map<string, any[]>();
  for (const emp of employees) {
    const candIds = empCandidateIdsMap.get(emp.id) || new Set([emp.id]);
    const empHistory = allSalaryHistory.filter((h: any) => candIds.has(h.employee_id));
    salaryHistoryByEmp.set(emp.id, empHistory);
  }

  // 7. Build paid holiday date set — ALL company holidays are paid
  const paidHolidayDates = new Set<string>();
  holidays.forEach(h => {
    if (h.holiday_type === 'PAID') {
      paidHolidayDates.add(h.date);
    }
  });

  // 8. Authoritative divisor policy: configurable fixed 26 days or dynamic actual Mon–Sat working days.
  const divisorMode: PayrollDivisorPolicy = options?.divisorMode || (await getAuthoritativeDivisorPolicy());
  const dynamicWorkingDays = getStandardWorkingDaysInMonth(year, month);
  const applicableDivisor = getDivisorForMonth(year, month, divisorMode);
  const STANDARD_WORKING_DAYS = applicableDivisor;
  const standardHours = STANDARD_WORKING_DAYS * 8;

  // 9. Fetch active employee-specific deductions for this month
  const { getDeductionsForMonth } = await import('@/lib/services/payroll-deductions.service');
  const activeDeductions = await getDeductionsForMonth(year, month, queryIds);

  // 10. Process each employee independently
  const results: PayrollResult[] = [];

  for (const emp of employees) {
    const candIds = empCandidateIdsMap.get(emp.id) || new Set([emp.id]);

    // Resolve salary for this period with mid-month join/exit & hike proration
    const empHistory = salaryHistoryByEmp.get(emp.id) || [];
    const salaryResolution = resolveSalaryForPeriod(
      emp,
      empHistory,
      year,
      month,
      STANDARD_WORKING_DAYS,
      isWorkingDay
    );

    if (!salaryResolution.isEligible) {
      continue;
    }

    const monthlyPayBase = salaryResolution.basePay;
    const fullDayRate = salaryResolution.dailyRate;
    const effectiveStart = salaryResolution.proration.effectiveStartDate;
    const effectiveEnd = salaryResolution.proration.effectiveEndDate;

    // Filter EODs for THIS employee across their candidate IDs
    const empEods = eods.filter(e => candIds.has(e.employee_id));

    // Filter leaves for THIS employee across their candidate IDs
    const empLeaves = leaves.filter(l => candIds.has(l.employee_id));

    // Track dates of approved leaves for this employee (WFH is remote work, not leave)
    const approvedLeaveDates = new Set<string>();
    empLeaves.forEach(l => {
      if (l.request_type === 'WFH') return;
      let curr = new Date(l.start_date);
      const end = new Date(l.end_date);
      while (curr <= end) {
        approvedLeaveDates.add(curr.toISOString().split('T')[0]);
        curr.setDate(curr.getDate() + 1);
      }
    });

    // ─── Daily Evaluation & Breakdown ───────────────────────────
    const dailyBreakdown: DayPayrollBreakdown[] = [];
    let scheduledWorkingDays = 0;
    let daysFullDay = 0;
    let daysHalfDay = 0;
    let daysUnpaidLeaveEod = 0;
    let daysPaidHolidayWorked = 0;
    let daysSundayWorked = 0;
    let compOffMinutesEarned = 0;
    let totalWorkedMinutes = 0;
    let payableWorkedMinutes = 0;
    let missingWorkingDays = 0;
    let paidHolidayMinutesNotWorked = 0;
    let creditedLeaveMinutes = 0;
    let unpaidLeaveMinutes = 0;
    let wfhMinutes = 0;

    for (let d = 1; d <= lastDay; d++) {
      const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(dStr + 'T00:00:00');
      const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const isSun = isSunday(dStr);
      const isHoliday = paidHolidayDates.has(dStr);
      const isWorkDay = isWorkingDay(dStr);
      const isWithinEligible = dStr >= effectiveStart && dStr <= effectiveEnd;

      if (isWorkDay && isWithinEligible) {
        scheduledWorkingDays++;
      }

      const eod = empEods.find(e => e.report_date === dStr);
      const leavesOnDay = empLeaves.filter(l => l.start_date <= dStr && l.end_date >= dStr);
      const paidLeave = leavesOnDay.find(l => l.request_type !== 'WFH' && isLeavePaid(l, emp));
      const unpaidLeave = leavesOnDay.find(l => l.request_type !== 'WFH' && !isLeavePaid(l, emp));
      const wfhLeave = leavesOnDay.find(l => l.request_type === 'WFH');

      let officeHoursLogged = 0;
      let payableDayWorkedHours = 0;
      let payableFraction = 0;
      let compOff = 0;
      let deductionDays = 0;
      let status: DayPayrollBreakdown['status'] = 'OFF';
      let activity = isSun ? 'Sunday Weekly Off' : 'No Activity';
      let notes = '';

      if (isSun) {
        if (eod) {
          officeHoursLogged = Number(eod.office_hours);
          const wMins = canonicalOfficeHoursToMinutes(officeHoursLogged);
          totalWorkedMinutes += wMins;
          compOff = wMins;
          compOffMinutesEarned += compOff;
          status = 'SUNDAY';
          activity = 'Approved Sunday EOD';
          notes = 'Sunday work: 100% credited to Comp-Off. 0 payroll pay.';
          daysSundayWorked++;
        }
      } else if (!isWithinEligible) {
        status = 'OFF';
        activity = 'Outside Employment Window';
        notes = 'Not employed on this date; zero deduction.';
      } else if (isHoliday) {
        activity = 'Paid Company Holiday';
        if (eod) {
          officeHoursLogged = Number(eod.office_hours);
          const wMins = canonicalOfficeHoursToMinutes(officeHoursLogged);
          totalWorkedMinutes += wMins;
          compOff = wMins;
          compOffMinutesEarned += compOff;
          payableFraction = 1.0;
          status = 'HOLIDAY';
          activity = 'Paid Company Holiday (Worked)';
          notes = 'Worked on Paid Holiday: Full day pay + 100% worked time to Comp-Off.';
          daysPaidHolidayWorked++;
        } else {
          payableFraction = 1.0;
          paidHolidayMinutesNotWorked += STANDARD_WORK_MINUTES;
          status = 'HOLIDAY';
          notes = 'Paid Holiday: 100% regular daily pay credited.';
        }
      } else if (paidLeave) {
        if (paidLeave.is_half_day) {
          creditedLeaveMinutes += STANDARD_WORK_MINUTES / 2;
          activity = `Approved Half-Day ${paidLeave.leave_type || paidLeave.request_type}`;
          status = 'HALF_DAY';
          if (eod) {
            officeHoursLogged = Number(eod.office_hours);
            const wMins = canonicalOfficeHoursToMinutes(officeHoursLogged);
            totalWorkedMinutes += wMins;
            if (wMins >= HALF_DAY_THRESHOLD) {
              // Worked other half: 0.5 leave + 0.5 work = 1.0 day pay!
              payableFraction = 1.0;
              payableDayWorkedHours = 4.0;
              payableWorkedMinutes += HALF_DAY_THRESHOLD;
              deductionDays = 0.0;
              if (wMins > HALF_DAY_THRESHOLD) {
                compOff = wMins - HALF_DAY_THRESHOLD;
                compOffMinutesEarned += compOff;
              }
              notes = `Half-Day Paid Leave (4h) + Worked shift (${officeHoursLogged}h) -> Full day pay.`;
            } else {
              // Worked <4h on the other half: 0.5 pay, 0.5 deduction
              payableFraction = 0.5;
              deductionDays = 0.5;
              compOff = wMins;
              compOffMinutesEarned += compOff;
              notes = `Half-Day Paid Leave (4h) + Short shift (<4h) -> 0.5 day pay, 0.5 day deduction. ${officeHoursLogged}h to Comp-Off.`;
            }
          } else {
            // No EOD for the other half of the scheduled working day:
            payableFraction = 0.5;
            deductionDays = 0.5;
            missingWorkingDays += 0.5;
            notes = `Approved Half-Day Paid Leave (4h pay). Remaining half-day unexcused absence (0.5 day deduction).`;
          }
          if (paidLeave.leave_type === 'Compensatory Off' || (paidLeave.leave_type || '').toLowerCase().includes('comp')) {
            notes += ' (4h debited from Comp-Off ledger)';
          }
        } else {
          // Full Day Paid Leave
          creditedLeaveMinutes += STANDARD_WORK_MINUTES;
          activity = `Approved ${paidLeave.leave_type || paidLeave.request_type}`;
          payableFraction = 1.0;
          status = 'LEAVE';
          notes = `Approved paid leave credited (8h). Zero deduction.`;
          if (paidLeave.leave_type === 'Compensatory Off' || (paidLeave.leave_type || '').toLowerCase().includes('comp')) {
            notes += ' (8h debited from Comp-Off ledger)';
          }
          if (eod) {
            officeHoursLogged = Number(eod.office_hours);
            const wMins = canonicalOfficeHoursToMinutes(officeHoursLogged);
            totalWorkedMinutes += wMins;
            compOff = wMins;
            compOffMinutesEarned += compOff;
            notes += ` Worked ${officeHoursLogged}h on leave -> 100% to Comp-Off.`;
          }
        }
      } else if (unpaidLeave) {
        if (unpaidLeave.is_half_day) {
          unpaidLeaveMinutes += STANDARD_WORK_MINUTES / 2;
          activity = 'Approved Half-Day Unpaid Leave';
          status = 'HALF_DAY';
          if (eod) {
            officeHoursLogged = Number(eod.office_hours);
            const wMins = canonicalOfficeHoursToMinutes(officeHoursLogged);
            totalWorkedMinutes += wMins;
            if (wMins >= HALF_DAY_THRESHOLD) {
              payableFraction = 0.5;
              payableDayWorkedHours = 4.0;
              payableWorkedMinutes += HALF_DAY_THRESHOLD;
              deductionDays = 0.5;
              if (wMins > HALF_DAY_THRESHOLD) {
                compOff = wMins - HALF_DAY_THRESHOLD;
                compOffMinutesEarned += compOff;
              }
              notes = `Half-Day Unpaid Leave (0.5 deduction) + Worked other half (${officeHoursLogged}h -> 0.5 pay).`;
            } else {
              deductionDays = 1.0;
              compOff = wMins;
              compOffMinutesEarned += compOff;
              status = 'UNPAID';
              notes = `Half-Day Unpaid Leave (0.5 ded) + <4h short shift (0.5 ded) -> 1.0 day deduction.`;
            }
          } else {
            deductionDays = 1.0;
            missingWorkingDays += 0.5;
            status = 'UNPAID';
            notes = `Half-Day Unpaid Leave (0.5 deduction) + unexcused absence (0.5 deduction) = 1.0 day deduction.`;
          }
        } else {
          const unpMins = STANDARD_WORK_MINUTES;
          unpaidLeaveMinutes += unpMins;
          activity = `Approved ${unpaidLeave.leave_type || 'Unpaid Leave'} (Unpaid)`;
          deductionDays = 1.0;
          status = 'UNPAID';
          notes = `Approved ${unpaidLeave.leave_type || 'unpaid'} leave (1.0 day salary deduction).`;
          if (eod) {
            officeHoursLogged = Number(eod.office_hours);
            const wMins = canonicalOfficeHoursToMinutes(officeHoursLogged);
            totalWorkedMinutes += wMins;
            compOff = wMins;
            compOffMinutesEarned += compOff;
            notes += ` Worked ${officeHoursLogged}h on leave -> 100% to Comp-Off.`;
          }
        }
      } else if (eod) {
        officeHoursLogged = Number(eod.office_hours);
        const wMins = canonicalOfficeHoursToMinutes(officeHoursLogged);
        totalWorkedMinutes += wMins;
        activity = wfhLeave ? 'Approved EOD (WFH Remote Work)' : 'Approved Office EOD';
        if (wfhLeave) {
          wfhMinutes += (wfhLeave.is_half_day ? STANDARD_WORK_MINUTES / 2 : STANDARD_WORK_MINUTES);
        }

        if (wMins < HALF_DAY_THRESHOLD) {
          status = 'UNPAID';
          compOff = wMins;
          compOffMinutesEarned += compOff;
          deductionDays = 1.0;
          daysUnpaidLeaveEod++;
          notes = `<4h shift: Unpaid day in payroll (1.0 day deduction). ${officeHoursLogged}h credited to Comp-Off.`;
        } else if (wMins < FULL_DAY_MINUTES) {
          status = 'HALF_DAY';
          payableFraction = 0.5;
          payableDayWorkedHours = 4.0;
          payableWorkedMinutes += HALF_DAY_THRESHOLD;
          deductionDays = 0.5;
          daysHalfDay++;
          notes = 'Half-Day shift (4h–<8h): 0.5 day pay (4h). 0.5 day deduction.';
        } else {
          status = 'FULL_DAY';
          payableFraction = 1.0;
          payableDayWorkedHours = 8.0;
          payableWorkedMinutes += FULL_DAY_MINUTES;
          compOff = wMins - FULL_DAY_MINUTES;
          compOffMinutesEarned += compOff;
          daysFullDay++;
          notes = `Full-Day shift: 1.0 day pay (8h). ${(compOff / 60).toFixed(2)}h extra to Comp-Off.`;
        }
      } else if (wfhLeave) {
        activity = 'Approved WFH (Remote)';
        const wfhMins = wfhLeave.is_half_day ? STANDARD_WORK_MINUTES / 2 : STANDARD_WORK_MINUTES;
        wfhMinutes += wfhMins;
        payableFraction = wfhLeave.is_half_day ? 0.5 : 1.0;
        payableDayWorkedHours = payableFraction * 8.0;
        payableWorkedMinutes += wfhMins;
        status = wfhLeave.is_half_day ? 'HALF_DAY' : 'FULL_DAY';
        if (wfhLeave.is_half_day) {
          daysHalfDay++;
          deductionDays = 0.5;
        } else {
          daysFullDay++;
        }
        notes = 'Approved WFH: credited as payable working time. Zero deduction.';
      } else {
        activity = 'Unexcused Absence (No EOD / No Leave)';
        status = 'ABSENT';
        deductionDays = 1.0;
        missingWorkingDays++;
        notes = 'Missed working day without approved leave. 1.0 day deduction.';
      }

      const salaryCredit = Math.round(payableFraction * fullDayRate * 100) / 100;
      const deductionAmount = Math.round(deductionDays * fullDayRate * 100) / 100;

      dailyBreakdown.push({
        date: dStr,
        dayOfWeek,
        dayType: isSun ? 'WEEKLY_OFF' : isHoliday ? 'COMPANY_HOLIDAY' : 'WORKING_DAY',
        activity,
        officeHoursLogged,
        payableWorkedHours: payableDayWorkedHours,
        payableFraction,
        salaryCredit,
        deductionDays,
        deductionAmount,
        compOffMinutesEarned: compOff,
        status,
        notes
      });
    }

    // ─── Financial calculation ──────────────────────────────────
    const unpaidLeaveDaysFromLeaves = unpaidLeaveMinutes / STANDARD_WORK_MINUTES;

    // Total deducted days and payable days derived strictly from dailyBreakdown to ensure 100% mathematical consistency
    const totalDeductedDays = Math.round(dailyBreakdown.reduce((sum, d) => sum + d.deductionDays, 0) * 10) / 10;
    const totalPayableDays = Math.round(dailyBreakdown.reduce((sum, d) => sum + d.payableFraction, 0) * 10) / 10;

    // Employee-specific fixed manual deductions
    const empDeductions = activeDeductions.filter((d: any) => candIds.has(d.employee_id));
    const manualDeductions = empDeductions.reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0);

    // Validation for missing salary / stipend configuration
    const isIntern = emp.employment_type?.toLowerCase() === 'intern';
    const hasConfiguredSalary = isIntern
      ? (emp.stipend !== null && emp.stipend !== undefined && Number(emp.stipend) > 0)
      : (
        (emp.basic_salary !== null && emp.basic_salary !== undefined && Number(emp.basic_salary) > 0) ||
        (emp.salary !== null && emp.salary !== undefined && Number(emp.salary) > 0)
      );
    const hasMissingSalary = !hasConfiguredSalary && empHistory.length === 0;
    const validationWarning = hasMissingSalary
      ? (isIntern ? 'Missing stipend configuration for intern' : 'Missing salary structure/basic salary configuration')
      : undefined;
    // All evaluated employees for this period have hasPayrollData = true
    const hasPayrollData = true;

    // Applicable company divisor for this month
    const monthDivisor = STANDARD_WORKING_DAYS;
    const exactDailyRate = (monthDivisor > 0 && (salaryResolution.fullMonthSalary || monthlyPayBase) > 0)
      ? ((salaryResolution.fullMonthSalary || monthlyPayBase) / monthDivisor)
      : fullDayRate;

    // Gross scheduled pay for the employee's active scheduled working days in this month
    const grossScheduledPay = Math.round(scheduledWorkingDays * exactDailyRate * 100) / 100;

    // Attendance Deduction = total deducted days * exact daily rate
    const attendanceDeduction = Math.round(totalDeductedDays * exactDailyRate * 100) / 100;

    // Earned pay:
    // Under actual_mon_sat: totalPayableDays * exactDailyRate reconciles to monthlyPayBase - attendanceDeduction
    // Under fixed_26: totalPayableDays * exactDailyRate compensates for every payable day worked (e.g. 16.5 * 307.6923... = ₹5,076.92)
    const earnedPay = (totalPayableDays === scheduledWorkingDays && totalDeductedDays === 0)
      ? (divisorMode === 'fixed_26' ? grossScheduledPay : monthlyPayBase)
      : Math.round(totalPayableDays * exactDailyRate * 100) / 100;

    // Gross Pay for reporting
    const grossPay = divisorMode === 'fixed_26' ? grossScheduledPay : monthlyPayBase;
    // Total deductions = attendance deduction + manual deductions
    const totalDeductions = Math.round((attendanceDeduction + manualDeductions) * 100) / 100;

    // Net Payable: earnedPay reduced by manual deductions (cannot fall below 0)
    const netPayable = Math.max(0, Math.round((earnedPay - manualDeductions) * 100) / 100);

    // ─── Display values ─────────────────────────────────────────
    const actualWorkedHours = totalWorkedMinutes / 60;
    const creditedLeaveHours = creditedLeaveMinutes / 60;
    const paidHolidayHours = paidHolidayMinutesNotWorked / 60;
    const wfhHoursValue = wfhMinutes / 60;
    const unpaidLeaveHours = unpaidLeaveMinutes / 60;
    const extraHoursValue = compOffMinutesEarned / 60;
    const payableWorkedHours = Math.round((payableWorkedMinutes / 60) * 100) / 100;
    const payableHours = Math.round(((payableWorkedMinutes + creditedLeaveMinutes + paidHolidayMinutesNotWorked) / 60) * 100) / 100;

    // Standard hourly rate based on regular monthly working hours
    const standardHourlyRate = (monthlyPayBase > 0 && standardHours > 0)
      ? monthlyPayBase / standardHours
      : 0;

    // True total paid hours earned: proportional to earned pay (excluding comp-off/unpaid time)
    const totalPaidHours = standardHourlyRate > 0
      ? Math.round((earnedPay / standardHourlyRate) * 100) / 100
      : 0;

    // ─── Reconciliation checks ──────────────────────────────────
    const isScheduledDaysReconciled = Math.abs((totalPayableDays + totalDeductedDays) - scheduledWorkingDays) < 0.01;
    const targetGross = divisorMode === 'fixed_26' ? grossScheduledPay : monthlyPayBase;
    const isFinancialReconciled = Math.abs((earnedPay + attendanceDeduction) - targetGross) < 0.05;

    const reconciliation: PayrollReconciliation = {
      isScheduledDaysReconciled,
      scheduledWorkingDays,
      payableDays: totalPayableDays,
      deductedDays: totalDeductedDays,
      isFinancialReconciled,
      baseSalary: monthlyPayBase,
      grossScheduledPay,
      netPayable,
      attendanceDeduction,
      totalDeductions,
      earnedPay,
      compOffMinutesEarned,
      divisorMode,
      divisorDays: monthDivisor,
      dailyRate: Math.round(exactDailyRate * 100) / 100,
      status: (isScheduledDaysReconciled && isFinancialReconciled) ? 'RECONCILED' : 'DISCREPANCY_DETECTED',
      notes: isScheduledDaysReconciled && isFinancialReconciled
        ? `Reconciled (${divisorMode} divisor: ${monthDivisor} days): ${totalPayableDays} payable days + ${totalDeductedDays} deducted days = ${scheduledWorkingDays} scheduled days. Net pay (₹${netPayable.toFixed(2)}) + deductions (₹${attendanceDeduction.toFixed(2)}) = ₹${(earnedPay + attendanceDeduction).toFixed(2)}.`
        : `Discrepancy detected in reconciliation.`
    };

    results.push({
      employeeId: emp.id,
      name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee',
      department: emp.department || 'N/A',
      designation: emp.designation || undefined,
      employeeIdNumber: emp.employee_id_number || undefined,
      salary: monthlyPayBase,
      standardHours,
      actualWorkedHours: Math.round(actualWorkedHours * 100) / 100,
      creditedLeaveHours: Math.round(creditedLeaveHours * 100) / 100,
      unpaidLeaveHours: Math.round(unpaidLeaveHours * 100) / 100,
      paidHolidayHours: Math.round(paidHolidayHours * 100) / 100,
      wfhHours: Math.round(wfhHoursValue * 100) / 100,
      extraHours: Math.round(extraHoursValue * 100) / 100,
      shortHours: 0,

      daysFullDay,
      daysHalfDay,
      daysUnpaidLeaveEod,
      daysAbsent: missingWorkingDays,
      payableWorkedHours,
      payableHours,
      compOffMinutesEarned,

      overtimePay: 0,
      unpaidLeaveDeduction: Math.round(attendanceDeduction * 100) / 100,
      attendanceDeduction: Math.round(attendanceDeduction * 100) / 100,
      shortHoursDeduction: 0,
      manualDeductions: Math.round(manualDeductions * 100) / 100,
      deductionsCount: empDeductions.length,
      deductionsList: empDeductions,

      totalPaidHours,
      grossPay: Math.round(monthlyPayBase * 100) / 100,
      totalDeductions,
      netPayable: Math.round(netPayable * 100) / 100,

      hasPayrollData,
      isLocked: false,
      prorationDetail: salaryResolution.proration.isProrated ? salaryResolution.proration : undefined,
      hasMissingSalary,
      validationWarning,
      dailyBreakdown,
      reconciliation
    });
  }

  return results;
}
