-- Migration: Create Session Screenshots Table for TripleS Time Tracker (Idempotent & Safe)

CREATE TABLE IF NOT EXISTS public.session_screenshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.time_sessions(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    storage_path TEXT,
    image_url TEXT,
    image_data TEXT,
    file_size_bytes BIGINT DEFAULT 0,
    app_name TEXT,
    window_title TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_screenshots_session ON public.session_screenshots (session_id);
CREATE INDEX IF NOT EXISTS idx_session_screenshots_emp_date ON public.session_screenshots (employee_id, session_date);
CREATE INDEX IF NOT EXISTS idx_session_screenshots_captured_at ON public.session_screenshots (captured_at DESC);

-- Enable RLS
ALTER TABLE public.session_screenshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Employees can view own screenshots" ON public.session_screenshots;
CREATE POLICY "Employees can view own screenshots"
    ON public.session_screenshots FOR SELECT
    USING (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Employees can insert own screenshots" ON public.session_screenshots;
CREATE POLICY "Employees can insert own screenshots"
    ON public.session_screenshots FOR INSERT
    WITH CHECK (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Admin can view all screenshots" ON public.session_screenshots;
CREATE POLICY "Admin can view all screenshots"
    ON public.session_screenshots FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'Admin' OR profiles.role = 'Super Admin')
        )
    );

