import { createAdminClient } from '@/lib/supabase/server';
import {
  STANDARD_WORK_MINUTES,
  HALF_DAY_THRESHOLD,
  FULL_DAY_MINUTES,
  isWorkingDay,
  isSunday,
  calculateCompOffMinutes,
  canonicalOfficeHoursToMinutes,
} from '@/lib/utils/time';
import { calculateMonthlyBasicSalary } from '@/lib/utils/salary';
import { processEODCompOff } from '@/lib/actions/compoff';

// ─── Types ──────────────────────────────────────────────────────────

export interface PayrollResult {
  employeeId: string;
  name: string;
  department: string;
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
  /** Total comp off minutes earned this month */
  compOffMinutesEarned: number;

  overtimePay: number;
  unpaidLeaveDeduction: number;
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
 * Rules:
 * - Sunday: ALL worked hours → Comp Off. No payroll pay from work.
 * - Paid Holiday: Full daily pay regardless. ALL worked hours → Comp Off.
 * - Approved Leave: Handled by leave quota. ALL worked hours → Comp Off.
 * - Normal <4h: Unpaid. ALL worked hours → Comp Off.
 * - Normal 4h–<8h: Half Day = 50% daily pay. 0 Comp Off.
 * - Normal 8h: Full Day = 100% daily pay. 0 Comp Off.
 * - Normal >8h: Full Day = 100% daily pay. Extra hours → Comp Off.
 */
function classifyDay(workedMinutes: number, context: DayContext): DayClassification {
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
    // payFraction = 1 means the holiday itself is a paid day.
    // The employee gets full daily pay whether or not they work.
    // If they DO work, all worked hours are additional Comp Off.
    return { payFraction: 1, compOffMinutes: wm, status: 'HOLIDAY' };
  }

  // Normal working day (Mon–Sat)
  if (wm < HALF_DAY_THRESHOLD) {
    // <4h: Unpaid, 0 Comp Off
    return { payFraction: 0, compOffMinutes: 0, status: 'UNPAID' };
  }

  if (wm < FULL_DAY_MINUTES) {
    // 4h–<8h: Half Day
    return { payFraction: 0.5, compOffMinutes: 0, status: 'HALF_DAY' };
  }

  if (wm === FULL_DAY_MINUTES) {
    // Exactly 8h: Full Day
    return { payFraction: 1, compOffMinutes: 0, status: 'FULL_DAY' };
  }

  // >8h: Full Day + extra → Comp Off
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

  // 2. Fetch employees from employee_onboarding
  let query = supabase
    .from('employee_onboarding')
    .select('id, first_name, last_name, department, salary, basic_salary, employee_id_number, employment_type, stipend');
  if (employeeIds && employeeIds.length > 0) {
    query = query.in('id', employeeIds);
  }
  const { data: employees } = await query;
  if (!employees || employees.length === 0) return [];

  // 3. Fetch profiles to map employee_onboarding → eod_reports (filtered by employee_id_number)
  const empNumbers = employees.map(e => e.employee_id_number).filter(Boolean);
  const { data: profiles } = empNumbers.length > 0
    ? await supabase.from('profiles').select('id, employee_id').in('employee_id', empNumbers)
    : { data: [] };

  const authIds: string[] = [];
  const empToAuthIdMap = new Map<string, string>();

  for (const e of employees) {
    const prof = profiles?.find(p => p.employee_id === e.employee_id_number);
    const mappedId = prof ? prof.id : e.id;
    authIds.push(mappedId);
    empToAuthIdMap.set(e.id, mappedId);
  }

  if (authIds.length === 0) return [];

  // 4, 5, 6. Concurrently fetch EOD reports, Holidays, and Leaves in ONE parallel wave
  const [eodsRes, holidaysRes, leavesRes] = await Promise.all([
    supabase
      .from('eod_reports')
      .select('id, employee_id, office_hours, report_date, status')
      .eq('status', 'Approved')
      .gte('report_date', startDate)
      .lte('report_date', endDate)
      .in('employee_id', authIds),
    supabase
      .from('holidays')
      .select('id, name, date, is_optional, holiday_type')
      .gte('date', startDate)
      .lte('date', endDate),
    supabase
      .from('leave_requests')
      .select('id, employee_id, start_date, end_date, is_half_day, request_type, leave_type, status')
      .in('status', ['Approved', 'Approved HR'])
      .gte('start_date', startDate)
      .lte('start_date', endDate)
      .in('employee_id', authIds)
  ]);

  const eods = eodsRes.data || [];
  const holidays = holidaysRes.data || [];
  const leaves = leavesRes.data || [];

  // 7. Build paid holiday date set — ALL holidays are paid
  const paidHolidayDates = new Set<string>();
  holidays.forEach(h => {
    if (h.holiday_type === 'PAID') {
      paidHolidayDates.add(h.date);
    }
  });

  // 8. Standard payroll rule: 26 working days * 8 hours = 208 standard monthly working hours
  const STANDARD_WORKING_DAYS = 26;
  const standardHours = 208; // Fixed rule: 26 days * 8 hours = 208 standard hours

  // Calendar working days for calendar proration (Mon–Sat, excluding Sundays)
  let calendarWorkingDays = 0;
  for (let d = 1; d <= lastDay; d++) {
    const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (isWorkingDay(dStr)) {
      calendarWorkingDays++;
    }
  }

  // Payable days in month (Mon–Sat calendar days). Weekday holidays are already in calendarWorkingDays.
  const payableDaysInMonth = calendarWorkingDays;

  // 9. Batch check existing Comp-Off credits for all EODs to avoid repeated individual queries
  const allEodIds = eods.map(e => e.id);
  const creditedEodIds = new Set<string>();
  if (allEodIds.length > 0) {
    const { data: existingCredits } = await supabase
      .from('comp_off_ledger')
      .select('reference_id')
      .in('reference_id', allEodIds)
      .eq('transaction_type', 'CREDIT');
    existingCredits?.forEach(c => creditedEodIds.add(c.reference_id));
  }

  // Batch insert any uncredited EOD comp off credits in a single atomic insert
  const uncreditedEods = eods.filter(e => !creditedEodIds.has(e.id));
  if (uncreditedEods.length > 0) {
    const authToOnboardingId = new Map<string, string>();
    for (const [onboardingId, authId] of empToAuthIdMap.entries()) {
      authToOnboardingId.set(authId, onboardingId);
    }

    const newCredits: { employee_id: string; transaction_type: 'CREDIT'; hours: number; reference_id: string }[] = [];
    for (const eod of uncreditedEods) {
      const resolvedOnboardingId = authToOnboardingId.get(eod.employee_id) || eod.employee_id;
      const workedMins = canonicalOfficeHoursToMinutes(Number(eod.office_hours));

      let context: 'normal' | 'sunday' | 'paid_holiday' | 'approved_leave' = 'normal';
      if (isSunday(eod.report_date)) {
        context = 'sunday';
      } else if (paidHolidayDates.has(eod.report_date)) {
        context = 'paid_holiday';
      } else {
        const empLeave = leaves.find(l =>
          l.employee_id === eod.employee_id &&
          l.start_date <= eod.report_date &&
          l.end_date >= eod.report_date &&
          !l.is_half_day
        );
        if (empLeave) context = 'approved_leave';
      }

      const compOffMinutes = calculateCompOffMinutes(workedMins, context, 'Approved');
      if (compOffMinutes > 0) {
        const creditHours = Math.round((compOffMinutes / 60) * 100) / 100;
        newCredits.push({
          employee_id: resolvedOnboardingId,
          transaction_type: 'CREDIT',
          hours: creditHours,
          reference_id: eod.id
        });
      }
    }

    if (newCredits.length > 0) {
      const { error: insertErr } = await supabase.from('comp_off_ledger').insert(newCredits);
      if (insertErr && !(insertErr.code === '23505' || insertErr.message?.includes('unique'))) {
        console.error("[PAYROLL] Comp-Off ledger insert error:", insertErr);
      }
    }
  }

