export function calculateMonthlyBasicSalary(annualCTC: number): number {
  if (!annualCTC || isNaN(annualCTC)) return 0;
  return Math.round((annualCTC / 12) * 100) / 100;
}

/**
 * Calculate salary increment percentage.
 * Formula: (new total salary - previous salary) / previous salary * 100
 * Handles zero or missing previous salary safely without dividing by zero or returning NaN/Infinity/null.
 */
export function calculateIncrementPercentage(
  previousSalary: number | null | undefined,
  newSalary: number | null | undefined
): number {
  const prev = Number(previousSalary);
  const next = Number(newSalary);

  if (isNaN(next) || next <= 0) return 0;
  if (isNaN(prev) || prev <= 0) return 0;

  const percentage = ((next - prev) / prev) * 100;
  if (!isFinite(percentage) || isNaN(percentage)) return 0;

  return Math.round(percentage * 100) / 100;
}

/**
 * Resolve the employee's actual current salary from employee records and salary history.
 * Checks:
 * 1. Most recent record in salary_history (if valid > 0)
 * 2. employee.basic_salary (if valid > 0)
 * 3. employee.stipend (if employment_type is Intern and valid > 0)
 * 4. employee.salary (annual CTC -> converted to monthly basic salary, if valid > 0)
 * 5. employee.stipend (fallback, if valid > 0)
 * Returns null if salary data is genuinely missing, avoiding defaulting to 0.
 */
export function resolveCurrentSalary(
  employee: {
    salary?: number | string | null;
    basic_salary?: number | string | null;
    stipend?: number | string | null;
    employment_type?: string | null;
  } | null | undefined,
  history?: Array<{ new_salary: number | string }> | null
): number | null {
  // 1. Check salary history: most recent new_salary
  if (history && history.length > 0) {
    const latest = history[0];
    const val = Number(latest.new_salary);
    if (!isNaN(val) && val > 0) {
      return val;
    }
  }

  if (!employee) return null;

  // 2. Check basic_salary (monthly basic salary)
  if (employee.basic_salary != null && employee.basic_salary !== '') {
    const val = Number(employee.basic_salary);
    if (!isNaN(val) && val > 0) {
      return val;
    }
  }

  // 3. For Interns, check stipend (monthly stipend)
  const isIntern = employee.employment_type?.toLowerCase() === 'intern';
  if (isIntern && employee.stipend != null && employee.stipend !== '') {
    const val = Number(employee.stipend);
    if (!isNaN(val) && val > 0) {
      return val;
    }
  }

  // 4. Check annual salary CTC -> monthly basic
  if (employee.salary != null && employee.salary !== '') {
    const val = Number(employee.salary);
    if (!isNaN(val) && val > 0) {
      return calculateMonthlyBasicSalary(val);
    }
  }

  // 5. Fallback check for stipend for any employment type
  if (employee.stipend != null && employee.stipend !== '') {
    const val = Number(employee.stipend);
    if (!isNaN(val) && val > 0) {
      return val;
    }
  }

  return null;
}

