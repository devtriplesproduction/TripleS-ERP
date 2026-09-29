CREATE TABLE IF NOT EXISTS public.salary_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employee_onboarding(id) ON DELETE CASCADE,
    previous_salary NUMERIC NOT NULL,
    new_salary NUMERIC NOT NULL,
    increment_percentage NUMERIC NOT NULL,
    effective_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.salary_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public full access to salary_history"
    ON public.salary_history
    FOR ALL
    USING (true)
    WITH CHECK (true);
