export type BankAccountType = 'Savings' | 'Current' | 'Cash' | 'Credit Card' | 'Overdraft' | 'Other'
export type BankAccountStatus = 'Active' | 'Inactive'

export interface BankAccount {
  id: string
  account_name: string
  bank_name: string
  account_number: string
  account_type: BankAccountType
  ifsc_code?: string | null
  branch?: string | null
  opening_balance: number
  current_balance: number
  status: BankAccountStatus
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface CreateBankAccountInput {
  account_name: string
  bank_name: string
  account_number: string
  account_type: BankAccountType
  ifsc_code?: string | null
  branch?: string | null
  opening_balance: number
  status?: BankAccountStatus
}

export interface UpdateBankAccountInput extends Partial<CreateBankAccountInput> {
  id: string
}

export type IncomeStatus = 'Received' | 'Pending' | 'Partially Received' | 'Cancelled'
export type ExpenseStatus = 'Paid' | 'Pending' | 'Partially Paid' | 'Cancelled'

export type PaymentMethod = 
  | 'Cash'
  | 'UPI'
  | 'Credit Card'
  | 'Debit Card'
  | 'Bank Transfer'
  | 'Cheque'

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'UPI',
  'Credit Card',
  'Debit Card',
  'Bank Transfer',
  'Cheque',
]

export type ChequeStatus = 'Pending' | 'Cleared' | 'Bounced'
export const CHEQUE_STATUSES: ChequeStatus[] = ['Pending', 'Cleared', 'Bounced']


export type TaxType = 
  | 'No Tax'
  | 'GST 5%'
  | 'GST 12%'
  | 'GST 18%'
  | 'GST 28%'
  | 'Custom Tax'

export const TAX_TYPES: TaxType[] = [
  'No Tax',
  'GST 5%',
  'GST 12%',
  'GST 18%',
  'GST 28%',
  'Custom Tax',
]

export const TAX_RATES: Record<TaxType, number> = {
  'No Tax': 0,
  'GST 5%': 5,
  'GST 12%': 12,
  'GST 18%': 18,
  'GST 28%': 28,
  'Custom Tax': 0,
}

export const INCOME_CATEGORIES = [
  'Digital Marketing Services',
  'Social Media Marketing',
  'SEO Services',
  'Google Ads / PPC',
  'Meta Ads Management',
  'Content Marketing',
  'Website Development',
  'Graphic Design',
  'Video / Creative Services',
  'Consulting',
  'Retainer Services',
  'Other Income',
] as const

export type IncomeCategory = typeof INCOME_CATEGORIES[number] | string

export const EXPENSE_CATEGORIES = [
  'Office Rent',
  'Employee Salaries',
  'Software & Subscriptions',
  'Advertising & Marketing',
  'Google Ads',
  'Meta Ads',
  'Hosting & Domain',
  'Internet & Telephone',
  'Travel & Transportation',
  'Office Supplies',
  'Professional Services',
  'Equipment',
  'Utilities',
  'Other Expenses',
] as const

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number] | string

