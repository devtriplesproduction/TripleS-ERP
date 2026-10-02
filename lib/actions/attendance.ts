"use server"

import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { guardServerAction } from "@/lib/auth"

export type AttendanceStatus = 'Present' | 'Leave' | 'WFH' | 'Half Day + Present' | 'Half Day + WFH' | 'Absent' | 'Pending' | 'Holiday' | 'Weekend' | 'Not Marked';

export interface DerivedAttendance {
  date: string;
  status: AttendanceStatus;
  workedHours: number;
  extraHours: number;
  eod?: any;
  leave?: any;
  wfh?: any;
  holiday?: any;
}

import { calculateAttendanceSummary } from "@/lib/utils/attendance-summary"
import { getDayOfWeek, STANDARD_WORK_MINUTES, calculateExtraMinutes, determineWorkDayContext, formatWorkedTime } from "@/lib/utils/time"

export async function getAttendanceEmployees(month: number, year: number) {
  // Enforce role-based access for this action
  await guardServerAction(['HR', 'Admin', 'Super Admin'] as any);
  
  // Use admin client to bypass RLS for fetching all profiles
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name, employee_id')
    .order('first_name');

  if (error) {
    console.error('getAttendanceEmployees profile error:', error);
    return [];
  }
  
  if (!profiles) {
    console.error('getAttendanceEmployees profile returned no data');
    return [];
  }

  // Fetch departments and profile photos from employee_onboarding
  const { data: onboardingData } = await supabaseAdmin
    .from('employee_onboarding')
    .select('employee_id_number, department, profile_photo, designation, employment_type');

  const onboardingMap = new Map();
  if (onboardingData) {
    onboardingData.forEach(o => {
      if (o.employee_id_number) {
        onboardingMap.set(o.employee_id_number, o);
      }
    });
  }

  const data = profiles.map(p => {
    const ob = onboardingMap.get(p.employee_id) || {};
    return {
      ...p,
      department: ob.department || 'General',
      designation: ob.designation || '',
      profile_photo: ob.profile_photo || null,
      employment_type: ob.employment_type || ''
    };
  });

  try {
    const empsWithSummary = await Promise.all(data.map(async (emp) => {
      const attendance = await _calculateAttendance(emp.id, month, year, supabaseAdmin);
      const summary = calculateAttendanceSummary(attendance);
      // Check if employee has any actual attendance activity for this month/year
      // (i.e., at least one day that is not Absent/Weekend/Holiday/Not Marked)
      const hasActivity = attendance.some(a =>
        a.status === 'Present' ||
        a.status === 'WFH' ||
        a.status === 'Leave' ||
        a.status === 'Pending' ||
        a.status === 'Half Day + Present' ||
        a.status === 'Half Day + WFH'
      );
      return { ...emp, summary, hasActivity };
    }));

    // Only return employees who have at least one attendance record for this month/year
    return empsWithSummary.filter(emp => emp.hasActivity);
  } catch (err) {
    console.error("Error calculating attendance summaries:", err);
    return [];
  }
}

export async function getAttendanceEmployeeProfile(employeeId: string) {
  await guardServerAction(['HR', 'Admin', 'Super Admin', 'Employee'] as any); // Employee can see their own
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const { data: profile } = await supabaseAdmin.from('profiles').select('id, first_name, last_name, employee_id').eq('id', employeeId).single();
  if (!profile) return null;

  const { data: obData } = await supabaseAdmin.from('employee_onboarding').select('department, designation, profile_photo, employment_type').eq('employee_id_number', profile.employee_id).maybeSingle();

  return {
    ...profile,
    department: obData?.department || 'General',
    designation: obData?.designation || '',
    profile_photo: obData?.profile_photo || null,
    employment_type: obData?.employment_type || ''
  };
}

export async function getEmployeeAttendance(employeeId: string, month: number, year: number): Promise<DerivedAttendance[]> {
  await guardServerAction(['HR', 'Admin', 'Super Admin', 'Employee'] as any);

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  return _calculateAttendance(employeeId, month, year, supabaseAdmin);
}

