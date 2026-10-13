"use server"

import { createAdminClient } from "@/lib/supabase/server"
import { guardServerAction } from "@/lib/auth"


export type AttendanceStatus = 'Present' | 'Leave' | 'WFH' | 'Half Day + Present' | 'Half Day + WFH' | 'Half Day' | 'Unpaid Leave' | 'Absent' | 'Pending' | 'Holiday' | 'Weekend' | 'Not Marked' | 'Holiday Work';

export interface DerivedAttendance {
  date: string;
  status: AttendanceStatus;
  workedHours: number;
  extraHours: number;
  compOffMinutes: number;
  payrollStatus: string;
  eod?: any;
  leave?: any;
  wfh?: any;
  holiday?: any;
}

import { calculateAttendanceSummary } from "@/lib/utils/attendance-summary"
import { buildAttendanceRecords } from "@/lib/utils/attendance-builder"

export async function getAttendanceEmployees(month: number, year: number) {
  // Enforce role-based access for this action
  await guardServerAction(['HR', 'Admin', 'Super Admin'] as any);
  
  const supabaseAdmin = await createAdminClient();
  
  // Parallel fetch: profiles and employee_onboarding
  const [profilesRes, onboardingRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, first_name, last_name, employee_id').order('first_name'),
    supabaseAdmin.from('employee_onboarding').select('id, employee_id_number, department, profile_photo, designation, employment_type')
  ]);

  const profiles = profilesRes.data || [];
  const onboardingData = onboardingRes.data || [];

  const onboardingMap = new Map();
  const onboardingByEmpNumMap = new Map();
  onboardingData.forEach(o => {
    if (o.employee_id_number) {
      onboardingByEmpNumMap.set(o.employee_id_number, o);
    }
    if (o.id) {
      onboardingMap.set(o.id, o);
    }
  });

  // Filter out admin
  const filteredProfiles = profiles.filter(p => p.first_name?.toLowerCase() !== 'admin');

  const data = filteredProfiles
    .filter(p => p.employee_id && onboardingByEmpNumMap.has(p.employee_id))
    .map(p => {
      const ob = onboardingByEmpNumMap.get(p.employee_id) || {};
      return {
        ...p,
        onboarding_id: ob.id || p.id,
        department: ob.department || 'General',
        designation: ob.designation || '',
        profile_photo: ob.profile_photo || null,
        employment_type: ob.employment_type || ''
      };
    });

  if (data.length === 0) return [];

  const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0);
  const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

  const allAuthIds = data.map(d => d.id);
  const allEmpIds = Array.from(new Set(data.map(d => d.onboarding_id)));

  // Batch fetch all month EODs, leaves, and holidays in ONE parallel wave (3 queries total)
  const [eodsRes, leavesRes, holidaysRes] = await Promise.all([
    supabaseAdmin
      .from('eod_reports')
      .select('id, employee_id, report_date, office_hours, status')
      .in('employee_id', allAuthIds)
      .gte('report_date', startDateStr)
      .lte('report_date', endDateStr),
    supabaseAdmin
      .from('leave_requests')
      .select('id, employee_id, start_date, end_date, status, request_type, is_half_day')
      .in('employee_id', allEmpIds)
      .in('status', ['Approved', 'Approved HR', 'Approved (Auto)'])
      .lte('start_date', endDateStr)
      .gte('end_date', startDateStr),
    supabaseAdmin
      .from('holidays')
      .select('id, date, name, holiday_type')
      .gte('date', startDateStr)
      .lte('date', endDateStr)
  ]);

  // Group EODs by employee (authId)
  const eodsByAuthId = new Map<string, any[]>();
  (eodsRes.data || []).forEach(e => {
    const list = eodsByAuthId.get(e.employee_id) || [];
    list.push(e);
    eodsByAuthId.set(e.employee_id, list);
  });

  // Group leaves by onboarding_id
  const leavesByEmpId = new Map<string, any[]>();
  (leavesRes.data || []).forEach(l => {
    const list = leavesByEmpId.get(l.employee_id) || [];
    list.push(l);
    leavesByEmpId.set(l.employee_id, list);
  });

  const holidays = holidaysRes.data || [];

  try {
    const empsWithSummary = data.map(emp => {
      const empEods = eodsByAuthId.get(emp.id) || [];
      const empLeaves = leavesByEmpId.get(emp.onboarding_id) || [];
      const attendance = _buildAttendanceRecords(year, month, empEods, empLeaves, holidays);
      const summary = calculateAttendanceSummary(attendance);

      const hasActivity = attendance.some(a =>
        a.status === 'Present' ||
        a.status === 'Holiday Work' ||
        a.status === 'WFH' ||
        a.status === 'Leave' ||
        a.status === 'Pending' ||
        a.status === 'Half Day + Present' ||
        a.status === 'Half Day + WFH'
      );
      return { ...emp, summary, hasActivity };
    });

    return empsWithSummary.filter(emp => emp.hasActivity);
  } catch (err) {
    console.error("Error calculating attendance summaries:", err);
    return [];
  }
}

export async function getAttendanceEmployeeProfile(employeeId: string) {
  await guardServerAction(['HR', 'Admin', 'Super Admin', 'Employee'] as any);
  const supabaseAdmin = await createAdminClient();
  
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
  const supabaseAdmin = await createAdminClient();
  return _calculateAttendance(employeeId, month, year, supabaseAdmin);
}

/** Internal calculation for a single employee */
async function _calculateAttendance(employeeId: string, month: number, year: number, supabase: any): Promise<DerivedAttendance[]> {
  const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0);
  const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

  const authUserPromise = supabase.from('employee_onboarding').select('employee_id_number').eq('id', employeeId).single()
    .then(async (empOnboarding: any) => {
      let authId = employeeId;
      if (empOnboarding.data && empOnboarding.data.employee_id_number) {
        const prof = await supabase.from('profiles').select('id').eq('employee_id', empOnboarding.data.employee_id_number).single();
        if (prof.data) authId = prof.data.id;
      }
      return authId;
    });

  const [authUserId, holidaysRes, leaveRequestsRes] = await Promise.all([
    authUserPromise,
    supabase.from('holidays').select('id, date, name, holiday_type').gte('date', startDateStr).lte('date', endDateStr),
    supabase.from('leave_requests').select('id, employee_id, start_date, end_date, status, request_type, is_half_day').eq('employee_id', employeeId).in('status', ['Approved', 'Approved HR', 'Approved (Auto)']).lte('start_date', endDateStr).gte('end_date', startDateStr)
  ]);

  const { data: eods } = await supabase
    .from('eod_reports')
    .select('id, employee_id, report_date, office_hours, status')
    .eq('employee_id', authUserId)
    .gte('report_date', startDateStr)
    .lte('report_date', endDateStr);

  return _buildAttendanceRecords(year, month, eods || [], leaveRequestsRes.data || [], holidaysRes.data || []);
}

const _buildAttendanceRecords = buildAttendanceRecords;
