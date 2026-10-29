-- ==============================================================================
-- Migration: Create Accounting Module Tables
-- Tables: bank_accounts, accounting_income, accounting_expenses, accounting_ledger, accounting_company_settings
-- ==============================================================================

-- 1. Bank Accounts Table
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_name TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_type TEXT NOT NULL DEFAULT 'Current' CHECK (account_type IN ('Savings', 'Current', 'Cash', 'Credit Card', 'Overdraft', 'Other')),
    ifsc_code TEXT,
    branch TEXT,
    opening_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_status ON public.bank_accounts(status);

-- 2. Income Table
CREATE TABLE IF NOT EXISTS public.accounting_income (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    income_number TEXT UNIQUE NOT NULL,
    income_date DATE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    campaign_project TEXT,
    invoice_number TEXT,
    description TEXT,
    category TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    tax_type TEXT NOT NULL DEFAULT 'No Tax',
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0),
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
    payment_reference TEXT,
    payment_date DATE,
    upi_id TEXT,
    card_holder_name TEXT,
    card_last4 TEXT,
    bank_name TEXT,
    account_name TEXT,
    cheque_number TEXT,
    cheque_date DATE,
    cheque_status TEXT,
    bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
    notes TEXT,
    attachment_url TEXT,
    status TEXT NOT NULL DEFAULT 'Received' CHECK (status IN ('Received', 'Pending', 'Partially Received', 'Cancelled')),
    received_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    pending_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounting_income_date ON public.accounting_income(income_date);
CREATE INDEX IF NOT EXISTS idx_accounting_income_client ON public.accounting_income(client_id);
CREATE INDEX IF NOT EXISTS idx_accounting_income_bank_account ON public.accounting_income(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_accounting_income_status ON public.accounting_income(status);

-- 3. Expenses Table
CREATE TABLE IF NOT EXISTS public.accounting_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_number TEXT UNIQUE NOT NULL,
    expense_date DATE NOT NULL,
    category TEXT NOT NULL,
    vendor_payee TEXT NOT NULL,
    campaign_project TEXT,
    invoice_number TEXT,
    description TEXT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    tax_type TEXT NOT NULL DEFAULT 'No Tax',
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0),
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
    payment_reference TEXT,
    payment_date DATE,
    upi_id TEXT,
    card_holder_name TEXT,
    card_last4 TEXT,
    bank_name TEXT,
    account_name TEXT,
    cheque_number TEXT,
    cheque_date DATE,
    cheque_status TEXT,
    bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
    notes TEXT,
    attachment_url TEXT,
    status TEXT NOT NULL DEFAULT 'Paid' CHECK (status IN ('Paid', 'Pending', 'Partially Paid', 'Cancelled')),
    paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    pending_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounting_expenses_date ON public.accounting_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_accounting_expenses_bank_account ON public.accounting_expenses(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_accounting_expenses_status ON public.accounting_expenses(status);

-- 4. General Ledger Table
CREATE TABLE IF NOT EXISTS public.accounting_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_date DATE NOT NULL,
    reference_number TEXT NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('INCOME', 'EXPENSE', 'TRANSFER', 'ADJUSTMENT')),
    source_id UUID,
    description TEXT NOT NULL,
    account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
    account_name TEXT NOT NULL,
    debit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    credit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounting_ledger_date ON public.accounting_ledger(transaction_date);
CREATE INDEX IF NOT EXISTS idx_accounting_ledger_account ON public.accounting_ledger(account_id);
CREATE INDEX IF NOT EXISTS idx_accounting_ledger_ref ON public.accounting_ledger(reference_number);

-- 5. Company Accounting Settings Table
CREATE TABLE IF NOT EXISTS public.accounting_company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL DEFAULT 'Triple S Production',
    company_address TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    currency TEXT NOT NULL DEFAULT 'INR',
    currency_symbol TEXT NOT NULL DEFAULT '₹',
    financial_year_start TEXT NOT NULL DEFAULT '04-01',
    financial_year_end TEXT NOT NULL DEFAULT '03-31',
    tax_gst_number TEXT,
    pan_number TEXT,
    default_bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
    default_payment_method TEXT DEFAULT 'Bank Transfer',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial company settings row if empty
