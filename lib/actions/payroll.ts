'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { calculateMonthlyPayroll } from '@/lib/services/payroll.service'
import { getCurrentUser } from '@/lib/auth'
import { calculateMonthlyBasicSalary } from '@/lib/utils/salary'

export async function addSalaryIncrementAction(employeeId: string, previousSalary: number, newSalary: number, incrementPercentage: number, effectiveDate: string, newPackage: number) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'HR' && user.role !== 'Admin')) {
      return { success: false, error: 'Unauthorized: Financial data access is restricted to HR and Admin.' }
    }

    const supabase = await createClient()
    
    const { error: insertError } = await supabase
      .from('salary_history')
      .insert({
        employee_id: employeeId,
        previous_salary: previousSalary,
        new_salary: newSalary,
        increment_percentage: incrementPercentage,
        effective_date: effectiveDate || new Date().toISOString().split('T')[0]
      })

    if (insertError) throw insertError

    const { error: updateError } = await supabase
      .from('employee_onboarding')
      .update({ 
        salary: newPackage,
        basic_salary: calculateMonthlyBasicSalary(newPackage)
      })
      .eq('id', employeeId)

    if (updateError) throw updateError

    revalidatePath('/employees')
    revalidatePath('/hr/onboarding')
    revalidatePath('/payroll')
    return { success: true }
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
    const { data, error } = await supabase
      .from('salary_history')
      .select('*')
      .eq('employee_id', employeeId)
      .order('effective_date', { ascending: false })
      .order('created_at', { ascending: false })
      
    if (error) throw error
    return { success: true, data }
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


