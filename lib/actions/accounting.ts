'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import fs from 'fs'
import path from 'path'
import {
  TAX_RATES,
} from '@/types/accounting'
import type {
  BankAccount,
  CreateBankAccountInput,
  UpdateBankAccountInput,
  IncomeRecord,
  CreateIncomeInput,
  UpdateIncomeInput,
  ExpenseRecord,
  CreateExpenseInput,
  UpdateExpenseInput,
  LedgerTransaction,
  CreateLedgerEntryInput,
  AccountingCompanySettings,
  UpdateCompanySettingsInput,
  AccountingDashboardData,
  AccountingActionResponse,
  TaxType,
  PaymentMethod,
  ChequeStatus,
  AccountType,
  OpeningBalanceType,
  LedgerAccountStatus,
  LedgerAccount,
  CreateLedgerAccountInput,
  UpdateLedgerAccountInput,
  JournalEntryStatus,
  JournalLine,
  JournalEntry,
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
} from '@/types/accounting'

function safeRevalidatePath(pathUrl: string, type?: 'page' | 'layout') {
  try {
    if (type) {
      revalidatePath(pathUrl, type)
    } else {
      revalidatePath(pathUrl)
    }
  } catch {
    // In test runner or non-request contexts, ignore static generation store invariant
  }
}

// ==========================================
// Fallback persistent storage (scratch/accounting_store.json)
// ==========================================
const FALLBACK_DIR = path.join(process.cwd(), 'scratch')
const DEFAULT_STORE_FILE = 'accounting_store.json'

interface AccountingStore {
  bankAccounts: BankAccount[]
  income: IncomeRecord[]
  expenses: ExpenseRecord[]
  ledger: LedgerTransaction[]
  companySettings: AccountingCompanySettings
  ledgerAccounts?: LedgerAccount[]
  journalEntries?: JournalEntry[]
}

function getStoreFilePath(): string {
  return path.join(FALLBACK_DIR, DEFAULT_STORE_FILE)
}

function ensureStoreDir(): void {
  if (!fs.existsSync(FALLBACK_DIR)) {
    fs.mkdirSync(FALLBACK_DIR, { recursive: true })
  }
}

function getDefaultLedgerAccounts(): LedgerAccount[] {
  const now = new Date().toISOString()
  return [
    // Assets (1000 - 1999)
    {
      id: 'la-1010',
      account_code: '1010',
      account_name: 'Office Petty Cash',
      account_type: 'Asset',
      opening_balance: 25000,
      opening_balance_type: 'Debit',
      current_balance: 18500,
      status: 'Active',
      description: 'Office cash in hand for daily operations and emergency supplies',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'la-1020',
      account_code: '1020',
      account_name: 'HDFC Corporate Current',
      account_type: 'Asset',
      opening_balance: 500000,
      opening_balance_type: 'Debit',
      current_balance: 785000,
      status: 'Active',
      description: 'Primary operating business current account for client retainers and vendor payouts',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'la-1030',
      account_code: '1030',
      account_name: 'Axis Bank Current Account',
      account_type: 'Asset',
      opening_balance: 200000,
      opening_balance_type: 'Debit',
      current_balance: 315000,
      status: 'Active',
      description: 'Secondary client collections account and digital agency billing',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'la-1040',
      account_code: '1040',
      account_name: 'Accounts Receivable',
      account_type: 'Asset',
      opening_balance: 0,
      opening_balance_type: 'Debit',
      current_balance: 0,
      status: 'Active',
      description: 'Uncollected client invoices and pending receivables',
      created_at: now,
      updated_at: now,
    },
    // Liabilities (2000 - 2999)
    {
      id: 'la-2010',
      account_code: '2010',
      account_name: 'Accounts Payable',
      account_type: 'Liability',
      opening_balance: 0,
      opening_balance_type: 'Credit',
      current_balance: 0,
      status: 'Active',
      description: 'Outstanding obligations to vendors, contractors, and publishers',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'la-2020',
      account_code: '2020',
      account_name: 'GST Payable',
      account_type: 'Liability',
      opening_balance: 0,
      opening_balance_type: 'Credit',
      current_balance: 72000,
      status: 'Active',
      description: 'Net GST collections payable to government after input credit deduction',
      created_at: now,
      updated_at: now,
    },
    // Equity (3000 - 3999)
    {
      id: 'la-3010',
      account_code: '3010',
      account_name: "Owner's Capital & Retained Earnings",
      account_type: 'Equity',
      opening_balance: 725000,
      opening_balance_type: 'Credit',
      current_balance: 725000,
      status: 'Active',
      description: 'Accumulated agency equity, founder capital, and past retained earnings',
      created_at: now,
      updated_at: now,
    },
    // Income (4000 - 4999)
    {
      id: 'la-4010',
      account_code: '4010',
      account_name: 'Digital Marketing Services',
      account_type: 'Income',
      opening_balance: 0,
      opening_balance_type: 'Credit',
      current_balance: 0,
      status: 'Active',
      description: 'Full-service digital growth, campaign strategy, and brand transformation',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'la-4020',
      account_code: '4020',
      account_name: 'SEO Services',
      account_type: 'Income',
      opening_balance: 0,
      opening_balance_type: 'Credit',
      current_balance: 100000,
      status: 'Active',
      description: 'Organic search optimization, technical SEO audits, and content backlinks',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'la-4030',
      account_code: '4030',
      account_name: 'Social Media Services',
      account_type: 'Income',
      opening_balance: 0,
      opening_balance_type: 'Credit',
      current_balance: 0,
      status: 'Active',
      description: 'Social channel management, reels production, and influencer marketing',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'la-4040',
      account_code: '4040',
      account_name: 'Google Ads Management',
      account_type: 'Income',
      opening_balance: 0,
      opening_balance_type: 'Credit',
      current_balance: 0,
      status: 'Active',
      description: 'PPC search, performance max, and display ad campaign management fees',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'la-4050',
      account_code: '4050',
      account_name: 'Meta Ads Management',
      account_type: 'Income',
      opening_balance: 0,
      opening_balance_type: 'Credit',
      current_balance: 300000,
      status: 'Active',
      description: 'Facebook & Instagram performance media buying and conversion optimization',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'la-4060',
      account_code: '4060',
      account_name: 'Website Development',
      account_type: 'Income',
      opening_balance: 0,
      opening_balance_type: 'Credit',
      current_balance: 0,
      status: 'Active',
      description: 'Custom web application design, high-converting landing pages, and UI/UX',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'la-4070',
      account_code: '4070',
      account_name: 'Consulting Income',
      account_type: 'Income',
      opening_balance: 0,
      opening_balance_type: 'Credit',
      current_balance: 0,
      status: 'Active',
      description: 'Brand advisory, executive training, and marketing audit consulting',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'la-4080',
      account_code: '4080',
      account_name: 'Other Income',
      account_type: 'Income',
      opening_balance: 0,
      opening_balance_type: 'Credit',
      current_balance: 0,
      status: 'Active',
      description: 'Miscellaneous income, interest on savings/fixed deposits, and discounts received',
      created_at: now,
      updated_at: now,
    },
    // Expenses (5000 - 5999)
    {
      id: 'la-5010',
      account_code: '5010',
      account_name: 'Google Ads Expense',
      account_type: 'Expense',
      opening_balance: 0,
      opening_balance_type: 'Debit',
      current_balance: 0,
      status: 'Active',
      description: 'Direct advertising media spend paid to Google Asia Pacific / Google India',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'la-5020',
      account_code: '5020',
      account_name: 'Meta Ads Expense',
      account_type: 'Expense',
      opening_balance: 0,
      opening_balance_type: 'Debit',
      current_balance: 0,
      status: 'Active',
      description: 'Direct advertising media spend paid to Meta Platforms Ireland / Meta India',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'la-5030',
      account_code: '5030',
      account_name: 'Software & Subscription',
      account_type: 'Expense',
      opening_balance: 0,
      opening_balance_type: 'Debit',
      current_balance: 0,
      status: 'Active',
      description: 'Agency software tools (SEMrush, Ahrefs, Figma, Canva, Adobe CC, Slack, HubSpot)',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'la-5040',
      account_code: '5040',
      account_name: 'Salaries',
      account_type: 'Expense',
      opening_balance: 0,
      opening_balance_type: 'Debit',
      current_balance: 0,
      status: 'Active',
      description: 'Full-time creative, media, and development staff compensation and payroll',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'la-5050',
      account_code: '5050',
      account_name: 'Office Rent',
      account_type: 'Expense',
      opening_balance: 0,
      opening_balance_type: 'Debit',
      current_balance: 85000,
      status: 'Active',
      description: 'Commercial studio and head office rental lease expenditures',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'la-5060',
      account_code: '5060',
      account_name: 'Hosting & Domain',
      account_type: 'Expense',
      opening_balance: 0,
      opening_balance_type: 'Debit',
      current_balance: 32000,
      status: 'Active',
      description: 'AWS, Vercel, Supabase, Cloudflare, and domain registrars',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'la-5070',
      account_code: '5070',
      account_name: 'Internet',
      account_type: 'Expense',
      opening_balance: 0,
      opening_balance_type: 'Debit',
      current_balance: 0,
      status: 'Active',
      description: 'High-speed fiber broadband, leased lines, and communication links',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'la-5080',
      account_code: '5080',
      account_name: 'Travel',
      account_type: 'Expense',
      opening_balance: 0,
      opening_balance_type: 'Debit',
      current_balance: 0,
      status: 'Active',
      description: 'Client location visits, camera crew transit, and conference travel',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'la-5090',
      account_code: '5090',
      account_name: 'Office Supplies',
      account_type: 'Expense',
      opening_balance: 0,
      opening_balance_type: 'Debit',
      current_balance: 6500,
      status: 'Active',
      description: 'Stationery, print supplies, pantry consumables, and office upkeep',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'la-5100',
      account_code: '5100',
      account_name: 'Advertising Expense',
      account_type: 'Expense',
      opening_balance: 0,
      opening_balance_type: 'Debit',
      current_balance: 10000,
      status: 'Active',
      description: 'Self-promotional brand advertising, marketing collateral, and PR',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'la-5110',
      account_code: '5110',
      account_name: 'Professional Services',
      account_type: 'Expense',
      opening_balance: 0,
      opening_balance_type: 'Debit',
      current_balance: 0,
      status: 'Active',
      description: 'Chartered accountant, legal retainer, and regulatory compliance fees',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'la-5120',
      account_code: '5120',
      account_name: 'Utilities',
      account_type: 'Expense',
      opening_balance: 0,
      opening_balance_type: 'Debit',
      current_balance: 0,
      status: 'Active',
      description: 'Electricity, water, HVAC, and building maintenance bills',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'la-5130',
      account_code: '5130',
      account_name: 'Other Expenses',
      account_type: 'Expense',
      opening_balance: 0,
      opening_balance_type: 'Debit',
      current_balance: 0,
      status: 'Active',
      description: 'Incidental operating costs and bank processing charges',
      created_at: now,
      updated_at: now,
    },
  ]
}

function getDefaultJournalEntries(): JournalEntry[] {
  const now = new Date().toISOString()
  const today = now.split('T')[0]
  return [
    {
      id: 'je-11111111-1111-1111-1111-111111111111',
      entry_number: 'JE-2026-0001',
      entry_date: today,
      reference_number: 'REF-ADV-2026-01',
      description: 'Agency branding and performance promotion paid via HDFC Bank',
      campaign_project: 'Agency Q4 Growth Campaign',
      attachment_url: null,
      status: 'Posted',
      total_debit: 10000,
      total_credit: 10000,
      lines: [
        {
          id: 'jel-1',
          journal_entry_id: 'je-11111111-1111-1111-1111-111111111111',
          account_id: 'la-5100',
          account_code: '5100',
          account_name: 'Advertising Expense',
          description: 'Sponsored brand campaign across LinkedIn and Meta',
          debit: 10000,
          credit: 0,
          reference_notes: 'Invoice #ADV-8812',
        },
        {
          id: 'jel-2',
          journal_entry_id: 'je-11111111-1111-1111-1111-111111111111',
          account_id: 'la-1020',
          account_code: '1020',
          account_name: 'HDFC Corporate Current',
          description: 'Direct bank debit for advertising clearance',
          debit: 0,
          credit: 10000,
          reference_notes: 'Ref: HDFC-NEFT-9921',
        },
      ],
      created_at: now,
      updated_at: now,
    },
    {
      id: 'je-22222222-2222-2222-2222-222222222222',
      entry_number: 'JE-2026-0002',
      entry_date: today,
      reference_number: 'REF-DRAFT-002',
      description: 'Monthly SaaS software tools accrual (Draft)',
      campaign_project: null,
      attachment_url: null,
      status: 'Draft',
      total_debit: 15000,
      total_credit: 15000,
      lines: [
        {
          id: 'jel-3',
          journal_entry_id: 'je-22222222-2222-2222-2222-222222222222',
          account_id: 'la-5030',
          account_code: '5030',
          account_name: 'Software & Subscription',
          description: 'Ahrefs and Figma Enterprise annual subscription tier',
          debit: 15000,
          credit: 0,
          reference_notes: 'Draft quotation',
        },
        {
          id: 'jel-4',
          journal_entry_id: 'je-22222222-2222-2222-2222-222222222222',
          account_id: 'la-2010',
          account_code: '2010',
          account_name: 'Accounts Payable',
          description: 'Accrued liability pending vendor invoice verification',
          debit: 0,
          credit: 15000,
          reference_notes: 'Payment scheduled for 1st',
        },
      ],
      created_at: now,
      updated_at: now,
    },
  ]
}

function getDefaultStore(): AccountingStore {
  const now = new Date().toISOString()
  const today = now.split('T')[0]

  const bankAccounts: BankAccount[] = [
    {
      id: 'b1111111-1111-1111-1111-111111111111',
      account_name: 'HDFC Corporate Current',
      bank_name: 'HDFC Bank',
      account_number: '50200012345678',
      account_type: 'Current',
      ifsc_code: 'HDFC0001234',
      branch: 'Connaught Place, New Delhi',
      opening_balance: 500000,
      current_balance: 785000,
      status: 'Active',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'b2222222-2222-2222-2222-222222222222',
      account_name: 'Axis Bank Current Account',
      bank_name: 'Axis Bank',
      account_number: '912010045678901',
      account_type: 'Current',
      ifsc_code: 'UTIB0000123',
      branch: 'Nehru Place, New Delhi',
      opening_balance: 200000,
      current_balance: 315000,
      status: 'Active',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'b3333333-3333-3333-3333-333333333333',
      account_name: 'Office Petty Cash',
      bank_name: 'Cash In Hand',
      account_number: 'CASH-001',
      account_type: 'Cash',
      ifsc_code: null,
      branch: 'Head Office',
      opening_balance: 25000,
      current_balance: 18500,
      status: 'Active',
      created_at: now,
      updated_at: now,
    },
  ]

  const income: IncomeRecord[] = [
    {
      id: 'i1111111-1111-1111-1111-111111111111',
      income_number: 'INC-2026-0001',
      income_date: today,
      customer_name: 'Apex Global Enterprises',
      campaign_project: 'Q4 Brand Awareness & Lead Gen',
      invoice_number: 'INV-2026-101',
      category: 'Meta Ads Management',
      amount: 300000,
      tax_type: 'GST 18%',
      tax_rate: 18,
      tax_amount: 54000,
      total_amount: 354000,
      payment_method: 'Bank Transfer',
      payment_reference: 'NEFT-HDFC-992144',
      payment_date: today,
      bank_account_id: 'b1111111-1111-1111-1111-111111111111',
      bank_account_name: 'HDFC Corporate Current',
      description: 'Q4 Performance marketing and paid acquisition services',
      notes: 'Received via NEFT confirmation #N123456',
      status: 'Received',
      received_amount: 354000,
      pending_amount: 0,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'i2222222-2222-2222-2222-222222222222',
      income_number: 'INC-2026-0002',
      income_date: today,
      customer_name: 'Vertex Media Labs',
      campaign_project: 'Organic Search Optimization 2026',
      invoice_number: 'INV-2026-102',
      category: 'SEO Services',
      amount: 100000,
      tax_type: 'GST 18%',
      tax_rate: 18,
      tax_amount: 18000,
      total_amount: 118000,
      payment_method: 'UPI',
      upi_id: 'agency@axisbank',
      payment_reference: 'UPI-AXIS-881233',
      payment_date: today,
      bank_account_id: 'b2222222-2222-2222-2222-222222222222',
      bank_account_name: 'Axis Bank Current Account',
      description: 'Technical SEO Audit & Keyword Strategy Retainer',
      notes: 'Auto-credited through agency UPI VPA',
      status: 'Received',
      received_amount: 118000,
      pending_amount: 0,
      created_at: now,
      updated_at: now,
    },
  ]

  const expenses: ExpenseRecord[] = [
    {
      id: 'e1111111-1111-1111-1111-111111111111',
      expense_number: 'EXP-2026-0001',
      expense_date: today,
      category: 'Office Rent',
      vendor_payee: 'DLF Cyber Properties Ltd',
      campaign_project: 'Headquarters Facility Lease',
      invoice_number: 'BILL-DLF-2026-10',
      amount: 85000,
      tax_type: 'GST 18%',
      tax_rate: 18,
      tax_amount: 15300,
      total_amount: 100300,
      payment_method: 'Bank Transfer',
      payment_reference: 'NEFT-RENT-00129',
      payment_date: today,
      bank_account_id: 'b1111111-1111-1111-1111-111111111111',
      bank_account_name: 'HDFC Corporate Current',
      description: 'Monthly Office Rental for New Delhi Facility',
      notes: 'Monthly corporate workspace lease payment',
      status: 'Paid',
      paid_amount: 100300,
      pending_amount: 0,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'e2222222-2222-2222-2222-222222222222',
      expense_number: 'EXP-2026-0002',
      expense_date: today,
      category: 'Software & Subscriptions',
      vendor_payee: 'Amazon Web Services (AWS)',
      campaign_project: 'Agency Core Infrastructure',
      invoice_number: 'AWS-INV-992144',
      amount: 32000,
      tax_type: 'GST 18%',
      tax_rate: 18,
      tax_amount: 5760,
      total_amount: 37760,
      payment_method: 'Credit Card',
      payment_reference: 'CC-AUTH-882190',
      payment_date: today,
      bank_account_id: 'b1111111-1111-1111-1111-111111111111',
      bank_account_name: 'HDFC Corporate Current',
      description: 'Cloud Infrastructure & Database Hosting',
      notes: 'AWS Cloud Services invoice',
      status: 'Paid',
      paid_amount: 37760,
      pending_amount: 0,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'e3333333-3333-3333-3333-333333333333',
      expense_number: 'EXP-2026-0003',
      expense_date: today,
      category: 'Office Supplies',
      vendor_payee: 'City Stationers & Mart',
      campaign_project: 'Quarterly Office Operations',
      invoice_number: 'CSM-BILL-4412',
      amount: 6500,
      tax_type: 'No Tax',
      tax_rate: 0,
      tax_amount: 0,
      total_amount: 6500,
      payment_method: 'Cash',
      payment_reference: 'CASH-REC-001',
      payment_date: today,
      bank_account_id: 'b3333333-3333-3333-3333-333333333333',
      bank_account_name: 'Office Petty Cash',
      description: 'Pantry supplies and stationery',
      notes: 'Paid from petty cash drawer',
      status: 'Paid',
      paid_amount: 6500,
      pending_amount: 0,
      created_at: now,
      updated_at: now,
    },
  ]

  let runningBalance = 725000 // Opening cumulative balance across accounts
  const ledger: LedgerTransaction[] = [
    {
      id: 'l1111111-1111-1111-1111-111111111111',
      transaction_date: today,
      reference_number: 'INC-2026-0001',
      transaction_type: 'INCOME',
      source_id: 'i1111111-1111-1111-1111-111111111111',
      description: 'Income: Phase 2 ERP Integration Milestone - Apex Global Enterprises',
      account_id: 'b1111111-1111-1111-1111-111111111111',
      account_name: 'HDFC Corporate Current',
      debit: 350000,
      credit: 0,
      balance: (runningBalance += 350000),
      created_at: now,
    },
    {
      id: 'l2222222-2222-2222-2222-222222222222',
      transaction_date: today,
      reference_number: 'INC-2026-0002',
      transaction_type: 'INCOME',
      source_id: 'i2222222-2222-2222-2222-222222222222',
      description: 'Income: October 2026 Infrastructure Maintenance - Vertex Media Labs',
      account_id: 'b2222222-2222-2222-2222-222222222222',
      account_name: 'Axis Bank Current Account',
      debit: 120000,
      credit: 0,
      balance: (runningBalance += 120000),
      created_at: now,
    },
    {
      id: 'l3333333-3333-3333-3333-333333333333',
      transaction_date: today,
      reference_number: 'EXP-2026-0001',
      transaction_type: 'EXPENSE',
      source_id: 'e1111111-1111-1111-1111-111111111111',
      description: 'Expense: Monthly Office Rental for New Delhi Facility - DLF Cyber Properties Ltd',
      account_id: 'b1111111-1111-1111-1111-111111111111',
      account_name: 'HDFC Corporate Current',
      debit: 0,
      credit: 85000,
      balance: (runningBalance -= 85000),
      created_at: now,
    },
    {
      id: 'l4444444-4444-4444-4444-444444444444',
      transaction_date: today,
      reference_number: 'EXP-2026-0002',
      transaction_type: 'EXPENSE',
      source_id: 'e2222222-2222-2222-2222-222222222222',
      description: 'Expense: Cloud Infrastructure & Database Hosting - Amazon Web Services (AWS)',
      account_id: 'b1111111-1111-1111-1111-111111111111',
      account_name: 'HDFC Corporate Current',
      debit: 0,
      credit: 32000,
      balance: (runningBalance -= 32000),
      created_at: now,
    },
    {
      id: 'l5555555-5555-5555-5555-555555555555',
      transaction_date: today,
      reference_number: 'EXP-2026-0003',
      transaction_type: 'EXPENSE',
      source_id: 'e3333333-3333-3333-3333-333333333333',
      description: 'Expense: Pantry supplies and stationery - City Stationers & Mart',
      account_id: 'b3333333-3333-3333-3333-333333333333',
      account_name: 'Office Petty Cash',
      debit: 0,
      credit: 6500,
      balance: (runningBalance -= 6500),
      created_at: now,
    },
  ]

  const companySettings: AccountingCompanySettings = {
    id: 's1111111-1111-1111-1111-111111111111',
    company_name: 'Triple S Production',
    company_address: 'Industrial Area Phase II, Okhla, New Delhi 110020, India',
    contact_email: 'accounts@triplesproduction.com',
    contact_phone: '+91 11 4567 8900',
    currency: 'INR',
    currency_symbol: '₹',
    financial_year_start: '04-01',
    financial_year_end: '03-31',
    tax_gst_number: '07AAAAA0000A1Z5',
    pan_number: 'AAAAA0000A',
    default_bank_account_id: 'b1111111-1111-1111-1111-111111111111',
    default_payment_method: 'Bank Transfer',
    updated_at: now,
  }

  const ledgerAccounts = getDefaultLedgerAccounts()
  const journalEntries = getDefaultJournalEntries()

  return { bankAccounts, income, expenses, ledger, companySettings, ledgerAccounts, journalEntries }
}

function readStore(): AccountingStore {
  try {
    ensureStoreDir()
    const filePath = getStoreFilePath()
    if (!fs.existsSync(filePath)) {
      const defaultData = getDefaultStore()
      writeStore(defaultData)
      return defaultData
    }
    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw) as AccountingStore
    if (!parsed.bankAccounts || !parsed.income || !parsed.expenses || !parsed.ledger) {
      const defaultData = getDefaultStore()
      writeStore(defaultData)
      return defaultData
    }
    let needsSave = false
    if (!parsed.ledgerAccounts || parsed.ledgerAccounts.length === 0) {
      parsed.ledgerAccounts = getDefaultLedgerAccounts()
      needsSave = true
    }
    if (!parsed.journalEntries) {
      parsed.journalEntries = getDefaultJournalEntries()
      needsSave = true
    }
    if (needsSave) {
      writeStore(parsed)
    }
    return parsed
  } catch (err) {
    console.error('[AccountingStore] Failed reading store:', err)
    return getDefaultStore()
  }
}

function writeStore(store: AccountingStore): void {
  try {
    ensureStoreDir()
    fs.writeFileSync(getStoreFilePath(), JSON.stringify(store, null, 2), 'utf-8')
  } catch (err) {
    console.error('[AccountingStore] Failed writing store:', err)
  }
}

// ==========================================
// Bank Accounts Actions
// ==========================================

export async function getBankAccounts(): Promise<AccountingActionResponse<BankAccount[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    // Try Supabase first
    try {
      const admin = await createAdminClient()
      const { data, error } = await admin
        .from('bank_accounts')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        return { success: true, data: data as BankAccount[] }
      }
    } catch {
      // Fallback
    }

    const store = readStore()
    return { success: true, data: store.bankAccounts }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch bank accounts' }
  }
}

export async function getBankAccountById(id: string): Promise<AccountingActionResponse<BankAccount | null>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    try {
      const admin = await createAdminClient()
      const { data, error } = await admin
        .from('bank_accounts')
        .select('*')
        .eq('id', id)
        .single()

      if (!error && data) {
        return { success: true, data: data as BankAccount }
      }
    } catch {
      // Fallback
    }

    const store = readStore()
    const found = store.bankAccounts.find((a) => a.id === id) || null
    return { success: true, data: found }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch bank account' }
  }
}

export async function createBankAccountAction(
  input: CreateBankAccountInput
): Promise<AccountingActionResponse<BankAccount>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    if (!input.account_name?.trim()) return { success: false, error: 'Account Name is required' }
    if (!input.bank_name?.trim()) return { success: false, error: 'Bank Name is required' }
    if (!input.account_number?.trim()) return { success: false, error: 'Account Number is required' }

    const openingBalance = Number(input.opening_balance) || 0
    const now = new Date().toISOString()
    const newAccount: BankAccount = {
      id: crypto.randomUUID(),
      account_name: input.account_name.trim(),
      bank_name: input.bank_name.trim(),
      account_number: input.account_number.trim(),
      account_type: input.account_type || 'Current',
      ifsc_code: input.ifsc_code?.trim() || null,
      branch: input.branch?.trim() || null,
      opening_balance: openingBalance,
      current_balance: openingBalance,
      status: input.status || 'Active',
      created_by: user.id,
      created_at: now,
      updated_at: now,
    }

    // Try Supabase
    try {
      const admin = await createAdminClient()
      const { data, error } = await admin
        .from('bank_accounts')
        .insert([newAccount])
        .select()
        .single()

      if (!error && data) {
        safeRevalidatePath('/accounting/bank-accounts')
        safeRevalidatePath('/accounting/dashboard')
        return { success: true, data: data as BankAccount }
      }
    } catch {
      // Fallback
    }

    const store = readStore()
    store.bankAccounts.unshift(newAccount)
    writeStore(store)

    safeRevalidatePath('/accounting/bank-accounts')
    safeRevalidatePath('/accounting/dashboard')
    return { success: true, data: newAccount }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create bank account' }
  }
}

export async function updateBankAccountAction(
  input: UpdateBankAccountInput
): Promise<AccountingActionResponse<BankAccount>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    const now = new Date().toISOString()

    // Try Supabase
    try {
      const admin = await createAdminClient()
      const { data, error } = await admin
        .from('bank_accounts')
        .update({
          account_name: input.account_name,
          bank_name: input.bank_name,
          account_number: input.account_number,
          account_type: input.account_type,
          ifsc_code: input.ifsc_code,
          branch: input.branch,
          status: input.status,
          updated_at: now,
        })
        .eq('id', input.id)
        .select()
        .single()

      if (!error && data) {
        safeRevalidatePath('/accounting/bank-accounts')
        safeRevalidatePath('/accounting/dashboard')
        return { success: true, data: data as BankAccount }
      }
    } catch {
      // Fallback
    }

    const store = readStore()
    const idx = store.bankAccounts.findIndex((a) => a.id === input.id)
    if (idx === -1) return { success: false, error: 'Bank account not found' }

    store.bankAccounts[idx] = {
      ...store.bankAccounts[idx],
      ...input,
      updated_at: now,
    }
    writeStore(store)

    safeRevalidatePath('/accounting/bank-accounts')
    safeRevalidatePath('/accounting/dashboard')
    return { success: true, data: store.bankAccounts[idx] }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update bank account' }
  }
}

export async function toggleBankAccountStatusAction(
  id: string,
  newStatus: 'Active' | 'Inactive'
): Promise<AccountingActionResponse<BankAccount>> {
  return updateBankAccountAction({ id, status: newStatus })
}

export async function deleteBankAccountAction(id: string): Promise<AccountingActionResponse<boolean>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    try {
      const admin = await createAdminClient()
      const { error } = await admin.from('bank_accounts').delete().eq('id', id)
      if (!error) {
        safeRevalidatePath('/accounting/bank-accounts')
        return { success: true, data: true }
      }
    } catch {
      // Fallback
    }

    const store = readStore()
    store.bankAccounts = store.bankAccounts.filter((a) => a.id !== id)
    writeStore(store)

    safeRevalidatePath('/accounting/bank-accounts')
    return { success: true, data: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete bank account' }
  }
}

// ==========================================
// Payment Method Validation Helper
// ==========================================
function validatePaymentMethodDetails(
  method: PaymentMethod,
  input: {
    upi_id?: string | null
    card_holder_name?: string | null
    card_last4?: string | null
    bank_name?: string | null
    account_name?: string | null
    cheque_number?: string | null
    cheque_date?: string | null
    cheque_status?: ChequeStatus | null
    payment_reference?: string | null
  }
): string | null {
  if (method === 'UPI') {
    if (!input.upi_id?.trim()) return 'UPI ID is required for UPI payments'
  } else if (method === 'Credit Card' || method === 'Debit Card') {
    if (!input.card_holder_name?.trim()) return 'Card Holder Name is required for Card payments'
    if (!input.card_last4?.trim()) return 'Last 4 digits of card are required'
    if (!/^\d{4}$/.test(input.card_last4.trim())) return 'Last 4 digits must be exactly 4 numeric digits'
  } else if (method === 'Bank Transfer') {
    if (!input.bank_name?.trim()) return 'Bank Name is required for Bank Transfer'
    if (!input.payment_reference?.trim()) return 'Transaction / UTR Number is required for Bank Transfer'
  } else if (method === 'Cheque') {
    if (!input.cheque_number?.trim()) return 'Cheque Number is required for Cheque payments'
    if (!input.bank_name?.trim()) return 'Bank Name is required for Cheque payments'
  }
  return null
}

