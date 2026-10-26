// @ts-nocheck

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from '@supabase/supabase-js';



import { format } from "date-fns";
import { processEODCompOff, batchProcessEODCompOff } from "./compoff";
import { queueEodActivity } from "@/lib/services/audit-queue.service";
import { createConcurrencyLimiter, withRetry } from "@/lib/services/job-queue.service";



export type EODReport = any;

export function canManageEOD(roles: string[] = []) {
  return roles.includes('SUPER_ADMIN') || roles.includes('ADMIN') || roles.includes('HR');
}

export function isSuperAdminOrHR(roles: string[] = []) {
  return canManageEOD(roles);
}

async function resolveCurrentEODUser(client: any) {
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;

  const adminSupa = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: profile } = await adminSupa.from('profiles').select('role').eq('id', user.id).single();
  return {
    id: user.id,
    email: user.email || 'unknown',
    roles: profile?.role ? [profile.role.toUpperCase()] : ['EMPLOYEE']
  };
}

/**
 * Submit an EOD report
 * Handles self-submission (Pending) and proxy submission (Approved)
 */
export async function submitEOD(payload: Omit<EODReport, 'id' | 'status' | 'submitted_at' | 'reviewed_by' | 'reviewed_at' | 'review_remarks'> & { role_context?: 'Employee' | 'HR' }) {
  try {
    const _authSupabase = await createClient();
    const currentUser = await resolveCurrentEODUser(_authSupabase);
    if (!currentUser) return { success: false, error: "Unauthorized: Authentication required" };
    const supabase = _authSupabase;

    const canManage = canManageEOD(currentUser.roles);

    let status = 'Pending';
    if (payload.employee_id !== currentUser.id) {
      if (!canManage) {
        return { success: false, error: "Unauthorized to submit proxy EOD" };
      }
      status = 'Approved';
    } else {
      if (!canManage) {
        const getISTDateString = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        const todayLocal = getISTDateString();
        if (payload.report_date !== todayLocal) {
          return { success: false, error: "You can only submit EOD for today's date." };
        }
      }
    }


    const { data: insertedData, error: insertError } = await supabase.from('eod_reports').insert({
      employee_id: payload.employee_id,
      report_date: payload.report_date,
      tasks_accomplished: payload.tasks_accomplished,
      office_hours: payload.office_hours,
      location: payload.location,
      blockers: payload.blockers || '',
      photo_url: payload.photo_url || null,
      status: status,
      submitted_by: payload.employee_id,
      job_card_numbers: payload.job_card_numbers || '',
      tomorrows_plan: payload.tomorrows_plan || '',
      role_context: payload.role_context || 'Employee'
    }).select('id').single();

    if (insertError) {
      if (insertError.message.includes('unique constraint') || insertError.code === '23505') {
        return { success: false, error: "An EOD report already exists for this date." };
      }
      console.error("EOD submit insert error:", insertError);
      return { success: false, error: insertError.message || "Failed to submit EOD" };
    }
    const eodId = insertedData.id;

    // Log Activity
    await logEodActivity(
      status === 'Approved' ? 'PROXY_EOD_SUBMITTED' : 'EOD_SUBMITTED',
      currentUser.email || 'unknown',
      currentUser.id,
      payload.employee_id,
      { report_date: payload.report_date, location: payload.location } as Json
    );

    // Fix: If it was automatically approved (proxy submission), calculate Comp-Off
    if (status === 'Approved') {
      await processEODCompOff(eodId, payload.employee_id, payload.office_hours, 'Approved', {
        reportDate: payload.report_date,
        supabaseClient: supabase
      });
    }
    
    return { success: true, data: eodId };
  } catch (error: any) {
    console.error("Failed to submit EOD exception:", error);
    return { success: false, error: error?.message || "Failed to submit EOD (unknown JS exception)" };
  }
}

/**
 * Approve or Reject an EOD Report
 */
