-- Add request_type to leave_requests
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS request_type TEXT DEFAULT 'LEAVE' CHECK (request_type IN ('LEAVE', 'WFH'));

-- Relax leave_type constraint to allow NULL for WFH
ALTER TABLE public.leave_requests ALTER COLUMN leave_type DROP NOT NULL;

ALTER TABLE public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_leave_type_check;
ALTER TABLE public.leave_requests ADD CONSTRAINT leave_requests_leave_type_check CHECK (leave_type IN ('Sick Leave', 'Casual Leave', 'Unpaid Leave', 'Compensatory Off') OR leave_type IS NULL);

ALTER TABLE public.leave_requests ADD CONSTRAINT chk_leave_type_if_leave CHECK (request_type = 'WFH' OR leave_type IS NOT NULL);
