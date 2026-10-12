-- ==============================================================================
-- Migration: Batch Operations, Background Job Queue, and Idempotency Safety
-- ==============================================================================

-- 1. Ensure Comp-Off Ledger Concurrency & Idempotency Safety
-- Guarantees that concurrent approval requests or retries never duplicate CREDIT transactions for the same EOD/reference
CREATE UNIQUE INDEX IF NOT EXISTS idx_comp_off_ledger_unique_credit 
  ON public.comp_off_ledger(reference_id, transaction_type) 
  WHERE transaction_type = 'CREDIT' AND reference_id IS NOT NULL;

-- 2. Durable Background Job Queue Table
-- Lightweight, durable queue compatible with Vercel and Supabase architecture
CREATE TABLE IF NOT EXISTS public.background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB DEFAULT NULL,
    idempotency_key TEXT UNIQUE,
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    last_error TEXT DEFAULT NULL,
    locked_until TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for Queue Polling and Idempotency
CREATE INDEX IF NOT EXISTS idx_background_jobs_status_created 
  ON public.background_jobs(status, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_background_jobs_type_status 
  ON public.background_jobs(job_type, status);

ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access to background_jobs"
    ON public.background_jobs
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 3. Atomic Batch Review RPC
-- Atomically reviews multiple EOD reports in one SQL statement
CREATE OR REPLACE FUNCTION batch_review_eods_rpc(
  p_eod_ids UUID[],
  p_status VARCHAR(50),
  p_rejection_reason TEXT DEFAULT NULL
) RETURNS UUID[] AS $$
DECLARE
  v_updated_ids UUID[];
BEGIN
  WITH updated AS (
    UPDATE public.eod_reports
    SET
      status = p_status,
      rejection_reason = CASE WHEN p_status = 'Approved' THEN NULL ELSE p_rejection_reason END,
      approved_by = auth.uid(),
      approved_at = NOW(),
      updated_at = NOW()
    WHERE id = ANY(p_eod_ids)
      AND status != p_status
    RETURNING id
  )
  SELECT array_agg(id) INTO v_updated_ids FROM updated;

  RETURN COALESCE(v_updated_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Activity Logs Table (Audit Logging)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    actor_email TEXT NOT NULL,
    user_id UUID,
    target_user_id UUID,
    details JSONB,
    severity TEXT DEFAULT 'INFO',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created 
  ON public.activity_logs(created_at DESC);

-- 5. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
  ON public.notifications(user_id, is_read, created_at DESC);