export async function reviewEOD(eodId: string, action: 'Approve' | 'Reject', rejectionReason?: string) {
  try {
    const _authSupabase = await createClient();
    const currentUser = await resolveCurrentEODUser(_authSupabase);
    if (!currentUser) return { success: false, error: "Unauthorized: Authentication required" };
    const supabase = _authSupabase;

    const isSuperAdmin = currentUser.roles.includes('SUPER_ADMIN');

    if (!canManageEOD(currentUser.roles)) {
      return { success: false, error: "Insufficient permissions to review EODs" };
    }

    // Get EOD with report_date to avoid extra round trip in comp off processor
    const { data: eod } = await supabase
      .from('eod_reports')
      .select('employee_id, status, office_hours, report_date')
      .eq('id', eodId)
      .single();

    if (!eod) return { success: false, error: "EOD not found" };

    if (eod.employee_id === currentUser.id && !isSuperAdmin) {
      return { success: false, error: "You cannot review your own EOD." };
    }

    const newStatus = action === 'Approve' ? 'Approved' : 'Rejected';

    // Idempotency: If already in target status, return success immediately without redundant work
    if (eod.status === newStatus) {
      return { success: true };
    }

    if (action === 'Reject' && !rejectionReason) {
      return { success: false, error: "Rejection reason is required." };
    }

    const { error } = await supabase.rpc('review_eod_rpc', {
      p_eod_id: eodId,
      p_status: newStatus,
      p_rejection_reason: action === 'Approve' ? null : (rejectionReason || null)
    });

    if (error) {
      console.error("Failed to update EOD report:", error);
      return { success: false, error: "Failed to review EOD" };
    }

    // Queue non-critical audit log in background queue without blocking response
    queueEodActivity(
      action === 'Approve' ? 'EOD_APPROVED' : 'EOD_REJECTED',
      currentUser.email || 'unknown',
      currentUser.id,
      eod.employee_id,
      { eod_id: eodId, reason: rejectionReason } as Json
    );

    // Commit critical Comp-Off balance update BEFORE reporting success
    if (newStatus === 'Approved') {
      await processEODCompOff(eodId, eod.employee_id, eod.office_hours, newStatus, {
        reportDate: eod.report_date,
        supabaseClient: supabase
      });
    } else if (newStatus === 'Rejected') {
      await supabase
        .from('comp_off_ledger')
        .delete()
        .eq('reference_id', eodId)
        .eq('transaction_type', 'CREDIT');
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to review EOD:", error);
    return { success: false, error: "Failed to review EOD" };
  }
}

/**
 * Batch Approve or Reject multiple EOD reports with bounded concurrency and atomic idempotency
 */
export async function batchReviewEODs(
  eodIds: string[],
  action: 'Approve' | 'Reject',
  rejectionReason?: string,
  options?: { idempotencyKey?: string }
) {
  if (!Array.isArray(eodIds) || eodIds.length === 0) {
    return { success: true, total: 0, succeeded: [], failed: [] };
  }

  try {
    const _authSupabase = await createClient();
    const currentUser = await resolveCurrentEODUser(_authSupabase);

    if (!currentUser || !canManageEOD(currentUser.roles)) {
      return { success: false, total: eodIds.length, succeeded: [], failed: [], error: "Insufficient permissions to review EODs" };
    }

    const isSuperAdmin = currentUser.roles.includes('SUPER_ADMIN');
    const supabase = _authSupabase;
    const newStatus = action === 'Approve' ? 'Approved' : 'Rejected';

    if (action === 'Reject' && (!rejectionReason || !rejectionReason.trim())) {
      return { success: false, total: eodIds.length, succeeded: [], failed: [], error: "Rejection reason is required." };
    }

    // 1. Batch fetch target EODs
    const { data: targetEods, error: fetchErr } = await supabase
      .from('eod_reports')
      .select('id, employee_id, status, office_hours, report_date')
      .in('id', eodIds);

    if (fetchErr || !targetEods) {
      return { success: false, total: eodIds.length, succeeded: [], failed: [], error: "Failed to fetch EOD reports for review" };
    }

    const succeeded: string[] = [];
    const failed: { id: string; error: string }[] = [];
    const toUpdate: typeof targetEods = [];

    for (const eod of targetEods) {
      if (eod.employee_id === currentUser.id && !isSuperAdmin) {
        failed.push({ id: eod.id, error: "You cannot review your own EOD." });
        continue;
      }
      if (eod.status === newStatus) {
        // Idempotency: already reviewed
        succeeded.push(eod.id);
        continue;
      }
      toUpdate.push(eod);
    }

    if (toUpdate.length > 0) {
      const toUpdateIds = toUpdate.map(e => e.id);

      // Attempt atomic batch review RPC
      let rpcSucceeded = false;
      try {
        const { data: updatedRpcIds, error: rpcError } = await supabase.rpc('batch_review_eods_rpc', {
          p_eod_ids: toUpdateIds,
          p_status: newStatus,
          p_rejection_reason: action === 'Approve' ? null : (rejectionReason || null)
        });

        if (!rpcError && Array.isArray(updatedRpcIds)) {
          rpcSucceeded = true;
          succeeded.push(...toUpdateIds);
        }
      } catch {
        rpcSucceeded = false;
      }

      // Fallback: bounded concurrency review if batch RPC is not provisioned
      if (!rpcSucceeded) {
        const limiter = createConcurrencyLimiter(5);
        await Promise.all(
          toUpdate.map(eod =>
            limiter(async () => {
              try {
                await withRetry(
                  async () => {
                    const { error } = await supabase.rpc('review_eod_rpc', {
                      p_eod_id: eod.id,
                      p_status: newStatus,
                      p_rejection_reason: action === 'Approve' ? null : (rejectionReason || null)
                    });
                    if (error) throw error;
                  },
                  { maxRetries: 2, initialDelayMs: 150 }
                );
                succeeded.push(eod.id);
              } catch (err: any) {
                failed.push({ id: eod.id, error: err?.message || "Failed to update EOD" });
              }
            })
          )
        );
      }

      // If approved, commit Comp-Off ledger updates using batch processor BEFORE returning
      if (newStatus === 'Approved') {
        const approvedSuccessEods = toUpdate.filter(e => succeeded.includes(e.id));
        if (approvedSuccessEods.length > 0) {
          await batchProcessEODCompOff(
            approvedSuccessEods.map(e => ({
              id: e.id,
              employee_id: e.employee_id,
              office_hours: e.office_hours,
              report_date: e.report_date,
              status: 'Approved'
            })),
            { supabaseClient: supabase }
          );
        }
      } else if (newStatus === 'Rejected') {
        const rejectedSuccessEods = toUpdate.filter(e => succeeded.includes(e.id));
        if (rejectedSuccessEods.length > 0) {
          await supabase
            .from('comp_off_ledger')
            .delete()
            .in('reference_id', rejectedSuccessEods.map(e => e.id))
            .eq('transaction_type', 'CREDIT');
        }
      }
    }

    // Queue non-critical audit log in background
    if (succeeded.length > 0) {
      queueEodActivity(
        action === 'Approve' ? 'BATCH_EOD_APPROVED' : 'BATCH_EOD_REJECTED',
        currentUser.email || 'unknown',
        currentUser.id,
        null,
        {
          count: succeeded.length,
          succeeded_ids: succeeded,
          action,
          reason: rejectionReason
        } as Json
      );
    }

    return {
      success: failed.length === 0,
      total: eodIds.length,
      succeeded,
      failed
    };
  } catch (error: any) {
    console.error("Failed in batchReviewEODs:", error);
    return {
      success: false,
      total: eodIds.length,
      succeeded: [],
      failed: [],
      error: error?.message || "Unexpected error in batch review"
    };
  }
}

/**
 * Get EOD history for an employee
 */
export async function getEODHistory(employeeId: string, roleContext: 'Employee' | 'HR' = 'Employee') {
  const supabase = await createClient();
  try {
    const _authSupabase = await createClient();
    const currentUser = await resolveCurrentEODUser(_authSupabase);
    if (!currentUser) return { success: false, error: "Unauthorized: Authentication required" };
    const supabase = _authSupabase;

    const isAuthorized = currentUser.id === employeeId || isSuperAdminOrHR(currentUser.roles);
    if (!isAuthorized) return { success: false, error: "Unauthorized to view this employee's EOD history" };

    
    const { data, error } = await supabase
      .from('eod_reports')
      .select('id, employee_id, report_date, tasks_accomplished, office_hours, location, blockers, photo_url, status, submitted_by, approved_by, approved_at, rejection_reason, submitted_at, tomorrows_plan')
      .eq('employee_id', employeeId)
      .ilike('role_context', roleContext)
      .order('report_date', { ascending: false });

    if (error) {
      console.error("Failed to fetch EOD history:", error);
      return { success: false, error: "Failed to retrieve EOD history" };
    }
    return { success: true, data };
  } catch (error: unknown) {
    console.error("Failed to fetch EOD history:", error);
    return { success: false, error: "Failed to retrieve EOD history" };
  }
}

/**
 * Get pending EODs for review
 */
export async function getPendingEODs() {
  try {
    const _authSupabase = await createClient();
    const currentUser = await resolveCurrentEODUser(_authSupabase);
    if (!currentUser) return { success: false, error: "Unauthorized: Authentication required" };
    const supabase = _authSupabase;

    const isSuperAdmin = currentUser.roles.includes('SUPER_ADMIN');

    if (!canReviewEOD(currentUser.roles)) {
      return { success: false, error: "Unauthorized: " + (currentUser ? JSON.stringify(currentUser) : "No User") };
    }

    
    
    // Fetch only pending, order by oldest first
    const { data, error } = await supabase
      .from('eod_reports')
      .select(`
        id, employee_id, report_date, tasks_accomplished, office_hours, location, blockers, photo_url, status, submitted_by, approved_by, approved_at, rejection_reason, submitted_at, tomorrows_plan,
        profiles!eod_reports_employee_id_fkey(first_name, last_name, employee_id, department)
      `)
      .eq('status', 'Pending')
      .order('report_date', { ascending: true });

    if (error) {
      console.error("Failed to fetch pending EODs:", error);
      return { success: false, error: "Failed to retrieve pending EODs" };
    }

    // HR can't approve their own, so filter them out if they are just HR
    let filteredData = data;
    if (!isSuperAdmin) {
      filteredData = data.filter(eod => eod.employee_id !== currentUser.id);
    }

    return { success: true, data: filteredData };
  } catch (error: unknown) {
    console.error("Failed to fetch pending EODs:", error);
    return { success: false, error: "Failed to retrieve pending EODs" };
  }
}

/**
 * Calculate consecutive EOD streak for an employee
 */
export async function getEODStreak(employeeId: string, roleContext: 'Employee' | 'HR' = 'Employee') {
  try {
    const _authSupabase = await createClient();
    const currentUser = await resolveCurrentEODUser(_authSupabase);
    if (!currentUser) return { success: false, streak: 0 };

    const isAuthorized = currentUser.id === employeeId || isSuperAdminOrHR(currentUser.roles);
    if (!isAuthorized) return { success: false, streak: 0 };
    const supabase = _authSupabase;

    // Get all approved/pending EODs, order by date descending
    const { data, error } = await supabase
      .from('eod_reports')
      .select('report_date')
      .eq('employee_id', employeeId)
      .in('status', ['Approved', 'Pending'])
      .eq('role_context', roleContext)
      .order('report_date', { ascending: false });

    if (error || !data || data.length === 0) return { success: true, streak: 0 };

    let streak = 0;
    const getISTDateString = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const todayStr = getISTDateString();
    const today = new Date(todayStr + "T00:00:00");

    // Strip time from report dates
    const dates = data.map(d => {
      const date = new Date(d.report_date + "T00:00:00");
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    });

    // Remove duplicates just in case (though unique constraint prevents it)
    const uniqueDates = Array.from(new Set(dates)).sort((a, b) => b - a);

    // If latest report is not today or yesterday, streak is broken
    const oneDayMs = 24 * 60 * 60 * 1000;
    const todayMs = today.getTime();

    if (uniqueDates[0] < todayMs - oneDayMs) {
      return { success: true, streak: 0 };
    }

    // Count consecutive days
    let expectedNext = uniqueDates[0];
    for (const d of uniqueDates) {
      if (d === expectedNext) {
        streak++;
        expectedNext -= oneDayMs;
      } else {
        break;
      }
    }

    return { success: true, streak };
  } catch {
    return { success: false, streak: 0 };
  }
}

/**
 * Get all EODs for management dashboard with optional filters
 */
export async function getAllEODs(filters?: { employeeId?: string; startDate?: string; endDate?: string; searchString?: string; branchId?: string; page?: number; limit?: number; roleContextFilter?: 'Employee' | 'HR'; }) {
  try {
    const _authSupabase = await createClient();
    const currentUser = await resolveCurrentEODUser(_authSupabase);
    if (!currentUser) return { success: false, error: "Unauthorized: Authentication required" };
    const supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false }, global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) } });

    if (!canManageEOD(currentUser.roles)) {
      return { success: false, error: "Unauthorized: " + (currentUser ? JSON.stringify(currentUser) : "No User") };
    }

    
    
    let query = supabase
      .from('eod_reports')
      .select(`
        id, employee_id, report_date, tasks_accomplished, office_hours, location, blockers, photo_url, status, submitted_by, approved_by, approved_at, rejection_reason, submitted_at, tomorrows_plan, role_context,
        profiles!eod_reports_employee_id_fkey(first_name, last_name, employee_id, branch_id, department)
      `, { count: 'exact' });

    // Filter by role_context: HR review page only sees Employee EODs, Admin sees all
    if (filters?.roleContextFilter) {
      query = query.eq('role_context', filters.roleContextFilter);
    }

    if (filters?.employeeId && filters.employeeId !== 'all') {
      query = query.eq('employee_id', filters.employeeId);
    }
    if (filters?.startDate) {
      query = query.gte('report_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('report_date', filters.endDate);
    }
    if (filters?.searchString) {
      // Basic text search on tasks_accomplished, blockers, and joined profile names
      query = query.or(`tasks_accomplished.ilike.%${filters.searchString}%,blockers.ilike.%${filters.searchString}%,profiles.first_name.ilike.%${filters.searchString}%,profiles.last_name.ilike.%${filters.searchString}%`);
    }
    if (filters?.branchId && filters.branchId !== 'all') {
      query = query.eq('profiles.branch_id', filters.branchId);
    }

    // Pagination
    if (filters?.page !== undefined && filters?.limit !== undefined) {
      const from = (filters.page - 1) * filters.limit;
      const to = from + filters.limit - 1;
      query = query.range(from, to);
    }

    // Order by date descending
    query = query.order('report_date', { ascending: false });

    const { data: rawData, error, count } = await query;

    let data = rawData || [];

    // If any EOD is missing its profile, patch it!
    data = data.map(eod => {
      const fallbackProfile = { first_name: 'Unknown', last_name: 'Employee', employee_id: '', branch_id: '', department: '' };
      return {
        ...eod,
        profiles: eod.profiles || fallbackProfile
      };
    });

    if (error) {
      console.error("Failed to fetch all EODs:", error);
      return { success: false, error: "Failed to retrieve EOD reports" };
    }

    return { success: true, data, count };
  } catch (error: unknown) {
    console.error("Failed to fetch all EODs:", error);
    return { success: false, error: "Failed to retrieve EOD reports" };
  }
}

