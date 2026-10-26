-- Migration: Create employee-specific payroll deductions table
-- Allows Admin and HR to add fixed deductions for a selected employee and payroll month.

CREATE TABLE IF NOT EXISTS public.payroll_deductions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Efficient indexing for payroll run lookup and deduplication
CREATE INDEX IF NOT EXISTS idx_payroll_deductions_lookup 
    ON public.payroll_deductions(employee_id, payroll_year, payroll_month, status);

CREATE INDEX IF NOT EXISTS idx_payroll_deductions_period 
    ON public.payroll_deductions(payroll_year, payroll_month);

-- Enable RLS
ALTER TABLE public.payroll_deductions ENABLE ROW LEVEL SECURITY;

-- Allow HR and Admin to manage payroll deductions
CREATE POLICY "HR and Admin can manage payroll deductions"
    ON public.payroll_deductions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'HR' OR profiles.role = 'Admin' OR profiles.role = 'Super Admin')
        )
    );

-- Allow Employees to view their own deductions
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
