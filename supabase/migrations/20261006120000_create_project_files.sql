CREATE TABLE IF NOT EXISTS public.project_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- Allow project managers and members to read files
CREATE POLICY "Project members can read project files"
ON public.project_files
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_files.project_id
        AND (
            p.project_manager_id = auth.uid()
            OR
            EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid())
            OR
            EXISTS (SELECT 1 FROM public.tasks t JOIN public.task_assignees ta ON ta.task_id = t.id WHERE t.project_id = p.id AND ta.user_id = auth.uid())
        )
    )
);

-- Allow uploads and deletions for HOD/Admins or project manager
CREATE POLICY "Authorized users can manage project files"
ON public.project_files
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_files.project_id
        AND (
            p.project_manager_id = auth.uid()
            OR
            (SELECT is_hod FROM public.profiles WHERE id = auth.uid()) = true
            OR
            (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
            OR
            EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid())
        )
    )
);
