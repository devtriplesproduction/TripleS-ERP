-- Migration: Create department_hod_assignments table
CREATE TABLE IF NOT EXISTS public.department_hod_assignments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  department text NOT NULL,
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at timestamp with time zone DEFAULT now() NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  removed_at timestamp with time zone,
  removed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Ensure only one active HOD per department
CREATE UNIQUE INDEX IF NOT EXISTS idx_department_active_hod 
ON public.department_hod_assignments (department) 
WHERE (is_active = true);

-- Enable RLS
ALTER TABLE public.department_hod_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read HOD assignments" 
  ON public.department_hod_assignments 
  FOR SELECT 
  USING (true);

-- Admins can manage HOD assignments
CREATE POLICY "Admins can manage HOD assignments" 
  ON public.department_hod_assignments 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('Admin', 'HR')
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dept_hod_is_active ON public.department_hod_assignments(department, is_active);
CREATE INDEX IF NOT EXISTS idx_dept_hod_employee_id ON public.department_hod_assignments(employee_id);
