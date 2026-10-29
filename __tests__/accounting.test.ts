import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getBankAccounts,
  createBankAccountAction,
  updateBankAccountAction,
  toggleBankAccountStatusAction,
  deleteBankAccountAction,
  getIncomeRecords,
  createIncomeAction,
  updateIncomeAction,
  deleteIncomeAction,
  getExpenseRecords,
  createExpenseAction,
  updateExpenseAction,
  deleteExpenseAction,
  getLedgerTransactions,
  createManualLedgerEntryAction,
  getCompanySettings,
  updateCompanySettingsAction,
  getAccountingDashboardData,
  generateIncomeNumber,
  generateExpenseNumber,
  uploadAccountingAttachmentAction,
  getLedgerAccounts,
  getLedgerAccountById,
  createLedgerAccountAction,
  updateLedgerAccountAction,
  deleteLedgerAccountAction,
  getLedgerAccountTransactionsAction,
  getJournalEntries,
  getJournalEntryById,
  createJournalEntryAction,
  updateJournalEntryAction,
  deleteJournalEntryAction,
  postJournalEntryAction,
  generateJournalEntryNumber,
} from '@/lib/actions/accounting'


// Mock getCurrentUser and Supabase with an Employee role
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn().mockResolvedValue({
    id: 'emp-user-456',
    email: 'employee@triplesproduction.com',
    role: 'Employee',
    employee_id: 'EMP-005',
    employee_name: 'Staff Employee',
  }),
  requireRole: vi.fn().mockResolvedValue({
    id: 'emp-user-456',
    email: 'employee@triplesproduction.com',
    role: 'Employee',
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: () => ({
      select: () => Promise.resolve({ data: null, error: { message: 'fallback' } }),
    }),
  }),
  createAdminClient: vi.fn().mockResolvedValue({
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: null, error: { message: 'fallback' } }),
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: { message: 'fallback' } }),
        }),
        limit: () => ({
          single: () => Promise.resolve({ data: null, error: { message: 'fallback' } }),
        }),
      }),
      insert: () => Promise.resolve({ error: { message: 'fallback' } }),
      update: () => ({
        eq: () => Promise.resolve({ error: { message: 'fallback' } }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ error: { message: 'fallback' } }),
      }),
      upsert: () => Promise.resolve({ error: { message: 'fallback' } }),
    }),
  }),
}))

describe('Accounting Module - Bank Accounts', () => {
  it('should fetch bank accounts and return exactly 3 accounts (HDFC, Axis, and Office Petty Cash)', async () => {
    const res = await getBankAccounts()
    expect(res.success).toBe(true)
    expect(res.data).toBeDefined()
    expect(Array.isArray(res.data)).toBe(true)
    expect(res.data!.length).toBe(3)
    const names = res.data!.map((b) => b.account_name.toLowerCase())
    expect(names.some((n) => n.includes('hdfc'))).toBe(true)
    expect(names.some((n) => n.includes('axis'))).toBe(true)
    expect(names.some((n) => n.includes('petty cash'))).toBe(true)
  })

  it('should create a new bank account and allow toggling its status', async () => {
    const createRes = await createBankAccountAction({
      account_name: 'Axis Bank Reserves',
      bank_name: 'Axis Bank',
      account_number: '912010045678901',
      account_type: 'Current',
      ifsc_code: 'UTIB0000123',
      branch: 'Nehru Place',
      opening_balance: 150000,
    })

    expect(createRes.success).toBe(true)
    expect(createRes.data?.account_name).toBe('Axis Bank Reserves')
    expect(createRes.data?.current_balance).toBe(150000)
    expect(createRes.data?.status).toBe('Active')

    const newId = createRes.data!.id

    // Toggle status to Inactive
    const toggleRes = await toggleBankAccountStatusAction(newId, 'Inactive')
    expect(toggleRes.success).toBe(true)
    expect(toggleRes.data?.status).toBe('Inactive')

    // Toggle back to Active
    const toggleRes2 = await toggleBankAccountStatusAction(newId, 'Active')
    expect(toggleRes2.success).toBe(true)
    expect(toggleRes2.data?.status).toBe('Active')

    // Clean up temporary bank account
    await deleteBankAccountAction(newId)
  })
})

