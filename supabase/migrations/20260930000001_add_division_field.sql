-- Add division field to employee_onboarding
ALTER TABLE public.employee_onboarding
ADD COLUMN IF NOT EXISTS division TEXT;
