import { createAdminClient } from '@/lib/supabase/server';
import {
  STANDARD_WORK_MINUTES,
  HALF_DAY_THRESHOLD,
  FULL_DAY_MINUTES,
  isWorkingDay,
  isSunday,
  canonicalOfficeHoursToMinutes,
} from '@/lib/utils/time';
import { calculateMonthlyBasicSalary, resolveSalaryForPeriod, PeriodSalaryResolution } from '@/lib/utils/salary';
import { SalaryProrationDetail } from '@/types/payroll';

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

  /** Number of half-day (4h-7h59m) working days */
  daysHalfDay: number;
  /** Number of <4h unpaid leave days (excluded from payroll) */
  daysUnpaidLeaveEod: number;
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
}

// ─── Day context for classification ─────────────────────────────────

type DayContext = 'normal' | 'sunday' | 'paid_holiday' | 'approved_leave';

function getDayContext(
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

// ─── Main Payroll Calculation ───────────────────────────────────────

export async function calculateMonthlyPayroll(
  year: number,
  month: number,
  employeeIds?: string[]
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
  const employees = rawEmployees.filter(emp => {
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
  const empNumbers = employees.map(e => e.employee_id_number).filter(Boolean);
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
          .select('id, employee_id, start_date, end_date, is_half_day, request_type, leave_type, status')
          .in('status', ['Approved', 'Approved HR'])
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

  // 8. Standard payroll rule: 26 working days * 8 hours = 208 standard monthly working hours
  const STANDARD_WORKING_DAYS = 26;
  const standardHours = 208;

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

    // Track dates of approved leaves for this employee
    const approvedLeaveDates = new Set<string>();
    empLeaves.forEach(l => {
      let curr = new Date(l.start_date);
      const end = new Date(l.end_date);
      while (curr <= end) {
        approvedLeaveDates.add(curr.toISOString().split('T')[0]);
        curr.setDate(curr.getDate() + 1);
      }
    });

    // ─── Process EODs ───────────────────────────────────────────
    let totalWorkedMinutes = 0;
    let compOffMinutesEarned = 0;
    let daysHalfDay = 0;
    let daysUnpaidLeaveEod = 0;
    let daysFullDay = 0;
    let daysPaidHolidayWorked = 0;
    let daysSundayWorked = 0;
    let totalPaidDayFractions = 0;

    const holidaysWorkedDates = new Set<string>();
    const processedEodDates = new Set<string>();

    empEods.forEach(eod => {
      // Disallow duplicate EOD credit for the same report date
      if (processedEodDates.has(eod.report_date)) {
        return;
      }
      processedEodDates.add(eod.report_date);

      const wMins = canonicalOfficeHoursToMinutes(Number(eod.office_hours));
      totalWorkedMinutes += wMins;

      const context = getDayContext(eod.report_date, paidHolidayDates, approvedLeaveDates);
      const classification = classifyDay(wMins, context);

      compOffMinutesEarned += classification.compOffMinutes;
      totalPaidDayFractions += classification.payFraction;

      switch (classification.status) {
        case 'UNPAID':
          daysUnpaidLeaveEod++;
          break;
        case 'HALF_DAY':
          daysHalfDay++;
          break;
        case 'FULL_DAY':
          daysFullDay++;
          break;
        case 'HOLIDAY':
          daysPaidHolidayWorked++;
          holidaysWorkedDates.add(eod.report_date);
          break;
        case 'SUNDAY':
          daysSundayWorked++;
          break;
      }
    });

    // ─── Paid Holidays where employee did NOT work ──────────────
    // Paid holidays falling within the employee's active eligible window still count as paid days
    let paidHolidayMinutesNotWorked = 0;
    paidHolidayDates.forEach(hDate => {
      if (hDate >= effectiveStart && hDate <= effectiveEnd && !holidaysWorkedDates.has(hDate)) {
        totalPaidDayFractions += 1;
        paidHolidayMinutesNotWorked += STANDARD_WORK_MINUTES;
      }
    });

    // ─── Leave tracking ─────────────────────────────────────────
    let creditedLeaveMinutes = 0;
    let unpaidLeaveMinutes = 0;
    let wfhMinutes = 0;

    empLeaves.forEach(l => {
      // Only count days in leave range that fall within employee's eligible window
      const lStartStr = l.start_date < effectiveStart ? effectiveStart : l.start_date;
      const lEndStr = l.end_date > effectiveEnd ? effectiveEnd : l.end_date;

      let leaveDaysCount = 0;
      let curr = new Date(lStartStr);
      const endLimit = new Date(lEndStr);
      while (curr <= endLimit) {
        const dStr = curr.toISOString().split('T')[0];
        // Only count Mon-Sat working days (excluding Sundays and holidays) as leave days
        if (isWorkingDay(dStr) && !paidHolidayDates.has(dStr)) {
          leaveDaysCount++;
        }
        curr.setDate(curr.getDate() + 1);
      }

      if (leaveDaysCount === 0 && l.start_date === l.end_date && l.start_date >= effectiveStart && l.start_date <= effectiveEnd) {
        if (isWorkingDay(l.start_date) && !paidHolidayDates.has(l.start_date)) {
          leaveDaysCount = 1;
        }
      }

      const dayMins = l.is_half_day ? STANDARD_WORK_MINUTES / 2 : STANDARD_WORK_MINUTES;
      const totalMins = dayMins * leaveDaysCount;

      if (l.request_type === 'WFH') {
        wfhMinutes += totalMins;
      } else if (l.leave_type === 'Unpaid') {
        unpaidLeaveMinutes += totalMins;
      } else {
        creditedLeaveMinutes += totalMins;
      }
    });

    // ─── Financial calculation ──────────────────────────────────

    // Determine how many working days were missed (Rule 6: ONLY within the employee's eligible employment window)
    let missingWorkingDays = 0;
    for (let d = 1; d <= lastDay; d++) {
      const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      // Rule 6: Never penalize dates before joining or after deactivation!
      if (dStr >= effectiveStart && dStr <= effectiveEnd && isWorkingDay(dStr)) {
        const hasEod = empEods.some(e => e.report_date === dStr);
        const hasPaidLeave = empLeaves.some(l => l.start_date <= dStr && l.end_date >= dStr && l.leave_type !== 'Unpaid');
        const hasUnpaidLeave = empLeaves.some(l => l.start_date <= dStr && l.end_date >= dStr && l.leave_type === 'Unpaid');
        const isHoliday = paidHolidayDates.has(dStr);
        if (!hasEod && !hasPaidLeave && !hasUnpaidLeave && !isHoliday) {
          missingWorkingDays++;
        }
      }
    }

    // Approved unpaid leave days
    const unpaidLeaveDaysFromLeaves = unpaidLeaveMinutes / STANDARD_WORK_MINUTES;

    // Total deducted days = EOD unpaid (<4h) + half-day fractions (0.5) + unexcused missing days + approved unpaid leaves
    const totalDeductedDays = daysUnpaidLeaveEod + (daysHalfDay * 0.5) + missingWorkingDays + unpaidLeaveDaysFromLeaves;

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

    // Attendance Deduction = total deducted days * standard daily rate (capped at monthly base)
    const attendanceDeduction = Math.min(monthlyPayBase, Math.round(totalDeductedDays * fullDayRate * 100) / 100);

    // Earned pay = monthly base - attendanceDeduction
    const earnedPay = Math.max(0, monthlyPayBase - attendanceDeduction);

    // Total deductions = attendance deduction + manual deductions
    const totalDeductions = Math.round((attendanceDeduction + manualDeductions) * 100) / 100;

    // Net Payable: earnedPay reduced by manual deductions (cannot fall below 0)
    const netPayable = Math.max(0, earnedPay - manualDeductions);

    // ─── Display values ─────────────────────────────────────────
    const actualWorkedHours = totalWorkedMinutes / 60;
    const creditedLeaveHours = creditedLeaveMinutes / 60;
    const paidHolidayHours = paidHolidayMinutesNotWorked / 60;
    const wfhHoursValue = wfhMinutes / 60;
    const unpaidLeaveHours = unpaidLeaveMinutes / 60;
    const extraHoursValue = compOffMinutesEarned / 60;

    const totalPaidMinutes = totalWorkedMinutes + creditedLeaveMinutes + paidHolidayMinutesNotWorked;
    const totalPaidHours = totalPaidMinutes / 60;

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

      daysHalfDay,
      daysUnpaidLeaveEod,
      compOffMinutesEarned,

      overtimePay: 0,
      unpaidLeaveDeduction: Math.round(attendanceDeduction * 100) / 100,
      attendanceDeduction: Math.round(attendanceDeduction * 100) / 100,
      shortHoursDeduction: 0,
      manualDeductions: Math.round(manualDeductions * 100) / 100,
      deductionsCount: empDeductions.length,
      deductionsList: empDeductions,

      totalPaidHours: Math.round(totalPaidHours * 100) / 100,
      grossPay: Math.round(monthlyPayBase * 100) / 100,
      totalDeductions,
      netPayable: Math.round(netPayable * 100) / 100,

      hasPayrollData,
      isLocked: false,
      prorationDetail: salaryResolution.proration.isProrated ? salaryResolution.proration : undefined,
      hasMissingSalary,
      validationWarning
    });
  }

  return results;
}
