import { createAdminClient } from "@/lib/supabase/server";
import { calculateCompOffMinutes, isSunday } from "@/lib/utils/time";

const onboardingIdCache = new Map<string, string>();

async function resolveOnboardingId(id: string, supabase: any) {
  if (onboardingIdCache.has(id)) {
    return onboardingIdCache.get(id)!;
  }

  const { data: isAlready } = await supabase.from('employee_onboarding').select('id').eq('id', id).maybeSingle();
  if (isAlready) {
    onboardingIdCache.set(id, id);
    return id;
  }

  const { data: profile } = await supabase.from('profiles').select('employee_id').eq('id', id).maybeSingle();
  if (!profile) return null;

  if (profile.employee_id) {
    const { data } = await supabase.from('employee_onboarding').select('id').eq('employee_id_number', profile.employee_id).maybeSingle();
    if (data) {
      onboardingIdCache.set(id, data.id);
      return data.id;
    }
  }
  return null;
}

export async function getCompOffBalance(employeeId: string): Promise<number> {
  const supabase = await createAdminClient();

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

export async function processEODCompOff(
  eodId: string,
  employeeId: string,
  workedHours: number,
  status: string,
  options?: {
    reportDate?: string;
    supabaseClient?: any;
    onboardingId?: string;
    context?: 'normal' | 'sunday' | 'paid_holiday' | 'approved_leave';
  }
) {
  // Only process approved EODs
  if (status !== 'Approved') return;

  const supabase = options?.supabaseClient || await createAdminClient();

  const resolvedId = options?.onboardingId || await resolveOnboardingId(employeeId, supabase);
  if (!resolvedId) return;

  // Idempotency: check if credit already exists for this EOD
  const { data: existing } = await supabase
    .from('comp_off_ledger')
    .select('id')
    .eq('reference_id', eodId)
    .eq('transaction_type', 'CREDIT')
    .limit(1)
    .maybeSingle();

  if (existing) return; // Already credited, do not duplicate

  // 1. Fetch EOD details to know the date if not passed directly
  let reportDate: string = options?.reportDate || '';
  if (!reportDate) {
    const { data: eod } = await supabase.from('eod_reports').select('report_date').eq('id', eodId).single();
    if (!eod || !eod.report_date) return;
    reportDate = eod.report_date;
  }

  // 2. Determine context (Sunday, Holiday, Approved Leave)
  let context: 'normal' | 'sunday' | 'paid_holiday' | 'approved_leave' = options?.context || 'normal';

  if (!options?.context) {
    if (isSunday(reportDate)) {
      context = 'sunday';
    } else {
      // Check holiday and leave concurrently in parallel with specific column projections
      const [holidayRes, leaveRes] = await Promise.all([
        supabase.from('holidays').select('holiday_type').eq('date', reportDate).maybeSingle(),
        supabase.from('leave_requests')
          .select('id, is_half_day')
          .eq('employee_id', employeeId)
          .lte('start_date', reportDate)
          .gte('end_date', reportDate)
          .in('status', ['Approved', 'Approved HR'])
          .maybeSingle()
      ]);

      if (holidayRes.data && holidayRes.data.holiday_type === 'PAID') {
        context = 'paid_holiday';
      } else if (leaveRes.data && !leaveRes.data.is_half_day) {
        context = 'approved_leave';
      }
    }
  }

  // 3. Use centralized classification to determine comp off minutes
  const workedMinutes = Math.round(Number(workedHours) * 60);
  const compOffMinutes = calculateCompOffMinutes(workedMinutes, context, 'Approved');

  // CRITICAL: Never create negative comp off. Only credit positive amounts.
  if (compOffMinutes <= 0) return;

  // Convert to hours for backward-compatible storage in existing ledger
  const creditHours = Math.round((compOffMinutes / 60) * 100) / 100;

  const { error: insertError } = await supabase.from('comp_off_ledger').insert({
    employee_id: resolvedId,
    transaction_type: 'CREDIT',
    hours: creditHours,
    reference_id: eodId
  });

  // Handle unique constraint violation gracefully on concurrent review/retry
  if (insertError && (insertError.code === '23505' || insertError.message?.includes('unique'))) {
    return;
  }
}

export async function batchResolveOnboardingIds(ids: string[], supabase: any): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const toFetch: string[] = [];

  for (const id of ids) {
    if (onboardingIdCache.has(id)) {
      result.set(id, onboardingIdCache.get(id)!);
    } else {
      toFetch.push(id);
    }
  }

  if (toFetch.length === 0) return result;

  // 1. Check if these IDs are directly employee_onboarding IDs
  const { data: directEmps } = await supabase
    .from('employee_onboarding')
    .select('id')
    .in('id', toFetch);
  directEmps?.forEach((d: any) => {
    onboardingIdCache.set(d.id, d.id);
    result.set(d.id, d.id);
  });

  const remaining = toFetch.filter(id => !result.has(id));
  if (remaining.length === 0) return result;

  // 2. Fetch profiles for remaining
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, employee_id')
    .in('id', remaining);

  if (profiles && profiles.length > 0) {
    const empNumbers = profiles.map((p: any) => p.employee_id).filter(Boolean);
    if (empNumbers.length > 0) {
      const { data: obList } = await supabase
        .from('employee_onboarding')
        .select('id, employee_id_number')
        .in('employee_id_number', empNumbers);

      const obMap = new Map((obList || []).map((o: any) => [o.employee_id_number, o.id]));

      profiles.forEach((p: { id: string; employee_id: string | null }) => {
        if (p.employee_id && obMap.has(p.employee_id)) {
          const obId = String(obMap.get(p.employee_id)!);
          onboardingIdCache.set(String(p.id), obId);
          result.set(String(p.id), obId);
        }
      });
    }
  }

  return result;
}

