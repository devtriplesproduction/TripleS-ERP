import { createClient } from '@/lib/supabase/server';
import { getDayOfWeek, STANDARD_WORK_MINUTES, HALF_DAY_THRESHOLD, FULL_DAY_MINUTES, calculateExtraMinutes, calculateShortMinutes, classifyWorkDay, determineWorkDayContext, isWorkingDay, type WorkDayContext } from '@/lib/utils/time';

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
}

export async function calculateMonthlyPayroll(year: number, month: number, employeeIds?: string[]): Promise<PayrollResult[]> {
  const supabase = await createClient();
  
  // 1. Determine dates
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  
  // 2. Fetch Employees
  let query = supabase.from('employee_onboarding').select('id, first_name, last_name, department, salary, employee_id_number');
  if (employeeIds && employeeIds.length > 0) {
    query = query.in('id', employeeIds);
  }
  const { data: employees } = await query;
  if (!employees) return [];
  
  const { data: profiles } = await supabase.from('profiles').select('id, employee_id');
  
  const authIds: string[] = [];
  const empToAuthIdMap = new Map();
  
  for (const e of employees) {
    const prof = profiles?.find(p => p.employee_id === e.employee_id_number);
    const mappedId = prof ? prof.id : e.id;
    authIds.push(mappedId);
    empToAuthIdMap.set(e.id, mappedId);
  }

  if (authIds.length === 0) return [];

  // 3. Fetch EOD Reports
  const { data: eods } = await supabase
    .from('eod_reports')
    .select('id, employee_id, office_hours, report_date')
    .eq('status', 'Approved')
    .gte('report_date', startDate)
    .lte('report_date', endDate)
    .in('employee_id', authIds);
    
  // 4. Fetch Comp Off Ledger to check converted overtime
  const eodIds = eods?.map(e => e.id) || [];
  let compOffLedger: any[] = [];
  if (eodIds.length > 0) {
    const { data: ledger } = await supabase
      .from('comp_off_ledger')
      .select('reference_id, hours, transaction_type')
      .in('reference_id', eodIds)
      .eq('transaction_type', 'CREDIT');
    compOffLedger = ledger || [];
  }
    
  // 5. Fetch Holidays
  const { data: holidays } = await supabase
    .from('holidays')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);
    
  // 6. Fetch Leaves (Approved leaves/WFH)
  const { data: leaves } = await supabase
    .from('leave_requests')
    .select('*')
    .in('status', ['Approved', 'Approved HR'])
    .gte('start_date', startDate)
    .lte('start_date', endDate)
    .in('employee_id', authIds);

  const results: PayrollResult[] = [];
  
  let standardWorkingDays = 0;
  for (let d = 1; d <= lastDay; d++) {
    const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (isWorkingDay(dStr)) {
      standardWorkingDays++;
    }
  }
  const standardHours = standardWorkingDays * 8;
  
  for (const emp of employees) {
    const authId = empToAuthIdMap.get(emp.id);
    const empEods = eods?.filter(e => e.employee_id === authId) || [];
    const empLeaves = leaves?.filter(l => l.employee_id === authId) || [];
    
    const paidHolidayDates = new Set<string>();
    holidays?.forEach(h => {
      if (h.holiday_type === 'PAID' && !h.is_optional) paidHolidayDates.add(h.date);
    });
    
    const paidLeaveDates = new Map<string, number>();
    const unpaidLeaveDates = new Map<string, number>();
    const wfhDates = new Map<string, number>();
    const approvedLeaveDates = new Set<string>();
    
    empLeaves.forEach(l => {
      const mins = l.is_half_day ? STANDARD_WORK_MINUTES / 2 : STANDARD_WORK_MINUTES;
      if (l.request_type === 'WFH') {
        wfhDates.set(l.start_date, mins);
      } else if (l.leave_type === 'Unpaid') {
        unpaidLeaveDates.set(l.start_date, mins);
      } else {
        paidLeaveDates.set(l.start_date, mins); // Paid leave types (Casual, Sick, Comp-off)
      }
      // Track all approved leave dates for comp off context
      approvedLeaveDates.add(l.start_date);
    });
    
    let totalWorkedMinutes = 0;
    let extraMinutes = 0;
    let shortMinutes = 0;
    let convertedToCompOffMinutes = 0;
    let compOffMinutesEarned = 0;
    let daysHalfDay = 0;
    let daysUnpaidLeaveEod = 0;
    
    empEods.forEach(eod => {
      const wMins = Math.round(Number(eod.office_hours) * 60);
      totalWorkedMinutes += wMins;
      
      const context = determineWorkDayContext(eod.report_date, paidHolidayDates, approvedLeaveDates);
      
      // Use centralized classification
      const classification = classifyWorkDay(wMins, context);
      
      // Track classification results
      extraMinutes += calculateExtraMinutes(wMins, context);
      compOffMinutesEarned += classification.compOffMinutes;
      
      if (classification.payrollStatus === 'HALF_DAY') {
        daysHalfDay++;
      }
      if (classification.payrollStatus === 'UNPAID_LEAVE') {
        daysUnpaidLeaveEod++;
      }
      
      // Short minutes only on normal days where employee worked but didn't hit 8h
      // Note: <4h is already classified as UNPAID_LEAVE (excluded from payroll)
      // Half days (4h-7h59m) preserve existing half-day salary treatment
      if (context === 'normal' && wMins >= HALF_DAY_THRESHOLD) {
        shortMinutes += calculateShortMinutes(wMins, context);
      }
      
      // Check if this EOD was already converted to Comp Off
      const ledgerCredits = compOffLedger.filter(l => l.reference_id === eod.id);
      ledgerCredits.forEach(l => {
        convertedToCompOffMinutes += Math.round(Number(l.hours) * 60);
      });
    });
    
    // Ensure we don't pay overtime for extra time already converted to Comp Off
    let payableExtraMinutes = Math.max(0, extraMinutes - convertedToCompOffMinutes);
    
    let creditedLeaveMinutes = 0;
    for (const [dStr, mins] of paidLeaveDates.entries()) {
      if (!empEods.some(e => e.report_date === dStr)) {
        creditedLeaveMinutes += mins;
      }
    }
    
    let unpaidLeaveMinutes = 0;
    for (const [dStr, mins] of unpaidLeaveDates.entries()) {
      if (!empEods.some(e => e.report_date === dStr)) {
        unpaidLeaveMinutes += mins; // Track unpaid time
      }
    }
    
    let paidHolidayMinutes = 0;
    paidHolidayDates.forEach(dStr => {
      if (!empEods.some(e => e.report_date === dStr)) {
        paidHolidayMinutes += STANDARD_WORK_MINUTES;
      }
    });
    
    let wfhMinutes = 0;
    for (const [dStr, mins] of wfhDates.entries()) {
      wfhMinutes += mins;
    }

    const totalPaidMinutes = totalWorkedMinutes + creditedLeaveMinutes + paidHolidayMinutes;
    
    const salary = Number(emp.salary || 0); 
    const hourlyRate = salary > 0 ? (salary / standardHours) : 0;
    
    const actualWorkedHours = totalWorkedMinutes / 60;
    const creditedLeaveHours = creditedLeaveMinutes / 60;
    const paidHolidayHours = paidHolidayMinutes / 60;
    const wfhHoursValue = wfhMinutes / 60;
    const unpaidLeaveHours = unpaidLeaveMinutes / 60;
    const extraHoursValue = extraMinutes / 60;
    const shortHoursValue = shortMinutes / 60;
    const payableExtraHours = payableExtraMinutes / 60;
    const totalPaidHours = totalPaidMinutes / 60;
    
    // Financial Math
    const overtimePay = payableExtraHours * hourlyRate * 1.5;
    const unpaidLeaveDeduction = unpaidLeaveHours * hourlyRate;
    // IMPORTANT: shortHoursDeduction is set to 0 per new business rules
    // Half-day treatment preserves existing salary calculation
    // <4h days are already excluded via UNPAID_LEAVE classification
    const shortHoursDeduction = 0;
    
    const grossPay = salary + overtimePay; // Base salary + Overtime
    const totalDeductions = unpaidLeaveDeduction + shortHoursDeduction;
    const netPayable = grossPay - totalDeductions;
    
    results.push({
      employeeId: emp.id,
      name: `${emp.first_name} ${emp.last_name}`,
      department: emp.department || 'N/A',
      salary,
      standardHours,
      actualWorkedHours: Math.round(actualWorkedHours * 100) / 100,
      creditedLeaveHours: Math.round(creditedLeaveHours * 100) / 100,
      unpaidLeaveHours: Math.round(unpaidLeaveHours * 100) / 100,
      paidHolidayHours: Math.round(paidHolidayHours * 100) / 100,
      wfhHours: Math.round(wfhHoursValue * 100) / 100,
      extraHours: Math.round(extraHoursValue * 100) / 100,
      shortHours: Math.round(shortHoursValue * 100) / 100,
      
      daysHalfDay,
      daysUnpaidLeaveEod,
      compOffMinutesEarned,
      
      overtimePay: Math.round(overtimePay * 100) / 100,
      unpaidLeaveDeduction: Math.round(unpaidLeaveDeduction * 100) / 100,
      shortHoursDeduction: 0, // Removed per new rules
      
      totalPaidHours: Math.round(totalPaidHours * 100) / 100,
      grossPay: Math.round(grossPay * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netPayable: Math.round(netPayable * 100) / 100
    });
  }
  
  return results;
}
