-- ==============================================================================
-- 20261021000000_user_notification_cleared.sql
-- TripleS ERP — Per-User Notification Clearing & Feed Isolation
-- Allows individual users to clear their notification bell feed without altering
-- shared announcements, rulebook policies, holidays, or other users' feed state.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.user_notification_clears (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cleared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    cleared_ids TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT user_notification_clears_user_id_key UNIQUE (user_id)
);

-- Index for instant lookup by authenticated user ID
CREATE INDEX IF NOT EXISTS idx_user_notification_clears_user_id 
ON public.user_notification_clears(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_notification_clears ENABLE ROW LEVEL SECURITY;

-- 1. SELECT POLICY: Authenticated users can ONLY view their own clear state
DROP POLICY IF EXISTS "user_notification_clears_select_policy" ON public.user_notification_clears;
CREATE POLICY "user_notification_clears_select_policy"
    ON public.user_notification_clears
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 2. INSERT POLICY: Authenticated users can ONLY insert their own clear state
DROP POLICY IF EXISTS "user_notification_clears_insert_policy" ON public.user_notification_clears;
CREATE POLICY "user_notification_clears_insert_policy"
    ON public.user_notification_clears
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE POLICY: Authenticated users can ONLY update their own clear state
DROP POLICY IF EXISTS "user_notification_clears_update_policy" ON public.user_notification_clears;
CREATE POLICY "user_notification_clears_update_policy"
    ON public.user_notification_clears
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. DELETE POLICY: Authenticated users can ONLY delete their own clear state
DROP POLICY IF EXISTS "user_notification_clears_delete_policy" ON public.user_notification_clears;
CREATE POLICY "user_notification_clears_delete_policy"
    ON public.user_notification_clears
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
