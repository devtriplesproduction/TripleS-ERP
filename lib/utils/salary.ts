export function calculateMonthlyBasicSalary(annualCTC: number): number {
  if (!annualCTC || isNaN(annualCTC)) return 0;
  return Math.round((annualCTC / 12) * 100) / 100;
}

/**
 * Calculates salary increment percentage: ((newSalary - previousSalary) / previousSalary) * 100
 * Safely handles null, zero, negative, or invalid previous/new salaries without returning Infinity, NaN, or null.
 */
export function calculateIncrementPercentage(
  previousSalary: number | null | undefined,
  newSalary: number | null | undefined
): number {
  const prev = Number(previousSalary);
  const next = Number(newSalary);

  if (!Number.isFinite(prev) || prev <= 0) return 0;
  if (!Number.isFinite(next) || next <= 0) return 0;

  const percentage = ((next - prev) / prev) * 100;
  return Math.round(percentage * 100) / 100;
}

/**
 * Resolves current monthly compensation from employee and salary history records.
 * 
 * Precedence:
 * 1. Latest salary_history row's new_salary (if any exists)
 * 2. If Intern: employee.stipend (can be 1, never defaults to 0 if set)
 * 3. employee.basic_salary (if set)
 * 4. employee.salary / 12 (if annual salary is set)
 * 5. Returns null if genuinely missing (never defaults to 0)
 */
export function resolveCurrentSalary(
  employee: {
    salary?: number | null;
    basic_salary?: number | null;
    stipend?: number | null;
    employment_type?: string | null;
  } | null | undefined,
  salaryHistory: Array<{ new_salary: number | string | null }> | null | undefined
): number | null {
  if (!employee && (!salaryHistory || salaryHistory.length === 0)) {
    return null;
  }

  // 1. Check latest salary history
  if (salaryHistory && salaryHistory.length > 0 && salaryHistory[0].new_salary !== null && salaryHistory[0].new_salary !== undefined) {
    const histVal = Number(salaryHistory[0].new_salary);
    if (Number.isFinite(histVal)) return histVal;
  }

  if (!employee) return null;

  // 2. Check Intern stipend
  const isIntern = employee.employment_type?.toLowerCase() === 'intern';
  if (isIntern) {
    if (employee.stipend !== null && employee.stipend !== undefined) {
      const stipendVal = Number(employee.stipend);
      if (Number.isFinite(stipendVal)) return stipendVal;
    }
  }

  // 3. Check basic_salary
  if (employee.basic_salary !== null && employee.basic_salary !== undefined) {
    const basicVal = Number(employee.basic_salary);
    if (Number.isFinite(basicVal)) return basicVal;
  }

  // 4. Check annual salary (divide by 12)
  if (employee.salary !== null && employee.salary !== undefined) {
    const annualVal = Number(employee.salary);
    if (Number.isFinite(annualVal) && annualVal > 0) {
      return Math.round((annualVal / 12) * 100) / 100;
    }
  }

  return null;
}

export interface PeriodSalaryResolution {
  /** The final base pay for the employee for this payroll month (prorated if joined/left mid-month or had hikes) */
  basePay: number;
  /** Full month applicable monthly salary at the end of the period */
  fullMonthSalary: number;
  /** Standard daily rate = fullMonthSalary / scheduledWorkingDays */
  dailyRate: number;
  /** Whether the employee is eligible for payroll in this month */
  isEligible: boolean;
  /** Proration breakdown */
  proration: {
    isProrated: boolean;
    eligibleWorkingDays: number;
    scheduledWorkingDays: number;
    effectiveStartDate: string;
    effectiveEndDate: string;
    hikeSplits?: Array<{
      startDate: string;
      endDate: string;
      rate: number;
      workingDays: number;
      subtotal: number;
    }>;
    reason?: string;
  };
}

