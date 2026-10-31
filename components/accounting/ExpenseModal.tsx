'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dropdown } from '@/components/ui/Dropdown'
import { toast } from 'sonner'
import {
  Loader2,
  ArrowUpRight,
  Building2,
  Receipt,
  CreditCard,
  FileCheck2,
  Percent,
  Calculator,
  Sparkles,
} from 'lucide-react'
import {
  ExpenseRecord,
  ExpenseStatus,
  PaymentMethod,
  PAYMENT_METHODS,
  EXPENSE_CATEGORIES,
  TAX_TYPES,
  TAX_RATES,
  TaxType,
  BankAccount,
  ChequeStatus,
} from '@/types/accounting'
import { createExpenseAction, updateExpenseAction } from '@/lib/actions/accounting'
import { AttachmentUploader } from './AttachmentUploader'
import { DynamicPaymentFields } from './DynamicPaymentFields'


interface ExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  expenseToEdit?: ExpenseRecord | null
  bankAccounts: BankAccount[]
}

export function ExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  expenseToEdit,
  bankAccounts,
}: ExpenseModalProps) {
  const isEditing = !!expenseToEdit

  // --- Section 1: Expense Information ---
  const [expenseDate, setExpenseDate] = useState('')
  const [expenseNumber, setExpenseNumber] = useState('')
  const [vendorPayee, setVendorPayee] = useState('')
  const [category, setCategory] = useState<string>('Software & Subscriptions')
  const [campaignProject, setCampaignProject] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [description, setDescription] = useState('')

  // --- Section 2: Amount & Tax ---
  const [amount, setAmount] = useState<string>('') // Subtotal
  const [taxType, setTaxType] = useState<TaxType>('GST 18%')
  const [customTaxRate, setCustomTaxRate] = useState<string>('0')

  // --- Section 3: Payment Details ---
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer')
  const [status, setStatus] = useState<ExpenseStatus>('Paid')
  const [paidAmountInput, setPaidAmountInput] = useState<string>('')
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentDate, setPaymentDate] = useState('')

  // Dynamic payment-method specific fields
  const [upiId, setUpiId] = useState('')
  const [cardHolderName, setCardHolderName] = useState('')
  const [cardLast4, setCardLast4] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [chequeNumber, setChequeNumber] = useState('')
  const [chequeDate, setChequeDate] = useState('')
  const [chequeStatus, setChequeStatus] = useState<ChequeStatus>('Pending')

  // --- Section 4: Additional Information ---
  const [notes, setNotes] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Determine current numeric Tax Rate
  const effectiveTaxRate = useMemo(() => {
    if (taxType === 'Custom Tax') {
      const parsed = parseFloat(customTaxRate)
      return isNaN(parsed) || parsed < 0 ? 0 : parsed
    }
    return TAX_RATES[taxType] ?? 0
  }, [taxType, customTaxRate])

  // Calculated Subtotal, Tax Amount, and Total Amount
  const subtotalNum = useMemo(() => {
    const val = parseFloat(amount)
    return isNaN(val) || val <= 0 ? 0 : val
  }, [amount])

  const calculatedTaxAmount = useMemo(() => {
    return Math.round(((subtotalNum * effectiveTaxRate) / 100) * 100) / 100
  }, [subtotalNum, effectiveTaxRate])

  const calculatedTotalAmount = useMemo(() => {
    return Math.round((subtotalNum + calculatedTaxAmount) * 100) / 100
  }, [subtotalNum, calculatedTaxAmount])

  // Calculated Paid & Pending Amount
  const paidAmountNum = useMemo(() => {
    if (status === 'Paid') return calculatedTotalAmount
    if (status === 'Pending') return 0
    if (status === 'Partially Paid') {
      const parsed = parseFloat(paidAmountInput)
      return isNaN(parsed) || parsed < 0 ? 0 : parsed
    }
    return 0
  }, [status, calculatedTotalAmount, paidAmountInput])

  const calculatedPendingAmount = useMemo(() => {
    if (status === 'Paid') return 0
    if (status === 'Pending') return calculatedTotalAmount
    return Math.max(0, Math.round((calculatedTotalAmount - paidAmountNum) * 100) / 100)
  }, [status, calculatedTotalAmount, paidAmountNum])

  // Populate form on edit or reset
  useEffect(() => {
    if (expenseToEdit) {
      setExpenseDate(expenseToEdit.expense_date || '')
      setExpenseNumber(expenseToEdit.expense_number || '')
      setVendorPayee(expenseToEdit.vendor_payee || '')
      setCategory(expenseToEdit.category || 'Software & Subscriptions')
      setCampaignProject(expenseToEdit.campaign_project || '')
      setInvoiceNumber(expenseToEdit.invoice_number || '')
      setDescription(expenseToEdit.description || '')

      setAmount(expenseToEdit.amount ? String(expenseToEdit.amount) : '')
      const editTaxType = expenseToEdit.tax_type || 'No Tax'
      setTaxType(editTaxType)
      setCustomTaxRate(expenseToEdit.tax_rate ? String(expenseToEdit.tax_rate) : '0')

      setPaymentMethod(expenseToEdit.payment_method || 'Bank Transfer')
      setStatus(expenseToEdit.status || 'Paid')
      setPaidAmountInput(
        expenseToEdit.paid_amount !== undefined ? String(expenseToEdit.paid_amount) : ''
      )
      setPaymentReference(expenseToEdit.payment_reference || '')
      setPaymentDate(expenseToEdit.payment_date || '')
      setUpiId(expenseToEdit.upi_id || '')
      setCardHolderName(expenseToEdit.card_holder_name || '')
      setCardLast4(expenseToEdit.card_last4 || '')
      setBankName(expenseToEdit.bank_name || '')
      setAccountName(expenseToEdit.account_name || '')
      setChequeNumber(expenseToEdit.cheque_number || '')
      setChequeDate(expenseToEdit.cheque_date || '')
      setChequeStatus(expenseToEdit.cheque_status || 'Pending')

      setNotes(expenseToEdit.notes || '')
      setAttachmentUrl(expenseToEdit.attachment_url || '')
    } else {
      const today = new Date().toISOString().split('T')[0]
      setExpenseDate(today)
      setExpenseNumber('')
      setVendorPayee('')
      setCategory('Software & Subscriptions')
      setCampaignProject('')
      setInvoiceNumber('')
      setDescription('')

      setAmount('')
      setTaxType('GST 18%')
      setCustomTaxRate('18')

      setPaymentMethod('Bank Transfer')
      setStatus('Paid')
      setPaidAmountInput('')
      setPaymentReference('')
      setPaymentDate(today)
      setUpiId('')
      setCardHolderName('')
      setCardLast4('')
      setBankName('')
      setAccountName('')
      setChequeNumber('')
      setChequeDate('')
      setChequeStatus('Pending')

      setNotes('')
      setAttachmentUrl('')
    }
    setErrorMsg(null)
  }, [expenseToEdit, isOpen])

  const handlePaymentMethodChange = (newMethod: PaymentMethod) => {
    setPaymentMethod(newMethod)
    // Clear irrelevant payment-method-specific values
    setUpiId('')
    setCardHolderName('')
    setCardLast4('')
    setBankName('')
    setAccountName('')
    setChequeNumber('')
    setChequeDate('')
    setChequeStatus('Pending')
    setPaymentReference('')
  }


  // Helper to quickly fill "Test Expense"
  const handleSetTestExpense = () => {
    setVendorPayee('Google Ireland Ltd (Google Ads)')
    setCategory('Google Ads')
    setCampaignProject('Brand Search & PPC Campaign')
    setInvoiceNumber(`BILL-GOOG-${Date.now().toString().slice(-4)}`)
    setDescription('Agency paid media ad spend for client acquisition')
    setAmount('45000')
    setTaxType('GST 18%')
    setPaymentMethod('Credit Card')
    setPaymentReference(`AUTH-${Date.now().toString().slice(-6)}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    // Validations
    const trimmedVendor = vendorPayee.trim()
    if (!trimmedVendor) {
      setErrorMsg('Vendor / Payee Name is required.')
      return
    }

    if (!expenseDate) {
      setErrorMsg('Expense Date is required.')
      return
    }

    if (!category) {
      setErrorMsg('Expense Category is required.')
      return
    }

    if (subtotalNum <= 0) {
      setErrorMsg('Subtotal / Amount must be greater than 0.')
      return
    }

    if (effectiveTaxRate < 0) {
      setErrorMsg('Tax Rate cannot be negative.')
      return
    }

    if (status === 'Partially Paid') {
      const parsedPaid = parseFloat(paidAmountInput)
      if (isNaN(parsedPaid) || parsedPaid < 0) {
        setErrorMsg('Please enter a valid Paid Amount (cannot be negative).')
        return
      }
      if (parsedPaid > calculatedTotalAmount) {
        setErrorMsg(`Paid Amount (₹${parsedPaid}) cannot exceed Total Amount (₹${calculatedTotalAmount}).`)
        return
      }
    }

    // Method-specific validations
    if (paymentMethod === 'UPI' && !upiId.trim()) {
      setErrorMsg('UPI ID is required (e.g. company@upi).')
      return
    }
    if (paymentMethod === 'Credit Card' || paymentMethod === 'Debit Card') {
      if (!cardHolderName.trim()) {
        setErrorMsg('Card Holder Name is required.')
        return
      }
      if (!cardLast4.trim() || !/^\d{4}$/.test(cardLast4.trim())) {
        setErrorMsg('Last 4 Digits of card must be exactly 4 numeric digits.')
        return
      }
    }
    if (paymentMethod === 'Bank Transfer') {
      if (!bankName.trim()) {
        setErrorMsg('Bank Name is required for Bank Transfer.')
        return
      }
      if (!paymentReference.trim()) {
        setErrorMsg('Transaction / UTR Number is required for Bank Transfer.')
        return
      }
    }
    if (paymentMethod === 'Cheque') {
      if (!chequeNumber.trim()) {
        setErrorMsg('Cheque Number is required.')
        return
      }
      if (!bankName.trim()) {
        setErrorMsg('Bank Name is required for Cheque payment.')
        return
      }
    }

    setLoading(true)

    try {
      if (isEditing && expenseToEdit) {
        const res = await updateExpenseAction({
          id: expenseToEdit.id,
          expense_number: expenseNumber.trim() || undefined,
          expense_date: expenseDate,
          category,
          vendor_payee: trimmedVendor,
          campaign_project: campaignProject.trim() || null,
          invoice_number: invoiceNumber.trim() || null,
          description: description.trim() || null,
          amount: subtotalNum,
          tax_type: taxType,
          tax_rate: effectiveTaxRate,
          tax_amount: calculatedTaxAmount,
          total_amount: calculatedTotalAmount,
          payment_method: paymentMethod,
          payment_reference: paymentReference.trim() || null,
          payment_date: paymentDate || (paidAmountNum > 0 ? expenseDate : null),
          upi_id: upiId.trim() || null,
          card_holder_name: cardHolderName.trim() || null,
          card_last4: cardLast4.trim() || null,
          bank_name: bankName.trim() || null,
          account_name: accountName.trim() || null,
          cheque_number: chequeNumber.trim() || null,
          cheque_date: chequeDate || null,
          cheque_status: chequeStatus,
          notes: notes.trim() || null,
          attachment_url: attachmentUrl.trim() || null,
          status,
          paid_amount: paidAmountNum,
          pending_amount: calculatedPendingAmount,
        })

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to update expense record.')
          toast.error(res.error || 'Failed to update expense record.')
        } else {
          toast.success('Expense record updated successfully.')
          onSuccess()
          onClose()
        }
      } else {
        const res = await createExpenseAction({
          expense_number: expenseNumber.trim() || undefined,
          expense_date: expenseDate,
          category,
          vendor_payee: trimmedVendor,
          campaign_project: campaignProject.trim() || null,
          invoice_number: invoiceNumber.trim() || null,
          description: description.trim() || null,
          amount: subtotalNum,
          tax_type: taxType,
          tax_rate: effectiveTaxRate,
          tax_amount: calculatedTaxAmount,
          total_amount: calculatedTotalAmount,
          payment_method: paymentMethod,
          payment_reference: paymentReference.trim() || null,
          payment_date: paymentDate || (paidAmountNum > 0 ? expenseDate : null),
          upi_id: upiId.trim() || null,
          card_holder_name: cardHolderName.trim() || null,
          card_last4: cardLast4.trim() || null,
          bank_name: bankName.trim() || null,
          account_name: accountName.trim() || null,
          cheque_number: chequeNumber.trim() || null,
          cheque_date: chequeDate || null,
          cheque_status: chequeStatus,
          notes: notes.trim() || null,
          attachment_url: attachmentUrl.trim() || null,
          status,
          paid_amount: paidAmountNum,
          pending_amount: calculatedPendingAmount,
        })

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to record expense.')
          toast.error(res.error || 'Failed to record expense.')
        } else {
          toast.success('Expense recorded successfully.')
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

  // Format currency helper for display
  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val)
  }

  const categoryOptions = EXPENSE_CATEGORIES.map((cat) => ({
    value: cat,
    label: cat,
  }))

  const taxTypeOptions = TAX_TYPES.map((t) => ({
    value: t,
    label: t === 'Custom Tax' ? 'Custom Tax Rate (%)' : `${t} (${TAX_RATES[t]}%)`,
  }))

  const paymentMethodOptions = PAYMENT_METHODS.map((pm) => ({
    value: pm,
    label: pm,
  }))

  const statusOptions: { value: ExpenseStatus; label: string }[] = [
    { value: 'Paid', label: 'Paid (Fully Settled)' },
    { value: 'Pending', label: 'Pending (Unpaid Bill)' },
    { value: 'Partially Paid', label: 'Partially Paid' },
  ]

  const bankOptions = [
    { value: '', label: '-- Select Bank / Cash Account --' },
    ...bankAccounts.map((b) => ({
      value: b.id,
      label: `${b.account_name} (${b.bank_name}) • ${b.account_type}`,
    })),
  ]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl sm:max-w-4xl lg:max-w-5xl w-[96vw] bg-card border-border text-foreground p-0 max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  {isEditing ? 'Edit Agency Expense Record' : 'Record Agency Expense'}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Vendor Payments, Campaign Ad Spend & Operating Costs
                </p>
              </div>
            </div>

            {/* Quick Test Helper */}
            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSetTestExpense}
                className="text-xs h-8 border-dashed border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 gap-1.5"
                title="Populate test agency expense details for quick verification"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Fill Test Expense
              </Button>
            )}
          </div>
        </DialogHeader>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-2">
            <span className="font-semibold text-xs uppercase tracking-wider">Error:</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5">
          {/* 2-Column Spacious Grid on Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* ========================================================
                COLUMN 1: EXPENSE INFORMATION & ADDITIONAL INFO
                ======================================================== */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                <Building2 className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                  Expense Information
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Expense Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="expense-date" className="text-xs font-semibold">
                    Expense Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="expense-date"
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="bg-background border-border text-sm h-9"
                    required
                  />
                </div>

                {/* Expense Number / Reference */}
                <div className="space-y-1.5">
                  <Label htmlFor="expense-number" className="text-xs font-semibold">
                    Expense # / Reference
                  </Label>
                  <Input
                    id="expense-number"
                    placeholder="Auto-generated (e.g. EXP-2026-0001)"
                    value={expenseNumber}
                    onChange={(e) => setExpenseNumber(e.target.value)}
                    className="bg-background border-border text-sm h-9"
                  />
                </div>
              </div>

              {/* Vendor / Payee Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="vendor-payee" className="text-xs font-semibold">
                    Vendor / Payee Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="vendor-payee"
                    placeholder="e.g. Google Ads, AWS, Office Landlord"
                    value={vendorPayee}
                    onChange={(e) => setVendorPayee(e.target.value)}
                    className="bg-background border-border text-sm h-9 font-medium"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="expense-category" className="text-xs font-semibold">
                    Expense Category <span className="text-destructive">*</span>
                  </Label>
                  <Dropdown
                    id="expense-category"
                    value={category}
                    onChange={(v) => setCategory(v)}
                    options={categoryOptions}
                    buttonClassName="bg-background border-border w-full h-9 text-xs"
                  />
                </div>
              </div>

              {/* Campaign / Project & Invoice/Bill Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="campaign-project" className="text-xs font-semibold">
                    Campaign / Project
                  </Label>
                  <Input
                    id="campaign-project"
                    placeholder="e.g. Q4 Brand Search, Lead Gen Ads"
                    value={campaignProject}
                    onChange={(e) => setCampaignProject(e.target.value)}
                    className="bg-background border-border text-sm h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invoice-number" className="text-xs font-semibold">
                    Invoice / Bill Number
                  </Label>
                  <Input
                    id="invoice-number"
                    placeholder="e.g. BILL-2026-0891"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="bg-background border-border text-sm h-9 font-mono"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="expense-description" className="text-xs font-semibold">
                  Description / Expense Details
                </Label>
                <Input
                  id="expense-description"
                  placeholder="e.g. Monthly advertising budget for Meta Lead Generation campaign"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-background border-border text-sm h-9"
                />
              </div>

              {/* Additional Information: Notes & Attachment Proof */}
              <div className="pt-2 space-y-3.5">
                <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                  <FileCheck2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Additional Information
                  </span>
                </div>

                <AttachmentUploader
                  label="Attachment / Bill Proof"
                  helperText="PDF, PNG, JPG (Max 10MB)"
                  value={attachmentUrl}
                  onChange={(url) => setAttachmentUrl(url)}
                />


                <div className="space-y-1.5">
                  <Label htmlFor="expense-notes" className="text-xs font-semibold">
                    Notes
                  </Label>
                  <Textarea
                    id="expense-notes"
                    placeholder="Add any internal remarks, billing notes, or approval references..."
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-background border-border text-xs resize-none"
                  />
                </div>
              </div>
            </div>

            {/* ========================================================
                COLUMN 2: AMOUNT, TAX & PAYMENT DETAILS
                ======================================================== */}
            <div className="space-y-5">
              {/* Amount & Tax */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                  <Receipt className="w-4 h-4 text-rose-500" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                    Amount & Tax
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Subtotal */}
                  <div className="space-y-1.5">
                    <Label htmlFor="subtotal-amount" className="text-xs font-semibold">
                      Subtotal (₹) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="subtotal-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="e.g. 50000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-background border-border text-sm h-9 font-semibold text-foreground"
                      required
                    />
                  </div>

                  {/* Tax Type */}
                  <div className="space-y-1.5">
                    <Label htmlFor="tax-type" className="text-xs font-semibold">
                      Tax Type
                    </Label>
                    <Dropdown
                      id="tax-type"
                      value={taxType}
                      onChange={(v) => {
                        const selected = v as TaxType
                        setTaxType(selected)
                        if (selected !== 'Custom Tax') {
                          setCustomTaxRate(String(TAX_RATES[selected] ?? 0))
                        }
                      }}
                      options={taxTypeOptions}
                      buttonClassName="bg-background border-border w-full h-9 text-xs"
                    />
                  </div>

                  {/* Tax Rate (%) */}
                  <div className="space-y-1.5">
                    <Label htmlFor="tax-rate" className="text-xs font-semibold flex items-center justify-between">
                      <span>Tax Rate (%)</span>
                      {taxType === 'Custom Tax' && (
                        <span className="text-[10px] text-amber-500 font-medium">Custom</span>
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        id="tax-rate"
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={taxType !== 'Custom Tax'}
                        value={taxType === 'Custom Tax' ? customTaxRate : effectiveTaxRate}
                        onChange={(e) => setCustomTaxRate(e.target.value)}
                        className="bg-background border-border text-sm h-9 pr-7 disabled:opacity-80"
                      />
                      <Percent className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Computation Summary Card */}
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Expense Subtotal
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatINR(subtotalNum)}
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Tax Amount ({effectiveTaxRate}%)
                    </p>
                    <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                      +{formatINR(calculatedTaxAmount)}
                    </p>
                  </div>

                  <div className="space-y-0.5 sm:border-l sm:border-border/60 sm:pl-3">
                    <div className="flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-rose-500" />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                        Total Amount
                      </p>
                    </div>
                    <p className="text-base font-extrabold text-rose-600 dark:text-rose-400">
                      {formatINR(calculatedTotalAmount)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-3.5 pt-1">
                <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                  <CreditCard className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                    Payment Details
                  </h3>
                </div>

                <DynamicPaymentFields
                  method={paymentMethod}
                  onMethodChange={handlePaymentMethodChange}
                  status={status}
                  onStatusChange={(s) => setStatus(s as ExpenseStatus)}
                  statusOptions={statusOptions}
                  totalAmount={calculatedTotalAmount}
                  settledAmount={paidAmountNum}
                  onSettledAmountChange={(val) => setPaidAmountInput(val > 0 ? String(val) : '')}
                  pendingAmount={calculatedPendingAmount}
                  paymentDate={paymentDate}
                  onPaymentDateChange={setPaymentDate}
                  upiId={upiId}
                  onUpiIdChange={setUpiId}
                  cardHolderName={cardHolderName}
                  onCardHolderNameChange={setCardHolderName}
                  cardLast4={cardLast4}
                  onCardLast4Change={setCardLast4}
                  bankName={bankName}
                  onBankNameChange={setBankName}
                  accountName={accountName}
                  onAccountNameChange={setAccountName}
                  chequeNumber={chequeNumber}
                  onChequeNumberChange={setChequeNumber}
                  chequeDate={chequeDate}
                  onChequeDateChange={setChequeDate}
                  chequeStatus={chequeStatus}
                  onChequeStatusChange={setChequeStatus}
                  paymentReference={paymentReference}
                  onPaymentReferenceChange={setPaymentReference}
                  isIncome={false}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 mt-6 border-t border-border flex flex-col-reverse sm:flex-row items-center justify-between gap-3 sticky bottom-0 bg-card py-2">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>Settlement Amount:</span>
              <span className="font-bold text-foreground text-sm">
                {formatINR(paidAmountNum)}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="w-full sm:w-auto h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto h-9 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Confirm & Save Expense'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
