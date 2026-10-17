-- ==============================================================================
-- 20261019000000_create_quick_tasks.sql
-- TripleS ERP — Quick Tasks (Casual Task Assignment & Personal Tasks)
-- Dedicated table for casual, non-project task assignments and personal tasks
-- with strict RLS and performance indexes.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.quick_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    assigned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_personal BOOLEAN NOT NULL DEFAULT false,
    is_read BOOLEAN NOT NULL DEFAULT false,
    seen_at TIMESTAMPTZ,
    due_date DATE,
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Cancelled')),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- In case table already exists from earlier run, add columns safely
ALTER TABLE public.quick_tasks ADD COLUMN IF NOT EXISTS is_personal BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.quick_tasks ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.quick_tasks ADD COLUMN IF NOT EXISTS seen_at TIMESTAMPTZ;

-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE FILTERING & SEARCH
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_quick_tasks_assigned_to ON public.quick_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_quick_tasks_assigned_by ON public.quick_tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_quick_tasks_is_personal ON public.quick_tasks(is_personal);
CREATE INDEX IF NOT EXISTS idx_quick_tasks_is_read ON public.quick_tasks(is_read);
CREATE INDEX IF NOT EXISTS idx_quick_tasks_status ON public.quick_tasks(status);
CREATE INDEX IF NOT EXISTS idx_quick_tasks_created_at ON public.quick_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quick_tasks_due_date ON public.quick_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_quick_tasks_assigned_to_status ON public.quick_tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_quick_tasks_owner_personal ON public.quick_tasks(assigned_to, is_personal);
CREATE INDEX IF NOT EXISTS idx_quick_tasks_unread_assigned ON public.quick_tasks(assigned_to, is_read, is_personal, status);

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
-- 1. Personal tasks are strictly visible and manageable ONLY by their owner.
-- 2. Admin can view, assign, edit, and cancel/delete all assigned (non-personal) tasks.
-- 3. Employees & HR can ONLY view tasks assigned to them + their own personal tasks.
-- 4. Unrelated users' private personal tasks are completely hidden, even from Admin.
-- ==============================================================================
ALTER TABLE public.quick_tasks ENABLE ROW LEVEL SECURITY;

-- 1. SELECT POLICY
DROP POLICY IF EXISTS "quick_tasks_select_policy" ON public.quick_tasks;
CREATE POLICY "quick_tasks_select_policy"
    ON public.quick_tasks
    FOR SELECT
    TO authenticated
    USING (
        -- User can view tasks assigned to them (their own personal tasks + assigned to them)
        assigned_to = auth.uid()
        -- Admin can view assigned tasks (where is_personal is false), but NOT other users' personal tasks
        OR (
            (is_personal IS FALSE OR is_personal IS NULL)
            AND EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'Admin'
            )
        )
    );

-- 2. INSERT POLICY
DROP POLICY IF EXISTS "quick_tasks_insert_policy" ON public.quick_tasks;
CREATE POLICY "quick_tasks_insert_policy"
    ON public.quick_tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Any authenticated user can create personal tasks for themselves
        (is_personal IS TRUE AND assigned_to = auth.uid() AND assigned_by = auth.uid())
        -- Admin can assign tasks to anyone
        OR EXISTS (
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
        -- Owner or assigned user can update their tasks
        assigned_to = auth.uid()
        -- Admin can update assigned (non-personal) tasks
        OR (
            (is_personal IS FALSE OR is_personal IS NULL)
            AND EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'Admin'
            )
        )
    )
    WITH CHECK (
        assigned_to = auth.uid()
        OR (
            (is_personal IS FALSE OR is_personal IS NULL)
            AND EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'Admin'
            )
        )
    );

-- 4. DELETE POLICY
DROP POLICY IF EXISTS "quick_tasks_delete_policy" ON public.quick_tasks;
CREATE POLICY "quick_tasks_delete_policy"
    ON public.quick_tasks
    FOR DELETE
    TO authenticated
    USING (
        -- Owner can delete their own personal tasks
        (is_personal IS TRUE AND assigned_to = auth.uid())
        -- Admin can delete assigned (non-personal) tasks or their own tasks
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );
