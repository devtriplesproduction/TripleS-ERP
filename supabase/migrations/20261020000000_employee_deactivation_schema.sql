-- ==============================================================================
-- 20261020000000_employee_deactivation_schema.sql
-- TripleS ERP — Employee Deactivation & Reactivation Schema Support
-- Adds audit fields for employee deactivation lifecycle without corrupting historical records.
-- ==============================================================================

-- 1. Add deactivation/reactivation lifecycle fields to employee_onboarding
ALTER TABLE public.employee_onboarding
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS deactivation_reason TEXT,
ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reactivated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Add matching fields and is_active flag to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS deactivation_reason TEXT,
ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reactivated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Indexes for fast filtering on active / inactive records
CREATE INDEX IF NOT EXISTS idx_employee_onboarding_emp_status 
ON public.employee_onboarding(employment_status);

CREATE INDEX IF NOT EXISTS idx_profiles_is_active 
ON public.profiles(is_active);