/**
 * Get an existing EOD for a specific employee and date
 */
export async function getEODByEmployeeAndDate(employeeId: string, reportDate: string, roleContext: 'Employee' | 'HR' = 'Employee') {
  const supabase = await createClient();
  try {
    const _authSupabase = await createClient();
    const currentUser = await resolveCurrentEODUser(_authSupabase);
    if (!currentUser) return { success: false, error: "Unauthorized: Authentication required" };
    const supabase = _authSupabase;

    const isAuthorized = currentUser.id === employeeId || canManageEOD(currentUser.roles);
    if (!isAuthorized) return { success: false, error: "Unauthorized: " + (currentUser ? JSON.stringify(currentUser) : "No User") };

    
    const { data, error } = await supabase
      .from('eod_reports')
      .select('id, employee_id, report_date, tasks_accomplished, office_hours, location, blockers, photo_url, status, submitted_by, approved_by, approved_at, rejection_reason, submitted_at, tomorrows_plan')
      .eq('employee_id', employeeId)
      .eq('report_date', reportDate)
      .eq('role_context', roleContext)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Failed to fetch EOD by date:", error);
      return { success: false, error: "Failed to retrieve EOD" };
    }
    
    return { success: true, data: data || null };
  } catch (error) {
    console.error("Failed to fetch EOD by date:", error);
    return { success: false, error: "Failed to retrieve EOD" };
  }
}