export interface IncomeRecord {
  id: string
  income_number: string
  income_date: string
  client_id?: string | null
  customer_name: string
  campaign_project?: string | null
  invoice_number?: string | null
  description?: string | null
  category: string
  amount: number // Subtotal
  tax_type: TaxType
  tax_rate: number
  tax_amount: number
  total_amount: number
  payment_method: PaymentMethod
  payment_reference?: string | null
  payment_date?: string | null
  // Dynamic Payment Fields
  upi_id?: string | null
  card_holder_name?: string | null
  card_last4?: string | null
  bank_name?: string | null
  account_name?: string | null
  cheque_number?: string | null
  cheque_date?: string | null
  cheque_status?: ChequeStatus | null
  bank_account_id?: string | null
  bank_account_name?: string | null
  notes?: string | null
  attachment_url?: string | null
  status: IncomeStatus
  received_amount: number
  pending_amount: number
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface CreateIncomeInput {
  income_number?: string
  income_date: string
  client_id?: string | null
  customer_name: string
  campaign_project?: string | null
  invoice_number?: string | null
  description?: string | null
  category: string
  amount: number // Subtotal
  tax_type?: TaxType
  tax_rate?: number
  tax_amount?: number
  total_amount?: number
  payment_method: PaymentMethod
  payment_reference?: string | null
  payment_date?: string | null
  // Dynamic Payment Fields
  upi_id?: string | null
  card_holder_name?: string | null
  card_last4?: string | null
  bank_name?: string | null
  account_name?: string | null
  cheque_number?: string | null
  cheque_date?: string | null
  cheque_status?: ChequeStatus | null
  bank_account_id?: string | null
  notes?: string | null
  attachment_url?: string | null
  status?: IncomeStatus
  received_amount?: number
  pending_amount?: number
}

export interface UpdateIncomeInput extends Partial<CreateIncomeInput> {
  id: string
}

export interface ExpenseRecord {
  id: string
  expense_number: string
  expense_date: string
  category: string
  vendor_payee: string
  campaign_project?: string | null
  invoice_number?: string | null
  description?: string | null
  amount: number // Subtotal
  tax_type: TaxType
  tax_rate: number
  tax_amount: number
  total_amount: number
  payment_method: PaymentMethod
  payment_reference?: string | null
  payment_date?: string | null
  // Dynamic Payment Fields
  upi_id?: string | null
  card_holder_name?: string | null
  card_last4?: string | null
  bank_name?: string | null
  account_name?: string | null
  cheque_number?: string | null
  cheque_date?: string | null
  cheque_status?: ChequeStatus | null
  bank_account_id?: string | null
  bank_account_name?: string | null
  notes?: string | null
  attachment_url?: string | null
  status: ExpenseStatus
  paid_amount: number
  pending_amount: number
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface CreateExpenseInput {
  expense_number?: string
  expense_date: string
  category: string
  vendor_payee: string
  campaign_project?: string | null
  invoice_number?: string | null
  description?: string | null
  amount: number // Subtotal
  tax_type?: TaxType
  tax_rate?: number
  tax_amount?: number
  total_amount?: number
  payment_method: PaymentMethod
  payment_reference?: string | null
  payment_date?: string | null
  // Dynamic Payment Fields
  upi_id?: string | null
  card_holder_name?: string | null
  card_last4?: string | null
  bank_name?: string | null
  account_name?: string | null
  cheque_number?: string | null
  cheque_date?: string | null
  cheque_status?: ChequeStatus | null
  bank_account_id?: string | null
  notes?: string | null
  attachment_url?: string | null
  status?: ExpenseStatus
  paid_amount?: number
  pending_amount?: number
}

export interface UpdateExpenseInput extends Partial<CreateExpenseInput> {
  id: string
}

export type LedgerTransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'ADJUSTMENT'

export interface LedgerTransaction {
  id: string
  transaction_date: string
  reference_number: string
  transaction_type: LedgerTransactionType
  source_id?: string | null
  description: string
  account_id?: string | null
  account_name: string
  debit: number
  credit: number
  balance: number
  created_by?: string | null
  created_at: string
}

export interface CreateLedgerEntryInput {
  transaction_date: string
  reference_number: string
  transaction_type: LedgerTransactionType
  source_id?: string | null
  description: string
  account_id?: string | null
  account_name: string
  debit: number
  credit: number
}

export interface AccountingCompanySettings {
  id: string
  company_name: string
  company_address?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  currency: string
  currency_symbol: string
  financial_year_start: string
  financial_year_end: string
  tax_gst_number?: string | null
  pan_number?: string | null
  default_bank_account_id?: string | null
  default_payment_method?: PaymentMethod | null
  updated_at: string
}

export interface UpdateCompanySettingsInput {
  company_name: string
  company_address?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  currency?: string
  currency_symbol?: string
  financial_year_start?: string
  financial_year_end?: string
  tax_gst_number?: string | null
  pan_number?: string | null
  default_bank_account_id?: string | null
  default_payment_method?: PaymentMethod | null
}

export interface AccountingDashboardData {
  totalIncome: number
  totalExpenses: number
  netBalance: number
  bankAccountBalance: number
  activeBankAccountsCount: number
  pendingIncomeCount: number
  pendingExpensesCount: number
  recentTransactions: LedgerTransaction[]
  monthlyBreakdown: {
    month: string
    income: number
    expenses: number
    net: number
  }[]
  topExpenseCategories: {
    category: string
    amount: number
    percentage: number
  }[]
  topIncomeCategories: {
    category: string
    amount: number
    percentage: number
  }[]
  bankAccounts: BankAccount[]
}

export interface AccountingActionResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// ==========================================
// Ledger Accounts Types
// ==========================================

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense'
export const ACCOUNT_TYPES: AccountType[] = ['Asset', 'Liability', 'Equity', 'Income', 'Expense']

export type OpeningBalanceType = 'Debit' | 'Credit'
export const OPENING_BALANCE_TYPES: OpeningBalanceType[] = ['Debit', 'Credit']

export type LedgerAccountStatus = 'Active' | 'Inactive'
export const LEDGER_ACCOUNT_STATUSES: LedgerAccountStatus[] = ['Active', 'Inactive']

export interface LedgerAccount {
  id: string
  account_code: string
  account_name: string
  account_type: AccountType
  parent_account_id?: string | null
  parent_account_name?: string | null
  description?: string | null
  opening_balance: number
  opening_balance_type: OpeningBalanceType
  current_balance: number
  status: LedgerAccountStatus
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface CreateLedgerAccountInput {
  account_code: string
  account_name: string
  account_type: AccountType
  parent_account_id?: string | null
  description?: string | null
  opening_balance: number
  opening_balance_type: OpeningBalanceType
  status?: LedgerAccountStatus
}

export interface UpdateLedgerAccountInput extends Partial<CreateLedgerAccountInput> {
  id: string
}

// ==========================================
// Journal Entries Types
// ==========================================

export type JournalEntryStatus = 'Draft' | 'Posted'
export const JOURNAL_ENTRY_STATUSES: JournalEntryStatus[] = ['Draft', 'Posted']

export interface JournalLine {
  id: string
  journal_entry_id?: string
  account_id: string
  account_code?: string
  account_name: string
  description?: string | null
  debit: number
  credit: number
  reference_notes?: string | null
}

export interface JournalEntry {
  id: string
  entry_number: string
  entry_date: string
  reference_number?: string | null
  description: string
  campaign_project?: string | null
  attachment_url?: string | null
  status: JournalEntryStatus
  total_debit: number
  total_credit: number
  lines: JournalLine[]
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface CreateJournalEntryInput {
  entry_number?: string
  entry_date: string
  reference_number?: string | null
  description: string
  campaign_project?: string | null
  attachment_url?: string | null
  status?: JournalEntryStatus
  lines: {
    account_id: string
    account_name?: string
    account_code?: string
    description?: string | null
    debit: number
    credit: number
    reference_notes?: string | null
  }[]
}

export interface UpdateJournalEntryInput extends Partial<CreateJournalEntryInput> {
  id: string
}

