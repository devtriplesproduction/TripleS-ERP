'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dropdown } from '@/components/ui/Dropdown'
import { toast } from 'sonner'
import { Loader2, Plus, Scale } from 'lucide-react'
import { BankAccount, LedgerTransactionType } from '@/types/accounting'
import { createManualLedgerEntryAction } from '@/lib/actions/accounting'

interface ManualEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  bankAccounts: BankAccount[]
}

export function ManualEntryModal({
  isOpen,
  onClose,
  onSuccess,
  bankAccounts,
}: ManualEntryModalProps) {
  const today = new Date().toISOString().split('T')[0]
  const [transactionDate, setTransactionDate] = useState(today)
  const [referenceNumber, setReferenceNumber] = useState('')
  const [transactionType, setTransactionType] = useState<LedgerTransactionType>('ADJUSTMENT')
  const [description, setDescription] = useState('')
  const [accountId, setAccountId] = useState('')
  const [entrySide, setEntrySide] = useState<'DEBIT' | 'CREDIT'>('DEBIT')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!description.trim()) {
      setErrorMsg('Description is required.')
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid positive amount.')
      return
    }

    let accountName = 'General Ledger'
    if (accountId) {
      const b = bankAccounts.find((acc) => acc.id === accountId)
      if (b) accountName = b.account_name
    }

    setLoading(true)

    try {
      const res = await createManualLedgerEntryAction({
        transaction_date: transactionDate,
        reference_number: referenceNumber.trim() || `JV-${Date.now().toString().slice(-6)}`,
        transaction_type: transactionType,
        description: description.trim(),
        account_id: accountId || null,
        account_name: accountName,
        debit: entrySide === 'DEBIT' ? numAmount : 0,
        credit: entrySide === 'CREDIT' ? numAmount : 0,
      })

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to create journal entry.')
        toast.error(res.error || 'Failed to create journal entry.')
      } else {
        toast.success('Journal adjustment entry posted.')
        onSuccess()
        onClose()
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.')
      toast.error(err.message || 'An error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const bankOptions = [
    { value: '', label: 'General / Undefined Ledger Account' },
    ...bankAccounts.map((b) => ({ value: b.id, label: `${b.account_name} (${b.bank_name})` })),
  ]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg w-full bg-card border-border text-foreground p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Add Manual Journal Entry
          </DialogTitle>
        </DialogHeader>

        {errorMsg && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm p-3 rounded-md">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="jv-date" className="text-sm font-medium">
                Entry Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="jv-date"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="bg-input border-border"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="jv-ref" className="text-sm font-medium">
                Voucher / Reference #
              </Label>
              <Input
                id="jv-ref"
                placeholder="e.g. JV-2026-001"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="bg-input border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="jv-type" className="text-sm font-medium">
                Transaction Type
              </Label>
              <Dropdown
                id="jv-type"
                value={transactionType}
                onChange={(val) => setTransactionType(val as LedgerTransactionType)}
                options={[
                  { value: 'ADJUSTMENT', label: 'Adjustment / Correction' },
                  { value: 'TRANSFER', label: 'Inter-Account Transfer' },
                  { value: 'INCOME', label: 'Direct Inflow' },
                  { value: 'EXPENSE', label: 'Direct Outflow' },
                ]}
                buttonClassName="bg-input border-border w-full"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="jv-account" className="text-sm font-medium">
                Target Bank / Cash Account
              </Label>
              <Dropdown
                id="jv-account"
                value={accountId}
                onChange={setAccountId}
                options={bankOptions}
                buttonClassName="bg-input border-border w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="jv-side" className="text-sm font-medium">
                Entry Side <span className="text-destructive">*</span>
              </Label>
              <Dropdown
                id="jv-side"
                value={entrySide}
                onChange={(val) => setEntrySide(val as 'DEBIT' | 'CREDIT')}
                options={[
                  { value: 'DEBIT', label: 'Debit (+ Inflow / Increase Asset)' },
                  { value: 'CREDIT', label: 'Credit (- Outflow / Decrease Asset)' },
                ]}
                buttonClassName="bg-input border-border w-full"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="jv-amount" className="text-sm font-medium">
                Amount (₹) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="jv-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-input border-border font-semibold"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="jv-desc" className="text-sm font-medium">
              Description / Particulars <span className="text-destructive">*</span>
            </Label>
            <Input
              id="jv-desc"
              placeholder="e.g. Bank annual maintenance charge or Opening equity"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-input border-border"
              required
            />
          </div>

          <DialogFooter className="flex flex-row items-center justify-end gap-3 pt-3 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="w-auto min-w-[90px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="w-auto min-w-[130px] bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Post Entry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
