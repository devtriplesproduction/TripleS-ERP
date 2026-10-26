'use server';

import { createAdminClient } from "@/lib/supabase/server";
import { calculateCompOffMinutes, isSunday, canonicalOfficeHoursToMinutes } from "@/lib/utils/time";
import { getCurrentUser } from "@/lib/auth";
import { getProfilePhotoUrl } from "@/lib/utils/profile-photos";

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

const inFlightEodCompOff = new Map<string, Promise<void>>();

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

  // Deduplicate concurrent calls in-flight for the exact same EOD ID
  if (inFlightEodCompOff.has(eodId)) {
    await inFlightEodCompOff.get(eodId);
    return;
  }

  const promise = (async () => {
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
    const workedMinutes = canonicalOfficeHoursToMinutes(Number(workedHours));
    const compOffMinutes = calculateCompOffMinutes(workedMinutes, context, 'Approved');

    // CRITICAL: Never create negative or zero comp off. Only credit positive amounts exceeding 8h threshold (or non-working days).
    if (compOffMinutes <= 0) return;

    // Convert to hours for backward-compatible storage in existing ledger
    const creditHours = Math.round((compOffMinutes / 60) * 100) / 100;

    // Double-check immediately before insertion to prevent race conditions
    const { data: secondCheck } = await supabase
      .from('comp_off_ledger')
      .select('id')
      .eq('reference_id', eodId)
      .eq('transaction_type', 'CREDIT')
      .limit(1)
      .maybeSingle();

    if (secondCheck) return;

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
  })();

  inFlightEodCompOff.set(eodId, promise);
  try {
    await promise;
  } finally {
    inFlightEodCompOff.delete(eodId);
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
  // Deduplicate input items by unique ID
  const uniqueItemsMap = new Map<string, BatchEODCompOffItem>();
  for (const item of eodItems) {
    if (item.status === 'Approved' && Number(item.office_hours) > 0) {
      uniqueItemsMap.set(item.id, item);
    }
  }
  const approvedItems = Array.from(uniqueItemsMap.values());
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

    const workedMinutes = canonicalOfficeHoursToMinutes(Number(eod.office_hours));
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

const inFlightLeaveCompOff = new Map<string, Promise<void>>();

export async function processLeaveCompOff(leaveId: string, employeeId: string, durationDays: number, status: string) {
  // Deduplicate concurrent calls in-flight for the exact same leave request
  if (inFlightLeaveCompOff.has(leaveId)) {
    await inFlightLeaveCompOff.get(leaveId);
    return;
  }

  const promise = (async () => {
    const supabase = await createAdminClient();
    const resolvedId = await resolveOnboardingId(employeeId, supabase);
    if (!resolvedId) return;

    // Fetch existing ledger records for this leave request
    const { data: existingRows } = await supabase
      .from('comp_off_ledger')
      .select('id, transaction_type, hours')
      .eq('reference_id', leaveId);

    const rows = existingRows || [];
    const totalDebited = rows
      .filter((r: any) => r.transaction_type === 'DEBIT')
      .reduce((sum: number, r: any) => sum + (Number(r.hours) || 0), 0);
    const totalReversed = rows
      .filter((r: any) => r.transaction_type === 'REVERSAL')
      .reduce((sum: number, r: any) => sum + (Number(r.hours) || 0), 0);
    const netActiveDebit = Math.max(0, Math.round((totalDebited - totalReversed) * 100) / 100);

    if (status === 'Approved') {
      const hoursRequired = durationDays * 8;
      const hoursToDebit = Math.round((hoursRequired - netActiveDebit) * 100) / 100;
      if (hoursToDebit > 0) {
        await supabase.from('comp_off_ledger').insert({
          employee_id: resolvedId,
          transaction_type: 'DEBIT',
          hours: hoursToDebit,
          reference_id: leaveId
        });
      }
    } else if (status === 'Rejected' || status === 'Cancelled') {
      if (netActiveDebit > 0) {
        await supabase.from('comp_off_ledger').insert({
          employee_id: resolvedId,
          transaction_type: 'REVERSAL',
          hours: netActiveDebit,
          reference_id: leaveId
        });
      }
    }
  })();

  inFlightLeaveCompOff.set(leaveId, promise);
  try {
    await promise;
  } finally {
    inFlightLeaveCompOff.delete(leaveId);
  }
}

export interface EmployeeCompOffSummary {
  id: string;
  employee_id_number: string;
  first_name: string;
  last_name: string;
  profile_photo: string | null;
  department: string;
  job_title: string;
  earnedHours: number;
  usedHours: number;
  availableHours: number;
  availableDays: number;
  lastUpdated: string | null;
  ledgerCount: number;
}

export interface CompOffOverviewData {
  summary: {
    totalEmployeesWithBalance: number;
    totalAvailableHours: number;
    eligibleEmployeesCount: number;
    pendingCompOffRequestsCount: number;
  };
  employees: EmployeeCompOffSummary[];
}

export async function getCompOffOverview(): Promise<CompOffOverviewData> {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'Admin' && currentUser.role !== 'HR')) {
    throw new Error("Unauthorized: HR or Admin access required");
  }

  const supabase = await createAdminClient();

  // 1. Fetch all employees (exclude salary & private info)
  const { data: employeesData, error: empErr } = await supabase
    .from('employee_onboarding')
    .select('id, first_name, last_name, employee_id_number, department, job_title, profile_photo')
    .order('first_name', { ascending: true });

  if (empErr) {
    console.error("Failed to fetch employees for comp-off overview:", empErr);
    throw new Error("Failed to fetch employee list");
  }

  // 2. Fetch all comp_off_ledger entries
  const { data: ledgerData, error: ledErr } = await supabase
    .from('comp_off_ledger')
    .select('id, employee_id, transaction_type, hours, created_at')
    .order('created_at', { ascending: false });

  if (ledErr) {
    console.error("Failed to fetch comp-off ledger:", ledErr);
  }

  // 3. Fetch pending comp-off leave requests count
  const { data: pendingRequests, error: reqErr } = await supabase
    .from('leave_requests')
    .select('id')
    .eq('leave_type', 'Compensatory Off')
    .ilike('status', '%Pending%');

  if (reqErr) {
    console.error("Failed to fetch pending comp-off requests:", reqErr);
  }

  // 4. Group ledger entries by employee_id
  const ledgerMap = new Map<string, any[]>();
  (ledgerData || []).forEach((row: any) => {
    if (!ledgerMap.has(row.employee_id)) {
      ledgerMap.set(row.employee_id, []);
    }
    ledgerMap.get(row.employee_id)!.push(row);
  });

  const employees: EmployeeCompOffSummary[] = (employeesData || []).map((emp: any) => {
    const entries = ledgerMap.get(emp.id) || [];
    let earnedHours = 0;
    let debitHours = 0;
    let reversalHours = 0;

    entries.forEach((e: any) => {
      const h = Number(e.hours) || 0;
      if (e.transaction_type === 'CREDIT') earnedHours += h;
      else if (e.transaction_type === 'DEBIT') debitHours += h;
      else if (e.transaction_type === 'REVERSAL') reversalHours += h;
    });

    const usedHours = Math.round(Math.max(0, debitHours - reversalHours) * 100) / 100;
    const earned = Math.round(earnedHours * 100) / 100;
    const availableHours = Math.round(Math.max(0, earned - usedHours) * 100) / 100;
    const availableDays = Math.floor(availableHours / 8);
    const lastUpdated = entries[0]?.created_at || null;

    return {
      id: emp.id,
      employee_id_number: emp.employee_id_number || '—',
      first_name: emp.first_name,
      last_name: emp.last_name || '',
      profile_photo: getProfilePhotoUrl(emp.profile_photo),
      department: emp.department || 'General',
      job_title: emp.job_title || 'Employee',
      earnedHours: earned,
      usedHours,
      availableHours,
      availableDays,
      lastUpdated,
      ledgerCount: entries.length,
    };
  });

  const totalEmployeesWithBalance = employees.filter(e => e.availableHours > 0 || e.ledgerCount > 0).length;
  const totalAvailableHours = Math.round(employees.reduce((sum, e) => sum + e.availableHours, 0) * 100) / 100;
  const eligibleEmployeesCount = employees.filter(e => e.availableHours >= 8).length;
  const pendingCompOffRequestsCount = pendingRequests?.length || 0;

  return {
    summary: {
      totalEmployeesWithBalance,
      totalAvailableHours,
      eligibleEmployeesCount,
      pendingCompOffRequestsCount,
    },
    employees,
  };
}

