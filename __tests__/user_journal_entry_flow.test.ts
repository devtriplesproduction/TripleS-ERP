import { describe, it, expect, vi } from 'vitest'
import {
  createJournalEntryAction,
  getJournalEntryById,
  getLedgerAccountTransactionsAction,
  getLedgerAccounts,
} from '@/lib/actions/accounting'

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
      }),
      insert: () => Promise.resolve({ error: { message: 'fallback' } }),
    }),
  }),
}))

describe('Journal Entry -> Ledger Accounts Integration Exact User Flow', () => {
  it('posts Axis Bank Debit ₹50,000 and Digital Marketing Services Credit ₹50,000 and updates both Ledger Accounts', async () => {
    // 1. Get initial state of Axis Bank (la-1030) and Digital Marketing Services (la-4010)
    const initialAccountsRes = await getLedgerAccounts()
    expect(initialAccountsRes.success).toBe(true)

    const axisAccBefore = initialAccountsRes.data!.find(
      (a) => a.account_code === '1030' || a.account_name.toLowerCase().includes('axis')
    )!
    const dmsAccBefore = initialAccountsRes.data!.find(
      (a) => a.account_code === '4010' || a.account_name.toLowerCase().includes('digital marketing')
    )!

    expect(axisAccBefore).toBeDefined()
    expect(dmsAccBefore).toBeDefined()

    const axisBalanceBefore = axisAccBefore.current_balance
    const dmsBalanceBefore = dmsAccBefore.current_balance

    // 2. Create and Post Journal Entry with exact user parameters:
    // Debit: Axis Bank – Asset = ₹50,000
    // Credit: Digital Marketing Services Revenue = ₹50,000
    const createRes = await createJournalEntryAction({
      entry_date: '2026-10-27',
      description: 'Client payment received in Axis Bank for digital marketing services',
      reference_number: `REF-USER-${Date.now()}`,
      status: 'Posted',
      lines: [
        {
          account_id: axisAccBefore.id, // Axis Bank Current Account
          account_code: '1030',
          account_name: 'Axis Bank – Asset',
          description: 'Client payment received in Axis Bank',
          debit: 50000,
          credit: 0,
        },
        {
          account_id: dmsAccBefore.id, // Digital Marketing Services
          account_code: '4010',
          account_name: 'Digital Marketing Services Revenue',
          description: 'Income from digital marketing services',
          debit: 0,
          credit: 50000,
        },
      ],
    })

    expect(createRes.success).toBe(true)
    const je = createRes.data!
    expect(je.status).toBe('Posted')
    expect(je.total_debit).toBe(50000)
    expect(je.total_credit).toBe(50000)

    // 3. Verify Journal Entry was stored and can be retrieved
    const getJeRes = await getJournalEntryById(je.id)
    expect(getJeRes.success).toBe(true)
    expect(getJeRes.data!.status).toBe('Posted')

    // 4. Verify Axis Bank Ledger Account transaction history immediately includes the ₹50,000 debit
    const axisLedgerRes = await getLedgerAccountTransactionsAction(axisAccBefore.id)
    expect(axisLedgerRes.success).toBe(true)
    const axisData = axisLedgerRes.data!
    expect(axisData.account.account_name).toBe(axisAccBefore.account_name)

    const axisTx = axisData.transactions.find((t) => t.journal_entry_number === je.entry_number)
    expect(axisTx).toBeDefined()
    expect(axisTx!.debit).toBe(50000)
    expect(axisTx!.credit).toBe(0)
    expect(axisTx!.description).toBe('Client payment received in Axis Bank')

    // Running balance for Asset account increased by 50,000
    expect(axisData.closing_balance).toBe(axisBalanceBefore + 50000)
    expect(axisTx!.running_balance).toBeGreaterThan(0)
    expect(axisData.transactions[axisData.transactions.length - 1].running_balance).toBe(axisData.closing_balance)

    // 5. Verify Digital Marketing Services Ledger Account transaction history immediately includes the ₹50,000 credit
    const dmsLedgerRes = await getLedgerAccountTransactionsAction(dmsAccBefore.id)
    expect(dmsLedgerRes.success).toBe(true)
    const dmsData = dmsLedgerRes.data!

    const dmsTx = dmsData.transactions.find((t) => t.journal_entry_number === je.entry_number)
    expect(dmsTx).toBeDefined()
    expect(dmsTx!.debit).toBe(0)
    expect(dmsTx!.credit).toBe(50000)
    expect(dmsTx!.description).toBe('Income from digital marketing services')

    // Running balance for Revenue/Income account increased by 50,000
    expect(dmsData.closing_balance).toBe(dmsBalanceBefore + 50000)
    expect(dmsTx!.running_balance).toBeGreaterThan(0)
    expect(dmsData.transactions[dmsData.transactions.length - 1].running_balance).toBe(dmsData.closing_balance)

    // 6. Verify getLedgerAccounts() list page also reflects updated balances
    const accountsAfter = await getLedgerAccounts()
    expect(accountsAfter.success).toBe(true)
    const updatedAxis = accountsAfter.data!.find((a) => a.id === axisAccBefore.id)!
    const updatedDms = accountsAfter.data!.find((a) => a.id === dmsAccBefore.id)!

    expect(updatedAxis.current_balance).toBe(axisBalanceBefore + 50000)
    expect(updatedDms.current_balance).toBe(dmsBalanceBefore + 50000)

    // 7. Verify no duplicate transactions: transaction should appear exactly once in Axis ledger
    const matchingAxisTxs = axisData.transactions.filter(
      (t) => t.journal_entry_number === je.entry_number
    )
    expect(matchingAxisTxs.length).toBe(1)

    // And exactly once in DMS ledger
    const matchingDmsTxs = dmsData.transactions.filter(
      (t) => t.journal_entry_number === je.entry_number
    )
    expect(matchingDmsTxs.length).toBe(1)
  })

  it('rejects an unbalanced journal entry before posting (Total Debit != Total Credit)', async () => {
    const res = await createJournalEntryAction({
      entry_date: '2026-10-27',
      description: 'Unbalanced test',
      status: 'Posted',
      lines: [
        {
          account_id: 'la-1030',
          debit: 50000,
          credit: 0,
        },
        {
          account_id: 'la-4010',
          debit: 0,
          credit: 40000, // Unequal!
        },
      ],
    })

    expect(res.success).toBe(false)
    expect(res.error).toContain('Total Debit and Total Credit must be equal')
  })
})
