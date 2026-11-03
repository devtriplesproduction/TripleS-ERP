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

export type PayrollRunStatus = 'DRAFT' | 'CALCULATED' | 'REVIEWED' | 'APPROVED' | 'FINALIZED';

export interface PayrollRun {
  id: string;
  year: number;
  month: number;
  status: PayrollRunStatus;
  total_employees: number;
  total_payout: number;
  created_at: string;
  updated_at: string;
  finalized_at?: string | null;
  finalized_by?: string | null;
}

export interface SalaryProrationDetail {
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
}

export interface PayrollItem {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  name?: string;
  department?: string;
  designation?: string;
  employee_id_number?: string;
  salary: number;
  standard_hours: number;
  actual_worked_hours: number;
  credited_leave_hours: number;
  unpaid_leave_hours: number;
  paid_holiday_hours: number;
  wfh_hours: number;
  extra_hours: number;
  short_hours: number;
  total_paid_hours: number;
  days_half_day: number;
  days_unpaid_leave_eod: number;
  comp_off_minutes_earned: number;
  overtime_pay: number;
  attendance_deduction: number;
  unpaid_leave_deduction: number;
  manual_deductions: number;
  short_hours_deduction: number;
  gross_pay: number;
  total_deductions: number;
  net_payable: number;
  is_locked: boolean;
  has_payroll_data: boolean;
  metadata?: {
    proration?: SalaryProrationDetail;
    deductionsList?: any[];
    adjustments?: Array<{
      amount: number;
      reason: string;
      adjustedBy: string;
      adjustedAt: string;
    }>;
  };
  created_at: string;
  updated_at: string;
}

export type { PayrollResult } from '@/lib/services/payroll.service';

