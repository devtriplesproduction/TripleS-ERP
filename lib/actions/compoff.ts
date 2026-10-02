import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from "@/lib/supabase/server";
import { calculateExtraMinutes, isSunday } from "@/lib/utils/time";

async function resolveOnboardingId(id: string, supabase: any) {
  const { data: isAlready } = await supabase.from('employee_onboarding').select('id').eq('id', id).maybeSingle();
  if (isAlready) return id;

  const { data: profile } = await supabase.from('profiles').select('employee_id').eq('id', id).maybeSingle();
  if (!profile) return null;

  if (profile.employee_id) {
    const { data } = await supabase.from('employee_onboarding').select('id').eq('employee_id_number', profile.employee_id).maybeSingle();
    if (data) return data.id;
  }
  return null;
}

export async function getCompOffBalance(employeeId: string): Promise<number> {
  const supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const resolvedId = await resolveOnboardingId(employeeId, supabase);
  if (!resolvedId) return 0;

  const { data, error } = await supabase
    .from('comp_off_ledger')
    .select('hours, transaction_type')
    .eq('employee_id', resolvedId);

  if (error || !data) {
    return 0;
  }

  const total = data.reduce((sum, row) => {
    if (row.transaction_type === 'CREDIT' || row.transaction_type === 'REVERSAL') {
      return sum + Number(row.hours);
    } else if (row.transaction_type === 'DEBIT') {
      return sum - Number(row.hours);
    }
    return sum;
  }, 0);
  return Math.round(Math.max(0, total) * 100) / 100;
}

export async function processEODCompOff(eodId: string, employeeId: string, workedHours: number, status: string) {
  const supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  if (status !== 'Approved') return;
  
  const resolvedId = await resolveOnboardingId(employeeId, supabase);
  if (!resolvedId) return;

  const { data: existing } = await supabase
    .from('comp_off_ledger')
    .select('id')
    .eq('reference_id', eodId)
    .limit(1)
    .maybeSingle();
    
  if (existing) return;
  
  // 1. Fetch EOD details to know the date
  const { data: eod } = await supabase.from('eod_reports').select('report_date').eq('id', eodId).single();
  if (!eod) return;

  // 2. Check context (Sunday, Holiday, Leave)
  let context: 'normal' | 'sunday' | 'paid_holiday' | 'approved_leave' = 'normal';
  
  if (isSunday(eod.report_date)) {
    context = 'sunday';
  } else {
    // Check holiday
    const { data: holiday } = await supabase.from('holidays').select('*').eq('date', eod.report_date).maybeSingle();
    if (holiday && holiday.holiday_type === 'PAID') { // Using explicit holiday_type
      context = 'paid_holiday';
    } else {
      // Check leave
      const { data: leave } = await supabase.from('leave_requests')
        .select('*')
        .eq('employee_id', employeeId)
        .lte('start_date', eod.report_date)
        .gte('end_date', eod.report_date)
        .in('status', ['Approved', 'Approved HR'])
        .maybeSingle();
        
      if (leave && !leave.is_half_day) {
        context = 'approved_leave';
      }
    }
  }
  
  const workedMinutes = Math.round(Number(workedHours) * 60);
  const extraMinutes = calculateExtraMinutes(workedMinutes, context);
  const diff = Math.round((extraMinutes / 60) * 100) / 100;
  
  if (diff === 0) return;
  
  const currentBalance = await getCompOffBalance(resolvedId);
  const newBalance = Math.max(0, currentBalance + diff);
  const actualDiff = Math.round((newBalance - currentBalance) * 100) / 100;
  
  if (actualDiff === 0) return;
  
  const transactionType = actualDiff > 0 ? 'CREDIT' : 'DEBIT';
  
  await supabase.from('comp_off_ledger').insert({
    employee_id: resolvedId,
    transaction_type: transactionType,
    hours: Math.abs(actualDiff),
    reference_id: eodId
  });
}

export async function processLeaveCompOff(leaveId: string, employeeId: string, durationDays: number, status: string) {
  const supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  if (status === 'Approved') {
    const resolvedId = await resolveOnboardingId(employeeId, supabase);
    if (!resolvedId) return;

    const { data: existing } = await supabase
      .from('comp_off_ledger')
      .select('id')
      .eq('reference_id', leaveId)
      .eq('transaction_type', 'DEBIT')
      .maybeSingle();
      
    if (!existing) {
      const hoursRequired = durationDays * 8;
      await supabase.from('comp_off_ledger').insert({
        employee_id: resolvedId,
        transaction_type: 'DEBIT',
        hours: hoursRequired,
        reference_id: leaveId
      });
    }
  }
}


