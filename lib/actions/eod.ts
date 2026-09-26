// @ts-nocheck
import { createClient } from "@/lib/supabase/server";



import { format } from "date-fns";



export type EODReport = any;

export function canManageEOD(roles: string[] = []) {
  return roles.includes('SUPER_ADMIN') || roles.includes('HR');
}

export function isSuperAdminOrHR(roles: string[] = []) {
  return canManageEOD(roles);
}

/**
 * Submit an EOD report
 * Handles self-submission (Pending) and proxy submission (Approved)
 */
export async function submitEOD(payload: Omit<EODReport, 'id' | 'status' | 'submitted_at' | 'reviewed_by' | 'reviewed_at' | 'review_remarks'>) {
  try {
    const currentUser = { id: "11111111-1111-4111-8111-111111111111", roles: ["SUPER_ADMIN", "HR"] };

    if (!currentUser) return { success: false, error: "Unauthorized" };

    const supabase = await createClient();

    const canManage = canManageEOD(currentUser.roles);

    let status = 'Pending';
    if (payload.employee_id !== currentUser.id) {
      if (!canManage) {
        return { success: false, error: "Unauthorized to submit proxy EOD" };
      }
      status = 'Approved';
    } else {
      if (!canManage) {
        const todayLocal = format(new Date(), 'yyyy-MM-dd');
        if (payload.report_date !== todayLocal) {
          return { success: false, error: "You can only submit EOD for today's date." };
        }
      }
    }

    // Use the RPC to atomically insert EOD and Attendance
    const { data: eodId, error: rpcError } = await supabase.rpc('submit_eod_rpc', {
      p_employee_id: payload.employee_id,
      p_report_date: payload.report_date,
      p_tasks_accomplished: payload.tasks_accomplished,
      p_office_hours: payload.office_hours,
      p_location: payload.location,
      p_blockers: payload.blockers || '',
      p_photo_url: payload.photo_url || '',
      p_status: status,
      p_submitted_by: currentUser.id,
      p_job_card_numbers: payload.job_card_numbers || '',
      p_tomorrows_plan: payload.tomorrows_plan || ''
    });

    if (rpcError) {
      if (rpcError.message.includes('unique constraint')) {
        return { success: false, error: "An EOD report already exists for this date." };
      }
      console.error("EOD submit RPC error:", rpcError);
      return { success: false, error: rpcError.message || "Failed to submit EOD via RPC" };
    }

    // Log Activity
    await logEodActivity(
      status === 'Approved' ? 'PROXY_EOD_SUBMITTED' : 'EOD_SUBMITTED',
      currentUser.email || 'unknown',
      currentUser.id,
      payload.employee_id,
      { report_date: payload.report_date, location: payload.location } as Json
    );

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
    const currentUser = { id: "11111111-1111-4111-8111-111111111111", roles: ["SUPER_ADMIN", "HR"] };
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const supabase = await createClient();

    const isSuperAdmin = currentUser.roles.includes('SUPER_ADMIN');

    if (!canReviewEOD(currentUser.roles)) {
      return { success: false, error: "Insufficient permissions to review EODs" };
    }

    // Get EOD to verify HR isn't approving their own
    const { data: eod } = await supabase
      .from('eod_reports')
      .select('employee_id, status')
      .eq('id', eodId)
      .single();

    if (!eod) return { success: false, error: "EOD not found" };

    if (eod.employee_id === currentUser.id && !isSuperAdmin) {
      return { success: false, error: "You cannot review your own EOD." };
    }

    const newStatus = action === 'Approve' ? 'Approved' : 'Rejected';

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

    // Log Activity
    await logEodActivity(
      action === 'Approve' ? 'EOD_APPROVED' : 'EOD_REJECTED',
      currentUser.email || 'unknown',
      currentUser.id,
      eod.employee_id,
      { eod_id: eodId, reason: rejectionReason } as Json
    );

    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to review EOD:", error);
    return { success: false, error: "Failed to review EOD" };
  }
}

/**
 * Get EOD history for an employee
 */