export interface BatchEODCompOffItem {
  id: string;
  employee_id: string;
  office_hours: number;
  report_date: string;
  status: string;
}

/**
 * Batch process EOD Comp-Off credits in single database queries
 * Eliminates repetitive individual round-trips and guarantees atomic idempotency
 */
export async function batchProcessEODCompOff(
  eodItems: BatchEODCompOffItem[],
  options?: {
    holidays?: any[];
    leaves?: any[];
    supabaseClient?: any;
  }
): Promise<{ processed: number; credited: number }> {
  const approvedItems = eodItems.filter(e => e.status === 'Approved' && Number(e.office_hours) > 0);
  if (approvedItems.length === 0) return { processed: 0, credited: 0 };

  const supabase = options?.supabaseClient || await createAdminClient();

  // 1. Batch check existing credits to ensure idempotency in ONE query
  const allEodIds = approvedItems.map(e => e.id);
  const { data: existingCredits } = await supabase
    .from('comp_off_ledger')
    .select('reference_id')
    .in('reference_id', allEodIds)
    .eq('transaction_type', 'CREDIT');

  const creditedSet = new Set((existingCredits || []).map((c: any) => c.reference_id));
  const uncreditedItems = approvedItems.filter(e => !creditedSet.has(e.id));
  if (uncreditedItems.length === 0) return { processed: approvedItems.length, credited: 0 };

  // 2. Batch resolve onboarding IDs in ONE round-trip
  const uniqueEmployeeIds = Array.from(new Set(uncreditedItems.map(e => e.employee_id)));
  const idMap = await batchResolveOnboardingIds(uniqueEmployeeIds, supabase);

  // 3. Prepare dates, holidays, and leaves
  const allDates = uncreditedItems.map(e => e.report_date).sort();
  const minDate = allDates[0];
  const maxDate = allDates[allDates.length - 1];

  let holidays = options?.holidays;
  if (!holidays) {
    const { data: hols } = await supabase
      .from('holidays')
      .select('*')
      .gte('date', minDate)
      .lte('date', maxDate);
    holidays = hols || [];
  }
  const paidHolidayDates = new Set(
    (holidays || []).filter((h: any) => h.holiday_type === 'PAID').map((h: any) => h.date)
  );

  let leaves = options?.leaves;
  if (!leaves) {
    const { data: lvs } = await supabase
      .from('leave_requests')
      .select('*')
      .in('employee_id', uniqueEmployeeIds)
      .lte('start_date', maxDate)
      .gte('end_date', minDate)
      .in('status', ['Approved', 'Approved HR']);
    leaves = lvs || [];
  }

  // 4. Compute comp-off credits in-memory
  const ledgerRowsToInsert: any[] = [];

  for (const eod of uncreditedItems) {
    const resolvedId = idMap.get(eod.employee_id);
    if (!resolvedId) continue;

    let context: 'normal' | 'sunday' | 'paid_holiday' | 'approved_leave' = 'normal';
    if (isSunday(eod.report_date)) {
      context = 'sunday';
    } else if (paidHolidayDates.has(eod.report_date)) {
      context = 'paid_holiday';
    } else {
      const hasLeave = (leaves || []).some(
        (l: any) =>
          l.employee_id === eod.employee_id &&
          l.start_date <= eod.report_date &&
          l.end_date >= eod.report_date &&
          !l.is_half_day
      );
      if (hasLeave) context = 'approved_leave';
    }

    const workedMinutes = Math.round(Number(eod.office_hours) * 60);
    const compOffMinutes = calculateCompOffMinutes(workedMinutes, context, 'Approved');

    if (compOffMinutes > 0) {
      const creditHours = Math.round((compOffMinutes / 60) * 100) / 100;
      ledgerRowsToInsert.push({
        employee_id: resolvedId,
        transaction_type: 'CREDIT',
        hours: creditHours,
        reference_id: eod.id
      });
    }
  }

  // 5. Atomic multi-row insert into comp_off_ledger
  if (ledgerRowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('comp_off_ledger')
      .insert(ledgerRowsToInsert);

    if (insertError) {
      // If error is unique constraint, handle individually with fallback to ensure committed entries
      if (insertError.code === '23505' || insertError.message?.includes('unique')) {
        for (const row of ledgerRowsToInsert) {
          try {
            await supabase.from('comp_off_ledger').insert(row);
          } catch {
            // Already present, idempotent
          }
        }
      } else {
        console.error("Batch comp-off ledger insert error:", insertError);
      }
    }
  }

  return {
    processed: approvedItems.length,
    credited: ledgerRowsToInsert.length
  };
}

export async function processLeaveCompOff(leaveId: string, employeeId: string, durationDays: number, status: string) {
  const supabase = await createAdminClient();

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



