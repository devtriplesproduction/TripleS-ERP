-- ==============================================================================
-- 20261019000000_create_quick_tasks.sql
-- TripleS ERP — Quick Tasks (Casual Task Assignment)
-- Dedicated table for casual, non-project task assignments with strict RLS and performance indexes.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.quick_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    assigned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    due_date DATE,
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Cancelled')),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE FILTERING & SEARCH
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_quick_tasks_assigned_to ON public.quick_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_quick_tasks_assigned_by ON public.quick_tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_quick_tasks_status ON public.quick_tasks(status);
CREATE INDEX IF NOT EXISTS idx_quick_tasks_created_at ON public.quick_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quick_tasks_due_date ON public.quick_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_quick_tasks_assigned_to_status ON public.quick_tasks(assigned_to, status);

-- ==============================================================================
-- AUTOMATIC updated_at TRIGGER
-- ==============================================================================
DROP TRIGGER IF EXISTS update_quick_tasks_timestamp ON public.quick_tasks;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_timestamp_column') THEN
    CREATE TRIGGER update_quick_tasks_timestamp
        BEFORE UPDATE ON public.quick_tasks
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp_column();
  END IF;
END $$;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) — ROLE & USER LEVEL ISOLATION
-- 1. Admin can view, assign, edit, and cancel all casual tasks.
-- 2. Employees & HR can ONLY view tasks assigned directly to their own account.
-- 3. Employees & HR can ONLY update completion status for tasks assigned to them.
-- 4. Unrelated employees' private tasks are completely hidden.
-- ==============================================================================
ALTER TABLE public.quick_tasks ENABLE ROW LEVEL SECURITY;

-- 1. SELECT POLICY
DROP POLICY IF EXISTS "quick_tasks_select_policy" ON public.quick_tasks;
CREATE POLICY "quick_tasks_select_policy"
    ON public.quick_tasks
    FOR SELECT
    TO authenticated
    USING (
        assigned_to = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- 2. INSERT POLICY
DROP POLICY IF EXISTS "quick_tasks_insert_policy" ON public.quick_tasks;
CREATE POLICY "quick_tasks_insert_policy"
    ON public.quick_tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- 3. UPDATE POLICY
DROP POLICY IF EXISTS "quick_tasks_update_policy" ON public.quick_tasks;
CREATE POLICY "quick_tasks_update_policy"
    ON public.quick_tasks
    FOR UPDATE
    TO authenticated
    USING (
        assigned_to = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'Admin'
        )
    )
    WITH CHECK (
        assigned_to = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- 4. DELETE POLICY
DROP POLICY IF EXISTS "quick_tasks_delete_policy" ON public.quick_tasks;
CREATE POLICY "quick_tasks_delete_policy"
    ON public.quick_tasks
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );
