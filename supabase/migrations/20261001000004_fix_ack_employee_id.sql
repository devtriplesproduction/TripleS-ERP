-- Drop the foreign key constraint on employee_id since it might be a custom string like "EMP-001"
ALTER TABLE public.employee_rule_acknowledgements
  DROP CONSTRAINT employee_rule_acknowledgements_employee_id_fkey;

-- Change the employee_id column type from UUID to TEXT
ALTER TABLE public.employee_rule_acknowledgements
  ALTER COLUMN employee_id TYPE TEXT USING employee_id::TEXT;
