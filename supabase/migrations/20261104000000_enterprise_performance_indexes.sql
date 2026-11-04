-- ==============================================================================
-- 20261104000000_enterprise_performance_indexes.sql
-- TripleS ERP — Enterprise-Wide Performance Indexes & Query Optimization
-- Safe, idempotent, guarded indexes for EOD, Time Tracking, Attendance, Leaves & Dashboard
-- ==============================================================================

DO $$
BEGIN
  -- 1. EOD Reports Composite Optimization
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'eod_reports') THEN
    CREATE INDEX IF NOT EXISTS idx_eod_reports_emp_date_role
      ON public.eod_reports(employee_id, report_date, role_context);

    CREATE INDEX IF NOT EXISTS idx_eod_reports_submitted_at
      ON public.eod_reports(submitted_at DESC);

    CREATE INDEX IF NOT EXISTS idx_eod_reports_status_emp
      ON public.eod_reports(status, employee_id);
  END IF;

  -- 2. Time Tracking Sessions & Intervals
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_sessions') THEN
    CREATE INDEX IF NOT EXISTS idx_time_sessions_emp_date_status
      ON public.time_sessions(employee_id, session_date, status);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'session_breaks') THEN
    CREATE INDEX IF NOT EXISTS idx_session_breaks_session_start
      ON public.session_breaks(session_id, start_time DESC);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_logs') THEN
    CREATE INDEX IF NOT EXISTS idx_activity_logs_emp_start_desc
      ON public.activity_logs(employee_id, start_time DESC);
  END IF;

  -- 3. Leave Requests Multi-Column Coverage
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_requests') THEN
    CREATE INDEX IF NOT EXISTS idx_leave_requests_emp_dates_status
      ON public.leave_requests(employee_id, start_date, end_date, status);

    CREATE INDEX IF NOT EXISTS idx_leave_requests_status_created
      ON public.leave_requests(status, created_at DESC);
  END IF;

  -- 4. Quick Tasks & Personal Notes (Navbar triggers & modals)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quick_tasks') THEN
    CREATE INDEX IF NOT EXISTS idx_quick_tasks_assignee_completed
      ON public.quick_tasks(assigned_to, is_completed, updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_quick_tasks_created_by
      ON public.quick_tasks(created_by, created_at DESC);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'personal_notes') THEN
    CREATE INDEX IF NOT EXISTS idx_personal_notes_user_pinned_updated
      ON public.personal_notes(user_id, is_pinned DESC, updated_at DESC);
  END IF;

  -- 5. Payroll & Salary History
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'salary_history') THEN
    CREATE INDEX IF NOT EXISTS idx_salary_history_emp_effective
      ON public.salary_history(employee_id, effective_date ASC);
  END IF;

  -- 6. Announcements & Rulebook
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'announcements') THEN
    CREATE INDEX IF NOT EXISTS idx_announcements_published_created
      ON public.announcements(published_at DESC, created_at DESC);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_rules') THEN
    CREATE INDEX IF NOT EXISTS idx_company_rules_category_priority
      ON public.company_rules(category, priority DESC);
  END IF;

  -- 7. Security Audit Trail
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'security_audit_logs') THEN
    CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event_created
      ON public.security_audit_logs(event_type, created_at DESC);
  END IF;
END $$;