describe('Accounting Module - Income & Ledger Inflow', () => {
  it('should generate sequential income numbers', async () => {
    const num = await generateIncomeNumber()
    expect(num).toMatch(/^INC-\d{4}-\d{4}$/)
  })

  it('should calculate GST 18% automatically (e.g. 50,000 + 18% = 59,000) and update ledger with received funds', async () => {
    const banks = await getBankAccounts()
    const targetBank = banks.data![0]
    const initialBankBalance = targetBank.current_balance

    const incomeRes = await createIncomeAction({
      income_date: '2026-10-27',
      customer_name: 'Nexus Social Media Inc',
      campaign_project: 'Diwali Meta Ads Blitz',
      invoice_number: 'INV-2026-0042',
      category: 'Meta Ads Management',
      amount: 50000,
      tax_type: 'GST 18%',
      payment_method: 'UPI',
      upi_id: 'agency@okhdfcbank',
      payment_reference: 'UPI/2026/891234',
      bank_account_id: targetBank.id,
      description: 'Lead generation and creative campaign management',
      status: 'Received',
    })

    expect(incomeRes.success).toBe(true)
    expect(incomeRes.data?.amount).toBe(50000)
    expect(incomeRes.data?.tax_rate).toBe(18)
    expect(incomeRes.data?.tax_amount).toBe(9000)
    expect(incomeRes.data?.total_amount).toBe(59000)
    expect(incomeRes.data?.received_amount).toBe(59000)
    expect(incomeRes.data?.pending_amount).toBe(0)

    // Check bank account balance increased by total received amount (₹59,000)
    const updatedBanks = await getBankAccounts()
    const updatedTargetBank = updatedBanks.data!.find((b) => b.id === targetBank.id)
    expect(updatedTargetBank?.current_balance).toBe(initialBankBalance + 59000)

    // Check ledger entry exists with debit 59000
    const ledgerRes = await getLedgerTransactions()
    const matchingTx = ledgerRes.data!.find(
      (tx) => tx.reference_number === incomeRes.data?.income_number
    )
    expect(matchingTx).toBeDefined()
    expect(matchingTx?.debit).toBe(59000)
  })

  it('should support No Tax option (Tax = 0, Total = Amount)', async () => {
    const incomeRes = await createIncomeAction({
      income_date: '2026-10-27',
      customer_name: 'Direct Freelance Client',
      category: 'Content Marketing',
      amount: 50000,
      tax_type: 'No Tax',
      payment_method: 'Cash',
      status: 'Received',
    })

    expect(incomeRes.success).toBe(true)
    expect(incomeRes.data?.amount).toBe(50000)
    expect(incomeRes.data?.tax_rate).toBe(0)
    expect(incomeRes.data?.tax_amount).toBe(0)
    expect(incomeRes.data?.total_amount).toBe(50000)
  })

  it('should correctly calculate GST 5%, GST 12%, GST 28%, and Custom Tax', async () => {
    // GST 5%
    const res5 = await createIncomeAction({
      income_date: '2026-10-27',
      customer_name: 'Print & Creatives Client',
      category: 'Graphic Design',
      amount: 100000,
      tax_type: 'GST 5%',
      payment_method: 'Bank Transfer',
      bank_name: 'HDFC Bank',
      payment_reference: 'UTR-HDFC-99124',
      status: 'Pending',
    })
    expect(res5.success).toBe(true)
    expect(res5.data?.tax_amount).toBe(5000)
    expect(res5.data?.total_amount).toBe(105000)
    expect(res5.data?.pending_amount).toBe(105000)

    // GST 12%
    const res12 = await createIncomeAction({
      income_date: '2026-10-27',
      customer_name: 'Studio Productions',
      category: 'Video / Creative Services',
      amount: 20000,
      tax_type: 'GST 12%',
      payment_method: 'Credit Card',
      card_holder_name: 'Studio Manager',
      card_last4: '4021',
      status: 'Received',
    })
    expect(res12.success).toBe(true)
    expect(res12.data?.tax_amount).toBe(2400)
    expect(res12.data?.total_amount).toBe(22400)

    // GST 28%
    const res28 = await createIncomeAction({
      income_date: '2026-10-27',
      customer_name: 'Luxury Tech Brand',
      category: 'Website Development',
      amount: 10000,
      tax_type: 'GST 28%',
      payment_method: 'Debit Card',
      card_holder_name: 'Brand CFO',
      card_last4: '9812',
      status: 'Received',
    })
    expect(res28.success).toBe(true)
    expect(res28.data?.tax_amount).toBe(2800)
    expect(res28.data?.total_amount).toBe(12800)

    // Custom Tax 8.5%
    const resCustom = await createIncomeAction({
      income_date: '2026-10-27',
      customer_name: 'Overseas Agency Partner',
      category: 'Consulting',
      amount: 100000,
      tax_type: 'Custom Tax',
      tax_rate: 8.5,
      payment_method: 'Bank Transfer',
      bank_name: 'ICICI Bank',
      payment_reference: 'UTR-ICICI-4412',
      status: 'Received',
    })
    expect(resCustom.success).toBe(true)
    expect(resCustom.data?.tax_amount).toBe(8500)
    expect(resCustom.data?.total_amount).toBe(108500)
  })

  it('should handle Partially Received payment status and auto-calculate pending balance', async () => {
    const banks = await getBankAccounts()
    const targetBank = banks.data![0]
    const initialBalance = targetBank.current_balance

    // Subtotal 50,000 + 18% GST (9,000) = Total 59,000. Received 25,000 => Pending 34,000
    const partialRes = await createIncomeAction({
      income_date: '2026-10-27',
      customer_name: 'HyperGrowth SEO Retainer',
      category: 'SEO Services',
      amount: 50000,
      tax_type: 'GST 18%',
      payment_method: 'Bank Transfer',
      bank_name: 'HDFC Corporate Current',
      bank_account_id: targetBank.id,
      payment_reference: 'NEFT-PARTIAL-112',
      status: 'Partially Received',
      received_amount: 25000,
    })

    expect(partialRes.success).toBe(true)
    expect(partialRes.data?.total_amount).toBe(59000)
    expect(partialRes.data?.received_amount).toBe(25000)
    expect(partialRes.data?.pending_amount).toBe(34000)

    // Only received amount (25,000) should be added to bank balance
    const updatedBanks = await getBankAccounts()
    const updatedBank = updatedBanks.data!.find((b) => b.id === targetBank.id)
    expect(updatedBank?.current_balance).toBe(initialBalance + 25000)
  })

  it('should validate and reject invalid inputs (empty client, zero amount, negative tax, received > total)', async () => {
    // Empty client
    const resEmptyClient = await createIncomeAction({
      income_date: '2026-10-27',
      customer_name: '',
      category: 'Google Ads / PPC',
      amount: 10000,
      payment_method: 'Cash',
    })
    expect(resEmptyClient.success).toBe(false)
    expect(resEmptyClient.error).toMatch(/Client Name is required/i)

    // Amount <= 0
    const resZeroAmount = await createIncomeAction({
      income_date: '2026-10-27',
      customer_name: 'Test Client',
      category: 'Google Ads / PPC',
      amount: 0,
      payment_method: 'Cash',
    })
    expect(resZeroAmount.success).toBe(false)
    expect(resZeroAmount.error).toMatch(/greater than 0/i)

    // Negative tax rate
    const resNegTax = await createIncomeAction({
      income_date: '2026-10-27',
      customer_name: 'Test Client',
      category: 'Google Ads / PPC',
      amount: 10000,
      tax_type: 'Custom Tax',
      tax_rate: -5,
      payment_method: 'Cash',
    })
    expect(resNegTax.success).toBe(false)
    expect(resNegTax.error).toMatch(/Tax Rate cannot be negative/i)

    // Received amount > Total amount
    const resOverReceived = await createIncomeAction({
      income_date: '2026-10-27',
      customer_name: 'Test Client',
      category: 'Google Ads / PPC',
      amount: 10000,
      tax_type: 'No Tax',
      payment_method: 'Cash',
      status: 'Partially Received',
      received_amount: 15000,
    })
    expect(resOverReceived.success).toBe(false)
    expect(resOverReceived.error).toMatch(/cannot be greater than Total Amount/i)
  })
})

