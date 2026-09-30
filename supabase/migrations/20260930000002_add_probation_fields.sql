-- Migration to add probation fields
ALTER TABLE public.employee_onboarding
ADD COLUMN IF NOT EXISTS probation_start_date DATE,
ADD COLUMN IF NOT EXISTS probation_end_date DATE,
ADD COLUMN IF NOT EXISTS probation_period TEXT;
