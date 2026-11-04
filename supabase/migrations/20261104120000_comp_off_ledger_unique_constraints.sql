-- ==============================================================================
-- Migration: Comp-Off Ledger Concurrency, Idempotency & Transaction Identity
-- Description: Adds unique indexes on comp_off_ledger for CREDIT, DEBIT, and REVERSAL
--              transactions to ensure concurrent approvals or retries never
--              create duplicate entries for the same reference.
-- ==============================================================================

-- 1. Unique index for CREDIT transactions
CREATE UNIQUE INDEX IF NOT EXISTS idx_comp_off_ledger_unique_credit 
  ON public.comp_off_ledger(reference_id, transaction_type) 
  WHERE transaction_type = 'CREDIT' AND reference_id IS NOT NULL;

-- 2. Unique index for DEBIT transactions
CREATE UNIQUE INDEX IF NOT EXISTS idx_comp_off_ledger_unique_debit 
  ON public.comp_off_ledger(reference_id, transaction_type) 
  WHERE transaction_type = 'DEBIT' AND reference_id IS NOT NULL;

-- 3. Unique index for REVERSAL transactions
CREATE UNIQUE INDEX IF NOT EXISTS idx_comp_off_ledger_unique_reversal 
  ON public.comp_off_ledger(reference_id, transaction_type) 
  WHERE transaction_type = 'REVERSAL' AND reference_id IS NOT NULL;

-- 4. Composite aggregation index on employee_id, transaction_type and created_at for fast balance queries
CREATE INDEX IF NOT EXISTS idx_comp_off_ledger_emp_type_created 
  ON public.comp_off_ledger(employee_id, transaction_type, created_at ASC);
