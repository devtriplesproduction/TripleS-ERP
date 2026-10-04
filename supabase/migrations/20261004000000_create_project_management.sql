-- ==============================================================================
-- Migration: Create Client, Project & Task Management Module
-- Tables: clients, projects, project_members, tasks, task_assignees, task_comments, project_activity
-- Updates: public.profiles (is_hod, department, designation)
-- ==============================================================================

-- 1. Ensure profiles has is_hod, department, designation fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_hod BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS designation TEXT;

-- Sync existing data from employee_onboarding if matching employee_id exists
UPDATE public.profiles p
SET 
  is_hod = COALESCE(e.is_hod, false),
  department = e.department,
  designation = e.designation
FROM public.employee_onboarding e
WHERE p.employee_id = e.employee_id_number;

-- 2. Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id_display TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    contact_number TEXT,
    whatsapp_number TEXT,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for clients updated_at
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_clients_timestamp ON public.clients;
CREATE TRIGGER update_clients_timestamp
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp_column();

-- 3. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id_display TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    description TEXT,
    start_date DATE,
    deadline DATE,
    status TEXT NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED')),
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    department TEXT,
    project_manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    objective TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_projects_timestamp ON public.projects;
CREATE TRIGGER update_projects_timestamp
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp_column();

-- 4. Project Members Table
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'Member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- 5. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id_display TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    status TEXT NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'ON_HOLD')),
    start_date DATE,
    due_date DATE,
    estimated_hours NUMERIC(6, 2) DEFAULT 0,
    worked_hours NUMERIC(6, 2) DEFAULT 0,
    dependencies TEXT[] DEFAULT '{}',
    attachments JSONB DEFAULT '[]'::jsonb,
    order_index INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_tasks_timestamp ON public.tasks;
CREATE TRIGGER update_tasks_timestamp
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp_column();

-- 6. Task Assignees Table
CREATE TABLE IF NOT EXISTS public.task_assignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    UNIQUE(task_id, user_id)
);

-- 7. Task Comments Table
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_task_comments_timestamp ON public.task_comments;
CREATE TRIGGER update_task_comments_timestamp
    BEFORE UPDATE ON public.task_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp_column();

-- 8. Project Activity Table
CREATE TABLE IF NOT EXISTS public.project_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_activity ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is Admin or Manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (LOWER(role) IN ('admin', 'super admin', 'super_admin', 'manager'))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if current user is HOD, Manager, or Admin
CREATE OR REPLACE FUNCTION public.is_hod_or_above()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (
      is_hod = true 
      OR LOWER(role) IN ('admin', 'super admin', 'super_admin', 'manager')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CLIENTS POLICIES
DROP POLICY IF EXISTS "Clients select policy" ON public.clients;
CREATE POLICY "Clients select policy"
    ON public.clients
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Clients insert policy" ON public.clients;
CREATE POLICY "Clients insert policy"
    ON public.clients
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "Clients update policy" ON public.clients;
CREATE POLICY "Clients update policy"
    ON public.clients
    FOR UPDATE
    TO authenticated
    USING (public.is_admin_or_manager())
    WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "Clients delete policy" ON public.clients;
CREATE POLICY "Clients delete policy"
    ON public.clients
    FOR DELETE
    TO authenticated
    USING (public.is_admin_or_manager());

-- PROJECTS POLICIES
DROP POLICY IF EXISTS "Projects select policy" ON public.projects;
CREATE POLICY "Projects select policy"
    ON public.projects
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Projects insert policy" ON public.projects;
CREATE POLICY "Projects insert policy"
    ON public.projects
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_hod_or_above());

DROP POLICY IF EXISTS "Projects update policy" ON public.projects;
CREATE POLICY "Projects update policy"
    ON public.projects
    FOR UPDATE
    TO authenticated
    USING (public.is_hod_or_above())
    WITH CHECK (public.is_hod_or_above());

DROP POLICY IF EXISTS "Projects delete policy" ON public.projects;
CREATE POLICY "Projects delete policy"
    ON public.projects
    FOR DELETE
    TO authenticated
    USING (public.is_admin_or_manager());

-- PROJECT MEMBERS POLICIES
DROP POLICY IF EXISTS "Project members select policy" ON public.project_members;
CREATE POLICY "Project members select policy"
    ON public.project_members
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Project members insert policy" ON public.project_members;
CREATE POLICY "Project members insert policy"
    ON public.project_members
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_hod_or_above());

DROP POLICY IF EXISTS "Project members update policy" ON public.project_members;
CREATE POLICY "Project members update policy"
    ON public.project_members
    FOR UPDATE
    TO authenticated
    USING (public.is_hod_or_above())
    WITH CHECK (public.is_hod_or_above());

DROP POLICY IF EXISTS "Project members delete policy" ON public.project_members;
CREATE POLICY "Project members delete policy"
    ON public.project_members
    FOR DELETE
    TO authenticated
    USING (public.is_hod_or_above());

-- TASKS POLICIES
DROP POLICY IF EXISTS "Tasks select policy" ON public.tasks;
CREATE POLICY "Tasks select policy"
    ON public.tasks
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Tasks insert policy" ON public.tasks;
CREATE POLICY "Tasks insert policy"
    ON public.tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_hod_or_above());

DROP POLICY IF EXISTS "Tasks update policy" ON public.tasks;
CREATE POLICY "Tasks update policy"
    ON public.tasks
    FOR UPDATE
    TO authenticated
    USING (
      public.is_hod_or_above()
      OR EXISTS (
        SELECT 1 FROM public.task_assignees
        WHERE task_id = tasks.id AND user_id = auth.uid()
      )
    )
    WITH CHECK (
      public.is_hod_or_above()
      OR EXISTS (
        SELECT 1 FROM public.task_assignees
        WHERE task_id = tasks.id AND user_id = auth.uid()
      )
    );

DROP POLICY IF EXISTS "Tasks delete policy" ON public.tasks;
CREATE POLICY "Tasks delete policy"
    ON public.tasks
    FOR DELETE
    TO authenticated
    USING (public.is_hod_or_above());

-- TASK ASSIGNEES POLICIES
DROP POLICY IF EXISTS "Task assignees select policy" ON public.task_assignees;
CREATE POLICY "Task assignees select policy"
    ON public.task_assignees
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Task assignees insert policy" ON public.task_assignees;
CREATE POLICY "Task assignees insert policy"
    ON public.task_assignees
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_hod_or_above());

DROP POLICY IF EXISTS "Task assignees delete policy" ON public.task_assignees;
CREATE POLICY "Task assignees delete policy"
    ON public.task_assignees
    FOR DELETE
    TO authenticated
    USING (public.is_hod_or_above());

-- TASK COMMENTS POLICIES
DROP POLICY IF EXISTS "Task comments select policy" ON public.task_comments;
CREATE POLICY "Task comments select policy"
    ON public.task_comments
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Task comments insert policy" ON public.task_comments;
CREATE POLICY "Task comments insert policy"
    ON public.task_comments
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- PROJECT ACTIVITY POLICIES
DROP POLICY IF EXISTS "Project activity select policy" ON public.project_activity;
CREATE POLICY "Project activity select policy"
    ON public.project_activity
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Project activity insert policy" ON public.project_activity;
CREATE POLICY "Project activity insert policy"
    ON public.project_activity
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