/**
 * Update an EOD report (Administrative users only)
 */
export async function updateEOD(payload: {
  role_context?: 'Employee' | 'HR';
  employee_id: string;
  report_date: string;
  tasks_accomplished: string;
  office_hours: number;
  location: "Office" | "Field";
  blockers?: string;
  photo_url?: string;
  job_card_numbers?: string;
  tomorrows_plan?: string;
  admin_note?: string;
}) {
  try {
    const _authSupabase = await createClient();
    const currentUser = await resolveCurrentEODUser(_authSupabase);
    if (!currentUser) return { success: false, error: "Unauthorized: Authentication required" };
    const supabase = _authSupabase;

    if (!canManageEOD(currentUser.roles)) {
      return { success: false, error: "Unauthorized to update EOD" };
    }

    
    
    // Fetch the existing EOD to preserve its status
    const { data: existingEod } = await supabase
      .from('eod_reports')
      .select('status, tasks_accomplished, blockers, tomorrows_plan, location, job_card_numbers, photo_url')
      .eq('employee_id', payload.employee_id)
      .eq('report_date', payload.report_date)
      .single();
      
    const status = existingEod?.status || 'Approved';

    const { data: eodId, error: rpcError } = await supabase.rpc('update_eod_rpc', {
      p_employee_id: payload.employee_id,
      p_report_date: payload.report_date,
      p_tasks_accomplished: existingEod?.tasks_accomplished || payload.tasks_accomplished,
      p_office_hours: payload.office_hours,
      p_location: existingEod?.location || payload.location,
      p_blockers: existingEod?.blockers || '',
      p_photo_url: existingEod?.photo_url || '',
      p_status: status,
      p_submitted_by: payload.employee_id,
      p_job_card_numbers: existingEod?.job_card_numbers || '',
      p_tomorrows_plan: existingEod?.tomorrows_plan || ''
    });

    if (payload.admin_note !== undefined) {
      await supabase.from('eod_reports').update({ rejection_reason: payload.admin_note }).eq('id', eodId);
    }

    if (rpcError) {
      console.error("EOD update RPC error:", rpcError);
      return { success: false, error: "Failed to update EOD" };
    }

    await logEodActivity(
      'EOD_UPDATED',
      currentUser.email || 'unknown',
      currentUser.id,
      payload.employee_id,
      { report_date: payload.report_date, location: payload.location } as Json
    );

    if (payload.role_context) {
      await supabase.from('eod_reports').update({ role_context: payload.role_context }).eq('id', eodId);
    }
    return { success: true, data: eodId };
  } catch (error) {
    console.error("Failed to update EOD:", error);
    return { success: false, error: "Failed to update EOD" };
  }
}




async function logEodActivity(action: string, actor_email: string, user_id: string, target_user_id: string, details: Json) {
  const supabase = await createClient();
  try {
    
    const { error } = await supabase.from('activity_logs').insert({
      action,
      actor_email,
      user_id,
      target_user_id,
      details
    });
    if (error) console.error("Activity log failed:", error.message);
  } catch (e) {
    console.error("Activity log exception:", e);
  }
}


























