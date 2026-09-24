-- Migration for Employee Onboarding Module (All-in-One)

CREATE TABLE IF NOT EXISTS public.employee_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    job_title TEXT NOT NULL,
    department TEXT NOT NULL,
    joining_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'In Progress', 'Completed')),
    
    -- Expanded fields from multi-step wizard
    dob DATE,
    gender TEXT,
    personal_email TEXT,
    address TEXT,
    emergency_contact TEXT,
    employment_type TEXT DEFAULT 'full-time',
    salary NUMERIC,
    experience NUMERIC,
    employee_id_number TEXT UNIQUE,
    password_hash TEXT,
    profile_photo TEXT,
    reporting_manager TEXT,
    notes TEXT,
    documents JSONB DEFAULT '[]'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to update 'updated_at'
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employee_onboarding_modtime
    BEFORE UPDATE ON public.employee_onboarding
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


CREATE TABLE IF NOT EXISTS public.onboarding_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employee_onboarding(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_onboarding_tasks_modtime
    BEFORE UPDATE ON public.onboarding_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Setup Row Level Security (RLS)
ALTER TABLE public.employee_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;

-- Note: We are allowing public/anonymous access for testing purposes.
-- In a real production setup, this would be tied to specific roles (e.g., HR only) with `TO authenticated`.

CREATE POLICY "Allow public full access to employee_onboarding"
    ON public.employee_onboarding
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow public full access to onboarding_tasks"
    ON public.onboarding_tasks
    FOR ALL
    USING (true)
    WITH CHECK (true);