describe('Accounting Module - Expenses & Ledger Outflow', () => {
  it('should generate sequential expense numbers', async () => {
    const num = await generateExpenseNumber()
    expect(num).toMatch(/^EXP-\d{4}-\d{4}$/)
  })

  it('should calculate GST 18% automatically (e.g. 50,000 + 18% = 59,000) and deduct from bank & credit ledger', async () => {
    const banks = await getBankAccounts()
    const targetBank = banks.data![0]
    const initialBankBalance = targetBank.current_balance

    const expenseRes = await createExpenseAction({
      expense_date: '2026-10-27',
      category: 'Google Ads',
      vendor_payee: 'Google Ireland Ltd',
      campaign_project: 'Q4 PPC Search Blitz',
      invoice_number: 'INV-GOOG-2026-90',
      amount: 50000,
      tax_type: 'GST 18%',
      payment_method: 'Credit Card',
      card_holder_name: 'Ad Ops Lead',
      card_last4: '1099',
      payment_reference: 'CC-AUTH-772199',
      bank_account_id: targetBank.id,
      description: 'PPC Search Ads Campaign Spend',
      status: 'Paid',
    })

    expect(expenseRes.success).toBe(true)
    expect(expenseRes.data?.amount).toBe(50000)
    expect(expenseRes.data?.tax_rate).toBe(18)
    expect(expenseRes.data?.tax_amount).toBe(9000)
    expect(expenseRes.data?.total_amount).toBe(59000)
    expect(expenseRes.data?.paid_amount).toBe(59000)
    expect(expenseRes.data?.pending_amount).toBe(0)

    // Check bank balance deducted by full settled total (59,000)
    const updatedBanks = await getBankAccounts()
    const updatedTargetBank = updatedBanks.data!.find((b) => b.id === targetBank.id)
    expect(updatedTargetBank?.current_balance).toBe(initialBankBalance - 59000)

    // Check ledger entry exists with credit 59000 and debit 0
    const ledgerRes = await getLedgerTransactions()
    const matchingTx = ledgerRes.data!.find(
      (tx) => tx.reference_number === expenseRes.data?.expense_number
    )
    expect(matchingTx).toBeDefined()
    expect(matchingTx?.credit).toBe(59000)
    expect(matchingTx?.debit).toBe(0)
    expect(matchingTx?.transaction_type).toBe('EXPENSE')
  })

  it('should support No Tax, GST 5%, GST 12%, GST 28%, and Custom Tax for expenses', async () => {
    // No Tax
    const resNoTax = await createExpenseAction({
      expense_date: '2026-10-27',
      category: 'Internet & Telephone',
      vendor_payee: 'City Telecom Fibernet',
      amount: 4000,
      tax_type: 'No Tax',
      payment_method: 'UPI',
      upi_id: 'telecom@upi',
      status: 'Paid',
    })
    expect(resNoTax.success).toBe(true)
    expect(resNoTax.data?.tax_amount).toBe(0)
    expect(resNoTax.data?.total_amount).toBe(4000)

    // GST 5%
    const res5 = await createExpenseAction({
      expense_date: '2026-10-27',
      category: 'Travel & Transportation',
      vendor_payee: 'Intercity Fleet Corp',
      amount: 10000,
      tax_type: 'GST 5%',
      payment_method: 'Debit Card',
      card_holder_name: 'Travel Coordinator',
      card_last4: '5542',
      status: 'Paid',
    })
    expect(res5.success).toBe(true)
    expect(res5.data?.tax_amount).toBe(500)
    expect(res5.data?.total_amount).toBe(10500)

    // GST 28%
    const res28 = await createExpenseAction({
      expense_date: '2026-10-27',
      category: 'Equipment',
      vendor_payee: 'Apple Authorized Enterprise Reseller',
      amount: 100000,
      tax_type: 'GST 28%',
      payment_method: 'Bank Transfer',
      bank_name: 'Apple Enterprise Bank',
      payment_reference: 'UTR-APP-99',
      status: 'Paid',
    })
    expect(res28.success).toBe(true)
    expect(res28.data?.tax_amount).toBe(28000)
    expect(res28.data?.total_amount).toBe(128000)

    // Custom Tax
    const resCustom = await createExpenseAction({
      expense_date: '2026-10-27',
      category: 'Professional Services',
      vendor_payee: 'Legal Associates LLP',
      amount: 50000,
      tax_type: 'Custom Tax',
      tax_rate: 10,
      payment_method: 'Bank Transfer',
      bank_name: 'State Bank of India',
      payment_reference: 'UTR-LEGAL-88',
      status: 'Paid',
    })
    expect(resCustom.success).toBe(true)
    expect(resCustom.data?.tax_amount).toBe(5000)
    expect(resCustom.data?.total_amount).toBe(55000)
  })

  it('should handle Partially Paid expense status and auto-calculate pending balance', async () => {
    const banks = await getBankAccounts()
    const targetBank = banks.data![0]
    const initialBalance = targetBank.current_balance

    // Subtotal 50,000 + 18% GST (9,000) = Total 59,000. Paid 20,000 => Pending 39,000
    const partialRes = await createExpenseAction({
      expense_date: '2026-10-27',
      category: 'Meta Ads',
      vendor_payee: 'Meta Platforms Inc',
      amount: 50000,
      tax_type: 'GST 18%',
      payment_method: 'Credit Card',
      card_holder_name: 'Agency Ad Account',
      card_last4: '9912',
      bank_account_id: targetBank.id,
      payment_reference: 'CC-PARTIAL-991',
      status: 'Partially Paid',
      paid_amount: 20000,
    })

    expect(partialRes.success).toBe(true)
    expect(partialRes.data?.total_amount).toBe(59000)
    expect(partialRes.data?.paid_amount).toBe(20000)
    expect(partialRes.data?.pending_amount).toBe(39000)

    // Only actual paid amount (20,000) should be deducted from bank account
    const updatedBanks = await getBankAccounts()
    const updatedBank = updatedBanks.data!.find((b) => b.id === targetBank.id)
    expect(updatedBank?.current_balance).toBe(initialBalance - 20000)
  })

  it('should validate and reject invalid expense inputs (empty vendor, zero amount, negative tax, paid > total)', async () => {
    const emptyVendor = await createExpenseAction({
      expense_date: '2026-10-27',
      vendor_payee: '',
      category: 'Office Supplies',
      amount: 5000,
      payment_method: 'Cash',
    })
    expect(emptyVendor.success).toBe(false)
    expect(emptyVendor.error).toMatch(/Vendor \/ Payee Name is required/i)

    const zeroAmt = await createExpenseAction({
      expense_date: '2026-10-27',
      vendor_payee: 'Vendor Corp',
      category: 'Office Supplies',
      amount: 0,
      payment_method: 'Cash',
    })
    expect(zeroAmt.success).toBe(false)
    expect(zeroAmt.error).toMatch(/greater than 0/i)

    const negTax = await createExpenseAction({
      expense_date: '2026-10-27',
      vendor_payee: 'Vendor Corp',
      category: 'Office Supplies',
      amount: 5000,
      tax_type: 'Custom Tax',
      tax_rate: -2,
      payment_method: 'Cash',
    })
    expect(negTax.success).toBe(false)
    expect(negTax.error).toMatch(/Tax Rate cannot be negative/i)

    const overPaid = await createExpenseAction({
      expense_date: '2026-10-27',
      vendor_payee: 'Vendor Corp',
      category: 'Office Supplies',
      amount: 5000,
      tax_type: 'No Tax',
      payment_method: 'Cash',
      status: 'Partially Paid',
      paid_amount: 8000,
    })
    expect(overPaid.success).toBe(false)
    expect(overPaid.error).toMatch(/cannot exceed Total Amount/i)
  })
})

describe('Accounting Module - General Ledger & Adjustments', () => {
  it('should allow posting manual journal entries and recalculate running balance', async () => {
    const jvRes = await createManualLedgerEntryAction({
      transaction_date: '2026-10-27',
      reference_number: 'JV-AUDIT-001',
      transaction_type: 'ADJUSTMENT',
      description: 'Direct cash audit reconciliation entry',
      account_name: 'Cash Clearing',
      debit: 5000,
      credit: 0,
    })

    expect(jvRes.success).toBe(true)
    expect(jvRes.data?.debit).toBe(5000)

    const ledgerRes = await getLedgerTransactions()
    expect(ledgerRes.success).toBe(true)
    const jv = ledgerRes.data!.find((tx) => tx.reference_number === 'JV-AUDIT-001')
    expect(jv).toBeDefined()
    expect(jv?.balance).toBeDefined()
  })
})

describe('Accounting Module - Company Settings', () => {
  it('should fetch and update accounting company settings', async () => {
    const settingsRes = await getCompanySettings()
    expect(settingsRes.success).toBe(true)
    expect(settingsRes.data?.company_name).toBeDefined()

    const updateRes = await updateCompanySettingsAction({
      company_name: 'Triple S Production ERP Inc.',
      tax_gst_number: '07AAAAA9999Z1Z8',
      pan_number: 'BBBBB1111B',
      currency: 'INR',
      currency_symbol: '₹',
      financial_year_start: '04-01',
      financial_year_end: '03-31',
    })

    expect(updateRes.success).toBe(true)
    expect(updateRes.data?.company_name).toBe('Triple S Production ERP Inc.')
    expect(updateRes.data?.tax_gst_number).toBe('07AAAAA9999Z1Z8')
  })
})

