export const PREDEFINED_DEDUCTION_TYPES = [
  'Damage Recovery',
  'Salary Advance',
  'TDS',
  'Disciplinary / Late Fine',
  'Asset / Equipment',
  'Other Deduction'
] as const;

export type PayrollDeductionType = (typeof PREDEFINED_DEDUCTION_TYPES)[number] | string;

export interface PayrollDeduction {
  id: string;
  employee_id: string; // references employee_onboarding.id
  payroll_year: number;
  payroll_month: number; // 1-12
  deduction_type: string;
  amount: number;
  reason: string;
  notes?: string | null;
  status: 'ACTIVE' | 'CANCELLED';
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePayrollDeductionInput {
  employee_id: string;
  payroll_year: number;
  payroll_month: number;
  deduction_type: string;
  amount: number;
  reason: string;
  notes?: string;
}

export interface PayrollDeductionActionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