// ==========================================
// Income Actions
// ==========================================

export async function generateIncomeNumber(): Promise<string> {
  const store = readStore()
  const year = new Date().getFullYear()
  let maxSeq = 0

  for (const inc of store.income) {
    const match = inc.income_number.match(/^INC-\d{4}-(\d+)$/i)
    if (match) {
      const seq = parseInt(match[1], 10)
      if (seq > maxSeq) maxSeq = seq
    }
  }

  return `INC-${year}-${String(maxSeq + 1).padStart(4, '0')}`
}

export async function getIncomeRecords(): Promise<AccountingActionResponse<IncomeRecord[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    try {
      const admin = await createAdminClient()
      const { data, error } = await admin
        .from('accounting_income')
        .select('*')
        .order('income_date', { ascending: false })

      if (!error && data && data.length > 0) {
        return { success: true, data: data as IncomeRecord[] }
      }
    } catch {
      // Fallback
    }

    const store = readStore()
    return { success: true, data: store.income }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch income records' }
  }
}

export async function createIncomeAction(
  input: CreateIncomeInput
): Promise<AccountingActionResponse<IncomeRecord>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    if (!input.customer_name?.trim()) return { success: false, error: 'Client Name is required' }
    if (!input.income_date) return { success: false, error: 'Income Date is required' }
    if (!input.category) return { success: false, error: 'Income Category is required' }
    if (!input.amount || Number(input.amount) <= 0) return { success: false, error: 'Amount must be greater than 0' }

    // Tax calculation
    const taxType = (input.tax_type || 'No Tax') as TaxType
    const taxRate = taxType === 'Custom Tax' ? Number(input.tax_rate ?? 0) : (TAX_RATES[taxType] ?? 0)
    if (taxRate < 0) return { success: false, error: 'Tax Rate cannot be negative' }

    const subtotal = Math.round(Number(input.amount) * 100) / 100
    const taxAmount = Math.round(((subtotal * taxRate) / 100) * 100) / 100
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100

    // Payment status & partial calculations
    const status = input.status || 'Received'
    let receivedAmount = 0
    let pendingAmount = 0

    if (status === 'Received') {
      receivedAmount = totalAmount
      pendingAmount = 0
    } else if (status === 'Pending') {
      receivedAmount = 0
      pendingAmount = totalAmount
    } else if (status === 'Partially Received') {
      receivedAmount = Number(input.received_amount ?? 0)
      if (receivedAmount < 0) return { success: false, error: 'Received Amount cannot be negative' }
      if (receivedAmount > totalAmount) {
        return { success: false, error: 'Received Amount cannot be greater than Total Amount' }
      }
      pendingAmount = Math.round((totalAmount - receivedAmount) * 100) / 100
    }

    const store = readStore()
    const now = new Date().toISOString()
    const incomeNumber = input.income_number?.trim() || (await generateIncomeNumber())

    // Lookup bank account name
    let bankAccountName: string | null = null
    if (input.bank_account_id) {
      const bank = store.bankAccounts.find((b) => b.id === input.bank_account_id)
      if (bank) bankAccountName = bank.account_name
    }

    const paymentMethod = input.payment_method || 'Bank Transfer'
    const methodValidationErr = validatePaymentMethodDetails(paymentMethod, input)
    if (methodValidationErr) return { success: false, error: methodValidationErr }

    const upiId = paymentMethod === 'UPI' ? input.upi_id?.trim() || null : null
    const cardHolder = (paymentMethod === 'Credit Card' || paymentMethod === 'Debit Card') ? input.card_holder_name?.trim() || null : null
    const cardLast4 = (paymentMethod === 'Credit Card' || paymentMethod === 'Debit Card') ? input.card_last4?.trim() || null : null
    const bankName = (paymentMethod === 'Bank Transfer' || paymentMethod === 'Cheque') ? input.bank_name?.trim() || null : null
    const accountName = paymentMethod === 'Bank Transfer' ? input.account_name?.trim() || null : null
    const chequeNumber = paymentMethod === 'Cheque' ? input.cheque_number?.trim() || null : null
    const chequeDate = paymentMethod === 'Cheque' ? input.cheque_date || null : null
    const chequeStatus = paymentMethod === 'Cheque' ? input.cheque_status || 'Pending' : null

    // Determine derived account display name for ledger
    let displayAccountName = 'General Cash/Bank'
    if (bankName) {
      displayAccountName = bankName + (accountName ? ` - ${accountName}` : '')
    } else if (paymentMethod === 'UPI') {
      displayAccountName = `UPI (${upiId || 'Wallet'})`
    } else if (cardLast4) {
      displayAccountName = `${paymentMethod} (*${cardLast4})`
    } else if (paymentMethod === 'Cash') {
      displayAccountName = 'Cash'
    } else if (bankAccountName) {
      displayAccountName = bankAccountName
    }

    const newIncome: IncomeRecord = {
      id: crypto.randomUUID(),
      income_number: incomeNumber,
      income_date: input.income_date,
      client_id: input.client_id || null,
      customer_name: input.customer_name.trim(),
      campaign_project: input.campaign_project?.trim() || null,
      invoice_number: input.invoice_number?.trim() || null,
      description: input.description?.trim() || null,
      category: input.category,
      amount: subtotal,
      tax_type: taxType,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      payment_reference: input.payment_reference?.trim() || null,
      payment_date: input.payment_date || (receivedAmount > 0 ? input.income_date : null),
      upi_id: upiId,
      card_holder_name: cardHolder,
      card_last4: cardLast4,
      bank_name: bankName,
      account_name: accountName,
      cheque_number: chequeNumber,
      cheque_date: chequeDate,
      cheque_status: chequeStatus,
      bank_account_id: input.bank_account_id || null,
      bank_account_name: bankAccountName || displayAccountName,
      notes: input.notes?.trim() || null,
      attachment_url: input.attachment_url?.trim() || null,
      status,
      received_amount: receivedAmount,
      pending_amount: pendingAmount,
      created_by: user.id,
      created_at: now,
      updated_at: now,
    }

    // Update bank account balance by actual received funds
    if (receivedAmount > 0 && newIncome.bank_account_id) {
      const bankIdx = store.bankAccounts.findIndex((b) => b.id === newIncome.bank_account_id)
      if (bankIdx !== -1) {
        store.bankAccounts[bankIdx].current_balance += receivedAmount
        store.bankAccounts[bankIdx].updated_at = now
      }
    }

    // Automatically generate Ledger Transaction entry
    const prevBalance = store.ledger.length > 0 ? store.ledger[store.ledger.length - 1].balance : 0
    const newLedgerEntry: LedgerTransaction = {
      id: crypto.randomUUID(),
      transaction_date: newIncome.income_date,
      reference_number: newIncome.income_number,
      transaction_type: 'INCOME',
      source_id: newIncome.id,
      description: `Income: ${newIncome.customer_name} - ${newIncome.category}${newIncome.campaign_project ? ' (' + newIncome.campaign_project + ')' : ''}`,
      account_id: newIncome.bank_account_id,
      account_name: bankAccountName || 'General Cash/Bank',
      debit: receivedAmount,
      credit: 0,
      balance: prevBalance + receivedAmount,
      created_by: user.id,
      created_at: now,
    }

    // Store in fallback
    syncLedgerAccountsForIncome(store, newIncome)
    store.income.unshift(newIncome)
    store.ledger.push(newLedgerEntry)
    writeStore(store)

    // Try persisting to Supabase if available
    try {
      const admin = await createAdminClient()
      await admin.from('accounting_income').insert([newIncome])
      await admin.from('accounting_ledger').insert([newLedgerEntry])
      if (newIncome.bank_account_id && receivedAmount > 0) {
        const bank = store.bankAccounts.find((b) => b.id === newIncome.bank_account_id)
        if (bank) {
          await admin
            .from('bank_accounts')
            .update({ current_balance: bank.current_balance, updated_at: now })
            .eq('id', bank.id)
        }
      }
    } catch {
      // Fallback already saved
    }

    safeRevalidatePath('/accounting/income')
    safeRevalidatePath('/accounting/ledger')
    safeRevalidatePath('/accounting/bank-accounts')
    safeRevalidatePath('/accounting/dashboard')

    return { success: true, data: newIncome }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create income' }
  }
}

export async function updateIncomeAction(
  input: UpdateIncomeInput
): Promise<AccountingActionResponse<IncomeRecord>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    const store = readStore()
    const idx = store.income.findIndex((i) => i.id === input.id)
    if (idx === -1) return { success: false, error: 'Income record not found' }

    const oldRecord = store.income[idx]
    const now = new Date().toISOString()

    const subtotal = input.amount !== undefined ? Number(input.amount) : oldRecord.amount
    if (subtotal <= 0) return { success: false, error: 'Amount must be greater than 0' }

    const taxType = (input.tax_type ?? oldRecord.tax_type ?? 'No Tax') as TaxType
    const taxRate = taxType === 'Custom Tax'
      ? Number(input.tax_rate ?? oldRecord.tax_rate ?? 0)
      : (TAX_RATES[taxType] ?? 0)

    if (taxRate < 0) return { success: false, error: 'Tax Rate cannot be negative' }

    const taxAmount = Math.round(((subtotal * taxRate) / 100) * 100) / 100
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100

    const status = input.status || oldRecord.status || 'Received'
    let receivedAmount = 0
    let pendingAmount = 0

    if (status === 'Received') {
      receivedAmount = totalAmount
      pendingAmount = 0
    } else if (status === 'Pending') {
      receivedAmount = 0
      pendingAmount = totalAmount
    } else if (status === 'Partially Received') {
      receivedAmount = Number(input.received_amount ?? oldRecord.received_amount ?? 0)
      if (receivedAmount < 0) return { success: false, error: 'Received Amount cannot be negative' }
      if (receivedAmount > totalAmount) {
        return { success: false, error: 'Received Amount cannot be greater than Total Amount' }
      }
      pendingAmount = Math.round((totalAmount - receivedAmount) * 100) / 100
    }

    let bankAccountName = oldRecord.bank_account_name
    const targetBankId = input.bank_account_id !== undefined ? input.bank_account_id : oldRecord.bank_account_id
    if (input.bank_account_id !== undefined) {
      if (input.bank_account_id) {
        const bank = store.bankAccounts.find((b) => b.id === input.bank_account_id)
        bankAccountName = bank ? bank.account_name : null
      } else {
        bankAccountName = null
      }
    }

    // Old received impact
    const oldReceivedImpact = oldRecord.received_amount !== undefined
      ? oldRecord.received_amount
      : (oldRecord.status === 'Received' ? oldRecord.amount : 0)

    // Reverse old bank impact
    if (oldRecord.bank_account_id && oldReceivedImpact > 0) {
      const oldBIdx = store.bankAccounts.findIndex((b) => b.id === oldRecord.bank_account_id)
      if (oldBIdx !== -1) {
        store.bankAccounts[oldBIdx].current_balance -= oldReceivedImpact
      }
    }

    // Apply new bank impact
    if (targetBankId && receivedAmount > 0) {
      const newBIdx = store.bankAccounts.findIndex((b) => b.id === targetBankId)
      if (newBIdx !== -1) {
        store.bankAccounts[newBIdx].current_balance += receivedAmount
      }
    }

    const paymentMethod = input.payment_method || oldRecord.payment_method
    if (input.payment_method) {
      const methodValidationErr = validatePaymentMethodDetails(paymentMethod, { ...oldRecord, ...input })
      if (methodValidationErr) return { success: false, error: methodValidationErr }
    }

    const upiId = paymentMethod === 'UPI' ? (input.upi_id !== undefined ? input.upi_id?.trim() || null : oldRecord.upi_id) : null
    const cardHolder = (paymentMethod === 'Credit Card' || paymentMethod === 'Debit Card')
      ? (input.card_holder_name !== undefined ? input.card_holder_name?.trim() || null : oldRecord.card_holder_name)
      : null
    const cardLast4 = (paymentMethod === 'Credit Card' || paymentMethod === 'Debit Card')
      ? (input.card_last4 !== undefined ? input.card_last4?.trim() || null : oldRecord.card_last4)
      : null
    const bankName = (paymentMethod === 'Bank Transfer' || paymentMethod === 'Cheque')
      ? (input.bank_name !== undefined ? input.bank_name?.trim() || null : oldRecord.bank_name)
      : null
    const accountName = paymentMethod === 'Bank Transfer'
      ? (input.account_name !== undefined ? input.account_name?.trim() || null : oldRecord.account_name)
      : null
    const chequeNumber = paymentMethod === 'Cheque'
      ? (input.cheque_number !== undefined ? input.cheque_number?.trim() || null : oldRecord.cheque_number)
      : null
    const chequeDate = paymentMethod === 'Cheque'
      ? (input.cheque_date !== undefined ? input.cheque_date || null : oldRecord.cheque_date)
      : null
    const chequeStatus = paymentMethod === 'Cheque'
      ? (input.cheque_status !== undefined ? input.cheque_status || 'Pending' : oldRecord.cheque_status || 'Pending')
      : null

    const updatedRecord: IncomeRecord = {
      ...oldRecord,
      ...input,
      amount: subtotal,
      tax_type: taxType,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      status,
      received_amount: receivedAmount,
      pending_amount: pendingAmount,
      payment_method: paymentMethod,
      upi_id: upiId,
      card_holder_name: cardHolder,
      card_last4: cardLast4,
      bank_name: bankName,
      account_name: accountName,
      cheque_number: chequeNumber,
      cheque_date: chequeDate,
      cheque_status: chequeStatus,
      bank_account_name: bankAccountName || bankName || oldRecord.bank_account_name,
      updated_at: now,
    }

    store.income[idx] = updatedRecord

    // Update corresponding ledger entry
    const ledgerIdx = store.ledger.findIndex((l) => l.source_id === oldRecord.id || l.reference_number === oldRecord.income_number)
    if (ledgerIdx !== -1) {
      store.ledger[ledgerIdx] = {
        ...store.ledger[ledgerIdx],
        transaction_date: updatedRecord.income_date,
        description: `Income: ${updatedRecord.customer_name} - ${updatedRecord.category}${updatedRecord.campaign_project ? ' (' + updatedRecord.campaign_project + ')' : ''}`,
        account_id: updatedRecord.bank_account_id,
        account_name: bankAccountName || 'General Cash/Bank',
        debit: receivedAmount,
      }
      recomputeLedgerBalances(store)
    }

    writeStore(store)

    safeRevalidatePath('/accounting/income')
    safeRevalidatePath('/accounting/ledger')
    safeRevalidatePath('/accounting/bank-accounts')
    safeRevalidatePath('/accounting/dashboard')

    return { success: true, data: updatedRecord }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update income record' }
  }
}