export async function getEODHistory(employeeId: string) {
  try {
    const currentUser = { id: "11111111-1111-4111-8111-111111111111", roles: ["SUPER_ADMIN", "HR"] };
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const isAuthorized = currentUser.id === employeeId || isSuperAdminOrHR(currentUser.roles);
    if (!isAuthorized) return { success: false, error: "Unauthorized to view this employee's EOD history" };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('eod_reports')
      .select('id, employee_id, report_date, tasks_accomplished, office_hours, location, blockers, photo_url, status, submitted_by, approved_by, approved_at, rejection_reason, submitted_at')
      .eq('employee_id', employeeId)
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
    const currentUser = { id: "11111111-1111-4111-8111-111111111111", roles: ["SUPER_ADMIN", "HR"] };
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const isSuperAdmin = currentUser.roles.includes('SUPER_ADMIN');

    if (!canReviewEOD(currentUser.roles)) {
      return { success: false, error: "Unauthorized" };
    }

    const supabase = await createClient();
    
    // Fetch only pending, order by oldest first
    const { data, error } = await supabase
      .from('eod_reports')
      .select(`
        id, employee_id, report_date, tasks_accomplished, office_hours, location, blockers, photo_url, status, submitted_by, approved_by, approved_at, rejection_reason, submitted_at,
        profiles!eod_reports_employee_id_fkey(first_name, last_name, employee_id)
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
export async function getEODStreak(employeeId: string) {
  try {
    const currentUser = { id: "11111111-1111-4111-8111-111111111111", roles: ["SUPER_ADMIN", "HR"] };
    if (!currentUser) return { success: false, streak: 0 };

    const isAuthorized = currentUser.id === employeeId || isSuperAdminOrHR(currentUser.roles);
    if (!isAuthorized) return { success: false, streak: 0 };

    const supabase = await createClient();

    // Get all approved/pending EODs, order by date descending
    const { data, error } = await supabase
      .from('eod_reports')
      .select('report_date')
      .eq('employee_id', employeeId)
      .in('status', ['Approved', 'Pending'])
      .order('report_date', { ascending: false });

    if (error || !data || data.length === 0) return { success: true, streak: 0 };

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
export async function getAllEODs(filters?: { employeeId?: string; startDate?: string; endDate?: string; searchString?: string; branchId?: string; page?: number; limit?: number; }) {
  try {
    const currentUser = { id: "11111111-1111-4111-8111-111111111111", roles: ["SUPER_ADMIN", "HR"] };
    if (!currentUser) return { success: false, error: "Unauthorized" };

    if (!canManageEOD(currentUser.roles)) {
      return { success: false, error: "Unauthorized" };
    }

    const supabase = await createClient();
    
    let query = supabase
      .from('eod_reports')
      .select(`
        id, employee_id, report_date, tasks_accomplished, office_hours, location, blockers, photo_url, status, submitted_by, approved_by, approved_at, rejection_reason, submitted_at,
        profiles!eod_reports_employee_id_fkey(first_name, last_name, employee_id, branch_id)
      `, { count: 'exact' });

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
export async function getEODByEmployeeAndDate(employeeId: string, reportDate: string) {
  try {
    const currentUser = { id: "11111111-1111-4111-8111-111111111111", roles: ["SUPER_ADMIN", "HR"] };
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const isAuthorized = currentUser.id === employeeId || canManageEOD(currentUser.roles);
    if (!isAuthorized) return { success: false, error: "Unauthorized" };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('eod_reports')
      .select('id, employee_id, report_date, tasks_accomplished, office_hours, location, blockers, photo_url, status, submitted_by, approved_by, approved_at, rejection_reason, submitted_at')
      .eq('employee_id', employeeId)
      .eq('report_date', reportDate)
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
  employee_id: string;
  report_date: string;
  tasks_accomplished: string;
  office_hours: number;
  location: "Office" | "Field";
  blockers?: string;
  photo_url?: string;
  job_card_numbers?: string;
  tomorrows_plan?: string;
}) {
  try {
    const currentUser = { id: "11111111-1111-4111-8111-111111111111", roles: ["SUPER_ADMIN", "HR"] };
    if (!currentUser) return { success: false, error: "Unauthorized" };

    if (!canManageEOD(currentUser.roles)) {
      return { success: false, error: "Unauthorized to update EOD" };
    }

    const supabase = await createClient();
    
    // Status should remain the same or be reset to Approved? 
    // Proxy submissions are automatically approved. Updates by admin remain approved.
    const status = 'Approved';

    const { data: eodId, error: rpcError } = await supabase.rpc('update_eod_rpc', {
      p_employee_id: payload.employee_id,
      p_report_date: payload.report_date,
      p_tasks_accomplished: payload.tasks_accomplished,
      p_office_hours: payload.office_hours,
      p_location: payload.location,
      p_blockers: payload.blockers || '',
      p_photo_url: payload.photo_url || '',
      p_status: status,
      p_submitted_by: currentUser.id,
      p_job_card_numbers: payload.job_card_numbers || '',
      p_tomorrows_plan: payload.tomorrows_plan || ''
    });

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

    return { success: true, data: eodId };
  } catch (error) {
    console.error("Failed to update EOD:", error);
    return { success: false, error: "Failed to update EOD" };
  }
}




async function logEodActivity(
  action: string,
  actor_email: string,
  user_id: string,
  target_user_id: string,
  details: Json
) {
  try {
    const supabase = await createClient();
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













