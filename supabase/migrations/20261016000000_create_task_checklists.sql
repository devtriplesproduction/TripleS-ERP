-- ==============================================================================
-- 20261016000000_create_task_checklists.sql
-- Execution Checklist for Project Management Tasks
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.task_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for high-performance lookup by task_id
CREATE INDEX IF NOT EXISTS idx_task_checklists_task_id ON public.task_checklists(task_id);
CREATE INDEX IF NOT EXISTS idx_task_checklists_order ON public.task_checklists(task_id, order_index);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_task_checklists_timestamp ON public.task_checklists;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_timestamp_column') THEN
    CREATE TRIGGER update_task_checklists_timestamp
        BEFORE UPDATE ON public.task_checklists
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp_column();
  END IF;
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;

-- 1. SELECT POLICY: Authenticated users can view task checklists
DROP POLICY IF EXISTS "Task checklists select policy" ON public.task_checklists;
CREATE POLICY "Task checklists select policy"
    ON public.task_checklists
    FOR SELECT
    TO authenticated
    USING (true);

-- 2. INSERT POLICY: HOD / Admin / Manager or task assignees can add checklist items
DROP POLICY IF EXISTS "Task checklists insert policy" ON public.task_checklists;
CREATE POLICY "Task checklists insert policy"
    ON public.task_checklists
    FOR INSERT
    TO authenticated
    WITH CHECK (
      public.is_hod_or_above()
      OR EXISTS (
        SELECT 1 FROM public.task_assignees
        WHERE task_id = task_checklists.task_id AND user_id = auth.uid()
      )
    );

-- 3. UPDATE POLICY: HOD / Admin / Manager or task assignees can toggle or edit checklist items
DROP POLICY IF EXISTS "Task checklists update policy" ON public.task_checklists;
CREATE POLICY "Task checklists update policy"
    ON public.task_checklists
    FOR UPDATE
    TO authenticated
    USING (
      public.is_hod_or_above()
      OR EXISTS (
        SELECT 1 FROM public.task_assignees
        WHERE task_id = task_checklists.task_id AND user_id = auth.uid()
      )
    )
    WITH CHECK (
      public.is_hod_or_above()
      OR EXISTS (
        SELECT 1 FROM public.task_assignees
        WHERE task_id = task_checklists.task_id AND user_id = auth.uid()
      )
    );

-- 4. DELETE POLICY: HOD / Admin / Manager or task assignees can remove checklist items
DROP POLICY IF EXISTS "Task checklists delete policy" ON public.task_checklists;
CREATE POLICY "Task checklists delete policy"
    ON public.task_checklists
    FOR DELETE
    TO authenticated
    USING (
      public.is_hod_or_above()
      OR EXISTS (
        SELECT 1 FROM public.task_assignees
        WHERE task_id = task_checklists.task_id AND user_id = auth.uid()
      )
    );