describe('Accounting Module - Dashboard Analytics', () => {
  it('should aggregate dashboard financial metrics correctly', async () => {
    const dashRes = await getAccountingDashboardData()
    expect(dashRes.success).toBe(true)
    const d = dashRes.data!

    expect(d.totalIncome).toBeGreaterThan(0)
    expect(d.totalExpenses).toBeGreaterThan(0)
    expect(d.netBalance).toBe(d.totalIncome - d.totalExpenses)
    expect(d.bankAccountBalance).toBeGreaterThan(0)
    expect(Array.isArray(d.recentTransactions)).toBe(true)
    expect(Array.isArray(d.monthlyBreakdown)).toBe(true)
    expect(Array.isArray(d.topExpenseCategories)).toBe(true)
  })
})

describe('Accounting Module - Employee Access & RBAC', () => {
  it('should grant Employee role permission to access all Accounting routes', async () => {
    const { hasRouteAccess } = await import('@/config/rbac')
    expect(hasRouteAccess('Employee', '/accounting')).toBe(true)
    expect(hasRouteAccess('Employee', '/accounting/dashboard')).toBe(true)
    expect(hasRouteAccess('Employee', '/accounting/income')).toBe(true)
    expect(hasRouteAccess('Employee', '/accounting/expenses')).toBe(true)
    expect(hasRouteAccess('Employee', '/accounting/ledger')).toBe(true)
    expect(hasRouteAccess('Employee', '/accounting/bank-accounts')).toBe(true)
    expect(hasRouteAccess('Employee', '/accounting/company-settings')).toBe(true)
  })
})

describe('Accounting Module - File Upload & Attachments', () => {
  it('should upload a valid PDF attachment successfully', async () => {
    const pdfContent = '%PDF-1.4 mock pdf content'
    const file = new File([pdfContent], 'invoice_nov2026.pdf', { type: 'application/pdf' })
    const formData = new FormData()
    formData.append('file', file)

    const res = await uploadAccountingAttachmentAction(formData)
    expect(res.success).toBe(true)
    expect(res.url).toBeDefined()
    expect(res.fileName).toBe('invoice_nov2026.pdf')
    expect(res.mimeType).toBe('application/pdf')
  })

  it('should upload a valid PNG/JPG attachment successfully', async () => {
    const imgContent = 'mock image data'
    const file = new File([imgContent], 'payment_proof.png', { type: 'image/png' })
    const formData = new FormData()
    formData.append('file', file)

    const res = await uploadAccountingAttachmentAction(formData)
    expect(res.success).toBe(true)
    expect(res.url).toBeDefined()
    expect(res.fileName).toBe('payment_proof.png')
    expect(res.mimeType).toBe('image/png')
  })

  it('should reject invalid file types (e.g. .exe, .zip, .txt)', async () => {
    const file = new File(['content'], 'malware.exe', { type: 'application/x-msdownload' })
    const formData = new FormData()
    formData.append('file', file)

    const res = await uploadAccountingAttachmentAction(formData)
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/only pdf, png, and jpg\/jpeg/i)
  })

  it('should reject files exceeding 10MB', async () => {
    // Mock a 11MB file
    const largeBuffer = new Uint8Array(11 * 1024 * 1024)
    const file = new File([largeBuffer], 'large_scan.pdf', { type: 'application/pdf' })
    const formData = new FormData()
    formData.append('file', file)

    const res = await uploadAccountingAttachmentAction(formData)
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/exceeds 10mb limit/i)
  })

  it('should save income and expense transactions with attachment file references', async () => {
    // 1. Income with attachment
    const incRes = await createIncomeAction({
      income_date: '2026-10-27',
      customer_name: 'BrandWave Digital',
      category: 'Meta Ads Management',
      amount: 45000,
      tax_type: 'GST 18%',
      payment_method: 'UPI',
      upi_id: 'brandwave@upi',
      status: 'Received',
      attachment_url: '/uploads/accounting/test-proof-1.pdf',
    })
    expect(incRes.success).toBe(true)
    expect(incRes.data?.attachment_url).toBe('/uploads/accounting/test-proof-1.pdf')

    // 2. Expense with attachment
    const expRes = await createExpenseAction({
      expense_date: '2026-10-27',
      vendor_payee: 'Google Cloud EMEA',
      category: 'Hosting & Domain',
      amount: 15000,
      tax_type: 'GST 18%',
      payment_method: 'Credit Card',
      card_holder_name: 'DevOps Lead',
      card_last4: '2281',
      status: 'Paid',
      attachment_url: '/uploads/accounting/test-bill-2.png',
    })
    expect(expRes.success).toBe(true)
    expect(expRes.data?.attachment_url).toBe('/uploads/accounting/test-bill-2.png')
  })
})

