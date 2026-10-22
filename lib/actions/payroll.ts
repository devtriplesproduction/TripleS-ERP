'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { calculateMonthlyPayroll } from '@/lib/services/payroll.service'
import { getCurrentUser } from '@/lib/auth'
import { calculateMonthlyBasicSalary, calculateIncrementPercentage, resolveCurrentSalary } from '@/lib/utils/salary'

export async function addSalaryIncrementAction(
  employeeId: string,
  previousSalary: number | null | undefined,
  newSalary: number,
  incrementPercentage?: number | null | undefined,
  effectiveDate?: string,
  newPackage?: number
) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'HR' && user.role !== 'Admin')) {
      return { success: false, error: 'Unauthorized: Financial data access is restricted to HR and Admin.' }
    }

    const numNewSalary = Number(newSalary)
    if (isNaN(numNewSalary) || numNewSalary <= 0) {
      return { success: false, error: 'New salary must be a positive number.' }
    }

    const numPrevSalary = (previousSalary != null && !isNaN(Number(previousSalary)) && Number(previousSalary) > 0)
      ? Number(previousSalary)
      : 0

    // Compute or validate increment percentage: (new total salary - previous salary) / previous salary * 100
    // Handles zero or missing previous salary safely without dividing by zero or returning null.
    const computedPercentage = calculateIncrementPercentage(numPrevSalary, numNewSalary)
    const finalIncrementPercentage = (incrementPercentage != null && !isNaN(Number(incrementPercentage)) && isFinite(Number(incrementPercentage)))
      ? Math.round(Number(incrementPercentage) * 100) / 100
      : computedPercentage

    const safeEffectiveDate = effectiveDate && effectiveDate.trim() !== ''
      ? effectiveDate
      : new Date().toISOString().split('T')[0]

    const supabase = await createClient()
    
    const { error: insertError } = await supabase
      .from('salary_history')
      .insert({
        employee_id: employeeId,
        previous_salary: numPrevSalary,
        new_salary: numNewSalary,
        increment_percentage: finalIncrementPercentage,
        effective_date: safeEffectiveDate
      })

    if (insertError) throw insertError

    // Check employee to see employment type and preserve payroll sync
    const { data: emp } = await supabase
      .from('employee_onboarding')
      .select('id, employment_type')
      .eq('id', employeeId)
      .single()

    const annualPackage = (newPackage != null && !isNaN(Number(newPackage)) && Number(newPackage) > 0)
      ? Number(newPackage)
      : numNewSalary * 12

    const updatePayload: Record<string, any> = {
      salary: annualPackage,
      basic_salary: calculateMonthlyBasicSalary(annualPackage)
    }

    if (emp?.employment_type?.toLowerCase() === 'intern') {
      updatePayload.stipend = numNewSalary
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
    return { success: true, newSalary: numNewSalary, incrementPercentage: finalIncrementPercentage }
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

    const [historyRes, empRes] = await Promise.all([
      supabase
        .from('salary_history')
        .select('*')
        .eq('employee_id', employeeId)
        .order('effective_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('employee_onboarding')
        .select('id, salary, basic_salary, stipend, employment_type')
        .eq('id', employeeId)
        .single()
    ])

    if (historyRes.error) throw historyRes.error

    const history = historyRes.data || []
    const empData = empRes.data || null
    const currentSalary = resolveCurrentSalary(empData, history)

    return { 
      success: true, 
      data: history, 
      currentSalary, 
      employee: empData 
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getEmployeeSalaryDetailsAction(employeeId: string) {
  return getSalaryHistoryAction(employeeId)
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

