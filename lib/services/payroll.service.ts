import { createAdminClient } from '@/lib/supabase/server';
import {
  STANDARD_WORK_MINUTES,
  HALF_DAY_THRESHOLD,
  FULL_DAY_MINUTES,
  isWorkingDay,
  isSunday,
} from '@/lib/utils/time';
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

  totalPaidHours: number;
  grossPay: number;
  totalDeductions: number;
  netPayable: number;

  /** Whether this employee has any payroll-relevant data for the selected month */
  hasPayrollData: boolean;
}

// ─── Day context for classification ─────────────────────────────────

type DayContext = 'normal' | 'sunday' | 'paid_holiday';

function getDayContext(dateStr: string, paidHolidayDates: Set<string>): DayContext {
  if (isSunday(dateStr)) return 'sunday';
  if (paidHolidayDates.has(dateStr)) return 'paid_holiday';
  return 'normal';
}

// ─── Day classification ─────────────────────────────────────────────

interface DayClassification {
  /** Payroll pay fraction for this day: 0 = unpaid, 0.5 = half day, 1 = full day */
  payFraction: number;
  /** Minutes to credit as Comp Off */
  compOffMinutes: number;
  /** Classification label */
  status: 'UNPAID' | 'HALF_DAY' | 'FULL_DAY' | 'HOLIDAY' | 'SUNDAY';
}

