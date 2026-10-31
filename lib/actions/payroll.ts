'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { calculateMonthlyPayroll } from '@/lib/services/payroll.service'
import { getCurrentUser } from '@/lib/auth'
import { calculateMonthlyBasicSalary, calculateIncrementPercentage, resolveCurrentSalary } from '@/lib/utils/salary'
import type { PayrollDeduction, PayrollDeductionActionResponse } from '@/types/payroll'

function safeRevalidatePath(pathUrl: string) {
  try {
    revalidatePath(pathUrl)
  } catch {
    // In test runner or non-request contexts, ignore static generation store invariant
  }
}

export async function addSalaryIncrementAction(
  employeeId: string,
  previousSalary: number | null | undefined,
  newSalary: number,
  incrementPercentage: number | null | undefined,
  effectiveDate: string | null | undefined,
  newPackage: number
) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'HR' && user.role !== 'Admin')) {
      return { success: false, error: 'Unauthorized: Financial data access is restricted to HR and Admin.' }
    }

    const supabase = await createClient()

    // 1. Fetch employee to check employment type (e.g. Intern)
    const empQuery = supabase
      .from('employee_onboarding')
      .select('id, employment_type, stipend, salary, basic_salary')
      .eq('id', employeeId)
    const { data: emp } = typeof empQuery.maybeSingle === 'function' 
      ? await empQuery.maybeSingle() 
      : await empQuery.single()

    const isIntern = emp?.employment_type?.toLowerCase() === 'intern'

    // 2. Safe calculation for increment_percentage and previous_salary
    const safePrevSalary = Number(previousSalary ?? 0)
    const safeNewSalary = Number(newSalary)
    const computedPercentage = incrementPercentage !== null && incrementPercentage !== undefined
      ? Number(incrementPercentage)
      : calculateIncrementPercentage(safePrevSalary, safeNewSalary)

    const safePercentage = Number.isFinite(computedPercentage) ? computedPercentage : 0

    const { error: insertError } = await supabase
      .from('salary_history')
      .insert({
        employee_id: employeeId,
        previous_salary: safePrevSalary,
        new_salary: safeNewSalary,
        increment_percentage: safePercentage,
        effective_date: effectiveDate || new Date().toISOString().split('T')[0]
      })

    if (insertError) throw insertError

    // 3. Prepare update payload: for interns, keep stipend in sync as well
    const updatePayload: Record<string, any> = {
      salary: newPackage,
      basic_salary: safeNewSalary,
    }
    if (isIntern) {
      updatePayload.stipend = safeNewSalary
    }

    const { error: updateError } = await supabase
      .from('employee_onboarding')
      .update(updatePayload)
      .eq('id', employeeId)

    if (updateError) throw updateError

    revalidatePath('/employees')
    revalidatePath(`/employees/${employeeId}`)
    revalidatePath('/hr/onboarding')
    revalidatePath('/payroll')
    return {
      success: true,
      newSalary: safeNewSalary,
      incrementPercentage: safePercentage
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getSalaryHistoryAction(employeeId: string) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'HR' && user.role !== 'Admin')) {
      return { success: false, error: 'Unauthorized: Financial data access is restricted to HR and Admin.' }
    }

    const supabase = await createClient()
    const historyRes = await supabase
      .from('salary_history')
      .select('*')
      .eq('employee_id', employeeId)
      .order('effective_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (historyRes.error) throw historyRes.error

    const empQuery = supabase
      .from('employee_onboarding')
      .select('*')
      .eq('id', employeeId)
    const empRes = typeof empQuery.maybeSingle === 'function'
      ? await empQuery.maybeSingle()
      : await empQuery.single()

    const history = historyRes.data || []
    const emp = empRes?.data || null
    const currentSalary = resolveCurrentSalary(emp, history)

    return {
      success: true,
      data: history,
      currentSalary,
      employee: emp
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getMonthlyPayrollAction(year: number, month: number, employeeIds?: string[]) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'HR' && user.role !== 'Admin')) {
      return { success: false, error: 'Unauthorized: Financial data access is restricted to HR and Admin.' }
    }

    const results = await calculateMonthlyPayroll(year, month, employeeIds)
    return { success: true, data: results }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function addPayrollDeductionAction(input: {
  employee_id: string
  payroll_year: number
  payroll_month: number
  deduction_type: string
  amount: number
  reason: string
  notes?: string
}): Promise<PayrollDeductionActionResponse<PayrollDeduction>> {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'HR' && user.role !== 'Admin')) {
      return { success: false, error: 'Unauthorized: Deductions can only be managed by HR or Admin.' }
    }

    const { createPayrollDeduction } = await import('@/lib/services/payroll-deductions.service')
    const result = await createPayrollDeduction(input, user.id)

    if (result.success) {
      safeRevalidatePath('/payroll')
      safeRevalidatePath('/hr/payroll')
      safeRevalidatePath('/admin-payroll')
    }

    return result
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function cancelPayrollDeductionAction(deductionId: string): Promise<PayrollDeductionActionResponse<PayrollDeduction>> {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'HR' && user.role !== 'Admin')) {
      return { success: false, error: 'Unauthorized: Deductions can only be managed by HR or Admin.' }
    }

    const { cancelPayrollDeduction } = await import('@/lib/services/payroll-deductions.service')
    const result = await cancelPayrollDeduction(deductionId)

    if (result.success) {
      safeRevalidatePath('/payroll')
      safeRevalidatePath('/hr/payroll')
      safeRevalidatePath('/admin-payroll')
    }

    return result
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getPayrollDeductionsAction(year: number, month: number, employeeId?: string): Promise<PayrollDeductionActionResponse<PayrollDeduction[]>> {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'HR' && user.role !== 'Admin')) {
      return { success: false, error: 'Unauthorized: Financial data access is restricted to HR and Admin.' }
    }

    const { getDeductionsForMonth, getDeductionsForEmployee } = await import('@/lib/services/payroll-deductions.service')
    if (employeeId) {
      const data = await getDeductionsForEmployee(employeeId, year, month)
      return { success: true, data }
    }

    const data = await getDeductionsForMonth(year, month)
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Secure Server Action for logged-in employees to view strictly their OWN monthly payroll.
 * The employee identity is verified directly from the authenticated session cookies.
 * Does NOT accept arbitrary employee ID from client, preventing any privilege escalation or horizontal data leakage.
 */
