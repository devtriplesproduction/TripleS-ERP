CREATE TABLE eod_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    tasks_accomplished TEXT NOT NULL,
    office_hours NUMERIC NOT NULL,
    blockers TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_remarks TEXT,
    UNIQUE(employee_id, report_date)
);

-- RLS
ALTER TABLE eod_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view their own EODs"
    ON eod_reports FOR SELECT
    USING (auth.uid() = employee_id);

CREATE POLICY "Employees can submit their own EODs"
    ON eod_reports FOR INSERT
    WITH CHECK (auth.uid() = employee_id);

-- HR and Super Admin can view all EODs (simplification before formal RBAC)
CREATE POLICY "HR and Super Admin can view all EODs"
    ON eod_reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'HR' OR profiles.role = 'Super Admin')
        )
    );

-- HR and Super Admin can update all EODs (for review)
CREATE POLICY "HR and Super Admin can update EODs"
    ON eod_reports FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'HR' OR profiles.role = 'Super Admin')
        )
    );