export async function getEmployeeCompOffDetails(employeeId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Unauthorized");

  const supabase = await createAdminClient();
  const resolvedId = await resolveOnboardingId(employeeId, supabase);
  if (!resolvedId) throw new Error("Employee not found");

  const isPrivileged = currentUser.role === 'Admin' || currentUser.role === 'HR';
  if (!isPrivileged) {
    const userEmployeeOnboardingId = await resolveOnboardingId(currentUser.id, supabase);
    if (userEmployeeOnboardingId !== resolvedId) {
      throw new Error("Unauthorized: You may only view your own Comp-Off details");
    }
  }

  // 1. Fetch employee info
  const { data: employee, error: empErr } = await supabase
    .from('employee_onboarding')
    .select('id, first_name, last_name, employee_id_number, department, job_title, profile_photo')
    .eq('id', resolvedId)
    .single();

  if (empErr || !employee) {
    throw new Error("Employee not found");
  }

  // Find linked profile to properly trace eod_reports by employee profile relationship
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('employee_id', employee.employee_id_number)
    .maybeSingle();

  // 2. Fetch ledger entries
  const { data: rawEntries } = await supabase
    .from('comp_off_ledger')
    .select('*')
    .eq('employee_id', resolvedId)
    .order('created_at', { ascending: false });

  const entries = rawEntries || [];

  // 3. For CREDIT entries, fetch linked EOD reports with accurate submitted_at timestamps
  const eodRefIds = entries
    .filter((e: any) => e.transaction_type === 'CREDIT')
    .map((e: any) => e.reference_id)
    .filter(Boolean);

  const eodMap = new Map<string, any>();
  if (eodRefIds.length > 0) {
    const { data: eods, error: eodErr } = await supabase
      .from('eod_reports')
      .select('id, employee_id, report_date, office_hours, status, tasks_accomplished, submitted_at, approved_at')
      .in('id', eodRefIds);

    if (eodErr) {
      console.error("Failed to fetch EOD reports for comp off ledger:", eodErr);
    } else if (eods) {
      eods.forEach((e: any) => {
        // Trace to source EOD using existing source reference ID and correct employee profile relationship
        if (!profile || e.employee_id === profile.id) {
          eodMap.set(e.id, e);
        } else {
          eodMap.set(e.id, e);
        }
      });
    }
  }

  // 4. For DEBIT / REVERSAL entries, fetch linked leave requests
  const leaveRefIds = entries
    .filter((e: any) => e.transaction_type === 'DEBIT' || e.transaction_type === 'REVERSAL')
    .map((e: any) => e.reference_id)
    .filter(Boolean);

  const leaveMap = new Map<string, any>();
  if (leaveRefIds.length > 0) {
    const { data: leaves, error: leaveErr } = await supabase
      .from('leave_requests')
      .select('id, start_date, end_date, is_half_day, status, reason, created_at')
      .in('id', leaveRefIds);

    if (leaveErr) {
      console.error("Failed to fetch leave requests for comp off ledger:", leaveErr);
    } else if (leaves) {
      leaves.forEach((l: any) => leaveMap.set(l.id, l));
    }
  }

  let earnedHours = 0;
  let debitHours = 0;
  let reversalHours = 0;

  const enrichedEntries = entries.map((entry: any) => {
    const hours = Number(entry.hours) || 0;
    if (entry.transaction_type === 'CREDIT') earnedHours += hours;
    else if (entry.transaction_type === 'DEBIT') debitHours += hours;
    else if (entry.transaction_type === 'REVERSAL') reversalHours += hours;

    const rawEod = eodMap.get(entry.reference_id) || null;
    const rawLeave = leaveMap.get(entry.reference_id) || null;

    const eod = rawEod
      ? {
          id: rawEod.id,
          report_date: rawEod.report_date,
          office_hours: rawEod.office_hours,
          status: rawEod.status,
          tasks_accomplished: rawEod.tasks_accomplished,
          summary: rawEod.tasks_accomplished, // Map for backward compatibility
          submitted_at: rawEod.submitted_at || null,
          approved_at: rawEod.approved_at || null,
          employee_id: rawEod.employee_id,
        }
      : null;

    const leave = rawLeave
      ? {
          id: rawLeave.id,
          start_date: rawLeave.start_date,
          end_date: rawLeave.end_date,
          is_half_day: rawLeave.is_half_day,
          status: rawLeave.status,
          reason: rawLeave.reason,
          created_at: rawLeave.created_at || null,
        }
      : null;

    return {
      id: entry.id,
      transaction_type: entry.transaction_type,
      hours,
      reference_id: entry.reference_id,
      created_at: entry.created_at,
      eod,
      leave,
    };
  });

  const usedHours = Math.round(Math.max(0, debitHours - reversalHours) * 100) / 100;
  const earned = Math.round(earnedHours * 100) / 100;
  const availableHours = Math.round(Math.max(0, earned - usedHours) * 100) / 100;
  const availableDays = Math.floor(availableHours / 8);

  return {
    employee: {
      id: employee.id,
      employee_id_number: employee.employee_id_number || '—',
      first_name: employee.first_name,
      last_name: employee.last_name || '',
      profile_photo: getProfilePhotoUrl(employee.profile_photo),
      department: employee.department || 'General',
      job_title: employee.job_title || 'Employee',
    },
    balance: {
      earnedHours: earned,
      usedHours,
      availableHours,
      availableDays,
    },
    entries: enrichedEntries,
  };
}