/**
 * Resolves the precise base salary for an employee for a specific payroll month,
 * taking into account:
 * 1. Employment type (Intern stipend vs Full-time basic / CTC)
 * 2. Salary history records and effective dates
 * 3. Mid-month salary hikes (date-based proration)
 * 4. Mid-month joiners (never pay or penalize before joining date)
 * 5. Mid-month leavers / deactivations (never pay or penalize after leaving date)
 */
export function resolveSalaryForPeriod(
  employee: {
    id: string;
    employment_type?: string | null;
    stipend?: number | null;
    basic_salary?: number | null;
    salary?: number | null;
    joining_date?: string | null;
    deactivated_at?: string | null;
    employment_status?: string | null;
  },
  salaryHistory: Array<{
    previous_salary: number | string | null;
    new_salary: number | string | null;
    effective_date: string;
    created_at?: string;
  }> | null | undefined,
  year: number,
  month: number,
  scheduledWorkingDays: number = 26,
  isWorkingDayFn: (dateStr: string) => boolean
): PeriodSalaryResolution {
  const monthStartStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEndStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  // 1. Check eligibility:
  // - Joining date after month end => not eligible
  // - Deactivated before month start => not eligible
  if (employee.joining_date && employee.joining_date > monthEndStr) {
    return {
      basePay: 0,
      fullMonthSalary: 0,
      dailyRate: 0,
      isEligible: false,
      proration: {
        isProrated: true,
        eligibleWorkingDays: 0,
        scheduledWorkingDays,
        effectiveStartDate: employee.joining_date,
        effectiveEndDate: monthEndStr,
        reason: 'Employee joined after payroll month'
      }
    };
  }

  if (employee.deactivated_at && employee.deactivated_at < monthStartStr) {
    return {
      basePay: 0,
      fullMonthSalary: 0,
      dailyRate: 0,
      isEligible: false,
      proration: {
        isProrated: true,
        eligibleWorkingDays: 0,
        scheduledWorkingDays,
        effectiveStartDate: monthStartStr,
        effectiveEndDate: employee.deactivated_at,
        reason: 'Employee offboarded before payroll month'
      }
    };
  }

  // Window of active employment in this month
  const effectiveStart = employee.joining_date && employee.joining_date > monthStartStr
    ? employee.joining_date
    : monthStartStr;
  const effectiveEnd = employee.deactivated_at && employee.deactivated_at < monthEndStr
    ? employee.deactivated_at
    : monthEndStr;

  // 2. Determine base monthly salary (fallback if no history matches)
  const isIntern = employee.employment_type?.toLowerCase() === 'intern';
  let defaultSalary = 0;
  if (isIntern) {
    defaultSalary = Number(employee.stipend || 0);
  } else if (employee.basic_salary !== null && employee.basic_salary !== undefined && Number(employee.basic_salary) > 0) {
    defaultSalary = Number(employee.basic_salary);
  } else if (employee.salary !== null && employee.salary !== undefined && Number(employee.salary) > 0) {
    defaultSalary = calculateMonthlyBasicSalary(Number(employee.salary));
  }

  // 3. Resolve historical salary for any given date
  const historyList = (salaryHistory || []).slice().sort((a, b) => {
    const diff = new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime();
    if (diff !== 0) return diff;
    return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
  });

  const getSalaryOnDate = (dateStr: string): number => {
    // If there is salary history, find the latest hike with effective_date <= dateStr
    const effectiveHikes = historyList.filter(h => h.effective_date <= dateStr);
    if (effectiveHikes.length > 0) {
      const latest = effectiveHikes[effectiveHikes.length - 1];
      const val = Number(latest.new_salary);
      if (Number.isFinite(val) && val > 0) return val;
    }

    // If all hikes are after dateStr, check the earliest hike's previous_salary
    if (historyList.length > 0) {
      const earliest = historyList[0];
      const prevVal = Number(earliest.previous_salary);
      if (Number.isFinite(prevVal) && prevVal > 0) return prevVal;
    }

    return defaultSalary;
  };

  // 4. Calculate working days and salary per day
  let eligibleWorkingDays = 0;
  let totalCalendarWorkingDays = 0;
  let accumulatedPay = 0;

  // Collect daily rates to construct hike splits if multiple rates exist
  const dayRates: Array<{ dateStr: string; rate: number }> = [];

  for (let d = 1; d <= lastDay; d++) {
    const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isWorkDay = isWorkingDayFn(dStr);

    if (isWorkDay) {
      totalCalendarWorkingDays++;
      if (dStr >= effectiveStart && dStr <= effectiveEnd) {
        eligibleWorkingDays++;
        const daySalaryRate = getSalaryOnDate(dStr);
        dayRates.push({ dateStr: dStr, rate: daySalaryRate });
        // Daily rate based on scheduled working days (default 26)
        const dailyRate = scheduledWorkingDays > 0 ? daySalaryRate / scheduledWorkingDays : 0;
        accumulatedPay += dailyRate;
      }
    }
  }

  const endOfMonthSalary = getSalaryOnDate(effectiveEnd);
  const isProrated = effectiveStart !== monthStartStr || effectiveEnd !== monthEndStr || dayRates.some(r => r.rate !== dayRates[0]?.rate);

  // If the employee worked the FULL month and had constant salary, avoid rounding drift by using exact monthly salary
  let finalBasePay: number;
  if (!isProrated && dayRates.length > 0 && dayRates.every(r => r.rate === endOfMonthSalary)) {
    finalBasePay = endOfMonthSalary;
  } else {
    finalBasePay = Math.round(accumulatedPay * 100) / 100;
  }

  // Build hike splits for transparent UI breakdown
  const hikeSplits: Array<{
    startDate: string;
    endDate: string;
    rate: number;
    workingDays: number;
    subtotal: number;
  }> = [];

  if (dayRates.length > 0) {
    let currentSplit = {
      startDate: dayRates[0].dateStr,
      endDate: dayRates[0].dateStr,
      rate: dayRates[0].rate,
      workingDays: 1,
      subtotal: (dayRates[0].rate / (scheduledWorkingDays || 26))
    };

    for (let i = 1; i < dayRates.length; i++) {
      const item = dayRates[i];
      if (item.rate === currentSplit.rate) {
        currentSplit.endDate = item.dateStr;
        currentSplit.workingDays += 1;
        currentSplit.subtotal += (item.rate / (scheduledWorkingDays || 26));
      } else {
        currentSplit.subtotal = Math.round(currentSplit.subtotal * 100) / 100;
        hikeSplits.push({ ...currentSplit });
        currentSplit = {
          startDate: item.dateStr,
          endDate: item.dateStr,
          rate: item.rate,
          workingDays: 1,
          subtotal: (item.rate / (scheduledWorkingDays || 26))
        };
      }
    }
    currentSplit.subtotal = Math.round(currentSplit.subtotal * 100) / 100;
    hikeSplits.push(currentSplit);
  }

  const dailyRate = scheduledWorkingDays > 0
    ? Math.round((endOfMonthSalary / scheduledWorkingDays) * 100) / 100
    : 0;

  return {
    basePay: finalBasePay,
    fullMonthSalary: endOfMonthSalary,
    dailyRate,
    isEligible: true,
    proration: {
      isProrated,
      eligibleWorkingDays,
      scheduledWorkingDays,
      effectiveStartDate: effectiveStart,
      effectiveEndDate: effectiveEnd,
      hikeSplits: hikeSplits.length > 1 ? hikeSplits : undefined,
      reason: isProrated
        ? (effectiveStart !== monthStartStr
            ? `Mid-month joining on ${effectiveStart}`
            : effectiveEnd !== monthEndStr
            ? `Offboarded on ${effectiveEnd}`
            : 'Mid-month salary revision')
        : undefined
    }
  };
}

