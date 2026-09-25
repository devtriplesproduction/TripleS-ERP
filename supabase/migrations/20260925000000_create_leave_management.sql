-- Migration for Leave Management System
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employee_onboarding(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL CHECK (leave_type IN ('Sick Leave', 'Casual Leave', 'Unpaid Leave', 'Compensatory Off')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_half_day BOOLEAN NOT NULL DEFAULT false,
    reason TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Pending Level', 'Pending HR', 'Approved', 'Rejected', 'Cancelled')) DEFAULT 'Pending Level',
    medical_certificate_url TEXT,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    certificate_verified_by UUID REFERENCES public.employee_onboarding(id) ON DELETE SET NULL,
    first_level_approver_id UUID REFERENCES public.employee_onboarding(id) ON DELETE SET NULL,
    hr_approver_id UUID REFERENCES public.employee_onboarding(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT chk_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS leave_requests_employee_id_idx ON public.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS leave_requests_status_idx ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS leave_requests_start_date_idx ON public.leave_requests(start_date);

CREATE TABLE IF NOT EXISTS public.comp_off_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employee_onboarding(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('CREDIT', 'DEBIT', 'REVERSAL')),
    hours NUMERIC NOT NULL CHECK (hours > 0),
    reference_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comp_off_ledger_employee_id_idx ON public.comp_off_ledger(employee_id);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comp_off_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public full access to leave_requests"
    ON public.leave_requests
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow public full access to comp_off_ledger"
    ON public.comp_off_ledger
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE TRIGGER update_leave_requests_modtime
    BEFORE UPDATE ON public.leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
