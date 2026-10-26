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