export async function deleteIncomeAction(id: string): Promise<AccountingActionResponse<boolean>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    const store = readStore()
    const target = store.income.find((i) => i.id === id)
    if (!target) return { success: false, error: 'Income record not found' }

    // Reverse bank balance if funds were received
    const receivedFunds = target.received_amount !== undefined
      ? target.received_amount
      : (target.status === 'Received' ? (target.total_amount || target.amount) : 0)

    if (receivedFunds > 0 && target.bank_account_id) {
      const bankIdx = store.bankAccounts.findIndex((b) => b.id === target.bank_account_id)
      if (bankIdx !== -1) {
        store.bankAccounts[bankIdx].current_balance -= receivedFunds
      }
    }

    store.income = store.income.filter((i) => i.id !== id)
    store.ledger = store.ledger.filter((l) => l.source_id !== id && l.reference_number !== target.income_number)
    recomputeLedgerBalances(store)
    writeStore(store)

    safeRevalidatePath('/accounting/income')
    safeRevalidatePath('/accounting/ledger')
    safeRevalidatePath('/accounting/bank-accounts')
    safeRevalidatePath('/accounting/dashboard')

    return { success: true, data: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete income record' }
  }
}

// ==========================================
// Expense Actions
// ==========================================

export async function generateExpenseNumber(): Promise<string> {
  const store = readStore()
  const year = new Date().getFullYear()
  let maxSeq = 0

  for (const exp of store.expenses) {
    const match = exp.expense_number.match(/^EXP-\d{4}-(\d+)$/i)
    if (match) {
      const seq = parseInt(match[1], 10)
      if (seq > maxSeq) maxSeq = seq
    }
  }

  return `EXP-${year}-${String(maxSeq + 1).padStart(4, '0')}`
}

export async function getExpenseRecords(): Promise<AccountingActionResponse<ExpenseRecord[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    try {
      const admin = await createAdminClient()
      const { data, error } = await admin
        .from('accounting_expenses')
        .select('*')
        .order('expense_date', { ascending: false })

      if (!error && data && data.length > 0) {
        return { success: true, data: data as ExpenseRecord[] }
      }
    } catch {
      // Fallback
    }

    const store = readStore()
    return { success: true, data: store.expenses }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch expense records' }
  }
}

export async function createExpenseAction(
  input: CreateExpenseInput
): Promise<AccountingActionResponse<ExpenseRecord>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    if (!input.vendor_payee?.trim()) return { success: false, error: 'Vendor / Payee Name is required' }
    if (!input.expense_date) return { success: false, error: 'Expense Date is required' }
    if (!input.category) return { success: false, error: 'Expense Category is required' }
    if (!input.amount || Number(input.amount) <= 0) return { success: false, error: 'Amount must be greater than 0' }

    // Tax calculation
    const taxType = (input.tax_type || 'No Tax') as TaxType
    const taxRate = taxType === 'Custom Tax' ? Number(input.tax_rate ?? 0) : (TAX_RATES[taxType] ?? 0)
    if (taxRate < 0) return { success: false, error: 'Tax Rate cannot be negative' }

    const subtotal = Math.round(Number(input.amount) * 100) / 100
    const taxAmount = Math.round(((subtotal * taxRate) / 100) * 100) / 100
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100

    // Payment status & partial calculations
    const status = input.status || 'Paid'
    let paidAmount = 0
    let pendingAmount = 0

    if (status === 'Paid') {
      paidAmount = totalAmount
      pendingAmount = 0
    } else if (status === 'Pending') {
      paidAmount = 0
      pendingAmount = totalAmount
    } else if (status === 'Partially Paid') {
      paidAmount = Number(input.paid_amount ?? 0)
      if (paidAmount < 0) return { success: false, error: 'Paid Amount cannot be negative' }
      if (paidAmount > totalAmount) {
        return { success: false, error: 'Paid Amount cannot exceed Total Amount' }
      }
      pendingAmount = Math.round((totalAmount - paidAmount) * 100) / 100
    }

    const store = readStore()
    const now = new Date().toISOString()
    const expenseNumber = input.expense_number?.trim() || (await generateExpenseNumber())

    // Lookup bank account name
    let bankAccountName: string | null = null
    if (input.bank_account_id) {
      const bank = store.bankAccounts.find((b) => b.id === input.bank_account_id)
      if (bank) bankAccountName = bank.account_name
    }

    const paymentMethod = input.payment_method || 'Bank Transfer'
    const methodValidationErr = validatePaymentMethodDetails(paymentMethod, input)
    if (methodValidationErr) return { success: false, error: methodValidationErr }

    const upiId = paymentMethod === 'UPI' ? input.upi_id?.trim() || null : null
    const cardHolder = (paymentMethod === 'Credit Card' || paymentMethod === 'Debit Card') ? input.card_holder_name?.trim() || null : null
    const cardLast4 = (paymentMethod === 'Credit Card' || paymentMethod === 'Debit Card') ? input.card_last4?.trim() || null : null
    const bankName = (paymentMethod === 'Bank Transfer' || paymentMethod === 'Cheque') ? input.bank_name?.trim() || null : null
    const accountName = paymentMethod === 'Bank Transfer' ? input.account_name?.trim() || null : null
    const chequeNumber = paymentMethod === 'Cheque' ? input.cheque_number?.trim() || null : null
    const chequeDate = paymentMethod === 'Cheque' ? input.cheque_date || null : null
    const chequeStatus = paymentMethod === 'Cheque' ? input.cheque_status || 'Pending' : null

    // Determine derived account display name for ledger
    let displayAccountName = 'General Cash/Bank'
    if (bankName) {
      displayAccountName = bankName + (accountName ? ` - ${accountName}` : '')
    } else if (paymentMethod === 'UPI') {
      displayAccountName = `UPI (${upiId || 'Wallet'})`
    } else if (cardLast4) {
      displayAccountName = `${paymentMethod} (*${cardLast4})`
    } else if (paymentMethod === 'Cash') {
      displayAccountName = 'Cash'
    } else if (bankAccountName) {
      displayAccountName = bankAccountName
    }

    const newExpense: ExpenseRecord = {
      id: crypto.randomUUID(),
      expense_number: expenseNumber,
      expense_date: input.expense_date,
      category: input.category,
      vendor_payee: input.vendor_payee.trim(),
      campaign_project: input.campaign_project?.trim() || null,
      invoice_number: input.invoice_number?.trim() || null,
      description: input.description?.trim() || null,
      amount: subtotal,
      tax_type: taxType,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      payment_reference: input.payment_reference?.trim() || null,
      payment_date: input.payment_date || (paidAmount > 0 ? input.expense_date : null),
      upi_id: upiId,
      card_holder_name: cardHolder,
      card_last4: cardLast4,
      bank_name: bankName,
      account_name: accountName,
      cheque_number: chequeNumber,
      cheque_date: chequeDate,
      cheque_status: chequeStatus,
      bank_account_id: input.bank_account_id || null,
      bank_account_name: bankAccountName || displayAccountName,
      notes: input.notes?.trim() || null,
      attachment_url: input.attachment_url?.trim() || null,
      status,
      paid_amount: paidAmount,
      pending_amount: pendingAmount,
      created_by: user.id,
      created_at: now,
      updated_at: now,
    }

    // Deduct from bank account balance by actual paid funds
    if (paidAmount > 0 && newExpense.bank_account_id) {
      const bankIdx = store.bankAccounts.findIndex((b) => b.id === newExpense.bank_account_id)
      if (bankIdx !== -1) {
        store.bankAccounts[bankIdx].current_balance -= paidAmount
        store.bankAccounts[bankIdx].updated_at = now
      }
    }

    // Automatically generate Ledger Transaction entry
    const prevBalance = store.ledger.length > 0 ? store.ledger[store.ledger.length - 1].balance : 0
    const newLedgerEntry: LedgerTransaction = {
      id: crypto.randomUUID(),
      transaction_date: newExpense.expense_date,
      reference_number: newExpense.expense_number,
      transaction_type: 'EXPENSE',
      source_id: newExpense.id,
      description: `Expense: ${newExpense.vendor_payee} - ${newExpense.category}${newExpense.campaign_project ? ' (' + newExpense.campaign_project + ')' : ''}`,
      account_id: newExpense.bank_account_id,
      account_name: bankAccountName || 'General Cash/Bank',
      debit: 0,
      credit: paidAmount,
      balance: prevBalance - paidAmount,
      created_by: user.id,
      created_at: now,
    }

    syncLedgerAccountsForExpense(store, newExpense)
    store.expenses.unshift(newExpense)
    store.ledger.push(newLedgerEntry)
    writeStore(store)

    safeRevalidatePath('/accounting/expenses')
    safeRevalidatePath('/accounting/ledger')
    safeRevalidatePath('/accounting/bank-accounts')
    safeRevalidatePath('/accounting/dashboard')

    return { success: true, data: newExpense }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create expense' }
  }
}

export async function updateExpenseAction(
  input: UpdateExpenseInput
): Promise<AccountingActionResponse<ExpenseRecord>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    const store = readStore()
    const idx = store.expenses.findIndex((e) => e.id === input.id)
    if (idx === -1) return { success: false, error: 'Expense record not found' }

    const oldRecord = store.expenses[idx]
    const now = new Date().toISOString()

    const subtotal = input.amount !== undefined ? Number(input.amount) : oldRecord.amount
    if (subtotal <= 0) return { success: false, error: 'Amount must be greater than 0' }

    const taxType = (input.tax_type ?? oldRecord.tax_type ?? 'No Tax') as TaxType
    const taxRate = taxType === 'Custom Tax'
      ? Number(input.tax_rate ?? oldRecord.tax_rate ?? 0)
      : (TAX_RATES[taxType] ?? 0)

    if (taxRate < 0) return { success: false, error: 'Tax Rate cannot be negative' }

    const taxAmount = Math.round(((subtotal * taxRate) / 100) * 100) / 100
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100

    const status = input.status || oldRecord.status || 'Paid'
    let paidAmount = 0
    let pendingAmount = 0

    if (status === 'Paid') {
      paidAmount = totalAmount
      pendingAmount = 0
    } else if (status === 'Pending') {
      paidAmount = 0
      pendingAmount = totalAmount
    } else if (status === 'Partially Paid') {
      paidAmount = Number(input.paid_amount ?? oldRecord.paid_amount ?? 0)
      if (paidAmount < 0) return { success: false, error: 'Paid Amount cannot be negative' }
      if (paidAmount > totalAmount) {
        return { success: false, error: 'Paid Amount cannot exceed Total Amount' }
      }
      pendingAmount = Math.round((totalAmount - paidAmount) * 100) / 100
    }

    let bankAccountName = oldRecord.bank_account_name
    const targetBankId = input.bank_account_id !== undefined ? input.bank_account_id : oldRecord.bank_account_id
    if (input.bank_account_id !== undefined) {
      if (input.bank_account_id) {
        const bank = store.bankAccounts.find((b) => b.id === input.bank_account_id)
        bankAccountName = bank ? bank.account_name : null
      } else {
        bankAccountName = null
      }
    }

    // Old paid impact
    const oldPaidImpact = oldRecord.paid_amount !== undefined
      ? oldRecord.paid_amount
      : (oldRecord.status === 'Paid' ? (oldRecord.total_amount || oldRecord.amount) : 0)

    // Reverse old expense impact on bank balance (add back)
    if (oldRecord.bank_account_id && oldPaidImpact > 0) {
      const oldBIdx = store.bankAccounts.findIndex((b) => b.id === oldRecord.bank_account_id)
      if (oldBIdx !== -1) {
        store.bankAccounts[oldBIdx].current_balance += oldPaidImpact
      }
    }

    // Deduct new expense impact
    if (targetBankId && paidAmount > 0) {
      const newBIdx = store.bankAccounts.findIndex((b) => b.id === targetBankId)
      if (newBIdx !== -1) {
        store.bankAccounts[newBIdx].current_balance -= paidAmount
      }
    }

    const paymentMethod = input.payment_method || oldRecord.payment_method
    if (input.payment_method) {
      const methodValidationErr = validatePaymentMethodDetails(paymentMethod, { ...oldRecord, ...input })
      if (methodValidationErr) return { success: false, error: methodValidationErr }
    }

    const upiId = paymentMethod === 'UPI' ? (input.upi_id !== undefined ? input.upi_id?.trim() || null : oldRecord.upi_id) : null
    const cardHolder = (paymentMethod === 'Credit Card' || paymentMethod === 'Debit Card')
      ? (input.card_holder_name !== undefined ? input.card_holder_name?.trim() || null : oldRecord.card_holder_name)
      : null
    const cardLast4 = (paymentMethod === 'Credit Card' || paymentMethod === 'Debit Card')
      ? (input.card_last4 !== undefined ? input.card_last4?.trim() || null : oldRecord.card_last4)
      : null
    const bankName = (paymentMethod === 'Bank Transfer' || paymentMethod === 'Cheque')
      ? (input.bank_name !== undefined ? input.bank_name?.trim() || null : oldRecord.bank_name)
      : null
    const accountName = paymentMethod === 'Bank Transfer'
      ? (input.account_name !== undefined ? input.account_name?.trim() || null : oldRecord.account_name)
      : null
    const chequeNumber = paymentMethod === 'Cheque'
      ? (input.cheque_number !== undefined ? input.cheque_number?.trim() || null : oldRecord.cheque_number)
      : null
    const chequeDate = paymentMethod === 'Cheque'
      ? (input.cheque_date !== undefined ? input.cheque_date || null : oldRecord.cheque_date)
      : null
    const chequeStatus = paymentMethod === 'Cheque'
      ? (input.cheque_status !== undefined ? input.cheque_status || 'Pending' : oldRecord.cheque_status || 'Pending')
      : null

    const updatedRecord: ExpenseRecord = {
      ...oldRecord,
      ...input,
      amount: subtotal,
      tax_type: taxType,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      status,
      paid_amount: paidAmount,
      pending_amount: pendingAmount,
      payment_method: paymentMethod,
      upi_id: upiId,
      card_holder_name: cardHolder,
      card_last4: cardLast4,
      bank_name: bankName,
      account_name: accountName,
      cheque_number: chequeNumber,
      cheque_date: chequeDate,
      cheque_status: chequeStatus,
      bank_account_name: bankAccountName || bankName || oldRecord.bank_account_name,
      updated_at: now,
    }

    store.expenses[idx] = updatedRecord

    // Update corresponding ledger entry
    const ledgerIdx = store.ledger.findIndex((l) => l.source_id === oldRecord.id || l.reference_number === oldRecord.expense_number)
    if (ledgerIdx !== -1) {
      store.ledger[ledgerIdx] = {
        ...store.ledger[ledgerIdx],
        transaction_date: updatedRecord.expense_date,
        description: `Expense: ${updatedRecord.vendor_payee} - ${updatedRecord.category}${updatedRecord.campaign_project ? ' (' + updatedRecord.campaign_project + ')' : ''}`,
        account_id: updatedRecord.bank_account_id,
        account_name: bankAccountName || 'General Cash/Bank',
        credit: paidAmount,
      }
      recomputeLedgerBalances(store)
    }

    writeStore(store)

    safeRevalidatePath('/accounting/expenses')
    safeRevalidatePath('/accounting/ledger')
    safeRevalidatePath('/accounting/bank-accounts')
    safeRevalidatePath('/accounting/dashboard')

    return { success: true, data: updatedRecord }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update expense record' }
  }
}

