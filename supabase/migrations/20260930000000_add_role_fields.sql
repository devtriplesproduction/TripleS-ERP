-- Migration to add role and is_hod fields
ALTER TABLE public.employee_onboarding
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Employee',
ADD COLUMN IF NOT EXISTS is_hod BOOLEAN DEFAULT false;