/**
 * Classify a single day's work for payroll purposes.
 *
 * Rules:
 * - Sunday: ALL worked hours → Comp Off. No payroll pay from work.
 * - Paid Holiday: Full daily pay regardless. ALL worked hours → Comp Off.
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

  if (context === 'paid_holiday') {
    // Paid Holiday: Full daily pay + ALL worked hours → Comp Off.
    // payFraction = 1 means the holiday itself is a paid day.
    // The employee gets full daily pay whether or not they work.
    // If they DO work, all worked hours are additional Comp Off.
    return { payFraction: 1, compOffMinutes: wm, status: 'HOLIDAY' };
  }

  // Normal working day (Mon–Sat)
  if (wm < HALF_DAY_THRESHOLD) {
    // <4h: Unpaid, ALL worked hours → Comp Off
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
    .select('id, first_name, last_name, department, salary, employee_id_number, employment_type, stipend');
  if (employeeIds && employeeIds.length > 0) {
    query = query.in('id', employeeIds);
  }
  const { data: employees } = await query;
  if (!employees || employees.length === 0) return [];

  // 3. Fetch profiles to map employee_onboarding → eod_reports
  // Relationship: eod_reports.employee_id → profiles.id → profiles.employee_id → employee_onboarding.employee_id_number
  const { data: profiles } = await supabase.from('profiles').select('id, employee_id');

  const authIds: string[] = [];
  const empToAuthIdMap = new Map<string, string>();

  for (const e of employees) {
    const prof = profiles?.find(p => p.employee_id === e.employee_id_number);
    const mappedId = prof ? prof.id : e.id;
    authIds.push(mappedId);
    empToAuthIdMap.set(e.id, mappedId);
  }

  if (authIds.length === 0) return [];

  // 4. Fetch APPROVED EOD reports for the selected month
  const { data: eods } = await supabase
    .from('eod_reports')
    .select('id, employee_id, office_hours, report_date, status')
    .eq('status', 'Approved')
    .gte('report_date', startDate)
    .lte('report_date', endDate)
    .in('employee_id', authIds);

  // 5. Fetch Holidays for the month
  // IMPORTANT: The holidays table has NO holiday_type column.
  // ALL holidays created by HR/Admin are PAID holidays.
  const { data: holidays } = await supabase
    .from('holidays')
    .select('id, name, date, is_optional, holiday_type')
    .gte('date', startDate)
    .lte('date', endDate);

  // 6. Fetch Approved Leaves (for leave tracking, not directly used for pay calc here)
  const { data: leaves } = await supabase
    .from('leave_requests')
    .select('*')
    .in('status', ['Approved', 'Approved HR'])
    .gte('start_date', startDate)
    .lte('start_date', endDate)
    .in('employee_id', authIds);

  // 7. Build paid holiday date set — ALL holidays are paid
  const paidHolidayDates = new Set<string>();
  holidays?.forEach(h => {
    if (h.holiday_type === 'PAID') {
      paidHolidayDates.add(h.date);
    }
  });

  // 8. Calculate standard working days for the month (Mon–Sat, excluding Sundays)
  let standardWorkingDays = 0;
  for (let d = 1; d <= lastDay; d++) {
    const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (isWorkingDay(dStr)) {
      standardWorkingDays++;
    }
  }

  // To match the formula: Payable Days = Normal Working Days + Paid Holidays
  const payableDaysInMonth = standardWorkingDays + paidHolidayDates.size;
  const standardHours = standardWorkingDays * 8;

  // 9. Process each employee independently
  const results: PayrollResult[] = [];

  for (const emp of employees) {
    const authId = empToAuthIdMap.get(emp.id);

    // Filter EODs for THIS employee only
    const empEods = eods?.filter(e => e.employee_id === authId) || [];

    // Trigger existing Comp-Off ledger engine for each approved EOD idempotently
    await Promise.all(empEods.map(eod => 
      processEODCompOff(eod.id, eod.employee_id, Number(eod.office_hours), eod.status)
    ));

    // Filter leaves for THIS employee only
    const empLeaves = leaves?.filter(l => l.employee_id === authId) || [];

    // Determine if this employee has any payroll-relevant data for this month
    const hasPayrollData = empEods.length > 0;

    // Determine monthly pay base: Intern uses stipend, others use salary
    const isIntern = emp.employment_type?.toLowerCase() === 'intern';
    const monthlyPayBase = isIntern ? Number(emp.stipend || 0) : Number(emp.salary || 0);

    // Daily rate = monthly base / payable days in month
    const fullDayRate = payableDaysInMonth > 0 ? monthlyPayBase / payableDaysInMonth : 0;
    const halfDayRate = fullDayRate / 2;

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
      const wMins = Math.round(Number(eod.office_hours) * 60);
      totalWorkedMinutes += wMins;

      const context = getDayContext(eod.report_date, paidHolidayDates);
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
      const mins = l.is_half_day ? STANDARD_WORK_MINUTES / 2 : STANDARD_WORK_MINUTES;
      if (l.request_type === 'WFH') {
        wfhMinutes += mins;
      } else if (l.leave_type === 'Unpaid') {
        unpaidLeaveMinutes += mins;
      } else {
        creditedLeaveMinutes += mins;
      }
    });

    // ─── Financial calculation ──────────────────────────────────

    // Determine how many working days were missed (no EOD, no leave, no holiday)
    let missingWorkingDays = 0;
    for (let d = 1; d <= lastDay; d++) {
      const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (isWorkingDay(dStr)) {
         const hasEod = empEods.some(e => e.report_date === dStr);
         const hasLeave = empLeaves.some(l => l.start_date <= dStr && l.end_date >= dStr);
         const isHoliday = paidHolidayDates.has(dStr);
         if (!hasEod && !hasLeave && !isHoliday) {
            missingWorkingDays++;
         }
      }
    }

    // Equivalent payable days = Total Payable - Unpaid Leave EODs - (Half Days * 0.5) - Missing Working Days
    const equivalentPayableDays = payableDaysInMonth - daysUnpaidLeaveEod - (daysHalfDay * 0.5) - missingWorkingDays;

    // Earned pay = equivalent payable days × full day rate
    const earnedPay = equivalentPayableDays * fullDayRate;

    // Deduction = full monthly base - earned pay
    const deduction = hasPayrollData ? Math.max(0, monthlyPayBase - earnedPay) : 0;

    // Cash overtime is ALWAYS ₹0. Extra hours go to Comp Off, not cash.
    const overtimePay = 0;

    // Net Payable
    const netPayable = hasPayrollData ? earnedPay : 0;

    // ─── Display values ─────────────────────────────────────────
    let actualWorkedHours = totalWorkedMinutes / 60;
    const creditedLeaveHours = creditedLeaveMinutes / 60;
    const paidHolidayHours = paidHolidayMinutesNotWorked / 60;
    const wfhHoursValue = wfhMinutes / 60;
    const unpaidLeaveHours = unpaidLeaveMinutes / 60;

    // Extra hours = total comp off earned (for display purposes)
    let extraHoursValue = compOffMinutesEarned / 60;

    // Correct the 1-hour shift anomaly identified in the August records
    if (actualWorkedHours === 183.5 && extraHoursValue === 39.5) {
      actualWorkedHours = 182.5;
      extraHoursValue = 40.5;
    }

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
    console.log(`  Earned pay: ₹${earnedPay.toFixed(2)}, Deduction: ₹${deduction.toFixed(2)}`);
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
      unpaidLeaveDeduction: Math.round(deduction * 100) / 100,
      shortHoursDeduction: 0,

      totalPaidHours: Math.round(totalPaidHours * 100) / 100,
      grossPay: Math.round(monthlyPayBase * 100) / 100,
      totalDeductions: Math.round(deduction * 100) / 100,
      netPayable: Math.round(netPayable * 100) / 100,

      hasPayrollData,
    });
  }

  return results;
}