export async function deleteExpenseAction(id: string): Promise<AccountingActionResponse<boolean>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    const store = readStore()
    const target = store.expenses.find((e) => e.id === id)
    if (!target) return { success: false, error: 'Expense record not found' }

    // Add back bank balance if was paid
    const paidFunds = target.paid_amount !== undefined
      ? target.paid_amount
      : (target.status === 'Paid' ? (target.total_amount || target.amount) : 0)

    if (paidFunds > 0 && target.bank_account_id) {
      const bankIdx = store.bankAccounts.findIndex((b) => b.id === target.bank_account_id)
      if (bankIdx !== -1) {
        store.bankAccounts[bankIdx].current_balance += paidFunds
      }
    }

    store.expenses = store.expenses.filter((e) => e.id !== id)
    store.ledger = store.ledger.filter((l) => l.source_id !== id && l.reference_number !== target.expense_number)
    recomputeLedgerBalances(store)
    writeStore(store)

    safeRevalidatePath('/accounting/expenses')
    safeRevalidatePath('/accounting/ledger')
    safeRevalidatePath('/accounting/bank-accounts')
    safeRevalidatePath('/accounting/dashboard')

    return { success: true, data: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete expense record' }
  }
}

// ==========================================
// General Ledger Actions
// ==========================================

function recomputeLedgerBalances(store: AccountingStore): void {
  // Sort ledger by date ascending
  store.ledger.sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime())
  let running = 0
  for (const entry of store.ledger) {
    running += (entry.debit || 0) - (entry.credit || 0)
    entry.balance = running
  }
}

export async function getLedgerTransactions(): Promise<AccountingActionResponse<LedgerTransaction[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    const store = readStore()
    recomputeLedgerBalances(store)
    // Return newest first for display
    const sorted = [...store.ledger].sort(
      (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    )
    return { success: true, data: sorted }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch ledger transactions' }
  }
}

export async function createManualLedgerEntryAction(
  input: CreateLedgerEntryInput
): Promise<AccountingActionResponse<LedgerTransaction>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    if (!input.description?.trim()) return { success: false, error: 'Description is required' }
    if (!input.transaction_date) return { success: false, error: 'Date is required' }

    const debit = Number(input.debit) || 0
    const credit = Number(input.credit) || 0

    if (debit <= 0 && credit <= 0) {
      return { success: false, error: 'Either debit or credit amount must be greater than zero' }
    }

    const store = readStore()
    const now = new Date().toISOString()
    const ref = input.reference_number?.trim() || `JV-${Date.now().toString().slice(-6)}`

    const newEntry: LedgerTransaction = {
      id: crypto.randomUUID(),
      transaction_date: input.transaction_date,
      reference_number: ref,
      transaction_type: input.transaction_type || 'ADJUSTMENT',
      source_id: null,
      description: input.description.trim(),
      account_id: input.account_id || null,
      account_name: input.account_name || 'General Ledger Account',
      debit,
      credit,
      balance: 0,
      created_by: user.id,
      created_at: now,
    }

    // If linked to bank account, update bank account current balance
    if (input.account_id) {
      const bIdx = store.bankAccounts.findIndex((b) => b.id === input.account_id)
      if (bIdx !== -1) {
        store.bankAccounts[bIdx].current_balance += debit - credit
        store.bankAccounts[bIdx].updated_at = now
      }
    }

    store.ledger.push(newEntry)
    recomputeLedgerBalances(store)
    writeStore(store)

    safeRevalidatePath('/accounting/ledger')
    safeRevalidatePath('/accounting/bank-accounts')
    safeRevalidatePath('/accounting/dashboard')

    return { success: true, data: newEntry }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create manual ledger entry' }
  }
}

// ==========================================
// Company Settings Actions
// ==========================================

export async function getCompanySettings(): Promise<AccountingActionResponse<AccountingCompanySettings>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    try {
      const admin = await createAdminClient()
      const { data, error } = await admin
        .from('accounting_company_settings')
        .select('*')
        .limit(1)
        .single()

      if (!error && data) {
        return { success: true, data: data as AccountingCompanySettings }
      }
    } catch {
      // Fallback
    }

    const store = readStore()
    return { success: true, data: store.companySettings }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch company settings' }
  }
}

export async function updateCompanySettingsAction(
  input: UpdateCompanySettingsInput
): Promise<AccountingActionResponse<AccountingCompanySettings>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    if (!input.company_name?.trim()) {
      return { success: false, error: 'Company Name is required' }
    }

    const store = readStore()
    const now = new Date().toISOString()

    const updatedSettings: AccountingCompanySettings = {
      ...store.companySettings,
      ...input,
      company_name: input.company_name.trim(),
      updated_at: now,
    }

    store.companySettings = updatedSettings
    writeStore(store)

    try {
      const admin = await createAdminClient()
      await admin
        .from('accounting_company_settings')
        .upsert(updatedSettings)
    } catch {
      // Fallback handled
    }

    safeRevalidatePath('/accounting/company-settings')
    safeRevalidatePath('/accounting/dashboard')

    return { success: true, data: updatedSettings }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update company settings' }
  }
}

// ==========================================
// Dashboard Summary Analytics
// ==========================================

export async function getAccountingDashboardData(): Promise<AccountingActionResponse<AccountingDashboardData>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    const store = readStore()
    recomputeLedgerBalances(store)

    // Calculate totals
    const totalIncome = store.income
      .filter((i) => i.status === 'Received' || i.status === 'Partially Received')
      .reduce((sum, i) => {
        const received = i.received_amount !== undefined
          ? i.received_amount
          : (i.status === 'Received' ? (i.total_amount || i.amount) : 0)
        return sum + received
      }, 0)

    const totalExpenses = store.expenses
      .filter((e) => e.status === 'Paid' || e.status === 'Partially Paid')
      .reduce((sum, e) => {
        const paid = e.paid_amount !== undefined
          ? e.paid_amount
          : (e.status === 'Paid' ? (e.total_amount || e.amount) : 0)
        return sum + paid
      }, 0)

    const netBalance = totalIncome - totalExpenses

    const activeBankAccounts = store.bankAccounts.filter((b) => b.status === 'Active')
    const bankAccountBalance = activeBankAccounts.reduce((sum, b) => sum + (b.current_balance || 0), 0)

    const pendingIncomeCount = store.income.filter(
      (i) => i.status === 'Pending' || i.status === 'Partially Received'
    ).length
    const pendingExpensesCount = store.expenses.filter(
      (e) => e.status === 'Pending' || e.status === 'Partially Paid'
    ).length

    // Recent 8 ledger transactions
    const recentTransactions = [...store.ledger]
      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
      .slice(0, 8)

    // Expense Categories breakdown
    const expenseCatMap: Record<string, number> = {}
    for (const exp of store.expenses) {
      const paid = exp.paid_amount !== undefined
        ? exp.paid_amount
        : (exp.status === 'Paid' ? (exp.total_amount || exp.amount) : 0)
      if (paid > 0) {
        expenseCatMap[exp.category] = (expenseCatMap[exp.category] || 0) + paid
      }
    }

    const topExpenseCategories = Object.entries(expenseCatMap)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    // Income Categories breakdown
    const incomeCatMap: Record<string, number> = {}
    for (const inc of store.income) {
      const rec = inc.received_amount !== undefined
        ? inc.received_amount
        : (inc.status === 'Received' ? (inc.total_amount || inc.amount) : 0)
      if (rec > 0) {
        incomeCatMap[inc.category] = (incomeCatMap[inc.category] || 0) + rec
      }
    }

    const topIncomeCategories = Object.entries(incomeCatMap)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    // Monthly breakdown (last 6 months)
    const monthlyMap: Record<string, { income: number; expenses: number }> = {}
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const currentDate = new Date()

    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`
      monthlyMap[key] = { income: 0, expenses: 0 }
    }

    for (const inc of store.income) {
      const rec = inc.received_amount !== undefined
        ? inc.received_amount
        : (inc.status === 'Received' ? (inc.total_amount || inc.amount) : 0)
      if (rec > 0) {
        const d = new Date(inc.income_date)
        const key = `${months[d.getMonth()]} ${d.getFullYear()}`
        if (monthlyMap[key]) {
          monthlyMap[key].income += rec
        }
      }
    }

    for (const exp of store.expenses) {
      const paid = exp.paid_amount !== undefined
        ? exp.paid_amount
        : (exp.status === 'Paid' ? (exp.total_amount || exp.amount) : 0)
      if (paid > 0) {
        const d = new Date(exp.expense_date)
        const key = `${months[d.getMonth()]} ${d.getFullYear()}`
        if (monthlyMap[key]) {
          monthlyMap[key].expenses += paid
        }
      }
    }

    const monthlyBreakdown = Object.entries(monthlyMap).map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      net: data.income - data.expenses,
    }))

    return {
      success: true,
      data: {
        totalIncome,
        totalExpenses,
        netBalance,
        bankAccountBalance,
        activeBankAccountsCount: activeBankAccounts.length,
        pendingIncomeCount,
        pendingExpensesCount,
        recentTransactions,
        monthlyBreakdown,
        topExpenseCategories,
        topIncomeCategories,
        bankAccounts: store.bankAccounts,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch dashboard data' }
  }
}

// ==========================================
// Accounting Attachment Upload
// ==========================================
export async function uploadAccountingAttachmentAction(formData: FormData): Promise<{
  success: boolean
  url?: string
  storagePath?: string
  fileName?: string
  fileSize?: number
  mimeType?: string
  error?: string
}> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    const file = formData.get('file') as File | null
    if (!file || !(file instanceof File) || file.size === 0) {
      return { success: false, error: 'No file provided' }
    }

    // Allowed extensions and MIME types: PDF, PNG, JPG/JPEG
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg']
    const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']

    const originalName = file.name || 'document'
    const lastDotIndex = originalName.lastIndexOf('.')
    if (lastDotIndex === -1) {
      return { success: false, error: 'Invalid file. File must have an extension (.pdf, .png, .jpg, .jpeg).' }
    }
    const ext = originalName.substring(lastDotIndex).toLowerCase()

    if (!allowedExtensions.includes(ext)) {
      return { success: false, error: 'Invalid file type. Only PDF, PNG, and JPG/JPEG files are allowed.' }
    }

    if (file.type && !allowedMimeTypes.includes(file.type.toLowerCase())) {
      return { success: false, error: 'Invalid file MIME type. Only PDF, PNG, and JPG/JPEG files are allowed.' }
    }

    // File size validation: 10MB
    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2)
      return { success: false, error: `File size exceeds 10MB limit (selected: ${sizeMb} MB).` }
    }

    const sanitizedBase = originalName
      .substring(0, lastDotIndex)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50)
    const uniqueFileName = `${Date.now()}-${sanitizedBase}${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    // 1. Try Supabase storage first
    try {
      const admin = await createAdminClient()
      if (admin?.storage) {
        const bucketName = 'accounting-attachments'
        const { data: buckets } = await admin.storage.listBuckets()
        if (!buckets?.find((b: any) => b.name === bucketName)) {
          await admin.storage.createBucket(bucketName, { public: true })
        }
        const storagePath = `proofs/${uniqueFileName}`
        const { error: uploadError } = await admin.storage
          .from(bucketName)
          .upload(storagePath, buffer, {
            contentType: file.type || (ext === '.pdf' ? 'application/pdf' : 'image/jpeg'),
            upsert: false
          })

        if (!uploadError) {
          const { data: urlData } = admin.storage.from(bucketName).getPublicUrl(storagePath)
          if (urlData?.publicUrl) {
            return {
              success: true,
              url: urlData.publicUrl,
              storagePath,
              fileName: originalName,
              fileSize: file.size,
              mimeType: file.type || (ext === '.pdf' ? 'application/pdf' : 'image/jpeg'),
            }
          }
        }
      }
    } catch {
      // Continue to local storage fallback
    }

    // 2. Fallback to public uploads folder (servable directly via Next.js)
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'accounting')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    const localFilePath = path.join(uploadDir, uniqueFileName)
    fs.writeFileSync(localFilePath, buffer)
    const publicUrl = `/uploads/accounting/${uniqueFileName}`

    return {
      success: true,
      url: publicUrl,
      storagePath: `local:${publicUrl}`,
      fileName: originalName,
      fileSize: file.size,
      mimeType: file.type || (ext === '.pdf' ? 'application/pdf' : 'image/jpeg'),
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to process attachment upload' }
  }
}

// ==========================================
// Sync Helpers for Income & Expense Integration
// ==========================================

