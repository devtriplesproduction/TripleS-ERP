'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dropdown } from '@/components/ui/Dropdown'
import { toast } from 'sonner'
import { Loader2, Building2 } from 'lucide-react'
import { BankAccount, BankAccountType, BankAccountStatus } from '@/types/accounting'
import { createBankAccountAction, updateBankAccountAction } from '@/lib/actions/accounting'

interface BankAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  accountToEdit?: BankAccount | null
}

export function BankAccountModal({
  isOpen,
  onClose,
  onSuccess,
  accountToEdit,
}: BankAccountModalProps) {
  const isEditing = !!accountToEdit

  const [accountName, setAccountName] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountType, setAccountType] = useState<BankAccountType>('Current')
  const [ifscCode, setIfscCode] = useState('')
  const [branch, setBranch] = useState('')
  const [openingBalance, setOpeningBalance] = useState('')
  const [status, setStatus] = useState<BankAccountStatus>('Active')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (accountToEdit) {
      setAccountName(accountToEdit.account_name || '')
      setBankName(accountToEdit.bank_name || '')
      setAccountNumber(accountToEdit.account_number || '')
      setAccountType(accountToEdit.account_type || 'Current')
      setIfscCode(accountToEdit.ifsc_code || '')
      setBranch(accountToEdit.branch || '')
      setOpeningBalance(accountToEdit.opening_balance ? String(accountToEdit.opening_balance) : '0')
      setStatus(accountToEdit.status || 'Active')
    } else {
      setAccountName('')
      setBankName('')
      setAccountNumber('')
      setAccountType('Current')
      setIfscCode('')
      setBranch('')
      setOpeningBalance('0')
      setStatus('Active')
    }
    setErrorMsg(null)
  }, [accountToEdit, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!accountName.trim()) {
      setErrorMsg('Account Display Name is required.')
      return
    }

    if (!bankName.trim()) {
      setErrorMsg('Bank Name is required.')
      return
    }

    if (!accountNumber.trim()) {
      setErrorMsg('Account Number is required.')
      return
    }

    const numOpening = parseFloat(openingBalance)
    if (isNaN(numOpening)) {
      setErrorMsg('Please enter a valid numeric opening balance.')
      return
    }

    setLoading(true)

    try {
      if (isEditing && accountToEdit) {
        const res = await updateBankAccountAction({
          id: accountToEdit.id,
          account_name: accountName.trim(),
          bank_name: bankName.trim(),
          account_number: accountNumber.trim(),
          account_type: accountType,
          ifsc_code: ifscCode.trim() || null,
          branch: branch.trim() || null,
          status,
        })

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to update account.')
          toast.error(res.error || 'Failed to update account.')
        } else {
          toast.success('Bank account updated successfully.')
          onSuccess()
          onClose()
        }
      } else {
        const res = await createBankAccountAction({
          account_name: accountName.trim(),
          bank_name: bankName.trim(),
          account_number: accountNumber.trim(),
          account_type: accountType,
          ifsc_code: ifscCode.trim() || null,
          branch: branch.trim() || null,
          opening_balance: numOpening,
          status,
        })

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to create account.')
          toast.error(res.error || 'Failed to create account.')
        } else {
          toast.success('Bank account created successfully.')
          onSuccess()
          onClose()
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
      toast.error(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg w-full bg-card border-border text-foreground p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {isEditing ? 'Edit Bank Account' : 'Add New Bank Account'}
          </DialogTitle>
        </DialogHeader>

        {errorMsg && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm p-3 rounded-md">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="bank-acc-name" className="text-sm font-medium">
              Account Display Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="bank-acc-name"
              placeholder="e.g. HDFC Main Operations Current"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="bg-input border-border"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bank-name" className="text-sm font-medium">
                Bank / Entity Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bank-name"
                placeholder="e.g. HDFC Bank, ICICI, SBI, Petty Cash"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="bg-input border-border"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bank-acc-type" className="text-sm font-medium">
                Account Type <span className="text-destructive">*</span>
              </Label>
              <Dropdown
                id="bank-acc-type"
                value={accountType}
                onChange={(val) => setAccountType(val as BankAccountType)}
                options={[
                  { value: 'Current', label: 'Current Account' },
                  { value: 'Savings', label: 'Savings Account' },
                  { value: 'Cash', label: 'Petty Cash / Till' },
                  { value: 'Credit Card', label: 'Corporate Credit Card' },
                  { value: 'Overdraft', label: 'Overdraft / Cash Credit' },
                  { value: 'Other', label: 'Other Account' },
                ]}
                buttonClassName="bg-input border-border w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bank-acc-num" className="text-sm font-medium">
                Account Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bank-acc-num"
                placeholder="e.g. 50200012345678"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="bg-input border-border font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bank-ifsc" className="text-sm font-medium">
                IFSC / SWIFT Code
              </Label>
              <Input
                id="bank-ifsc"
                placeholder="e.g. HDFC0001234"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                className="bg-input border-border font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bank-branch" className="text-sm font-medium">
                Branch Location
              </Label>
              <Input
                id="bank-branch"
                placeholder="e.g. Connaught Place, New Delhi"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="bg-input border-border"
              />
            </div>

            {!isEditing ? (
              <div className="space-y-1.5">
                <Label htmlFor="bank-opening" className="text-sm font-medium">
                  Opening Balance (₹) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bank-opening"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="bg-input border-border font-semibold"
                  required
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="bank-status" className="text-sm font-medium">
                  Account Status
                </Label>
                <Dropdown
                  id="bank-status"
                  value={status}
                  onChange={(val) => setStatus(val as BankAccountStatus)}
                  options={[
                    { value: 'Active', label: 'Active' },
                    { value: 'Inactive', label: 'Inactive / Suspended' },
                  ]}
                  buttonClassName="bg-input border-border w-full"
                />
              </div>
            )}
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
              {isEditing ? 'Save Changes' : 'Create Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