INSERT INTO public.accounting_company_settings (
    company_name,
    company_address,
    contact_email,
    contact_phone,
    currency,
    currency_symbol,
    financial_year_start,
    financial_year_end,
    tax_gst_number,
    pan_number,
    default_payment_method
)
SELECT 
    'Triple S Production',
    'Industrial Area, Phase II, New Delhi, India',
    'finance@triplesproduction.com',
    '+91 11 2345 6789',
    'INR',
    '₹',
    '04-01',
    '03-31',
    '07AAAAA0000A1Z5',
    'AAAAA0000A',
    'Bank Transfer'
WHERE NOT EXISTS (SELECT 1 FROM public.accounting_company_settings LIMIT 1);

-- RLS Policies
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read bank_accounts" ON public.bank_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert bank_accounts" ON public.bank_accounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update bank_accounts" ON public.bank_accounts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete bank_accounts" ON public.bank_accounts FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read accounting_income" ON public.accounting_income FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert accounting_income" ON public.accounting_income FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update accounting_income" ON public.accounting_income FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete accounting_income" ON public.accounting_income FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read accounting_expenses" ON public.accounting_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert accounting_expenses" ON public.accounting_expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update accounting_expenses" ON public.accounting_expenses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete accounting_expenses" ON public.accounting_expenses FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read accounting_ledger" ON public.accounting_ledger FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert accounting_ledger" ON public.accounting_ledger FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update accounting_ledger" ON public.accounting_ledger FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read accounting_company_settings" ON public.accounting_company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated update accounting_company_settings" ON public.accounting_company_settings FOR UPDATE TO authenticated USING (true);

-- 6. Ledger Accounts (Chart of Accounts) Table
CREATE TABLE IF NOT EXISTS public.accounting_ledger_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_code TEXT UNIQUE NOT NULL,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('Asset', 'Liability', 'Equity', 'Income', 'Expense')),
    parent_account_id UUID REFERENCES public.accounting_ledger_accounts(id) ON DELETE SET NULL,
    description TEXT,
    opening_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    opening_balance_type TEXT NOT NULL DEFAULT 'Debit' CHECK (opening_balance_type IN ('Debit', 'Credit')),
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounting_ledger_accounts_type ON public.accounting_ledger_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounting_ledger_accounts_code ON public.accounting_ledger_accounts(account_code);
CREATE INDEX IF NOT EXISTS idx_accounting_ledger_accounts_status ON public.accounting_ledger_accounts(status);

-- 7. Journal Entries Table
CREATE TABLE IF NOT EXISTS public.accounting_journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_number TEXT UNIQUE NOT NULL,
    entry_date DATE NOT NULL,
    reference_number TEXT,
    description TEXT NOT NULL,
    campaign_project TEXT,
    attachment_url TEXT,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Posted')),
    total_debit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_credit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON public.accounting_journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON public.accounting_journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_number ON public.accounting_journal_entries(entry_number);

-- 8. Journal Lines Table
CREATE TABLE IF NOT EXISTS public.accounting_journal_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES public.accounting_journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounting_ledger_accounts(id) ON DELETE RESTRICT,
    account_code TEXT,
    account_name TEXT NOT NULL,
    description TEXT,
    debit NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (debit >= 0),
    credit NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (credit >= 0),
    reference_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON public.accounting_journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON public.accounting_journal_lines(account_id);

-- Enable RLS
ALTER TABLE public.accounting_ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_journal_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read ledger_accounts" ON public.accounting_ledger_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert ledger_accounts" ON public.accounting_ledger_accounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update ledger_accounts" ON public.accounting_ledger_accounts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete ledger_accounts" ON public.accounting_ledger_accounts FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read journal_entries" ON public.accounting_journal_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert journal_entries" ON public.accounting_journal_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update journal_entries" ON public.accounting_journal_entries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete journal_entries" ON public.accounting_journal_entries FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read journal_lines" ON public.accounting_journal_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert journal_lines" ON public.accounting_journal_lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update journal_lines" ON public.accounting_journal_lines FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete journal_lines" ON public.accounting_journal_lines FOR DELETE TO authenticated USING (true);

