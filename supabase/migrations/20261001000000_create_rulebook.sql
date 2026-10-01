-- Migration for Company Rulebook Module

CREATE TYPE rulebook_status AS ENUM ('Draft', 'Published', 'Archived');
CREATE TYPE rulebook_category AS ENUM ('Work Policy', 'Security & IT', 'Leave & PTO', 'Attendance', 'Human Resources');

CREATE TABLE IF NOT EXISTS public.company_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category rulebook_category NOT NULL,
    description TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    status rulebook_status NOT NULL DEFAULT 'Draft',
    created_by TEXT, -- using TEXT instead of UUID since sometimes employee_id_number or auth ID might be used depending on the system
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    effective_date DATE,
    previous_version_id UUID REFERENCES public.company_rules(id) ON DELETE SET NULL
);

CREATE TRIGGER update_company_rules_modtime
    BEFORE UPDATE ON public.company_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.employee_rule_acknowledgements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employee_onboarding(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES public.company_rules(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, rule_id, version)
);

-- RLS
ALTER TABLE public.company_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_rule_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public full access to company_rules"
    ON public.company_rules
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow public full access to employee_rule_acknowledgements"
    ON public.employee_rule_acknowledgements
    FOR ALL
    USING (true)
    WITH CHECK (true);