/** Internal calculation — no auth, caller must have already authenticated. */
async function _calculateAttendance(employeeId: string, month: number, year: number, supabase: any): Promise<DerivedAttendance[]> {
  
  
  const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0); // last day of the month
  const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

  // Map employee_onboarding ID to auth user ID for EOD lookups
  let authUserId = employeeId;
  const empOnboarding = await supabase.from('employee_onboarding').select('employee_id_number').eq('id', employeeId).single();
  if (empOnboarding.data && empOnboarding.data.employee_id_number) {
    const prof = await supabase.from('profiles').select('id').eq('employee_id', empOnboarding.data.employee_id_number).single();
    if (prof.data) authUserId = prof.data.id;
  }


  // Fetch ALL EODs (Approved, Pending, Rejected) to derive correct status
  const { data: eods } = await supabase
    .from('eod_reports')
    .select('*')
    .eq('employee_id', authUserId)
    .gte('report_date', startDateStr)
    .lte('report_date', endDateStr);

  // Fetch approved Leaves and WFH
  const { data: leaveRequests } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('employee_id', employeeId)
    .in('status', ['Approved', 'Approved HR', 'Approved (Auto)']) // Considering possible statuses, usually 'Approved'
    // Overlapping dates
    .lte('start_date', endDateStr)
    .gte('end_date', startDateStr);
    
  // Fetch Holidays
  const { data: holidays } = await supabase
    .from('holidays')
    .select('*')
    .eq('is_active', true)
    .gte('date', startDateStr)
    .lte('date', endDateStr);

  const eodMap = new Map(eods?.map((e: any) => [e.report_date, e]) || []);
  const holidayMap = new Map(holidays?.map((h: any) => [h.date, h]) || []);
  
  const leavesMap = new Map();
  const wfhMap = new Map();
  
  if (leaveRequests) {
    for (const req of leaveRequests) {
      if (req.status !== 'Approved' && req.status !== 'Approved HR') {
         // Assuming Approved HR is final
      }
      // Generate dates between start and end
      const start = new Date(req.start_date);
      const end = new Date(req.end_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (req.request_type === 'WFH') {
          wfhMap.set(dateStr, req);
        } else {
          leavesMap.set(dateStr, req);
        }
      }
    }
  }

  const attendance: DerivedAttendance[] = [];
  
  // Build today's date string in local time (IST) for comparison
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  for (let d = 1; d <= endDate.getDate(); d++) {
    const currentDate = new Date(year, month - 1, d); // local date
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    const eod = eodMap.get(dateStr);
    const leave = leavesMap.get(dateStr);
    const wfh = wfhMap.get(dateStr);
    const holiday = holidayMap.get(dateStr);
    const isWeekend = getDayOfWeek(dateStr) === 0; // Sunday only
    
    let status: AttendanceStatus = 'Absent';
    let workedHours = 0;
    
    const eodStatus = eod ? (eod as any).status : null;
    const isApprovedEod = eodStatus === 'Approved';
    const isPendingEod = eodStatus === 'Pending';
    // Rejected EOD = treat as no EOD (Absent)
    
    let workedMinutes = 0;
    if (isApprovedEod) {
      workedMinutes = Math.round(Number((eod as any).office_hours || 0) * 60);
      workedHours = Number((eod as any).office_hours || 0); // Keep for backwards compat
    }

    // Priority: Approved Leave/WFH → Approved EOD → Pending EOD → Absent
    if (leave && leave.is_half_day && isApprovedEod) {
      status = 'Half Day + Present';
    } else if (wfh && wfh.is_half_day && isApprovedEod) {
      status = 'Half Day + WFH';
    } else if (leave && !leave.is_half_day) {
      status = 'Leave';
    } else if (wfh && !wfh.is_half_day) {
      status = 'WFH';
    } else if (isApprovedEod) {
      status = 'Present';
    } else if (isPendingEod) {
      status = 'Pending';
    } else if (holiday) {
      status = 'Holiday';
    } else if (isWeekend) {
      status = 'Weekend';
    } else if (dateStr > todayStr) {
      status = 'Not Marked'; // Future dates
    }

    // Determine extra hours context
    let context: 'normal' | 'sunday' | 'paid_holiday' | 'approved_leave' = 'normal';
    if (isWeekend) context = 'sunday';
    else if (holiday && (holiday as any).holiday_type === 'PAID') context = 'paid_holiday';
    else if (leave && !leave.is_half_day) context = 'approved_leave';

    const extraMinutes = calculateExtraMinutes(workedMinutes, context);
    const extraHours = extraMinutes / 60;
    
    attendance.push({
      date: dateStr,
      status,
      workedHours,
      extraHours,
      eod,
      leave,
      wfh,
      holiday
    });
  }

  return attendance;
}
