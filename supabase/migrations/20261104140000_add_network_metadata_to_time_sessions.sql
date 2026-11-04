-- ==============================================================================
-- 20261104140000_add_network_metadata_to_time_sessions.sql
-- TripleS ERP — Network, Geolocation, and Client Telemetry Schema Migration
-- Idempotent, safe migration that preserves all existing records without modification.
-- ==============================================================================

-- 1. Extend public.time_sessions with nullable network & client telemetry columns
ALTER TABLE public.time_sessions ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.time_sessions ADD COLUMN IF NOT EXISTS ip_classification TEXT DEFAULT 'Unavailable';
ALTER TABLE public.time_sessions ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.time_sessions ADD COLUMN IF NOT EXISTS isp TEXT;
ALTER TABLE public.time_sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.time_sessions ADD COLUMN IF NOT EXISTS browser TEXT;
ALTER TABLE public.time_sessions ADD COLUMN IF NOT EXISTS os TEXT;
ALTER TABLE public.time_sessions ADD COLUMN IF NOT EXISTS device TEXT;
ALTER TABLE public.time_sessions ADD COLUMN IF NOT EXISTS client_type TEXT;
ALTER TABLE public.time_sessions ADD COLUMN IF NOT EXISTS app_version TEXT;

CREATE INDEX IF NOT EXISTS idx_time_sessions_ip ON public.time_sessions(ip_address);

-- 2. Extend public.security_audit_logs with structured device & geolocation columns
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS client_type TEXT;
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS app_name TEXT;
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS app_version TEXT;
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS runtime TEXT;
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS browser_version TEXT;
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS browser_engine TEXT;
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS os_version TEXT;
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS isp TEXT;
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS timezone TEXT;
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS clock_in TIMESTAMPTZ;
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS clock_out TIMESTAMPTZ;
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS worked_minutes INTEGER;
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS active_minutes INTEGER;
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;
