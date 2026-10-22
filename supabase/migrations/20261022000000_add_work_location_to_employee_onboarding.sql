-- ==============================================================================
-- 20261022000000_add_work_location_to_employee_onboarding.sql
-- TripleS ERP — Add work_location to employee_onboarding
-- ==============================================================================

ALTER TABLE public.employee_onboarding
ADD COLUMN IF NOT EXISTS work_location TEXT DEFAULT 'Satara (Office)';