describe('Accounting Module - Dynamic Payment Methods & Validation', () => {
  it('should validate and create UPI payments successfully', async () => {
    // Missing UPI ID should fail
    const failUpi = await createIncomeAction({
      income_date: '2026-10-27',
      customer_name: 'Client Alpha',
      category: 'SEO Services',
      amount: 25000,
      payment_method: 'UPI',
      upi_id: '',
    })
    expect(failUpi.success).toBe(false)
    expect(failUpi.error).toMatch(/UPI ID is required/i)

    // Valid UPI
    const validUpi = await createIncomeAction({
      income_date: '2026-10-27',
      customer_name: 'Client Alpha',
      category: 'SEO Services',
      amount: 25000,
      payment_method: 'UPI',
      upi_id: 'client.alpha@okaxis',
      payment_reference: 'UTR-UPI-884192',
    })
    expect(validUpi.success).toBe(true)
    expect(validUpi.data?.upi_id).toBe('client.alpha@okaxis')
  })

  it('should validate and create Credit & Debit Card payments without storing sensitive credentials', async () => {
    // Missing card holder name should fail
    const failHolder = await createExpenseAction({
      expense_date: '2026-10-27',
      vendor_payee: 'Figma Inc',
      category: 'Software & Subscriptions',
      amount: 12000,
      payment_method: 'Credit Card',
      card_holder_name: '',
      card_last4: '1234',
    })
    expect(failHolder.success).toBe(false)
    expect(failHolder.error).toMatch(/Card Holder Name is required/i)

    // Invalid last4 (not 4 digits) should fail
    const failLast4 = await createExpenseAction({
      expense_date: '2026-10-27',
      vendor_payee: 'Figma Inc',
      category: 'Software & Subscriptions',
      amount: 12000,
      payment_method: 'Credit Card',
      card_holder_name: 'Design Lead',
      card_last4: '12',
    })
    expect(failLast4.success).toBe(false)
    expect(failLast4.error).toMatch(/exactly 4 numeric digits/i)

    // Valid Card
    const validCard = await createExpenseAction({
      expense_date: '2026-10-27',
      vendor_payee: 'Figma Inc',
      category: 'Software & Subscriptions',
      amount: 12000,
      payment_method: 'Debit Card',
      card_holder_name: 'Design Lead',
      card_last4: '5512',
      payment_reference: 'AUTH-FIGMA-99',
    })
    expect(validCard.success).toBe(true)
    expect(validCard.data?.card_holder_name).toBe('Design Lead')
    expect(validCard.data?.card_last4).toBe('5512')
  })

  it('should validate and create Bank Transfer payments', async () => {
    // Missing bank name should fail
    const failBank = await createIncomeAction({
      income_date: '2026-10-27',
      customer_name: 'Enterprise Client Ltd',
      category: 'Website Development',
      amount: 150000,
      payment_method: 'Bank Transfer',
      bank_name: '',
      payment_reference: 'NEFT-12345',
    })
    expect(failBank.success).toBe(false)
    expect(failBank.error).toMatch(/Bank Name is required/i)

    // Missing UTR should fail
    const failUtr = await createIncomeAction({
      income_date: '2026-10-27',
      customer_name: 'Enterprise Client Ltd',
      category: 'Website Development',
      amount: 150000,
      payment_method: 'Bank Transfer',
      bank_name: 'State Bank of India',
      payment_reference: '',
    })
    expect(failUtr.success).toBe(false)
    expect(failUtr.error).toMatch(/Transaction \/ UTR Number is required/i)

    // Valid Bank Transfer
    const validTransfer = await createIncomeAction({
      income_date: '2026-10-27',
      customer_name: 'Enterprise Client Ltd',
      category: 'Website Development',
      amount: 150000,
      payment_method: 'Bank Transfer',
      bank_name: 'HDFC Corporate Current',
      account_name: 'Triple S Operations',
      payment_reference: 'HDFC-RTGS-991204',
    })
    expect(validTransfer.success).toBe(true)
    expect(validTransfer.data?.bank_name).toBe('HDFC Corporate Current')
    expect(validTransfer.data?.account_name).toBe('Triple S Operations')
  })

  it('should validate and create Cheque payments with status (Pending, Cleared, Bounced)', async () => {
    // Missing Cheque number should fail
    const failChqNum = await createIncomeAction({
      income_date: '2026-10-27',
      customer_name: 'Legacy Partner Corp',
      category: 'Consulting',
      amount: 75000,
      payment_method: 'Cheque',
      cheque_number: '',
      bank_name: 'Punjab National Bank',
    })
    expect(failChqNum.success).toBe(false)
    expect(failChqNum.error).toMatch(/Cheque Number is required/i)

    // Missing Bank name should fail
    const failChqBank = await createIncomeAction({
      income_date: '2026-10-27',
      customer_name: 'Legacy Partner Corp',
      category: 'Consulting',
      amount: 75000,
      payment_method: 'Cheque',
      cheque_number: '003921',
      bank_name: '',
    })
    expect(failChqBank.success).toBe(false)
    expect(failChqBank.error).toMatch(/Bank Name is required/i)

    // Valid Cheque with Cleared status
    const validCheque = await createIncomeAction({
      income_date: '2026-10-27',
      customer_name: 'Legacy Partner Corp',
      category: 'Consulting',
      amount: 75000,
      payment_method: 'Cheque',
      cheque_number: '003921',
      bank_name: 'Punjab National Bank',
      cheque_date: '2026-10-26',
      cheque_status: 'Cleared',
      payment_reference: 'DEP-SLIP-4019',
    })
    expect(validCheque.success).toBe(true)
    expect(validCheque.data?.cheque_number).toBe('003921')
    expect(validCheque.data?.bank_name).toBe('Punjab National Bank')
    expect(validCheque.data?.cheque_status).toBe('Cleared')
  })

  it('should allow Cash payments without requiring unnecessary identifiers', async () => {
    const validCash = await createExpenseAction({
      expense_date: '2026-10-27',
      vendor_payee: 'Local Stationers',
      category: 'Office Supplies',
      amount: 1500,
      payment_method: 'Cash',
      status: 'Paid',
    })
    expect(validCash.success).toBe(true)
    expect(validCash.data?.payment_method).toBe('Cash')
  })
})

