CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'CALCULATED', 'REVIEWED', 'APPROVED', 'FINALIZED'
    total_employees INTEGER NOT NULL DEFAULT 0,
    total_payout NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finalized_at TIMESTAMPTZ,
    finalized_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    UNIQUE(year, month)
);

CREATE TABLE IF NOT EXISTS payroll_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employee_onboarding(id) ON DELETE CASCADE,
    
    -- Snapshot data to preserve exact math
    salary NUMERIC NOT NULL,
    standard_hours NUMERIC NOT NULL,
    actual_worked_hours NUMERIC NOT NULL,
    credited_leave_hours NUMERIC NOT NULL,
    paid_holiday_hours NUMERIC NOT NULL,
    wfh_hours NUMERIC NOT NULL,
    extra_hours NUMERIC NOT NULL,
    short_hours NUMERIC NOT NULL,
    total_paid_hours NUMERIC NOT NULL,
    
    -- Snapshot monetary values
    overtime_pay NUMERIC NOT NULL DEFAULT 0,
    unpaid_leave_deduction NUMERIC NOT NULL DEFAULT 0,
    short_hours_deduction NUMERIC NOT NULL DEFAULT 0,
    gross_pay NUMERIC NOT NULL DEFAULT 0,
    net_payable NUMERIC NOT NULL DEFAULT 0,
    
    -- Record-keeping
    is_locked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(payroll_run_id, employee_id)
);

-- RLS Policies
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;

-- Allow HR and Super Admin to manage payroll
CREATE POLICY "HR and Super Admin can manage payroll_runs"
    ON payroll_runs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'HR' OR profiles.role = 'Super Admin')
        )
    );

CREATE POLICY "HR and Super Admin can manage payroll_items"
    ON payroll_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'HR' OR profiles.role = 'Super Admin')
        )
    );

-- Allow Employees to view their own payroll_items
CREATE POLICY "Employees can view own payroll_items"
    ON payroll_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM employee_onboarding e
            JOIN profiles p ON e.employee_id_number = p.employee_id
            WHERE e.id = payroll_items.employee_id
            AND p.id = auth.uid()
        )
    );