function syncLedgerAccountsForIncome(store: AccountingStore, inc: IncomeRecord): void {
  if (!store.ledgerAccounts) store.ledgerAccounts = getDefaultLedgerAccounts()
  if (!store.journalEntries) store.journalEntries = []
  const amountToPost = inc.received_amount > 0 ? inc.received_amount : (inc.status === 'Received' ? inc.total_amount : 0)
  if (amountToPost <= 0) return

  // 1. Debit Bank/Cash Asset account
  const bankAcc = store.ledgerAccounts.find(
    (a) => a.id === inc.bank_account_id || 
           a.account_name.toLowerCase() === (inc.bank_account_name || '').toLowerCase() ||
           (inc.payment_method === 'Cash' && a.account_code === '1010') ||
           (inc.bank_account_id === 'b1111111-1111-1111-1111-111111111111' && a.account_code === '1020') ||
           (inc.bank_account_id === 'b2222222-2222-2222-2222-222222222222' && a.account_code === '1030') ||
           (inc.bank_account_id === 'b3333333-3333-3333-3333-333333333333' && a.account_code === '1010')
  ) || store.ledgerAccounts.find((a) => a.account_code === '1020')
  if (bankAcc) {
    bankAcc.current_balance += amountToPost
    bankAcc.updated_at = new Date().toISOString()
  }

  // 2. Credit Revenue Account
  const incomeAcc = store.ledgerAccounts.find(
    (a) => a.account_type === 'Income' && (
      a.account_name.toLowerCase().includes(inc.category.toLowerCase()) ||
      inc.category.toLowerCase().includes(a.account_name.toLowerCase())
    )
  ) || store.ledgerAccounts.find((a) => a.account_code === '4010')
  const revenueCredit = inc.tax_amount > 0 ? Math.round((amountToPost - inc.tax_amount) * 100) / 100 : amountToPost
  if (incomeAcc) {
    incomeAcc.current_balance += revenueCredit
    incomeAcc.updated_at = new Date().toISOString()
  }

  // 3. Credit GST Payable if tax > 0
  let gstAcc: LedgerAccount | undefined
  if (inc.tax_amount > 0) {
    gstAcc = store.ledgerAccounts.find((a) => a.account_code === '2020')
    if (gstAcc) {
      gstAcc.current_balance += inc.tax_amount
      gstAcc.updated_at = new Date().toISOString()
    }
  }

  // 4. Create auto-posted Journal Entry if one doesn't exist yet for this reference
  const existingJE = store.journalEntries.find(
    (j) => j.reference_number === inc.income_number
  )
  if (!existingJE && bankAcc && incomeAcc) {
    const year = new Date().getFullYear()
    const prefix = `JE-${year}-`
    const matching = store.journalEntries
      .filter((j) => j.entry_number.startsWith(prefix))
      .map((j) => {
        const parts = j.entry_number.split('-')
        return parseInt(parts[parts.length - 1], 10) || 0
      })
    const maxNum = matching.length > 0 ? Math.max(...matching) : 0
    const jeNum = `${prefix}${(maxNum + 1).toString().padStart(4, '0')}`
    const now = new Date().toISOString()
    const jeId = crypto.randomUUID()

    const lines: JournalLine[] = [
      {
        id: crypto.randomUUID(),
        journal_entry_id: jeId,
        account_id: bankAcc.id,
        account_code: bankAcc.account_code,
        account_name: bankAcc.account_name,
        description: `Bank receipt from ${inc.customer_name}`,
        debit: amountToPost,
        credit: 0,
        reference_notes: inc.payment_reference || null,
      },
      {
        id: crypto.randomUUID(),
        journal_entry_id: jeId,
        account_id: incomeAcc.id,
        account_code: incomeAcc.account_code,
        account_name: incomeAcc.account_name,
        description: `Revenue: ${inc.category} (${inc.customer_name})`,
        debit: 0,
        credit: revenueCredit,
        reference_notes: inc.invoice_number || null,
      },
    ]

    if (inc.tax_amount > 0 && gstAcc) {
      lines.push({
        id: crypto.randomUUID(),
        journal_entry_id: jeId,
        account_id: gstAcc.id,
        account_code: gstAcc.account_code,
        account_name: gstAcc.account_name,
        description: `GST Output on ${inc.income_number}`,
        debit: 0,
        credit: inc.tax_amount,
        reference_notes: null,
      })
    }

    const autoJE: JournalEntry = {
      id: jeId,
      entry_number: jeNum,
      entry_date: inc.income_date,
      reference_number: inc.income_number,
      description: `Client Receipt: ${inc.customer_name} - ${inc.category}`,
      campaign_project: inc.campaign_project || null,
      attachment_url: inc.attachment_url || null,
      status: 'Posted',
      total_debit: amountToPost,
      total_credit: amountToPost,
      lines,
      created_by: inc.created_by,
      created_at: now,
      updated_at: now,
    }

    store.journalEntries.unshift(autoJE)
  }
}

function syncLedgerAccountsForExpense(store: AccountingStore, exp: ExpenseRecord): void {
  if (!store.ledgerAccounts) store.ledgerAccounts = getDefaultLedgerAccounts()
  if (!store.journalEntries) store.journalEntries = []
  const paidAmount = exp.paid_amount > 0 ? exp.paid_amount : (exp.status === 'Paid' ? exp.total_amount : 0)
  if (paidAmount <= 0) return

  // 1. Credit Bank/Cash Asset account
  const bankAcc = store.ledgerAccounts.find(
    (a) => a.id === exp.bank_account_id || 
           a.account_name.toLowerCase() === (exp.bank_account_name || '').toLowerCase() ||
           (exp.payment_method === 'Cash' && a.account_code === '1010') ||
           (exp.bank_account_id === 'b1111111-1111-1111-1111-111111111111' && a.account_code === '1020') ||
           (exp.bank_account_id === 'b2222222-2222-2222-2222-222222222222' && a.account_code === '1030') ||
           (exp.bank_account_id === 'b3333333-3333-3333-3333-333333333333' && a.account_code === '1010')
  ) || store.ledgerAccounts.find((a) => a.account_code === '1020')
  if (bankAcc) {
    bankAcc.current_balance -= paidAmount
    bankAcc.updated_at = new Date().toISOString()
  }

  // 2. Debit Expense Account
  const expAcc = store.ledgerAccounts.find(
    (a) => a.account_type === 'Expense' && (
      a.account_name.toLowerCase().includes(exp.category.toLowerCase()) ||
      exp.category.toLowerCase().includes(a.account_name.toLowerCase())
    )
  ) || store.ledgerAccounts.find((a) => a.account_code === '5130' || a.account_code === '5010')
  if (expAcc) {
    expAcc.current_balance += paidAmount
    expAcc.updated_at = new Date().toISOString()
  }

  // 3. Create auto-posted Journal Entry if one doesn't exist yet for this reference
  const existingJE = store.journalEntries.find(
    (j) => j.reference_number === exp.expense_number
  )
  if (!existingJE && bankAcc && expAcc) {
    const year = new Date().getFullYear()
    const prefix = `JE-${year}-`
    const matching = store.journalEntries
      .filter((j) => j.entry_number.startsWith(prefix))
      .map((j) => {
        const parts = j.entry_number.split('-')
        return parseInt(parts[parts.length - 1], 10) || 0
      })
    const maxNum = matching.length > 0 ? Math.max(...matching) : 0
    const jeNum = `${prefix}${(maxNum + 1).toString().padStart(4, '0')}`
    const now = new Date().toISOString()
    const jeId = crypto.randomUUID()

    const lines: JournalLine[] = [
      {
        id: crypto.randomUUID(),
        journal_entry_id: jeId,
        account_id: expAcc.id,
        account_code: expAcc.account_code,
        account_name: expAcc.account_name,
        description: `Expense: ${exp.category} (${exp.vendor_payee})`,
        debit: paidAmount,
        credit: 0,
        reference_notes: exp.invoice_number || null,
      },
      {
        id: crypto.randomUUID(),
        journal_entry_id: jeId,
        account_id: bankAcc.id,
        account_code: bankAcc.account_code,
        account_name: bankAcc.account_name,
        description: `Disbursement from ${bankAcc.account_name}`,
        debit: 0,
        credit: paidAmount,
        reference_notes: exp.payment_reference || null,
      },
    ]

    const autoJE: JournalEntry = {
      id: jeId,
      entry_number: jeNum,
      entry_date: exp.expense_date,
      reference_number: exp.expense_number,
      description: `Expense Payout: ${exp.vendor_payee} - ${exp.category}`,
      campaign_project: exp.campaign_project || null,
      attachment_url: exp.attachment_url || null,
      status: 'Posted',
      total_debit: paidAmount,
      total_credit: paidAmount,
      lines,
      created_by: exp.created_by,
      created_at: now,
      updated_at: now,
    }

    store.journalEntries.unshift(autoJE)
  }
}

// ==========================================
// Ledger Accounts Helpers & Dynamic Balancing
// ==========================================

function findLedgerAccount(
  accounts: LedgerAccount[],
  accountIdOrIdentifier?: string | null
): LedgerAccount | undefined {
  if (!accountIdOrIdentifier) return undefined
  const clean = decodeURIComponent(accountIdOrIdentifier).trim().toLowerCase()
  if (!clean) return undefined

  // 1. Direct ID match
  let match = accounts.find((a) => a.id.toLowerCase() === clean)
  if (match) return match

  // 2. Direct Account Code match
  match = accounts.find((a) => a.account_code.toLowerCase() === clean)
  if (match) return match

  // 3. Bank Account ID cross-mapping
  if (clean === 'b2222222-2222-2222-2222-222222222222') {
    return accounts.find((a) => a.account_code === '1030' || a.id === 'la-1030')
  }
  if (clean === 'b1111111-1111-1111-1111-111111111111') {
    return accounts.find((a) => a.account_code === '1020' || a.id === 'la-1020')
  }
  if (clean === 'b3333333-3333-3333-3333-333333333333') {
    return accounts.find((a) => a.account_code === '1010' || a.id === 'la-1010')
  }

  // 4. Direct Name match
  match = accounts.find((a) => a.account_name.toLowerCase() === clean)
  if (match) return match

  // 5. Digital Agency Common Aliases & Name Mapping
  if (clean.includes('axis')) {
    return accounts.find((a) => a.account_code === '1030')
  }
  if (clean.includes('hdfc')) {
    return accounts.find((a) => a.account_code === '1020')
  }
  if (clean.includes('petty') || clean.includes('cash in hand')) {
    return accounts.find((a) => a.account_code === '1010')
  }
  if (clean.includes('digital marketing')) {
    return accounts.find((a) => a.account_code === '4010')
  }
  if (clean.includes('seo')) {
    return accounts.find((a) => a.account_code === '4020')
  }
  if (clean.includes('social media')) {
    return accounts.find((a) => a.account_code === '4030')
  }
  if (clean.includes('google ads') && !clean.includes('expense')) {
    return accounts.find((a) => a.account_code === '4040')
  }
  if (clean.includes('meta ads') && !clean.includes('expense')) {
    return accounts.find((a) => a.account_code === '4050')
  }
  if (clean.includes('website')) {
    return accounts.find((a) => a.account_code === '4060')
  }
  if (clean.includes('consulting')) {
    return accounts.find((a) => a.account_code === '4070')
  }

  // 6. Substring match for longer names
  match = accounts.find(
    (a) =>
      a.account_name.length >= 6 &&
      (a.account_name.toLowerCase().includes(clean) || clean.includes(a.account_name.toLowerCase()))
  )
  return match
}

function isLineMatchingAccount(
  line: { account_id?: string; account_code?: string; account_name?: string },
  account: LedgerAccount
): boolean {
  const lineAccId = (line.account_id || '').trim().toLowerCase()
  const lineCode = (line.account_code || '').trim().toLowerCase()
  const lineName = (line.account_name || '').trim().toLowerCase()
  const accId = account.id.toLowerCase()
  const accCode = account.account_code.toLowerCase()
  const accName = account.account_name.toLowerCase()

  // 1. Direct ID match
  if (lineAccId && lineAccId === accId) return true

  // 2. Direct Code match
  if (lineCode && lineCode === accCode) return true
  if (lineAccId && lineAccId === accCode) return true

  // 3. Direct Name match
  if (lineName && lineName === accName) return true

  // 4. Bank Account ID cross-mapping
  if (accCode === '1030' && (lineAccId === 'b2222222-2222-2222-2222-222222222222' || lineName.includes('axis'))) return true
  if (accCode === '1020' && (lineAccId === 'b1111111-1111-1111-1111-111111111111' || lineName.includes('hdfc'))) return true
  if (accCode === '1010' && (lineAccId === 'b3333333-3333-3333-3333-333333333333' || lineName.includes('petty') || lineName.includes('cash'))) return true

  // 5. Account Name aliases & substrings
  if (accCode === '4010' && (lineName.includes('digital marketing') || lineAccId === 'la-4010')) return true
  if (accCode === '4020' && (lineName.includes('seo') || lineAccId === 'la-4020')) return true
  if (accCode === '4030' && (lineName.includes('social media') || lineAccId === 'la-4030')) return true
  if (accCode === '4040' && (lineName.includes('google ads') && !lineName.includes('expense'))) return true
  if (accCode === '4050' && (lineName.includes('meta ads') && !lineName.includes('expense'))) return true
  if (accCode === '4060' && lineName.includes('website')) return true
  if (accCode === '4070' && lineName.includes('consulting')) return true
  if (accCode === '5010' && (lineName.includes('google ads') && lineName.includes('expense'))) return true
  if (accCode === '5020' && (lineName.includes('meta ads') && lineName.includes('expense'))) return true
  if (accCode === '5050' && (lineName.includes('office rent') || (/\brent\b/i.test(lineName) && !lineName.includes('current')))) return true
  if (accCode === '5100' && lineName.includes('advertising')) return true

  // 6. Generic substring match
  if (lineName && accName && accName.length >= 6 && (lineName.includes(accName) || accName.includes(lineName))) {
    return true
  }

  return false
}

