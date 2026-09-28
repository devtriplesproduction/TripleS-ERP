-- 1. Add role_context column
ALTER TABLE public.eod_reports ADD COLUMN role_context TEXT DEFAULT 'Employee';

-- 2. Drop the old unique constraint (if it exists)
-- Replace 'eod_reports_employee_id_report_date_key' with the actual constraint name if different
ALTER TABLE public.eod_reports DROP CONSTRAINT IF EXISTS eod_reports_employee_id_report_date_key;
ALTER TABLE public.eod_reports DROP CONSTRAINT IF EXISTS eod_reports_employee_id_report_date_idx;

-- 3. Add a new unique constraint that includes role_context
ALTER TABLE public.eod_reports ADD CONSTRAINT eod_reports_employee_date_role_unique UNIQUE (employee_id, report_date, role_context);
