-- ==============================================================================
-- Migration: Complete Enterprise Payroll System Implementation
-- Description: Creates payroll_runs, payroll_items, payroll_deductions tables,
--              hardens salary_history RLS security, and sets up RLS policies.
-- ==============================================================================

-- 1. Create payroll_runs table
CREATE TABLE IF NOT EXISTS public.payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CALCULATED', 'REVIEWED', 'APPROVED', 'FINALIZED')),
    total_employees INTEGER NOT NULL DEFAULT 0,
    total_payout NUMERIC(14, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finalized_at TIMESTAMPTZ,
    finalized_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    UNIQUE(year, month)
);

-- 2. Create payroll_items table (Immutable historical snapshot)
CREATE TABLE IF NOT EXISTS public.payroll_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employee_onboarding(id) ON DELETE CASCADE,
    name VARCHAR(255),
    department VARCHAR(100),
    designation VARCHAR(100),
    employee_id_number VARCHAR(100),

    -- Compensation and hours snapshot
    salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
    standard_hours NUMERIC(8, 2) NOT NULL DEFAULT 208,
    actual_worked_hours NUMERIC(8, 2) NOT NULL DEFAULT 0,
    credited_leave_hours NUMERIC(8, 2) NOT NULL DEFAULT 0,
    unpaid_leave_hours NUMERIC(8, 2) NOT NULL DEFAULT 0,
    paid_holiday_hours NUMERIC(8, 2) NOT NULL DEFAULT 0,
    wfh_hours NUMERIC(8, 2) NOT NULL DEFAULT 0,
    extra_hours NUMERIC(8, 2) NOT NULL DEFAULT 0,
    short_hours NUMERIC(8, 2) NOT NULL DEFAULT 0,
    total_paid_hours NUMERIC(8, 2) NOT NULL DEFAULT 0,

    -- Day counts and payable hours
    days_full_day NUMERIC(6, 2) NOT NULL DEFAULT 0,
    days_half_day NUMERIC(6, 2) NOT NULL DEFAULT 0,
    days_unpaid_leave_eod NUMERIC(6, 2) NOT NULL DEFAULT 0,
    days_absent NUMERIC(6, 2) NOT NULL DEFAULT 0,
    payable_worked_hours NUMERIC(8, 2) NOT NULL DEFAULT 0,
    payable_hours NUMERIC(8, 2) NOT NULL DEFAULT 0,
    comp_off_minutes_earned NUMERIC(10, 2) NOT NULL DEFAULT 0,

    -- Financial calculations
    overtime_pay NUMERIC(12, 2) NOT NULL DEFAULT 0,
    attendance_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
    unpaid_leave_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
    manual_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0,
    short_hours_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
    gross_pay NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_payable NUMERIC(12, 2) NOT NULL DEFAULT 0,

    -- Audit and lock flags
    is_locked BOOLEAN NOT NULL DEFAULT true,
    has_payroll_data BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(payroll_run_id, employee_id)
);

-- 3. Create payroll_deductions table
CREATE TABLE IF NOT EXISTS public.payroll_deductions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employee_onboarding(id) ON DELETE CASCADE,
    payroll_year INTEGER NOT NULL CHECK (payroll_year >= 2000 AND payroll_year <= 2100),
    payroll_month INTEGER NOT NULL CHECK (payroll_month >= 1 AND payroll_month <= 12),
    deduction_type VARCHAR(100) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payroll_runs_year_month ON public.payroll_runs(year, month);
CREATE INDEX IF NOT EXISTS idx_payroll_items_run_emp ON public.payroll_items(payroll_run_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_emp ON public.payroll_items(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_deductions_lookup ON public.payroll_deductions(employee_id, payroll_year, payroll_month, status);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_history ENABLE ROW LEVEL SECURITY;

-- 5. Fix overly permissive salary_history policy
DROP POLICY IF EXISTS "Allow public full access to salary_history" ON public.salary_history;
DROP POLICY IF EXISTS "HR and Admin can manage salary_history" ON public.salary_history;
DROP POLICY IF EXISTS "Employees can view own salary_history" ON public.salary_history;

CREATE POLICY "HR and Admin can manage salary_history"
    ON public.salary_history FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'HR' OR profiles.role = 'Admin' OR profiles.role = 'Super Admin')
        )
    );

CREATE POLICY "Employees can view own salary_history"
    ON public.salary_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.employee_onboarding e
            JOIN public.profiles p ON e.employee_id_number = p.employee_id
            WHERE e.id = salary_history.employee_id
            AND p.id = auth.uid()
        )
    );

-- 6. Payroll Runs Policies
DROP POLICY IF EXISTS "HR and Super Admin can manage payroll_runs" ON public.payroll_runs;
CREATE POLICY "HR and Super Admin can manage payroll_runs"
    ON public.payroll_runs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'HR' OR profiles.role = 'Admin' OR profiles.role = 'Super Admin')
        )
    );

-- 7. Payroll Items Policies
DROP POLICY IF EXISTS "HR and Super Admin can manage payroll_items" ON public.payroll_items;
DROP POLICY IF EXISTS "Employees can view own payroll_items" ON public.payroll_items;

CREATE POLICY "HR and Super Admin can manage payroll_items"
    ON public.payroll_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'HR' OR profiles.role = 'Admin' OR profiles.role = 'Super Admin')
        )
    );

CREATE POLICY "Employees can view own payroll_items"
    ON public.payroll_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.employee_onboarding e
            JOIN public.profiles p ON e.employee_id_number = p.employee_id
            WHERE e.id = payroll_items.employee_id
            AND p.id = auth.uid()
        )
    );

-- 8. Payroll Deductions Policies
DROP POLICY IF EXISTS "HR and Admin can manage payroll deductions" ON public.payroll_deductions;
DROP POLICY IF EXISTS "Employees can view own payroll deductions" ON public.payroll_deductions;

CREATE POLICY "HR and Admin can manage payroll deductions"
    ON public.payroll_deductions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'HR' OR profiles.role = 'Admin' OR profiles.role = 'Super Admin')
        )
    );

CREATE POLICY "Employees can view own payroll deductions"
    ON public.payroll_deductions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.employee_onboarding e
            JOIN public.profiles p ON e.employee_id_number = p.employee_id
            WHERE e.id = payroll_deductions.employee_id
            AND p.id = auth.uid()
        )
    );
