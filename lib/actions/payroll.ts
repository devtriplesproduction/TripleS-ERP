'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { calculateMonthlyPayroll } from '@/lib/services/payroll.service'
import { getCurrentUser } from '@/lib/auth'

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
      .update({ salary: newPackage })
      .eq('id', employeeId)

    if (updateError) throw updateError

    revalidatePath('/hr/onboarding')
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

