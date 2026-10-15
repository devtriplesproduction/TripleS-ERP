-- ==============================================================================
-- 20261018000000_create_personal_notes.sql
-- TripleS ERP — Personal Notes (Google Keep Style)
-- Private, user-isolated personal notes table with strict RLS and performance indexes.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.personal_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT NOT NULL DEFAULT '',
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE SEARCH & FILTERING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_personal_notes_user_id ON public.personal_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_notes_user_archived ON public.personal_notes(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_personal_notes_user_pinned ON public.personal_notes(user_id, is_pinned);
CREATE INDEX IF NOT EXISTS idx_personal_notes_updated_at ON public.personal_notes(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_personal_notes_deleted_at ON public.personal_notes(user_id, deleted_at);

-- ==============================================================================
-- AUTOMATIC updated_at TRIGGER
-- ==============================================================================
DROP TRIGGER IF EXISTS update_personal_notes_timestamp ON public.personal_notes;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_timestamp_column') THEN
    CREATE TRIGGER update_personal_notes_timestamp
        BEFORE UPDATE ON public.personal_notes
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp_column();
  END IF;
END $$;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) — STRICT USER-LEVEL ISOLATION
-- Every user can ONLY view, create, edit, pin, archive, and delete their own notes.
-- Neither Admin nor HR accounts have automatic access to employee personal notes.
-- Unauthenticated users have zero access.
-- ==============================================================================
ALTER TABLE public.personal_notes ENABLE ROW LEVEL SECURITY;

-- 1. SELECT POLICY: Authenticated users can ONLY view their own non-deleted notes
DROP POLICY IF EXISTS "personal_notes_select_policy" ON public.personal_notes;
CREATE POLICY "personal_notes_select_policy"
    ON public.personal_notes
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 2. INSERT POLICY: Authenticated users can ONLY insert notes for themselves
DROP POLICY IF EXISTS "personal_notes_insert_policy" ON public.personal_notes;
CREATE POLICY "personal_notes_insert_policy"
    ON public.personal_notes
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE POLICY: Authenticated users can ONLY update their own notes
DROP POLICY IF EXISTS "personal_notes_update_policy" ON public.personal_notes;
CREATE POLICY "personal_notes_update_policy"
    ON public.personal_notes
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. DELETE POLICY: Authenticated users can ONLY delete their own notes
DROP POLICY IF EXISTS "personal_notes_delete_policy" ON public.personal_notes;
CREATE POLICY "personal_notes_delete_policy"
    ON public.personal_notes
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