  // 10. Fetch active employee-specific deductions for this month
  const { getDeductionsForMonth } = await import('@/lib/services/payroll-deductions.service');
  const activeDeductions = await getDeductionsForMonth(year, month, employeeIds);
  const deductionsByEmp = new Map<string, any[]>();
  activeDeductions.forEach(d => {
    const list = deductionsByEmp.get(d.employee_id) || [];
    list.push(d);
    deductionsByEmp.set(d.employee_id, list);
  });

  // 11. Process each employee independently
  const results: PayrollResult[] = [];

  for (const emp of employees) {
    const authId = empToAuthIdMap.get(emp.id);

    // Filter EODs for THIS employee only
    const empEods = eods?.filter(e => e.employee_id === authId) || [];


    // Filter leaves for THIS employee only
    const empLeaves = leaves?.filter(l => l.employee_id === authId) || [];

    // Determine if this employee has any payroll-relevant data for this month
    const hasPayrollData = empEods.length > 0;

    // Determine monthly pay base: Intern uses stipend, others use basic_salary or annual CTC / 12
    const isIntern = emp.employment_type?.toLowerCase() === 'intern';
    let monthlyPayBase = 0;
    if (isIntern) {
      monthlyPayBase = Number(emp.stipend || 0);
    } else if (emp.basic_salary !== null && emp.basic_salary !== undefined && Number(emp.basic_salary) > 0) {
      monthlyPayBase = Number(emp.basic_salary);
    } else if (emp.salary !== null && emp.salary !== undefined && Number(emp.salary) > 0) {
      monthlyPayBase = calculateMonthlyBasicSalary(Number(emp.salary));
    }

    // Standard daily rate = monthly base / 26 standard working days (standard 208h / 26 days basis)
    const fullDayRate = STANDARD_WORKING_DAYS > 0 ? monthlyPayBase / STANDARD_WORKING_DAYS : 0;
    const halfDayRate = fullDayRate / 2;

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

    // Track paid day fractions for Net Payable calculation
    let totalPaidDayFractions = 0;

    // Track holidays where employee worked (to count holiday pay correctly)
    const holidaysWorkedDates = new Set<string>();

    empEods.forEach(eod => {
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
    // These still count as full paid days
    let paidHolidayMinutesNotWorked = 0;
    paidHolidayDates.forEach(hDate => {
      if (!holidaysWorkedDates.has(hDate)) {
        // Holiday where employee did NOT work — still a paid day
        totalPaidDayFractions += 1;
        paidHolidayMinutesNotWorked += STANDARD_WORK_MINUTES;
      }
    });

    // ─── Leave tracking ─────────────────────────────────────────
    let creditedLeaveMinutes = 0;
    let unpaidLeaveMinutes = 0;
    let wfhMinutes = 0;

    empLeaves.forEach(l => {
      // Calculate working days in leave range within the target month
      const lStartStr = l.start_date < startDate ? startDate : l.start_date;
      const lEndStr = l.end_date > endDate ? endDate : l.end_date;

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

      if (leaveDaysCount === 0 && l.start_date === l.end_date) {
        leaveDaysCount = 1;
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

    // Determine how many working days were missed (no EOD, no approved leave, not a holiday)
    let missingWorkingDays = 0;
    for (let d = 1; d <= lastDay; d++) {
      const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (isWorkingDay(dStr)) {
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

    // Employee-specific fixed deductions
    const empDeductions = deductionsByEmp.get(emp.id) || [];
    const manualDeductions = empDeductions.reduce((sum, d) => sum + Number(d.amount || 0), 0);

    // Attendance Deduction = total deducted days × standard daily rate (capped at monthly base)
    const attendanceDeduction = hasPayrollData ? Math.min(monthlyPayBase, Math.round(totalDeductedDays * fullDayRate * 100) / 100) : 0;

    // Earned pay = monthly base - attendanceDeduction
    const earnedPay = hasPayrollData ? Math.max(0, monthlyPayBase - attendanceDeduction) : 0;

    // Total deductions = attendance deduction + employee-specific fixed deductions
    const totalDeductions = Math.round((attendanceDeduction + manualDeductions) * 100) / 100;

    // Cash overtime is ALWAYS ₹0. Extra hours go to Comp Off, not cash.
    const overtimePay = 0;

    // Net Payable: earnedPay reduced by manual deductions (cannot fall below 0)
    const netPayable = hasPayrollData ? Math.max(0, earnedPay - manualDeductions) : 0;

    // ─── Display values ─────────────────────────────────────────
    const actualWorkedHours = totalWorkedMinutes / 60;
    const creditedLeaveHours = creditedLeaveMinutes / 60;
    const paidHolidayHours = paidHolidayMinutesNotWorked / 60;
    const wfhHoursValue = wfhMinutes / 60;
    const unpaidLeaveHours = unpaidLeaveMinutes / 60;

    // Extra hours = total comp off earned (for display purposes)
    const extraHoursValue = compOffMinutesEarned / 60;

    const totalPaidMinutes = totalWorkedMinutes + creditedLeaveMinutes + paidHolidayMinutesNotWorked;
    const totalPaidHours = totalPaidMinutes / 60;

    // ─── Debug logging (temporary) ──────────────────────────────
    console.log(`[PAYROLL DEBUG] ${emp.first_name} ${emp.last_name} (${emp.employee_id_number})`);
    console.log(`  Profile ID: ${authId}`);
    console.log(`  Month: ${year}-${String(month).padStart(2, '0')}`);
    console.log(`  EOD rows found: ${empEods.length}`);
    console.log(`  Has payroll data: ${hasPayrollData}`);
    console.log(`  Total worked minutes: ${totalWorkedMinutes} (${actualWorkedHours}h)`);
    console.log(`  Full days: ${daysFullDay}, Half days: ${daysHalfDay}, Unpaid: ${daysUnpaidLeaveEod}`);
    console.log(`  Sundays worked: ${daysSundayWorked}, Holidays worked: ${daysPaidHolidayWorked}`);
    console.log(`  Holidays not worked (paid): ${paidHolidayDates.size - daysPaidHolidayWorked}`);
    console.log(`  Comp Off earned: ${compOffMinutesEarned} mins (${(compOffMinutesEarned / 60).toFixed(1)}h)`);
    console.log(`  Pay base: ₹${monthlyPayBase}, Full day rate: ₹${fullDayRate.toFixed(2)}`);
    console.log(`  Paid day fractions: ${totalPaidDayFractions}`);
    console.log(`  Earned pay: ₹${earnedPay.toFixed(2)}, Attendance Deduction: ₹${attendanceDeduction.toFixed(2)}, Manual Deductions: ₹${manualDeductions.toFixed(2)}, Total Deductions: ₹${totalDeductions.toFixed(2)}`);
    console.log(`  Cash overtime: ₹0 (always), Net payable: ₹${netPayable.toFixed(2)}`);

    results.push({
      employeeId: emp.id,
      name: `${emp.first_name} ${emp.last_name}`,
      department: emp.department || 'N/A',
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
      shortHoursDeduction: 0,
      manualDeductions: Math.round(manualDeductions * 100) / 100,
      deductionsCount: empDeductions.length,
      deductionsList: empDeductions,

      totalPaidHours: Math.round(totalPaidHours * 100) / 100,
      grossPay: Math.round(monthlyPayBase * 100) / 100,
      totalDeductions,
      netPayable: Math.round(netPayable * 100) / 100,

      hasPayrollData,
    });
  }

  return results;
}