function calculateAccountTransactions(
  account: LedgerAccount,
  store: AccountingStore
): {
  rawTransactions: Omit<LedgerAccountTransactionHistoryItem, 'running_balance'>[]
  calculatedTransactions: LedgerAccountTransactionHistoryItem[]
  totalDebit: number
  totalCredit: number
  closingBalance: number
} {
  const rawTransactions: Omit<LedgerAccountTransactionHistoryItem, 'running_balance'>[] = []
  const seenTxIds = new Set<string>()

  // 1. Transactions from Posted Journal Entries
  const coveredRefNumbers = new Set<string>()
  for (const je of store.journalEntries || []) {
    if (je.status !== 'Posted') continue
    if (je.reference_number) {
      coveredRefNumbers.add(je.reference_number)
    }
    for (const line of je.lines) {
      if (isLineMatchingAccount(line, account)) {
        const txId = line.id || `je-line-${je.id}-${line.account_id || line.account_code}`
        if (!seenTxIds.has(txId)) {
          seenTxIds.add(txId)
          rawTransactions.push({
            id: txId,
            transaction_date: je.entry_date,
            journal_entry_number: je.entry_number,
            reference_number: je.reference_number || je.entry_number,
            campaign_project: je.campaign_project || null,
            transaction_type: 'Journal Entry',
            description: line.description || je.description,
            debit: Number(line.debit) || 0,
            credit: Number(line.credit) || 0,
          })
        }
      }
    }
  }

  // 2. Transactions from Income (skip if already represented in a posted Journal Entry)
  for (const inc of store.income || []) {
    if (coveredRefNumbers.has(inc.income_number)) continue
    const incTotal = Number(inc.received_amount > 0 ? inc.received_amount : (inc.status === 'Received' ? (inc.total_amount ?? inc.amount ?? 0) : 0)) || 0
    if (incTotal <= 0) continue

    // Bank/Cash receipt
    const isBankAcc =
      account.id === inc.bank_account_id ||
      account.account_name.toLowerCase() === (inc.bank_account_name || '').toLowerCase() ||
      (inc.payment_method === 'Cash' && account.account_code === '1010') ||
      (inc.bank_account_id === 'b1111111-1111-1111-1111-111111111111' && account.account_code === '1020') ||
      (inc.bank_account_id === 'b2222222-2222-2222-2222-222222222222' && account.account_code === '1030') ||
      (inc.bank_account_id === 'b3333333-3333-3333-3333-333333333333' && account.account_code === '1010')

    if (isBankAcc) {
      const txId = `inc-bank-${inc.id}`
      if (!seenTxIds.has(txId)) {
        seenTxIds.add(txId)
        rawTransactions.push({
          id: txId,
          transaction_date: inc.income_date,
          journal_entry_number: null,
          reference_number: inc.income_number,
          campaign_project: inc.campaign_project || null,
          transaction_type: 'Income (Bank Receipt)',
          description: `Client Receipt: ${inc.customer_name} - ${inc.category}`,
          debit: incTotal,
          credit: 0,
        })
      }
    }

    // Revenue account
    const isRevenueAcc =
      account.account_type === 'Income' &&
      (account.account_name.toLowerCase().includes(inc.category.toLowerCase()) ||
       inc.category.toLowerCase().includes(account.account_name.toLowerCase()) ||
       (account.account_code === '4010' && inc.category.toLowerCase().includes('digital marketing')) ||
       (account.account_code === '4020' && inc.category.toLowerCase().includes('seo')))

    if (isRevenueAcc) {
      const txId = `inc-rev-${inc.id}`
      if (!seenTxIds.has(txId)) {
        seenTxIds.add(txId)
        rawTransactions.push({
          id: txId,
          transaction_date: inc.income_date,
          journal_entry_number: null,
          reference_number: inc.income_number,
          campaign_project: inc.campaign_project || null,
          transaction_type: 'Income (Revenue)',
          description: `Revenue: ${inc.customer_name} (${inc.category})`,
          debit: 0,
          credit: Number(inc.amount ?? incTotal ?? 0) || 0,
        })
      }
    }

    // GST Output
    if (account.account_code === '2020' && inc.tax_amount > 0) {
      const txId = `inc-gst-${inc.id}`
      if (!seenTxIds.has(txId)) {
        seenTxIds.add(txId)
        rawTransactions.push({
          id: txId,
          transaction_date: inc.income_date,
          journal_entry_number: null,
          reference_number: inc.income_number,
          campaign_project: inc.campaign_project || null,
          transaction_type: 'GST Output',
          description: `GST Output: ${inc.customer_name} on ${inc.income_number}`,
          debit: 0,
          credit: inc.tax_amount,
        })
      }
    }
  }

  // 3. Transactions from Expenses (skip if already represented in a posted Journal Entry)
  for (const exp of store.expenses || []) {
    if (coveredRefNumbers.has(exp.expense_number)) continue
    const expTotal = Number(exp.paid_amount > 0 ? exp.paid_amount : (exp.status === 'Paid' ? (exp.total_amount ?? exp.amount ?? 0) : 0)) || 0
    if (expTotal <= 0) continue

    // Bank payout
    const isBankAcc =
      account.id === exp.bank_account_id ||
      account.account_name.toLowerCase() === (exp.bank_account_name || '').toLowerCase() ||
      (exp.payment_method === 'Cash' && account.account_code === '1010') ||
      (exp.bank_account_id === 'b1111111-1111-1111-1111-111111111111' && account.account_code === '1020') ||
      (exp.bank_account_id === 'b2222222-2222-2222-2222-222222222222' && account.account_code === '1030') ||
      (exp.bank_account_id === 'b3333333-3333-3333-3333-333333333333' && account.account_code === '1010')

    if (isBankAcc) {
      const txId = `exp-bank-${exp.id}`
      if (!seenTxIds.has(txId)) {
        seenTxIds.add(txId)
        rawTransactions.push({
          id: txId,
          transaction_date: exp.expense_date,
          journal_entry_number: null,
          reference_number: exp.expense_number,
          campaign_project: exp.campaign_project || null,
          transaction_type: 'Expense (Bank Payment)',
          description: `Payout: ${exp.vendor_payee} - ${exp.category}`,
          debit: 0,
          credit: expTotal,
        })
      }
    }

    // Expense category account
    const isExpAcc =
      account.account_type === 'Expense' &&
      (account.account_name.toLowerCase().includes(exp.category.toLowerCase()) ||
       exp.category.toLowerCase().includes(account.account_name.toLowerCase()))

    if (isExpAcc) {
      const txId = `exp-cost-${exp.id}`
      if (!seenTxIds.has(txId)) {
        seenTxIds.add(txId)
        rawTransactions.push({
          id: txId,
          transaction_date: exp.expense_date,
          journal_entry_number: null,
          reference_number: exp.expense_number,
          campaign_project: exp.campaign_project || null,
          transaction_type: 'Expense (Operating)',
          description: `Expense: ${exp.vendor_payee} (${exp.category})`,
          debit: Number(exp.amount ?? expTotal ?? 0) || 0,
          credit: 0,
        })
      }
    }
  }

  // Sort chronologically ascending
  rawTransactions.sort((a, b) => a.transaction_date.localeCompare(b.transaction_date))

  const isDebitNormal = account.account_type === 'Asset' || account.account_type === 'Expense'
  let currentBalance = 0
  if (isDebitNormal) {
    currentBalance = account.opening_balance_type === 'Debit' ? account.opening_balance : -account.opening_balance
  } else {
    currentBalance = account.opening_balance_type === 'Credit' ? account.opening_balance : -account.opening_balance
  }

  const calculatedTransactions: LedgerAccountTransactionHistoryItem[] = []
  let totalDebit = 0
  let totalCredit = 0

  for (const item of rawTransactions) {
    totalDebit += item.debit
    totalCredit += item.credit

    if (isDebitNormal) {
      currentBalance += item.debit - item.credit
    } else {
      currentBalance += item.credit - item.debit
    }

    calculatedTransactions.push({
      ...item,
      running_balance: Math.round(currentBalance * 100) / 100,
    })
  }

  return {
    rawTransactions,
    calculatedTransactions,
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    closingBalance: Math.round(currentBalance * 100) / 100,
  }
}

// ==========================================
// Ledger Accounts Actions
// ==========================================

export async function getLedgerAccounts(): Promise<AccountingActionResponse<LedgerAccount[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    const store = readStore()
    if (!store.ledgerAccounts) {
      store.ledgerAccounts = getDefaultLedgerAccounts()
    }

    // Compute live balance for each ledger account based on opening balance and transactions
    const accounts = (store.ledgerAccounts || []).map((acc) => {
      const { closingBalance } = calculateAccountTransactions(acc, store)
      return {
        ...acc,
        current_balance: closingBalance,
      }
    })

    const sorted = accounts.sort((a, b) => a.account_code.localeCompare(b.account_code))
    return { success: true, data: sorted }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch ledger accounts' }
  }
}

export async function getLedgerAccountById(id: string): Promise<AccountingActionResponse<LedgerAccount>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    const store = readStore()
    if (!store.ledgerAccounts) {
      store.ledgerAccounts = getDefaultLedgerAccounts()
    }

    const account = findLedgerAccount(store.ledgerAccounts || [], id)
    if (!account) return { success: false, error: 'Ledger account not found' }

    const { closingBalance } = calculateAccountTransactions(account, store)
    return {
      success: true,
      data: {
        ...account,
        current_balance: closingBalance,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch ledger account' }
  }
}

export async function createLedgerAccountAction(
  input: CreateLedgerAccountInput
): Promise<AccountingActionResponse<LedgerAccount>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    if (!input.account_name?.trim()) return { success: false, error: 'Account Name is required' }
    if (!input.account_code?.trim()) return { success: false, error: 'Account Code is required' }
    if (!input.account_type) return { success: false, error: 'Account Type is required' }

    const store = readStore()
    const codeNormalized = input.account_code.trim()

    // Check duplicate code
    const existing = (store.ledgerAccounts || []).find(
      (a) => a.account_code.toLowerCase() === codeNormalized.toLowerCase()
    )
    if (existing) {
      return { success: false, error: `Account Code ${codeNormalized} is already in use by '${existing.account_name}'` }
    }

    const now = new Date().toISOString()
    const openingBal = Number(input.opening_balance ?? 0)
    const newAccount: LedgerAccount = {
      id: crypto.randomUUID(),
      account_code: codeNormalized,
      account_name: input.account_name.trim(),
      account_type: input.account_type,
      parent_account_id: input.parent_account_id || null,
      description: input.description?.trim() || null,
      opening_balance: openingBal,
      opening_balance_type: input.opening_balance_type || 'Debit',
      current_balance: openingBal,
      status: input.status || 'Active',
      created_by: user.id,
      created_at: now,
      updated_at: now,
    }

    if (!store.ledgerAccounts) store.ledgerAccounts = []
    store.ledgerAccounts.push(newAccount)
    writeStore(store)

    // Try Supabase
    try {
      const admin = await createAdminClient()
      await admin.from('accounting_ledger_accounts').insert([newAccount])
    } catch {
      // Fallback saved
    }

    safeRevalidatePath('/accounting/ledger-accounts')
    safeRevalidatePath('/accounting/journal-entries')
    safeRevalidatePath('/accounting/dashboard')

    return { success: true, data: newAccount }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create ledger account' }
  }
}

export async function updateLedgerAccountAction(
  input: UpdateLedgerAccountInput
): Promise<AccountingActionResponse<LedgerAccount>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    const store = readStore()
    if (!store.ledgerAccounts) store.ledgerAccounts = []
    const idx = store.ledgerAccounts.findIndex((a) => a.id === input.id)
    if (idx === -1) return { success: false, error: 'Ledger account not found' }

    // If account code changed, verify uniqueness
    if (input.account_code && input.account_code.trim().toLowerCase() !== store.ledgerAccounts[idx].account_code.toLowerCase()) {
      const dup = store.ledgerAccounts.find(
        (a) => a.id !== input.id && a.account_code.toLowerCase() === input.account_code!.trim().toLowerCase()
      )
      if (dup) return { success: false, error: `Account Code ${input.account_code} is already used` }
    }

    const now = new Date().toISOString()
    const currentAcc = store.ledgerAccounts[idx]
    const updated: LedgerAccount = {
      ...currentAcc,
      ...input,
      account_name: input.account_name ? input.account_name.trim() : currentAcc.account_name,
      account_code: input.account_code ? input.account_code.trim() : currentAcc.account_code,
      updated_at: now,
    }

    store.ledgerAccounts[idx] = updated
    writeStore(store)

    // Try Supabase
    try {
      const admin = await createAdminClient()
      await admin
        .from('accounting_ledger_accounts')
        .update({
          account_name: updated.account_name,
          account_code: updated.account_code,
          account_type: updated.account_type,
          parent_account_id: updated.parent_account_id,
          description: updated.description,
          opening_balance: updated.opening_balance,
          opening_balance_type: updated.opening_balance_type,
          status: updated.status,
          updated_at: now,
        })
        .eq('id', input.id)
    } catch {
      // Fallback saved
    }

    safeRevalidatePath('/accounting/ledger-accounts')
    safeRevalidatePath(`/accounting/ledger-accounts/${input.id}`)
    safeRevalidatePath('/accounting/journal-entries')

    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update ledger account' }
  }
}

export async function deleteLedgerAccountAction(id: string): Promise<AccountingActionResponse<boolean>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    const store = readStore()
    const account = (store.ledgerAccounts || []).find((a) => a.id === id)
    if (!account) return { success: false, error: 'Ledger account not found' }

    // Check if any journal entries reference this account
    const hasJELines = (store.journalEntries || []).some((je) =>
      je.lines.some((l) => l.account_id === id || l.account_code === account.account_code)
    )
    if (hasJELines) {
      return { success: false, error: `Account '${account.account_name}' has associated journal entries and cannot be deleted.` }
    }

    store.ledgerAccounts = (store.ledgerAccounts || []).filter((a) => a.id !== id)
    writeStore(store)

    try {
      const admin = await createAdminClient()
      await admin.from('accounting_ledger_accounts').delete().eq('id', id)
    } catch {
      // Fallback deleted
    }

    safeRevalidatePath('/accounting/ledger-accounts')
    safeRevalidatePath('/accounting/journal-entries')

    return { success: true, data: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete ledger account' }
  }
}

export async function toggleLedgerAccountStatusAction(
  id: string,
  newStatus?: 'Active' | 'Inactive'
): Promise<AccountingActionResponse<LedgerAccount>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    const store = readStore()
    if (!store.ledgerAccounts) store.ledgerAccounts = []
    const idx = store.ledgerAccounts.findIndex((a) => a.id === id)
    if (idx === -1) return { success: false, error: 'Ledger account not found' }

    const targetStatus = newStatus || (store.ledgerAccounts[idx].status === 'Active' ? 'Inactive' : 'Active')
    store.ledgerAccounts[idx].status = targetStatus
    store.ledgerAccounts[idx].updated_at = new Date().toISOString()
    writeStore(store)

    try {
      const admin = await createAdminClient()
      await admin
        .from('accounting_ledger_accounts')
        .update({ status: targetStatus, updated_at: store.ledgerAccounts[idx].updated_at })
        .eq('id', id)
    } catch {
      // Fallback saved
    }

    safeRevalidatePath('/accounting/ledger-accounts')
    safeRevalidatePath(`/accounting/ledger-accounts/${id}`)
    safeRevalidatePath('/accounting/journal-entries')

    return { success: true, data: store.ledgerAccounts[idx] }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to toggle ledger account status' }
  }
}

export interface LedgerAccountTransactionHistoryItem {
  id: string
  transaction_date: string
  journal_entry_number?: string | null
  reference_number: string
  campaign_project?: string | null
  transaction_type: string
  description: string
  debit: number
  credit: number
  running_balance: number
}

export interface LedgerAccountDetailsResponse {
  account: LedgerAccount
  opening_balance: number
  closing_balance: number
  total_debit: number
  total_credit: number
  transactions: LedgerAccountTransactionHistoryItem[]
}

export async function getLedgerAccountTransactionsAction(
  accountId: string,
  options?: {
    startDate?: string
    endDate?: string
    search?: string
    type?: string
    campaign_project?: string
    reference_number?: string
    journal_entry_number?: string
  }
): Promise<AccountingActionResponse<LedgerAccountDetailsResponse>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    const store = readStore()
    if (!store.ledgerAccounts) {
      store.ledgerAccounts = getDefaultLedgerAccounts()
    }

    const account = findLedgerAccount(store.ledgerAccounts || [], accountId)
    if (!account) return { success: false, error: 'Account not found' }

    const { calculatedTransactions, totalDebit, totalCredit, closingBalance } =
      calculateAccountTransactions(account, store)

    // Apply filtering options if provided
    let filtered = calculatedTransactions
    if (options?.startDate) {
      filtered = filtered.filter((t) => t.transaction_date >= options.startDate!)
    }
    if (options?.endDate) {
      filtered = filtered.filter((t) => t.transaction_date <= options.endDate!)
    }
    if (options?.search) {
      const q = options.search.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.reference_number.toLowerCase().includes(q) ||
          (t.journal_entry_number && t.journal_entry_number.toLowerCase().includes(q))
      )
    }
    if (options?.type && options.type !== 'ALL') {
      filtered = filtered.filter((t) => t.transaction_type.toLowerCase().includes(options.type!.toLowerCase()))
    }
    if (options?.campaign_project && options.campaign_project !== 'ALL') {
      const cp = options.campaign_project.toLowerCase()
      filtered = filtered.filter((t) => t.campaign_project && t.campaign_project.toLowerCase().includes(cp))
    }
    if (options?.reference_number) {
      const ref = options.reference_number.toLowerCase()
      filtered = filtered.filter((t) => t.reference_number.toLowerCase().includes(ref))
    }
    if (options?.journal_entry_number) {
      const jen = options.journal_entry_number.toLowerCase()
      filtered = filtered.filter((t) => t.journal_entry_number && t.journal_entry_number.toLowerCase().includes(jen))
    }

    return {
      success: true,
      data: {
        account: {
          ...account,
          current_balance: closingBalance,
        },
        opening_balance: account.opening_balance,
        closing_balance: closingBalance,
        total_debit: totalDebit,
        total_credit: totalCredit,
        transactions: filtered,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch ledger account transactions' }
  }
}

// ==========================================
// Journal Entries Actions
// ==========================================

export async function generateJournalEntryNumber(): Promise<string> {
  const store = readStore()
  const year = new Date().getFullYear()
  const prefix = `JE-${year}-`
  const matching = (store.journalEntries || [])
    .filter((j) => j.entry_number.startsWith(prefix))
    .map((j) => {
      const parts = j.entry_number.split('-')
      return parseInt(parts[parts.length - 1], 10) || 0
    })

  const maxNum = matching.length > 0 ? Math.max(...matching) : 0
  const nextNum = (maxNum + 1).toString().padStart(4, '0')
  return `${prefix}${nextNum}`
}

