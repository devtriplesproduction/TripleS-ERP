-- ==============================================================================
-- Performance Optimization: High-Frequency Query & Foreign Key Indexes
-- Safe, idempotent indexes for EOD, Comp-Off, Leave, Attendance, Projects & Tasks
-- ==============================================================================

-- 1. EOD Reports Indexes
CREATE INDEX IF NOT EXISTS idx_eod_reports_emp_date 
  ON public.eod_reports(employee_id, report_date DESC);

CREATE INDEX IF NOT EXISTS idx_eod_reports_status_date 
  ON public.eod_reports(status, report_date ASC);

CREATE INDEX IF NOT EXISTS idx_eod_reports_report_date 
  ON public.eod_reports(report_date);

CREATE INDEX IF NOT EXISTS idx_eod_reports_role_context 
  ON public.eod_reports(role_context);

-- 2. Comp-Off Ledger Indexes
CREATE INDEX IF NOT EXISTS idx_comp_off_ledger_ref_type 
  ON public.comp_off_ledger(reference_id, transaction_type);

CREATE INDEX IF NOT EXISTS idx_comp_off_ledger_emp_id 
  ON public.comp_off_ledger(employee_id);

-- 3. Leave Requests Indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_emp_dates 
  ON public.leave_requests(employee_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_leave_requests_dates_status 
  ON public.leave_requests(start_date, end_date, status);

-- 4. Projects & Tasks Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id_status 
  ON public.tasks(project_id, status);

CREATE INDEX IF NOT EXISTS idx_tasks_order_created 
  ON public.tasks(order_index ASC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_assignees_user_task 
  ON public.task_assignees(user_id, task_id);

CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id 
  ON public.task_assignees(task_id);

CREATE INDEX IF NOT EXISTS idx_project_members_user_proj 
  ON public.project_members(user_id, project_id);

CREATE INDEX IF NOT EXISTS idx_project_members_project_id 
  ON public.project_members(project_id);

CREATE INDEX IF NOT EXISTS idx_projects_status_deadline 
  ON public.projects(status, deadline);

CREATE INDEX IF NOT EXISTS idx_projects_pm 
  ON public.projects(project_manager_id);

-- 5. Holidays Indexes
CREATE INDEX IF NOT EXISTS idx_holidays_date 
  ON public.holidays(date);

CREATE INDEX IF NOT EXISTS idx_holidays_active_date 
  ON public.holidays(is_active, date);