export async function getMyMonthlyPayrollAction(year: number, month: number) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Authentication required' }
    }

    const supabase = await createClient()

    // Resolve caller's own employee_onboarding record
    let empRecord: any = null

    if (user.employee_id) {
      const { data } = await supabase
        .from('employee_onboarding')
        .select('id, employee_id_number, first_name, last_name, department, designation, salary, basic_salary, joining_date, employment_status')
        .eq('employee_id_number', user.employee_id)
        .maybeSingle()
      empRecord = data
    }

    if (!empRecord) {
      const { data } = await supabase
        .from('employee_onboarding')
        .select('id, employee_id_number, first_name, last_name, department, designation, salary, basic_salary, joining_date, employment_status')
        .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
        .maybeSingle()
      empRecord = data
    }

    if (!empRecord) {
      return { success: false, error: 'No employee record linked to your account.' }
    }

    if (empRecord.employment_status === 'Inactive' || empRecord.employment_status === 'Terminated') {
      return { success: false, error: 'Account inactive or access disabled.' }
    }

    // Securely calculate payroll ONLY for this single employee
    const results = await calculateMonthlyPayroll(year, month, [empRecord.id])
    const payroll = results && results.length > 0 ? results[0] : null

    return {
      success: true,
      data: payroll,
      employee: {
        id: empRecord.id,
        employee_id_number: empRecord.employee_id_number,
        name: `${empRecord.first_name || ''} ${empRecord.last_name || ''}`.trim() || user.employee_name,
        department: empRecord.department || user.department,
        designation: empRecord.designation || user.designation,
        joining_date: empRecord.joining_date,
        annualPackage: empRecord.salary || 0,
        monthlyBasic: empRecord.basic_salary || calculateMonthlyBasicSalary(empRecord.salary || 0)
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch payroll.' }
  }
}

/**
 * Secure Server Action for logged-in employees to view strictly their OWN salary increment history.
 * Read-only access to own historical revisions.
 */
export async function getMySalaryHistoryAction() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Authentication required' }
    }

    const supabase = await createClient()

    let empRecord: any = null

    if (user.employee_id) {
      const { data } = await supabase
        .from('employee_onboarding')
        .select('id, employee_id_number, salary, basic_salary, joining_date')
        .eq('employee_id_number', user.employee_id)
        .maybeSingle()
      empRecord = data
    }

    if (!empRecord) {
      const { data } = await supabase
        .from('employee_onboarding')
        .select('id, employee_id_number, salary, basic_salary, joining_date')
        .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
        .maybeSingle()
      empRecord = data
    }

    if (!empRecord) {
      return { success: false, error: 'No employee record linked to your account.' }
    }

    const { data: history, error } = await supabase
      .from('salary_history')
      .select('id, previous_salary, new_salary, increment_percentage, effective_date, created_at')
      .eq('employee_id', empRecord.id)
      .order('effective_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      success: true,
      data: history || [],
      currentPackage: empRecord.salary || 0,
      joiningDate: empRecord.joining_date || null
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch salary history.' }
  }
}