describe('Accounting Module - Journal Entries', () => {
  it('should auto-generate sequential journal entry numbers', async () => {
    const num = await generateJournalEntryNumber()
    expect(num).toMatch(/^JE-\d{4}-\d{4}$/)
  })

  it('should reject an unbalanced journal entry from being posted', async () => {
    const accounts = await getLedgerAccounts()
    expect(accounts.success).toBe(true)
    const acc1 = accounts.data![0].id
    const acc2 = accounts.data![1].id

    // Debit 10000, Credit 8000 (Difference: 2000)
    const res = await createJournalEntryAction({
      entry_date: '2026-10-27',
      description: 'Unbalanced Journal Entry Attempt',
      status: 'Posted',
      lines: [
        {
          account_id: acc1,
          debit: 10000,
          credit: 0,
          description: 'Debit line',
        },
        {
          account_id: acc2,
          debit: 0,
          credit: 8000,
          description: 'Credit line',
        },
      ],
    })

    expect(res.success).toBe(false)
    expect(res.error).toBe('Journal entry cannot be posted because Total Debit and Total Credit must be equal.')
  })

  it('should allow saving an unbalanced journal entry as a Draft', async () => {
    const accounts = await getLedgerAccounts()
    const acc1 = accounts.data![0].id
    const acc2 = accounts.data![1].id

    const res = await createJournalEntryAction({
      entry_date: '2026-10-27',
      description: 'Draft Unbalanced Journal Entry',
      status: 'Draft',
      lines: [
        {
          account_id: acc1,
          debit: 15000,
          credit: 0,
          description: 'Work in progress draft line',
        },
        {
          account_id: acc2,
          debit: 0,
          credit: 5000,
          description: 'Incomplete line',
        },
      ],
    })

    expect(res.success).toBe(true)
    expect(res.data?.status).toBe('Draft')
    expect(res.data?.total_debit).toBe(15000)
    expect(res.data?.total_credit).toBe(5000)

    // Clean up draft
    if (res.data?.id) {
      const delRes = await deleteJournalEntryAction(res.data.id)
      expect(delRes.success).toBe(true)
    }
  })

  it('should create and post a balanced journal entry and update ledger accounts', async () => {
    const accounts = await getLedgerAccounts()
    const advExpAcc = accounts.data!.find((a) => a.account_code === '5100' || a.account_name.includes('Advertising'))!
    const bankAcc = accounts.data!.find((a) => a.account_code === '1020' || a.account_name.includes('HDFC'))!

    const prevExpBal = advExpAcc.current_balance
    const prevBankBal = bankAcc.current_balance

    // Debit Advertising Expense ₹10,000, Credit Bank ₹10,000
    const res = await createJournalEntryAction({
      entry_date: '2026-10-27',
      reference_number: 'TEST-JE-BALANCED-01',
      description: 'Testing Balanced Double-Entry Post: Advertising via Bank',
      campaign_project: 'Q4 Performance',
      status: 'Posted',
      lines: [
        {
          account_id: advExpAcc.id,
          debit: 10000,
          credit: 0,
          description: 'Q4 Brand Awareness Advertising',
        },
        {
          account_id: bankAcc.id,
          debit: 0,
          credit: 10000,
          description: 'Bank payment clearance',
        },
      ],
    })

    expect(res.success).toBe(true)
    expect(res.data?.status).toBe('Posted')
    expect(res.data?.total_debit).toBe(10000)
    expect(res.data?.total_credit).toBe(10000)

    // Verify ledger accounts updated
    const updatedAdv = await getLedgerAccountById(advExpAcc.id)
    const updatedBank = await getLedgerAccountById(bankAcc.id)

    expect(updatedAdv.data?.current_balance).toBe(prevExpBal + 10000)
    expect(updatedBank.data?.current_balance).toBe(prevBankBal - 10000)
  })

  it('should prevent deletion of posted journal entries to preserve audit trail', async () => {
    const listRes = await getJournalEntries({ status: 'Posted' })
    expect(listRes.success).toBe(true)
    expect(listRes.data && listRes.data.length > 0).toBe(true)

    const postedEntry = listRes.data![0]
    const delRes = await deleteJournalEntryAction(postedEntry.id)

    expect(delRes.success).toBe(false)
    expect(delRes.error).toMatch(/Posted journal entries cannot be deleted/i)
  })

  it('should allow editing a draft journal entry and then posting it', async () => {
    const accounts = await getLedgerAccounts()
    const acc1 = accounts.data![0].id
    const acc2 = accounts.data![1].id

    // Create draft
    const createRes = await createJournalEntryAction({
      entry_date: '2026-10-27',
      description: 'Draft Entry to be updated',
      status: 'Draft',
      lines: [
        { account_id: acc1, debit: 5000, credit: 0 },
        { account_id: acc2, debit: 0, credit: 5000 },
      ],
    })
    expect(createRes.success).toBe(true)
    const draftId = createRes.data!.id

    // Update draft description & amount
    const updateRes = await updateJournalEntryAction({
      id: draftId,
      description: 'Updated draft narration',
      lines: [
        { account_id: acc1, debit: 8000, credit: 0 },
        { account_id: acc2, debit: 0, credit: 8000 },
      ],
    })
    expect(updateRes.success).toBe(true)
    expect(updateRes.data?.description).toBe('Updated draft narration')
    expect(updateRes.data?.total_debit).toBe(8000)

    // Post the draft
    const postRes = await postJournalEntryAction(draftId)
    expect(postRes.success).toBe(true)
    expect(postRes.data?.status).toBe('Posted')
  })
})

