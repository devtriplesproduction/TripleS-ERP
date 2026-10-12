-- ==============================================================================
-- Database Performance Optimization Migration
-- Focus: High-impact composite indexes, foreign key coverage, and RLS function stability
-- Safe & Idempotent (IF NOT EXISTS)
-- ==============================================================================

-- 1. Profiles & Employee Lookups
CREATE INDEX IF NOT EXISTS idx_profiles_employee_id 
  ON public.profiles(employee_id);

CREATE INDEX IF NOT EXISTS idx_emp_onboarding_emp_id_num 
  ON public.employee_onboarding(employee_id_number);

CREATE INDEX IF NOT EXISTS idx_emp_onboarding_dept 
  ON public.employee_onboarding(department);

CREATE INDEX IF NOT EXISTS idx_emp_onboarding_status 
  ON public.employee_onboarding(status);

-- 2. Comp-Off Ledger Optimization
CREATE INDEX IF NOT EXISTS idx_comp_off_ledger_emp_type 
  ON public.comp_off_ledger(employee_id, transaction_type);

-- 3. Leave Requests Multi-Column Coverage
CREATE INDEX IF NOT EXISTS idx_leave_requests_emp_status_dates 
  ON public.leave_requests(employee_id, status, start_date, end_date);

-- 4. EOD Reports Extended Filtering
CREATE INDEX IF NOT EXISTS idx_eod_reports_role_date 
  ON public.eod_reports(role_context, report_date DESC);

-- 5. Tasks, Comments & Activity
CREATE INDEX IF NOT EXISTS idx_task_comments_task_created 
  ON public.task_comments(task_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_project_activity_proj_created 
  ON public.project_activity(project_id, created_at DESC);

-- 6. RLS Helper Function Performance Optimization
-- Marking helper functions as STABLE allows PostgreSQL's query planner
-- to cache the result across rows for a single user/query instead of 
-- executing a separate sub-query per scanned table row.

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (LOWER(role) IN ('admin', 'super admin', 'super_admin', 'manager'))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_hod_or_above()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (
      is_hod = true 
      OR LOWER(role) IN ('admin', 'super admin', 'super_admin', 'manager')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
