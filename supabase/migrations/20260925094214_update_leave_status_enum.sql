-- Update leave_requests status constraint to include 'Pending Admin'
ALTER TABLE public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_status_check;

ALTER TABLE public.leave_requests ADD CONSTRAINT leave_requests_status_check 
CHECK (status IN ('Pending Level', 'Pending HR', 'Pending Admin', 'Approved', 'Rejected', 'Cancelled'));