describe('Accounting Module - Ledger Accounts', () => {
  it('should fetch standard digital marketing agency chart of accounts', async () => {
    const res = await getLedgerAccounts()
    expect(res.success).toBe(true)
    expect(res.data).toBeDefined()
    expect(res.data!.length).toBeGreaterThanOrEqual(15)

    const types = new Set(res.data!.map((a) => a.account_type))
    expect(types.has('Asset')).toBe(true)
    expect(types.has('Liability')).toBe(true)
    expect(types.has('Equity')).toBe(true)
    expect(types.has('Income')).toBe(true)
    expect(types.has('Expense')).toBe(true)

    // Check specific digital marketing accounts
    const names = res.data!.map((a) => a.account_name.toLowerCase())
    expect(names.some((n) => n.includes('meta ads') || n.includes('google ads'))).toBe(true)
    expect(names.some((n) => n.includes('seo services') || n.includes('digital marketing'))).toBe(true)
    expect(names.some((n) => n.includes('gst payable'))).toBe(true)
  })

  it('should create a new ledger account and reject duplicate codes', async () => {
    const createRes = await createLedgerAccountAction({
      account_code: '5999',
      account_name: 'Experimental AI Media Spend',
      account_type: 'Expense',
      description: 'Generative AI creative rendering tools',
      opening_balance: 5000,
      opening_balance_type: 'Debit',
      status: 'Active',
    })

    expect(createRes.success).toBe(true)
    expect(createRes.data?.account_code).toBe('5999')
    expect(createRes.data?.account_name).toBe('Experimental AI Media Spend')
    expect(createRes.data?.current_balance).toBe(5000)

    // Duplicate code should be rejected
    const dupRes = await createLedgerAccountAction({
      account_code: '5999',
      account_name: 'Another Duplicate Account',
      account_type: 'Expense',
      opening_balance: 0,
      opening_balance_type: 'Debit',
    })

    expect(dupRes.success).toBe(false)
    expect(dupRes.error).toMatch(/already in use/i)

    // Clean up
    if (createRes.data?.id) {
      await deleteLedgerAccountAction(createRes.data.id)
    }
  })

  it('should calculate running balance and transaction history with double-entry normal balance rules', async () => {
    // Check HDFC Bank Asset account
    const accounts = await getLedgerAccounts()
    const hdfc = accounts.data!.find((a) => a.account_code === '1020')!
    expect(hdfc).toBeDefined()

    const txRes = await getLedgerAccountTransactionsAction(hdfc.id)
    expect(txRes.success).toBe(true)
    expect(txRes.data?.account.id).toBe(hdfc.id)
    expect(txRes.data?.opening_balance).toBe(500000)
    expect(Array.isArray(txRes.data?.transactions)).toBe(true)

    // Asset account normal balance: Opening + Debits - Credits = Closing
    const { opening_balance, total_debit, total_credit, closing_balance } = txRes.data!
    expect(closing_balance).toBe(opening_balance + total_debit - total_credit)
  })
})

describe('Accounting Module - Income & Expense Integration with Ledger', () => {
  it('should update ledger accounts when income is recorded', async () => {
    const accountsBefore = await getLedgerAccounts()
    const seoIncomeAcc = accountsBefore.data!.find((a) => a.account_code === '4020')!
    const bankAcc = accountsBefore.data!.find((a) => a.account_code === '1020')!
    const prevSeoBal = seoIncomeAcc.current_balance
    const prevBankBal = bankAcc.current_balance

    const incRes = await createIncomeAction({
      income_date: '2026-10-27',
      customer_name: 'Search Growth Client',
      category: 'SEO Services',
      amount: 50000,
      tax_type: 'No Tax',
      payment_method: 'Bank Transfer',
      bank_name: 'HDFC Bank',
      payment_reference: 'NEFT-INC-8812',
      bank_account_id: 'b1111111-1111-1111-1111-111111111111',
      status: 'Received',
    })

    expect(incRes.success).toBe(true)

    // Check ledger accounts synced
    const accountsAfter = await getLedgerAccounts()
    const updatedSeo = accountsAfter.data!.find((a) => a.account_code === '4020')!
    const updatedBank = accountsAfter.data!.find((a) => a.account_code === '1020')!

    expect(updatedSeo.current_balance).toBe(prevSeoBal + 50000)
    expect(updatedBank.current_balance).toBe(prevBankBal + 50000)
  })

  it('should update ledger accounts when expense is recorded', async () => {
    const accountsBefore = await getLedgerAccounts()
    const rentAcc = accountsBefore.data!.find((a) => a.account_code === '5050')!
    const bankAcc = accountsBefore.data!.find((a) => a.account_code === '1020')!
    const prevRentBal = rentAcc.current_balance
    const prevBankBal = bankAcc.current_balance

    const expRes = await createExpenseAction({
      expense_date: '2026-10-27',
      vendor_payee: 'Office Facility Co',
      category: 'Office Rent',
      amount: 25000,
      tax_type: 'No Tax',
      payment_method: 'Bank Transfer',
      bank_name: 'HDFC Bank',
      payment_reference: 'RTGS-EXP-4412',
      bank_account_id: 'b1111111-1111-1111-1111-111111111111',
      status: 'Paid',
    })

    expect(expRes.success).toBe(true)

    const accountsAfter = await getLedgerAccounts()
    const updatedRent = accountsAfter.data!.find((a) => a.account_code === '5050')!
    const updatedBank = accountsAfter.data!.find((a) => a.account_code === '1020')!

    expect(updatedRent.current_balance).toBe(prevRentBal + 25000)
    expect(updatedBank.current_balance).toBe(prevBankBal - 25000)
  })
})



