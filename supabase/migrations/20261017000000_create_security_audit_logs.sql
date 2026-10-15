-- ==============================================================================
-- 20261017000000_create_security_audit_logs.sql
-- TripleS ERP — Employee Login & Security Audit Logs Table
-- Append-only security audit trail with strict RLS and indexing.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    employee_id UUID REFERENCES public.employee_onboarding(id) ON DELETE SET NULL,
    employee_id_number TEXT,
    employee_name TEXT,
    event_type TEXT NOT NULL, 
    -- e.g. 'login_success', 'login_failed', 'logout', 'session_refresh', 'password_change', 'password_reset', 'session_revoked', 'suspicious_attempt'
    status TEXT NOT NULL DEFAULT 'Success', -- 'Success' | 'Failed'
    auth_method TEXT DEFAULT 'Password',
    ip_address TEXT,
    ip_classification TEXT DEFAULT 'Unavailable', -- 'Localhost' | 'Private Network' | 'Public IP' | 'Unavailable'
    location TEXT,
    user_agent TEXT,
    browser TEXT,
    os TEXT,
    device TEXT,
    session_id TEXT,
    session_status TEXT DEFAULT 'Active', -- 'Active' | 'Logged Out' | 'Revoked' | 'Expired'
    is_suspicious BOOLEAN DEFAULT FALSE,
    flag_reason TEXT, -- e.g. 'New Device', 'Unusual Login', 'Multiple Failed Attempts'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure ip_classification column exists if table was previously created
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS ip_classification TEXT DEFAULT 'Unavailable';


-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE SEARCH & FILTERING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON public.security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_employee_id ON public.security_audit_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_emp_num ON public.security_audit_logs(employee_id_number);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event_type ON public.security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_status ON public.security_audit_logs(status);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created_at ON public.security_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_ip ON public.security_audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_session ON public.security_audit_logs(session_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) & APPEND-ONLY INTEGRITY
-- ==============================================================================
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. SELECT POLICY:
-- Ordinary employees can ONLY view their own audit records.
-- HR, Admin, and Super Admin can view all records across the company.
DROP POLICY IF EXISTS "security_audit_logs_select_policy" ON public.security_audit_logs;
CREATE POLICY "security_audit_logs_select_policy"
    ON public.security_audit_logs
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('HR', 'Admin', 'Super Admin')
        )
    );

-- 2. INSERT POLICY:
-- Allows authenticated server actions / API routes to record append-only security events.
DROP POLICY IF EXISTS "security_audit_logs_insert_policy" ON public.security_audit_logs;
CREATE POLICY "security_audit_logs_insert_policy"
    ON public.security_audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 3. NO UPDATE OR DELETE POLICIES FOR ORDINARY USERS:
-- Ensures strict append-only audit trail immutability. Ordinary users cannot alter or purge logs.
-- Only database superusers / service role key can execute maintenance or retention cleanups.
