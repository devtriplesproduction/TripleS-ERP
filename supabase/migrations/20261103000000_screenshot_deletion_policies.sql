-- Migration: Screenshot Deletion RLS & Storage Policies
-- Authorizes Admin and HR roles to delete desktop screenshots and storage objects.
-- Strictly prevents ordinary employees from deleting screenshot evidence.

-- 1. Table Policies on public.session_screenshots
ALTER TABLE public.session_screenshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin and HR can delete screenshots" ON public.session_screenshots;
CREATE POLICY "Admin and HR can delete screenshots"
    ON public.session_screenshots FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('Admin', 'Super Admin', 'HR')
        )
    );

-- Also allow HR to view screenshots alongside Admin
DROP POLICY IF EXISTS "Admin and HR can view all screenshots" ON public.session_screenshots;
CREATE POLICY "Admin and HR can view all screenshots"
    ON public.session_screenshots FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('Admin', 'Super Admin', 'HR')
        )
    );

-- 2. Storage Policies on storage.objects for the 'screenshots' bucket
DO $$
BEGIN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

DROP POLICY IF EXISTS "Admin and HR can delete screenshot objects" ON storage.objects;
CREATE POLICY "Admin and HR can delete screenshot objects"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'screenshots'
        AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('Admin', 'Super Admin', 'HR')
        )
    );

DROP POLICY IF EXISTS "Admin and HR can select screenshot objects" ON storage.objects;
CREATE POLICY "Admin and HR can select screenshot objects"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'screenshots'
        AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('Admin', 'Super Admin', 'HR')
            )
        )
    );

