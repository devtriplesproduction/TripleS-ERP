'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dropdown } from '@/components/ui/Dropdown'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Layers,
  Building2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react'
import {
  LedgerAccount,
  AccountType,
  OpeningBalanceType,
  LedgerAccountStatus,
  ACCOUNT_TYPES,
  OPENING_BALANCE_TYPES,
  LEDGER_ACCOUNT_STATUSES,
} from '@/types/accounting'
import {
  createLedgerAccountAction,
  updateLedgerAccountAction,
} from '@/lib/actions/accounting'

interface LedgerAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  accountToEdit?: LedgerAccount | null
  existingAccounts: LedgerAccount[]
}

export function LedgerAccountModal({
  isOpen,
  onClose,
  onSuccess,
  accountToEdit,
  existingAccounts,
}: LedgerAccountModalProps) {
  const isEditing = !!accountToEdit

  const [accountName, setAccountName] = useState('')
  const [accountCode, setAccountCode] = useState('')
  const [accountType, setAccountType] = useState<AccountType>('Expense')
  const [parentAccountId, setParentAccountId] = useState('')
  const [description, setDescription] = useState('')
  const [openingBalance, setOpeningBalance] = useState('0')
  const [openingBalanceType, setOpeningBalanceType] = useState<OpeningBalanceType>('Debit')
  const [status, setStatus] = useState<LedgerAccountStatus>('Active')

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setErrorMsg(null)

    if (accountToEdit) {
      setAccountName(accountToEdit.account_name)
      setAccountCode(accountToEdit.account_code)
      setAccountType(accountToEdit.account_type)
      setParentAccountId(accountToEdit.parent_account_id || '')
      setDescription(accountToEdit.description || '')
      setOpeningBalance(accountToEdit.opening_balance.toString())
      setOpeningBalanceType(accountToEdit.opening_balance_type)
      setStatus(accountToEdit.status)
    } else {
      setAccountName('')
      setAccountCode('')
      setAccountType('Expense')
      setParentAccountId('')
      setDescription('')
      setOpeningBalance('0')
      setOpeningBalanceType('Debit')
      setStatus('Active')
    }
  }, [isOpen, accountToEdit])

  // Automatically adjust default balance type when account type changes
  const handleTypeChange = (type: string) => {
    const actType = type as AccountType
    setAccountType(actType)
    if (actType === 'Asset' || actType === 'Expense') {
      setOpeningBalanceType('Debit')
    } else {
      setOpeningBalanceType('Credit')
    }

    // Auto-suggest next account code if creating new
    if (!isEditing && !accountCode) {
      const typeRanges: Record<AccountType, number> = {
        Asset: 1000,
        Liability: 2000,
        Equity: 3000,
        Income: 4000,
        Expense: 5000,
      }
      const base = typeRanges[actType]
      const matchingCodes = existingAccounts
        .filter((a) => a.account_type === actType)
        .map((a) => parseInt(a.account_code, 10))
        .filter((n) => !isNaN(n) && n >= base && n < base + 1000)

      const max = matchingCodes.length > 0 ? Math.max(...matchingCodes) : base
      setAccountCode((max + 10).toString())
    }
  }

  // Options
  const accountTypeOptions = ACCOUNT_TYPES.map((t) => ({ value: t, label: t }))
  const balanceTypeOptions = OPENING_BALANCE_TYPES.map((t) => ({ value: t, label: `${t} Balance` }))
  const statusOptions = LEDGER_ACCOUNT_STATUSES.map((s) => ({ value: s, label: s }))

  const parentOptions = useMemo(() => {
    return [
      { value: '', label: '-- None (Top-Level Account) --' },
      ...existingAccounts
        .filter((a) => !accountToEdit || a.id !== accountToEdit.id)
        .map((a) => ({
          value: a.id,
          label: `${a.account_code} - ${a.account_name} (${a.account_type})`,
        })),
    ]
  }, [existingAccounts, accountToEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!accountName.trim()) {
      setErrorMsg('Account Name is required.')
      return
    }
    if (!accountCode.trim()) {
      setErrorMsg('Account Code is required.')
      return
    }

    const opBal = parseFloat(openingBalance)
    if (isNaN(opBal) || opBal < 0) {
      setErrorMsg('Opening Balance must be a non-negative number.')
      return
    }

    setLoading(true)

    try {
      if (isEditing && accountToEdit) {
        const res = await updateLedgerAccountAction({
          id: accountToEdit.id,
          account_name: accountName.trim(),
          account_code: accountCode.trim(),
          account_type: accountType,
          parent_account_id: parentAccountId || null,
          description: description.trim() || null,
          opening_balance: opBal,
          opening_balance_type: openingBalanceType,
          status,
        })

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to update ledger account.')
          toast.error(res.error || 'Failed to update ledger account.')
        } else {
          toast.success(`Account '${accountName.trim()}' updated successfully.`)
          onSuccess()
          onClose()
        }
      } else {
        const res = await createLedgerAccountAction({
          account_name: accountName.trim(),
          account_code: accountCode.trim(),
          account_type: accountType,
          parent_account_id: parentAccountId || null,
          description: description.trim() || null,
          opening_balance: opBal,
          opening_balance_type: openingBalanceType,
          status,
        })

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to create ledger account.')
          toast.error(res.error || 'Failed to create ledger account.')
        } else {
          toast.success(`Account '${accountName.trim()}' created successfully.`)
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
      <DialogContent className="max-w-xl sm:max-w-xl w-[96vw] bg-card border-border text-foreground p-0 max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {isEditing ? 'Edit Ledger Account' : 'Create Ledger Account'}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Chart of Accounts • Double-entry general ledger definition
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium mb-1.5 block">
                Account Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. Meta Ads Expense, Cash, ICICI Bank"
                className="text-xs bg-background"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-medium mb-1.5 block">
                Account Code <span className="text-destructive">*</span>
              </Label>
              <Input
                value={accountCode}
                onChange={(e) => setAccountCode(e.target.value)}
                placeholder="e.g. 1010, 2010, 4010, 5010"
                className="text-xs bg-background font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium mb-1.5 block">
                Account Type <span className="text-destructive">*</span>
              </Label>
              <Dropdown
                options={accountTypeOptions}
                value={accountType}
                onChange={handleTypeChange}
                className="w-full text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-medium mb-1.5 block">
                Parent Account (Optional)
              </Label>
              <Dropdown
                options={parentOptions}
                value={parentAccountId}
                onChange={(val) => setParentAccountId(val)}
                className="w-full text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <Label className="text-xs font-medium mb-1.5 block">
                Opening Balance
              </Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                  ₹
                </span>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                  className="text-xs pl-6 text-right font-mono bg-background"
                />
              </div>
            </div>

            <div className="sm:col-span-1">
              <Label className="text-xs font-medium mb-1.5 block">
                Balance Type
              </Label>
              <Dropdown
                options={balanceTypeOptions}
                value={openingBalanceType}
                onChange={(val) => setOpeningBalanceType(val as OpeningBalanceType)}
                className="w-full text-xs"
              />
            </div>

            <div className="sm:col-span-1">
              <Label className="text-xs font-medium mb-1.5 block">
                Status
              </Label>
              <Dropdown
                options={statusOptions}
                value={status}
                onChange={(val) => setStatus(val as LedgerAccountStatus)}
                className="w-full text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium mb-1.5 block">
              Description / Notes
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Operational description, accounting purpose, or tax implications..."
              className="text-xs bg-background resize-none h-20"
            />
          </div>

          {/* Normal balance explanation box */}
          <div className="p-3 bg-muted/20 border border-border/80 rounded-lg text-xs text-muted-foreground space-y-1">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-primary" />
              <span>Double-Entry Normal Balance Guideline</span>
            </div>
            <p>
              {accountType === 'Asset' || accountType === 'Expense'
                ? `Normal balance for ${accountType} is DEBIT. Closing = Opening (Dr) + Debits − Credits.`
                : `Normal balance for ${accountType} is CREDIT. Closing = Opening (Cr) + Credits − Debits.`}
            </p>
          </div>

          <DialogFooter className="pt-4 border-t border-border flex justify-between sm:justify-between w-full">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="text-xs">
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Create Account'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
