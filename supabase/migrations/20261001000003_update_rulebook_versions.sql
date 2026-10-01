-- Migration to change version from INTEGER to TEXT to support Minor/Major versioning (e.g., 1.0, 1.1, 2.0)

ALTER TABLE public.company_rules
  ALTER COLUMN version TYPE TEXT USING version::TEXT || '.0';

ALTER TABLE public.company_rules
  ALTER COLUMN version SET DEFAULT '1.0';

ALTER TABLE public.employee_rule_acknowledgements
  ALTER COLUMN version TYPE TEXT USING version::TEXT || '.0';
