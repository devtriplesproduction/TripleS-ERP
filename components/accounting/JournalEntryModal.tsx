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
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileCheck2,
  ArrowRightLeft,
  Sparkles,
  Paperclip,
} from 'lucide-react'
import {
  JournalEntry,
  LedgerAccount,
  JournalLine,
  JournalEntryStatus,
} from '@/types/accounting'
import {
  generateJournalEntryNumber,
  createJournalEntryAction,
  updateJournalEntryAction,
} from '@/lib/actions/accounting'
import { AttachmentUploader } from './AttachmentUploader'

interface LineItemState {
  id: string
  account_id: string
  account_code: string
  account_name: string
  description: string
  debit: string
  credit: string
  reference_notes: string
}

interface JournalEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  entryToEdit?: JournalEntry | null
  ledgerAccounts: LedgerAccount[]
}

export function JournalEntryModal({
  isOpen,
  onClose,
  onSuccess,
  entryToEdit,
  ledgerAccounts,
}: JournalEntryModalProps) {
  const isEditing = !!entryToEdit

  const [entryNumber, setEntryNumber] = useState('')
  const [entryDate, setEntryDate] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [description, setDescription] = useState('')
  const [campaignProject, setCampaignProject] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [status, setStatus] = useState<JournalEntryStatus>('Draft')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [lines, setLines] = useState<LineItemState[]>([
    {
      id: 'l-1',
      account_id: '',
      account_code: '',
      account_name: '',
      description: '',
      debit: '',
      credit: '',
      reference_notes: '',
    },
    {
      id: 'l-2',
      account_id: '',
      account_code: '',
      account_name: '',
      description: '',
      debit: '',
      credit: '',
      reference_notes: '',
    },
  ])

  // Reset or initialize on open
  useEffect(() => {
    if (!isOpen) return

    setErrorMsg(null)
    const today = new Date().toISOString().split('T')[0]

    if (entryToEdit) {
      setEntryNumber(entryToEdit.entry_number)
      setEntryDate(entryToEdit.entry_date)
      setReferenceNumber(entryToEdit.reference_number || '')
      setDescription(entryToEdit.description)
      setCampaignProject(entryToEdit.campaign_project || '')
      setAttachmentUrl(entryToEdit.attachment_url || '')
      setStatus(entryToEdit.status)

      if (entryToEdit.lines && entryToEdit.lines.length >= 2) {
        setLines(
          entryToEdit.lines.map((l) => ({
            id: l.id || crypto.randomUUID(),
            account_id: l.account_id,
            account_code: l.account_code || '',
            account_name: l.account_name,
            description: l.description || '',
            debit: l.debit > 0 ? l.debit.toString() : '',
            credit: l.credit > 0 ? l.credit.toString() : '',
            reference_notes: l.reference_notes || '',
          }))
        )
      }
    } else {
      setEntryDate(today)
      setReferenceNumber('')
      setDescription('')
      setCampaignProject('')
      setAttachmentUrl('')
      setStatus('Draft')

      // Fetch next entry number
      generateJournalEntryNumber().then((num) => setEntryNumber(num)).catch(() => {})

      setLines([
        {
          id: 'l-1',
          account_id: '',
          account_code: '',
          account_name: '',
          description: '',
          debit: '',
          credit: '',
          reference_notes: '',
        },
        {
          id: 'l-2',
          account_id: '',
          account_code: '',
          account_name: '',
          description: '',
          debit: '',
          credit: '',
          reference_notes: '',
        },
      ])
    }
  }, [isOpen, entryToEdit])

  // Options for Account dropdown
  const accountOptions = useMemo(() => {
    return [
      { value: '', label: '-- Select Ledger Account --' },
      ...ledgerAccounts
        .filter((a) => a.status === 'Active')
        .sort((a, b) => a.account_code.localeCompare(b.account_code))
        .map((a) => ({
          value: a.id,
          label: `${a.account_code} • ${a.account_name} (${a.account_type})`,
        })),
    ]
  }, [ledgerAccounts])

  // Add line
  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        account_id: '',
        account_code: '',
        account_name: '',
        description: '',
        debit: '',
        credit: '',
        reference_notes: '',
      },
    ])
  }

  // Remove line
  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) {
      toast.error('A journal entry must contain at least 2 lines.')
      return
    }
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  // Handle line change with mutual debit/credit exclusion
  const handleLineChange = (
    index: number,
    field: keyof LineItemState,
    value: string
  ) => {
    setLines((prev) => {
      const updated = [...prev]
      const current = { ...updated[index] }

      if (field === 'account_id') {
        const found = ledgerAccounts.find((a) => a.id === value)
        current.account_id = value
        current.account_code = found?.account_code || ''
        current.account_name = found?.account_name || ''
      } else if (field === 'debit') {
        current.debit = value
        if (value && parseFloat(value) > 0) {
          current.credit = '' // Clear credit if debit is set
        }
      } else if (field === 'credit') {
        current.credit = value
        if (value && parseFloat(value) > 0) {
          current.debit = '' // Clear debit if credit is set
        }
      } else {
        ;(current as any)[field] = value
      }

      updated[index] = current
      return updated
    })
  }

  // Total debits, credits, and difference
  const totals = useMemo(() => {
    let deb = 0
    let cred = 0

    lines.forEach((l) => {
      const d = parseFloat(l.debit) || 0
      const c = parseFloat(l.credit) || 0
      deb += d
      cred += c
    })

    const totalDebit = Math.round(deb * 100) / 100
    const totalCredit = Math.round(cred * 100) / 100
    const difference = Math.round(Math.abs(totalDebit - totalCredit) * 100) / 100
    const isBalanced = totalDebit > 0 && difference === 0

    return { totalDebit, totalCredit, difference, isBalanced }
  }, [lines])

  // Quick preset helper for digital agency testing (Advertising Expense ₹10,000 / Bank ₹10,000)
  const handleLoadSampleBalanced = () => {
    const advExp = ledgerAccounts.find((a) => a.account_code === '5100' || a.account_name.includes('Advertising'))
    const bank = ledgerAccounts.find((a) => a.account_code === '1020' || a.account_name.includes('HDFC'))

    setDescription('Agency LinkedIn and Meta Brand Advertising Clearance')
    setReferenceNumber('REF-ADV-DEMO')
    setCampaignProject('Q4 Brand Campaign')

    setLines([
      {
        id: crypto.randomUUID(),
        account_id: advExp ? advExp.id : (ledgerAccounts[0]?.id || ''),
        account_code: advExp?.account_code || '',
        account_name: advExp?.account_name || '',
        description: 'LinkedIn Sponsored Content promotion',
        debit: '10000',
        credit: '',
        reference_notes: 'Q4 Brand Awareness',
      },
      {
        id: crypto.randomUUID(),
        account_id: bank ? bank.id : (ledgerAccounts[1]?.id || ''),
        account_code: bank?.account_code || '',
        account_name: bank?.account_name || '',
        description: 'Bank payment clearance',
        debit: '',
        credit: '10000',
        reference_notes: 'HDFC NetBanking #9921',
      },
    ])
    toast.info('Loaded sample balanced double-entry (₹10,000 Debit / ₹10,000 Credit)')
  }

  // Submit action
  const handleSubmit = async (submitStatus: JournalEntryStatus) => {
    setErrorMsg(null)

    if (!entryDate) {
      setErrorMsg('Entry Date is required.')
      toast.error('Entry Date is required.')
      return
    }

    if (!description.trim()) {
      setErrorMsg('Description / Narration is required.')
      toast.error('Description / Narration is required.')
      return
    }

    // Validate account selection on all rows
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].account_id) {
        const msg = `Line ${i + 1}: Please select an account.`
        setErrorMsg(msg)
        toast.error(msg)
        return
      }
    }

    // Double-entry validation if posting
    if (submitStatus === 'Posted') {
      if (!totals.isBalanced) {
        const msg = 'Journal entry cannot be posted because Total Debit and Total Credit must be equal.'
        setErrorMsg(msg)
        toast.error(msg)
        return
      }
    }

    setLoading(true)

    try {
      const payloadLines = lines.map((l) => ({
        account_id: l.account_id,
        account_code: l.account_code,
        account_name: l.account_name,
        description: l.description.trim() || null,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        reference_notes: l.reference_notes.trim() || null,
      }))

      if (isEditing && entryToEdit) {
        const res = await updateJournalEntryAction({
          id: entryToEdit.id,
          entry_date: entryDate,
          reference_number: referenceNumber.trim() || null,
          description: description.trim(),
          campaign_project: campaignProject.trim() || null,
          attachment_url: attachmentUrl.trim() || null,
          status: submitStatus,
          lines: payloadLines,
        })

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to update journal entry.')
          toast.error(res.error || 'Failed to update journal entry.')
        } else {
          toast.success(
            submitStatus === 'Posted'
              ? 'Journal Entry posted and ledger accounts updated successfully!'
              : 'Journal Entry draft updated successfully!'
          )
          onSuccess()
          onClose()
        }
      } else {
        const res = await createJournalEntryAction({
          entry_number: entryNumber.trim() || undefined,
          entry_date: entryDate,
          reference_number: referenceNumber.trim() || null,
          description: description.trim(),
          campaign_project: campaignProject.trim() || null,
          attachment_url: attachmentUrl.trim() || null,
          status: submitStatus,
          lines: payloadLines,
        })

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to save journal entry.')
          toast.error(res.error || 'Failed to save journal entry.')
        } else {
          toast.success(
            submitStatus === 'Posted'
              ? 'Journal Entry posted and ledger accounts updated successfully!'
              : 'Journal Entry draft saved successfully.'
          )
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
      <DialogContent className="max-w-5xl lg:max-w-6xl w-[96vw] bg-card border-border text-foreground p-0 max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>{isEditing ? 'Edit Journal Entry' : 'New Journal Entry'}</span>
                  {entryNumber && (
                    <Badge variant="outline" className="font-mono text-xs font-semibold px-2 py-0.5">
                      {entryNumber}
                    </Badge>
                  )}
                  <Badge
                    variant={status === 'Posted' ? 'default' : 'secondary'}
                    className={
                      status === 'Posted'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    }
                  >
                    {status}
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Double-entry accounting journal • Total Debit must equal Total Credit before posting
                </p>
              </div>
            </div>

            {/* Helper sample button */}
            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadSampleBalanced}
                className="text-xs h-8 border-dashed border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 gap-1.5"
                title="Populate Advertising Expense & Bank sample"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Fill Sample Balanced JE</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm font-medium animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Journal Header Details */}
          <div className="bg-muted/10 border border-border/60 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/40">
              <FileCheck2 className="w-3.5 h-3.5 text-primary" />
              <span>Journal Entry Header</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-medium mb-1.5 block">
                  Journal Entry Number
                </Label>
                <Input
                  value={entryNumber}
                  onChange={(e) => setEntryNumber(e.target.value)}
                  placeholder="Auto-generated (e.g. JE-2026-0001)"
                  disabled={isEditing}
                  className="bg-background font-mono text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-medium mb-1.5 block">
                  Entry Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="bg-background text-xs"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-medium mb-1.5 block">
                  Reference / Voucher Number
                </Label>
                <Input
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. REF-2026-8812, INV-01"
                  className="bg-background text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium mb-1.5 block">
                  Description / Narration <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain the purpose, client context, or accounting reason for this journal entry..."
                  className="bg-background text-xs resize-none h-20"
                  required
                />
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">
                    Campaign / Project (Optional)
                  </Label>
                  <Input
                    value={campaignProject}
                    onChange={(e) => setCampaignProject(e.target.value)}
                    placeholder="e.g. Meta Ads Q4 Scale, SEO Retainer 2026"
                    className="bg-background text-xs"
                  />
                </div>

                <div>
                  <AttachmentUploader
                    label="Attachment (PDF, PNG, JPG/JPEG)"
                    helperText="Upload bill, tax voucher, or bank debit advice"
                    value={attachmentUrl}
                    onChange={(url) => setAttachmentUrl(url)}
                    className="p-2 border rounded-lg bg-background"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Dynamic Journal Lines */}
          <div className="bg-muted/10 border border-border/60 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <ArrowRightLeft className="w-3.5 h-3.5 text-primary" />
                <span>Journal Entry Lines (Double-Entry Debit & Credit)</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLine}
                className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Line</span>
              </Button>
            </div>

            {/* Lines Table */}
            <div className="overflow-x-auto rounded-lg border border-border bg-background">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b border-border font-semibold text-muted-foreground">
                  <tr>
                    <th className="py-2.5 px-3 min-w-[240px]">Account</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Description</th>
                    <th className="py-2.5 px-3 w-36 text-right">Debit (₹)</th>
                    <th className="py-2.5 px-3 w-36 text-right">Credit (₹)</th>
                    <th className="py-2.5 px-3 min-w-[160px]">Reference / Notes</th>
                    <th className="py-2.5 px-2 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lines.map((line, idx) => (
                    <tr key={line.id} className="hover:bg-muted/20 transition-colors">
                      {/* Account selection */}
                      <td className="p-2">
                        <Dropdown
                          options={accountOptions}
                          value={line.account_id}
                          onChange={(val) => handleLineChange(idx, 'account_id', val)}
                          className="w-full text-xs"
                        />
                      </td>

                      {/* Description */}
                      <td className="p-2">
                        <Input
                          value={line.description}
                          onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                          placeholder="Line item description..."
                          className="text-xs h-8 bg-transparent"
                        />
                      </td>

                      {/* Debit */}
                      <td className="p-2">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                            ₹
                          </span>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            value={line.debit}
                            onChange={(e) => handleLineChange(idx, 'debit', e.target.value)}
                            placeholder="0.00"
                            className="text-xs h-8 pl-6 text-right font-mono bg-transparent"
                          />
                        </div>
                      </td>

                      {/* Credit */}
                      <td className="p-2">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                            ₹
                          </span>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            value={line.credit}
                            onChange={(e) => handleLineChange(idx, 'credit', e.target.value)}
                            placeholder="0.00"
                            className="text-xs h-8 pl-6 text-right font-mono bg-transparent"
                          />
                        </div>
                      </td>

                      {/* Reference / Notes */}
                      <td className="p-2">
                        <Input
                          value={line.reference_notes}
                          onChange={(e) => handleLineChange(idx, 'reference_notes', e.target.value)}
                          placeholder="Notes / Invoice ref..."
                          className="text-xs h-8 bg-transparent"
                        />
                      </td>

                      {/* Remove button */}
                      <td className="p-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={lines.length <= 2}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Remove line"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Validation & Totals Footer Bar */}
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
              {/* Validation Status Pill */}
              <div className="flex items-center gap-2">
                {totals.isBalanced ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Balanced: Total Debit = Total Credit</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      {totals.difference > 0
                        ? `Journal entry cannot be posted because Total Debit and Total Credit must be equal (Difference: ₹${totals.difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`
                        : 'Journal entry cannot be posted because Total Debit and Total Credit must be equal.'}
                    </span>
                  </div>
                )}
              </div>

              {/* Totals Summary */}
              <div className="flex items-center gap-6 text-xs">
                <div className="text-right">
                  <div className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                    Total Debit
                  </div>
                  <div className="text-sm font-bold font-mono text-foreground">
                    ₹{totals.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                    Total Credit
                  </div>
                  <div className="text-sm font-bold font-mono text-foreground">
                    ₹{totals.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="text-right pl-4 border-l border-border">
                  <div className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                    Difference
                  </div>
                  <div
                    className={`text-sm font-bold font-mono ${
                      totals.difference === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                    }`}
                  >
                    ₹{totals.difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <DialogFooter className="px-6 py-3.5 border-t border-border bg-muted/20 flex flex-row items-center justify-between sm:justify-between w-full">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="text-xs"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {/* Save Draft Button: Always allowed */}
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSubmit('Draft')}
              disabled={loading}
              className="text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                'Save Draft'
              )}
            </Button>

            {/* Post Journal Entry: Strictly validates Debit == Credit */}
            <Button
              type="button"
              onClick={() => handleSubmit('Posted')}
              disabled={loading || !totals.isBalanced}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Posting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Post Journal Entry
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