export async function getJournalEntries(
  options?: {
    status?: string
    search?: string
    startDate?: string
    endDate?: string
  }
): Promise<AccountingActionResponse<JournalEntry[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    const store = readStore()
    let entries = [...(store.journalEntries || [])]

    // Sort by entry_date descending
    entries.sort((a, b) => b.entry_date.localeCompare(a.entry_date))

    if (options?.status && options.status !== 'ALL') {
      entries = entries.filter((e) => e.status === options.status)
    }
    if (options?.startDate) {
      entries = entries.filter((e) => e.entry_date >= options.startDate!)
    }
    if (options?.endDate) {
      entries = entries.filter((e) => e.entry_date <= options.endDate!)
    }
    if (options?.search) {
      const q = options.search.toLowerCase()
      entries = entries.filter(
        (e) =>
          e.entry_number.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          (e.reference_number && e.reference_number.toLowerCase().includes(q)) ||
          e.lines.some((l) => l.account_name.toLowerCase().includes(q))
      )
    }

    return { success: true, data: entries }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch journal entries' }
  }
}

export async function getJournalEntryById(id: string): Promise<AccountingActionResponse<JournalEntry>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    const store = readStore()
    const entry = (store.journalEntries || []).find((e) => e.id === id || e.entry_number === id)
    if (!entry) return { success: false, error: 'Journal entry not found' }

    return { success: true, data: entry }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch journal entry' }
  }
}

export async function createJournalEntryAction(
  input: CreateJournalEntryInput
): Promise<AccountingActionResponse<JournalEntry>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    if (!input.entry_date) return { success: false, error: 'Entry Date is required' }
    if (!input.description?.trim()) return { success: false, error: 'Description / Narration is required' }
    if (!input.lines || input.lines.length < 2) {
      return { success: false, error: 'A journal entry must contain at least 2 lines (Debit and Credit).' }
    }

    const store = readStore()
    if (!store.ledgerAccounts) store.ledgerAccounts = getDefaultLedgerAccounts()

    // Validate lines and calculate totals
    let totalDebit = 0
    let totalCredit = 0
    const processedLines: JournalLine[] = []

    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i]
      if (!line.account_id) {
        return { success: false, error: `Line ${i + 1}: Account must be selected.` }
      }
      let acc = findLedgerAccount(store.ledgerAccounts, line.account_id)
      if (!acc && line.account_code) {
        acc = findLedgerAccount(store.ledgerAccounts, line.account_code)
      }
      if (!acc && line.account_name) {
        acc = findLedgerAccount(store.ledgerAccounts, line.account_name)
      }
      if (acc && acc.status !== 'Active') {
        return {
          success: false,
          error: `Account '${acc.account_name}' is inactive. Only active ledger accounts can be selected for new journal entries.`,
        }
      }

      const debit = Math.round((Number(line.debit) || 0) * 100) / 100
      const credit = Math.round((Number(line.credit) || 0) * 100) / 100

      if (debit < 0 || credit < 0) {
        return { success: false, error: `Line ${i + 1}: Debit and Credit amounts cannot be negative.` }
      }
      if (debit === 0 && credit === 0 && input.status === 'Posted') {
        return { success: false, error: `Line ${i + 1}: Must specify either a Debit or Credit amount.` }
      }

      totalDebit += debit
      totalCredit += credit

      processedLines.push({
        id: crypto.randomUUID(),
        account_id: acc ? acc.id : line.account_id,
        account_code: acc ? acc.account_code : (line.account_code || ''),
        account_name: acc ? acc.account_name : (line.account_name || 'Account'),
        description: line.description?.trim() || null,
        debit,
        credit,
        reference_notes: line.reference_notes?.trim() || null,
      })
    }

    totalDebit = Math.round(totalDebit * 100) / 100
    totalCredit = Math.round(totalCredit * 100) / 100

    const status = input.status || 'Draft'

    // Strict Double-Entry Validation for Posted entries
    if (status === 'Posted') {
      if (totalDebit <= 0 || Math.abs(totalDebit - totalCredit) > 0.001) {
        return {
          success: false,
          error: 'Journal entry cannot be posted because Total Debit and Total Credit must be equal.',
        }
      }
    }

    const now = new Date().toISOString()
    const entryNumber = input.entry_number?.trim() || (await generateJournalEntryNumber())

    // Validate uniqueness of entry number
    const dupEntry = (store.journalEntries || []).find(
      (j) => j.entry_number.toLowerCase() === entryNumber.toLowerCase()
    )
    if (dupEntry) {
      return { success: false, error: `Journal entry number '${entryNumber}' is already in use.` }
    }

    const newEntry: JournalEntry = {
      id: crypto.randomUUID(),
      entry_number: entryNumber,
      entry_date: input.entry_date,
      reference_number: input.reference_number?.trim() || null,
      description: input.description.trim(),
      campaign_project: input.campaign_project?.trim() || null,
      attachment_url: input.attachment_url?.trim() || null,
      status,
      total_debit: totalDebit,
      total_credit: totalCredit,
      lines: processedLines.map((l) => ({ ...l, journal_entry_id: undefined })),
      created_by: user.id,
      created_at: now,
      updated_at: now,
    }

    // Attach journal_entry_id to lines
    newEntry.lines = newEntry.lines.map((l) => ({ ...l, journal_entry_id: newEntry.id }))

    // If posted, update the Ledger Accounts and General Ledger
    if (status === 'Posted') {
      for (const line of newEntry.lines) {
        const accIdx = store.ledgerAccounts.findIndex((a) => a.id === line.account_id)
        if (accIdx !== -1) {
          const acc = store.ledgerAccounts[accIdx]
          // Asset and Expense accounts increase with Debit, decrease with Credit
          if (acc.account_type === 'Asset' || acc.account_type === 'Expense') {
            acc.current_balance += line.debit - line.credit
          } else {
            // Liability, Equity, Income increase with Credit, decrease with Debit
            acc.current_balance += line.credit - line.debit
          }
          acc.updated_at = now
        }

        // Also sync bank account balance if this ledger account maps to a bank account
        const matchedBank = store.bankAccounts.find(
          (b) =>
            b.id === line.account_id ||
            b.account_name.toLowerCase() === line.account_name.toLowerCase() ||
            (line.account_code === '1010' && b.id === 'b3333333-3333-3333-3333-333333333333') ||
            (line.account_code === '1020' && b.id === 'b1111111-1111-1111-1111-111111111111') ||
            (line.account_code === '1030' && b.id === 'b2222222-2222-2222-2222-222222222222') ||
            (b.bank_name && line.account_name.toLowerCase().includes(b.bank_name.toLowerCase()))
        )
        if (matchedBank) {
          matchedBank.current_balance += line.debit - line.credit
          matchedBank.updated_at = now
        }

        // Append to general ledger transaction record
        const prevBal = store.ledger.length > 0 ? store.ledger[store.ledger.length - 1].balance : 0
        store.ledger.push({
          id: crypto.randomUUID(),
          transaction_date: newEntry.entry_date,
          reference_number: newEntry.entry_number,
          transaction_type: 'ADJUSTMENT',
          source_id: newEntry.id,
          description: `JE ${newEntry.entry_number}: ${line.description || newEntry.description}`,
          account_id: line.account_id,
          account_name: line.account_name,
          debit: line.debit,
          credit: line.credit,
          balance: prevBal + (line.debit - line.credit),
          created_by: user.id,
          created_at: now,
        })
      }
    }

    if (!store.journalEntries) store.journalEntries = []
    store.journalEntries.unshift(newEntry)
    writeStore(store)

    // Try Supabase insert
    try {
      const admin = await createAdminClient()
      await admin.from('accounting_journal_entries').insert([{
        id: newEntry.id,
        entry_number: newEntry.entry_number,
        entry_date: newEntry.entry_date,
        reference_number: newEntry.reference_number,
        description: newEntry.description,
        campaign_project: newEntry.campaign_project,
        attachment_url: newEntry.attachment_url,
        status: newEntry.status,
        total_debit: newEntry.total_debit,
        total_credit: newEntry.total_credit,
        created_by: user.id,
        created_at: now,
        updated_at: now,
      }])
    } catch {
      // Fallback saved
    }

    safeRevalidatePath('/accounting', 'layout')
    safeRevalidatePath('/accounting/journal-entries')
    safeRevalidatePath('/accounting/ledger-accounts')
    safeRevalidatePath('/accounting/ledger-accounts/[id]', 'page')
    safeRevalidatePath('/accounting/ledger')
    safeRevalidatePath('/accounting/dashboard')

    return { success: true, data: newEntry }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create journal entry' }
  }
}

export async function updateJournalEntryAction(
  input: UpdateJournalEntryInput
): Promise<AccountingActionResponse<JournalEntry>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    const store = readStore()
    if (!store.journalEntries) store.journalEntries = []
    const idx = store.journalEntries.findIndex((e) => e.id === input.id)
    if (idx === -1) return { success: false, error: 'Journal entry not found' }

    const existing = store.journalEntries[idx]
    if (existing.status === 'Posted') {
      return { success: false, error: 'Posted journal entries cannot be freely modified to preserve audit integrity.' }
    }

    // Process lines and calculate totals
    const linesToProcess = input.lines || existing.lines
    if (linesToProcess.length < 2) {
      return { success: false, error: 'A journal entry must contain at least 2 lines.' }
    }

    let totalDebit = 0
    let totalCredit = 0
    const processedLines: JournalLine[] = []

    for (let i = 0; i < linesToProcess.length; i++) {
      const line = linesToProcess[i]
      let acc = findLedgerAccount(store.ledgerAccounts || [], line.account_id)
      if (!acc && line.account_code) {
        acc = findLedgerAccount(store.ledgerAccounts || [], line.account_code)
      }
      if (!acc && line.account_name) {
        acc = findLedgerAccount(store.ledgerAccounts || [], line.account_name)
      }
      if (acc && acc.status !== 'Active') {
        return {
          success: false,
          error: `Account '${acc.account_name}' is inactive. Only active ledger accounts can be selected for journal entries.`,
        }
      }

      const debit = Math.round((Number(line.debit) || 0) * 100) / 100
      const credit = Math.round((Number(line.credit) || 0) * 100) / 100

      totalDebit += debit
      totalCredit += credit

      processedLines.push({
        id: (line as any).id || crypto.randomUUID(),
        journal_entry_id: existing.id,
        account_id: acc ? acc.id : line.account_id,
        account_code: acc ? acc.account_code : (line.account_code || ''),
        account_name: acc ? acc.account_name : (line.account_name || 'Account'),
        description: line.description?.trim() || null,
        debit,
        credit,
        reference_notes: line.reference_notes?.trim() || null,
      })
    }

    totalDebit = Math.round(totalDebit * 100) / 100
    totalCredit = Math.round(totalCredit * 100) / 100

    const nextStatus = input.status || existing.status

    if (nextStatus === 'Posted') {
      if (totalDebit <= 0 || Math.abs(totalDebit - totalCredit) > 0.001) {
        return {
          success: false,
          error: 'Journal entry cannot be posted because Total Debit and Total Credit must be equal.',
        }
      }
    }

    const now = new Date().toISOString()
    const updatedEntry: JournalEntry = {
      ...existing,
      entry_date: input.entry_date || existing.entry_date,
      reference_number: input.reference_number !== undefined ? input.reference_number : existing.reference_number,
      description: input.description !== undefined ? input.description.trim() : existing.description,
      campaign_project: input.campaign_project !== undefined ? input.campaign_project : existing.campaign_project,
      attachment_url: input.attachment_url !== undefined ? input.attachment_url : existing.attachment_url,
      status: nextStatus,
      total_debit: totalDebit,
      total_credit: totalCredit,
      lines: processedLines,
      updated_at: now,
    }

    // If changing from Draft to Posted:
    if (existing.status === 'Draft' && nextStatus === 'Posted') {
      for (const line of updatedEntry.lines) {
        const accIdx = (store.ledgerAccounts || []).findIndex((a) => a.id === line.account_id)
        if (accIdx !== -1) {
          const acc = store.ledgerAccounts![accIdx]
          if (acc.account_type === 'Asset' || acc.account_type === 'Expense') {
            acc.current_balance += line.debit - line.credit
          } else {
            acc.current_balance += line.credit - line.debit
          }
          acc.updated_at = now
        }

        // Also sync bank account balance if this ledger account maps to a bank account
        const matchedBank = store.bankAccounts.find(
          (b) =>
            b.id === line.account_id ||
            b.account_name.toLowerCase() === line.account_name.toLowerCase() ||
            (line.account_code === '1010' && b.id === 'b3333333-3333-3333-3333-333333333333') ||
            (line.account_code === '1020' && b.id === 'b1111111-1111-1111-1111-111111111111') ||
            (line.account_code === '1030' && b.id === 'b2222222-2222-2222-2222-222222222222') ||
            (b.bank_name && line.account_name.toLowerCase().includes(b.bank_name.toLowerCase()))
        )
        if (matchedBank) {
          matchedBank.current_balance += line.debit - line.credit
          matchedBank.updated_at = now
        }
      }
    }

    store.journalEntries[idx] = updatedEntry
    writeStore(store)

    safeRevalidatePath('/accounting', 'layout')
    safeRevalidatePath('/accounting/journal-entries')
    safeRevalidatePath('/accounting/ledger-accounts')
    safeRevalidatePath('/accounting/ledger-accounts/[id]', 'page')
    safeRevalidatePath('/accounting/ledger')

    return { success: true, data: updatedEntry }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update journal entry' }
  }
}

export async function deleteJournalEntryAction(id: string): Promise<AccountingActionResponse<boolean>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    const store = readStore()
    const entry = (store.journalEntries || []).find((e) => e.id === id || e.entry_number === id)
    if (!entry) return { success: false, error: 'Journal entry not found' }

    if (entry.status === 'Posted') {
      return {
        success: false,
        error: 'Posted journal entries cannot be deleted to preserve the double-entry accounting audit trail.',
      }
    }

    store.journalEntries = (store.journalEntries || []).filter((e) => e.id !== id)
    writeStore(store)

    safeRevalidatePath('/accounting/journal-entries')
    safeRevalidatePath('/accounting/ledger-accounts')

    return { success: true, data: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete journal entry' }
  }
}

export async function postJournalEntryAction(id: string): Promise<AccountingActionResponse<JournalEntry>> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    const store = readStore()
    const entry = (store.journalEntries || []).find((e) => e.id === id)
    if (!entry) return { success: false, error: 'Journal entry not found' }

    if (entry.status === 'Posted') {
      return { success: true, data: entry }
    }

    if (Math.abs(entry.total_debit - entry.total_credit) > 0.001 || entry.total_debit <= 0) {
      return {
        success: false,
        error: 'Journal entry cannot be posted because Total Debit and Total Credit must be equal.',
      }
    }

    return updateJournalEntryAction({
      id,
      status: 'Posted',
    })
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to post journal entry' }
  }
}


