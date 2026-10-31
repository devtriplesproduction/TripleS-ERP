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
  ArrowDownLeft,
  Building2,
  Receipt,
  CreditCard,
  FileCheck2,
  Percent,
  Calculator,
  Sparkles,
} from 'lucide-react'
import {
  IncomeRecord,
  IncomeStatus,
  PaymentMethod,
  PAYMENT_METHODS,
  INCOME_CATEGORIES,
  TAX_TYPES,
  TAX_RATES,
  TaxType,
  BankAccount,
  ChequeStatus,
} from '@/types/accounting'
import { createIncomeAction, updateIncomeAction } from '@/lib/actions/accounting'
import { AttachmentUploader } from './AttachmentUploader'
import { DynamicPaymentFields } from './DynamicPaymentFields'


interface IncomeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  incomeToEdit?: IncomeRecord | null
  bankAccounts: BankAccount[]
  existingClients?: { id: string; name: string }[]
}

export function IncomeModal({
  isOpen,
  onClose,
  onSuccess,
  incomeToEdit,
  bankAccounts,
  existingClients = [],
}: IncomeModalProps) {
  const isEditing = !!incomeToEdit

  // --- Section 1: Income Information ---
  const [incomeDate, setIncomeDate] = useState('')
  const [incomeNumber, setIncomeNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [campaignProject, setCampaignProject] = useState('')
  const [category, setCategory] = useState<string>('Meta Ads Management')
  const [description, setDescription] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')

  // --- Section 2: Amount & Tax ---
  const [amount, setAmount] = useState<string>('') // Subtotal
  const [taxType, setTaxType] = useState<TaxType>('GST 18%')
  const [customTaxRate, setCustomTaxRate] = useState<string>('0')

  // --- Section 3: Payment Details ---
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer')
  const [status, setStatus] = useState<IncomeStatus>('Received')
  const [receivedAmountInput, setReceivedAmountInput] = useState<string>('')
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

  // Calculated Received & Pending Amount
  const receivedAmountNum = useMemo(() => {
    if (status === 'Received') return calculatedTotalAmount
    if (status === 'Pending') return 0
    if (status === 'Partially Received') {
      const parsed = parseFloat(receivedAmountInput)
      return isNaN(parsed) || parsed < 0 ? 0 : parsed
    }
    return 0
  }, [status, calculatedTotalAmount, receivedAmountInput])

  const calculatedPendingAmount = useMemo(() => {
    if (status === 'Received') return 0
    if (status === 'Pending') return calculatedTotalAmount
    return Math.max(0, Math.round((calculatedTotalAmount - receivedAmountNum) * 100) / 100)
  }, [status, calculatedTotalAmount, receivedAmountNum])

  // Populate form on edit or reset
  useEffect(() => {
    if (incomeToEdit) {
      setIncomeDate(incomeToEdit.income_date || '')
      setIncomeNumber(incomeToEdit.income_number || '')
      setSelectedClientId(incomeToEdit.client_id || '')
      setCustomerName(incomeToEdit.customer_name || '')
      setCampaignProject(incomeToEdit.campaign_project || '')
      setCategory(incomeToEdit.category || 'Meta Ads Management')
      setDescription(incomeToEdit.description || '')
      setInvoiceNumber(incomeToEdit.invoice_number || '')

      setAmount(incomeToEdit.amount ? String(incomeToEdit.amount) : '')
      const editTaxType = incomeToEdit.tax_type || 'No Tax'
      setTaxType(editTaxType)
      setCustomTaxRate(incomeToEdit.tax_rate ? String(incomeToEdit.tax_rate) : '0')

      setPaymentMethod(incomeToEdit.payment_method || 'Bank Transfer')
      setStatus(incomeToEdit.status || 'Received')
      setReceivedAmountInput(
        incomeToEdit.received_amount !== undefined ? String(incomeToEdit.received_amount) : ''
      )
      setPaymentReference(incomeToEdit.payment_reference || '')
      setPaymentDate(incomeToEdit.payment_date || '')
      setUpiId(incomeToEdit.upi_id || '')
      setCardHolderName(incomeToEdit.card_holder_name || '')
      setCardLast4(incomeToEdit.card_last4 || '')
      setBankName(incomeToEdit.bank_name || '')
      setAccountName(incomeToEdit.account_name || '')
      setChequeNumber(incomeToEdit.cheque_number || '')
      setChequeDate(incomeToEdit.cheque_date || '')
      setChequeStatus(incomeToEdit.cheque_status || 'Pending')

      setNotes(incomeToEdit.notes || '')
      setAttachmentUrl(incomeToEdit.attachment_url || '')
    } else {
      const today = new Date().toISOString().split('T')[0]
      setIncomeDate(today)
      setIncomeNumber('')
      setSelectedClientId('')
      setCustomerName('')
      setCampaignProject('')
      setCategory('Meta Ads Management')
      setDescription('')
      setInvoiceNumber('')

      setAmount('')
      setTaxType('GST 18%')
      setCustomTaxRate('18')

      setPaymentMethod('Bank Transfer')
      setStatus('Received')
      setReceivedAmountInput('')
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
  }, [incomeToEdit, isOpen])

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


  // Helper to quickly fill "Test Client"
  const handleSetTestClient = () => {
    setSelectedClientId('')
    setCustomerName('Test Client (Agency Demo)')
    if (!campaignProject) setCampaignProject('Meta Ads Q4 Launch (Test)')
    if (!description) setDescription('Test campaign payment for agency workflow verification')
    if (!invoiceNumber) setInvoiceNumber(`INV-TEST-${Date.now().toString().slice(-4)}`)
  }

  // Handle client selection from existing clients
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId)
    if (clientId === 'CUSTOM' || clientId === '') {
      return
    }
    const found = existingClients.find((c) => c.id === clientId)
    if (found) {
      setCustomerName(found.name)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    // Validations
    const trimmedCustomer = customerName.trim()
    if (!trimmedCustomer) {
      setErrorMsg('Client Name is required.')
      return
    }

    if (!incomeDate) {
      setErrorMsg('Income Date is required.')
      return
    }

    if (!category) {
      setErrorMsg('Income Category is required.')
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

    if (status === 'Partially Received') {
      const parsedRec = parseFloat(receivedAmountInput)
      if (isNaN(parsedRec) || parsedRec < 0) {
        setErrorMsg('Please enter a valid Received Amount (cannot be negative).')
        return
      }
      if (parsedRec > calculatedTotalAmount) {
        setErrorMsg(`Received Amount (₹${parsedRec}) cannot be greater than Total Amount (₹${calculatedTotalAmount}).`)
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
      if (isEditing && incomeToEdit) {
        const res = await updateIncomeAction({
          id: incomeToEdit.id,
          income_number: incomeNumber.trim() || undefined,
          income_date: incomeDate,
          client_id: selectedClientId && selectedClientId !== 'CUSTOM' ? selectedClientId : null,
          customer_name: trimmedCustomer,
          campaign_project: campaignProject.trim() || null,
          invoice_number: invoiceNumber.trim() || null,
          description: description.trim() || null,
          category,
          amount: subtotalNum,
          tax_type: taxType,
          tax_rate: effectiveTaxRate,
          tax_amount: calculatedTaxAmount,
          total_amount: calculatedTotalAmount,
          payment_method: paymentMethod,
          payment_reference: paymentReference.trim() || null,
          payment_date: paymentDate || (receivedAmountNum > 0 ? incomeDate : null),
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
          received_amount: receivedAmountNum,
          pending_amount: calculatedPendingAmount,
        })

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to update income record.')
          toast.error(res.error || 'Failed to update income record.')
        } else {
          toast.success('Income record updated successfully.')
          onSuccess()
          onClose()
        }
      } else {
        const res = await createIncomeAction({
          income_number: incomeNumber.trim() || undefined,
          income_date: incomeDate,
          client_id: selectedClientId && selectedClientId !== 'CUSTOM' ? selectedClientId : null,
          customer_name: trimmedCustomer,
          campaign_project: campaignProject.trim() || null,
          invoice_number: invoiceNumber.trim() || null,
          description: description.trim() || null,
          category,
          amount: subtotalNum,
          tax_type: taxType,
          tax_rate: effectiveTaxRate,
          tax_amount: calculatedTaxAmount,
          total_amount: calculatedTotalAmount,
          payment_method: paymentMethod,
          payment_reference: paymentReference.trim() || null,
          payment_date: paymentDate || (receivedAmountNum > 0 ? incomeDate : null),
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
          received_amount: receivedAmountNum,
          pending_amount: calculatedPendingAmount,
        })

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to record income.')
          toast.error(res.error || 'Failed to record income.')
        } else {
          toast.success('Income recorded successfully.')
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

  // Dropdown options
  const clientOptions = [
    { value: '', label: '-- Direct Customer / Free Entry --' },
    ...existingClients.map((c) => ({ value: c.id, label: c.name })),
  ]

  const categoryOptions = INCOME_CATEGORIES.map((cat) => ({
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

  const statusOptions: { value: IncomeStatus; label: string }[] = [
    { value: 'Received', label: 'Received (Fully Settled)' },
    { value: 'Pending', label: 'Pending (Unpaid Invoice)' },
    { value: 'Partially Received', label: 'Partially Received' },
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
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  {isEditing ? 'Edit Agency Income Record' : 'Record Agency Income'}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Digital Marketing Agency Revenue • Automated GST & Payment Tracking
                </p>
              </div>
            </div>

            {/* Quick Test Client Helper */}
            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSetTestClient}
                className="text-xs h-8 border-dashed border-primary/40 text-primary hover:bg-primary/10 gap-1.5"
                title="Populate test client details for quick verification"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Fill Test Client
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
                COLUMN 1: INCOME INFORMATION
                ======================================================== */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                <Building2 className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                  Income Information
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Income Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="income-date" className="text-xs font-semibold">
                    Income Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="income-date"
                    type="date"
                    value={incomeDate}
                    onChange={(e) => setIncomeDate(e.target.value)}
                    className="bg-background border-border text-sm h-9"
                    required
                  />
                </div>

                {/* Income Number / Reference */}
                <div className="space-y-1.5">
                  <Label htmlFor="income-number" className="text-xs font-semibold">
                    Reference / Income #
                  </Label>
                  <Input
                    id="income-number"
                    placeholder="Auto-generated (e.g. INC-2026-0001)"
                    value={incomeNumber}
                    onChange={(e) => setIncomeNumber(e.target.value)}
                    className="bg-background border-border text-sm h-9"
                  />
                </div>
              </div>

              {/* Client Selection & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="client-dropdown" className="text-xs font-semibold text-muted-foreground">
                    Select Client (Optional)
                  </Label>
                  <Dropdown
                    id="client-dropdown"
                    value={selectedClientId}
                    onChange={handleClientSelect}
                    options={clientOptions}
                    buttonClassName="bg-background border-border w-full h-9 text-xs"
                    placeholder="Select or enter directly..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="customer-name" className="text-xs font-semibold">
                    Client Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="customer-name"
                    placeholder="Direct Client Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="bg-background border-border text-sm h-9 font-medium"
                    required
                  />
                </div>
              </div>

              {/* Campaign / Project & Invoice Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="campaign-project" className="text-xs font-semibold">
                    Campaign / Project
                  </Label>
                  <Input
                    id="campaign-project"
                    placeholder="e.g. Meta Ads Q4 Launch, Website SEO"
                    value={campaignProject}
                    onChange={(e) => setCampaignProject(e.target.value)}
                    className="bg-background border-border text-sm h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invoice-number" className="text-xs font-semibold">
                    Invoice Number
                  </Label>
                  <Input
                    id="invoice-number"
                    placeholder="e.g. INV-2026-0089"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="bg-background border-border text-sm h-9 font-mono"
                  />
                </div>
              </div>

              {/* Income Category */}
              <div className="space-y-1.5">
                <Label htmlFor="income-category" className="text-xs font-semibold">
                  Income Category <span className="text-destructive">*</span>
                </Label>
                <Dropdown
                  id="income-category"
                  value={category}
                  onChange={(v) => setCategory(v)}
                  options={categoryOptions}
                  buttonClassName="bg-background border-border w-full h-9 text-xs"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="income-description" className="text-xs font-semibold">
                  Description / Service Details
                </Label>
                <Input
                  id="income-description"
                  placeholder="e.g. Monthly Meta Ad management retainer & ad copy"
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
                  label="Attachment / Payment Proof"
                  helperText="PDF, PNG, JPG (Max 10MB)"
                  value={attachmentUrl}
                  onChange={(url) => setAttachmentUrl(url)}
                />


                <div className="space-y-1.5">
                  <Label htmlFor="income-notes" className="text-xs font-semibold">
                    Notes
                  </Label>
                  <Textarea
                    id="income-notes"
                    placeholder="Add any internal client remarks, milestone deliverables..."
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
                  <Receipt className="w-4 h-4 text-emerald-500" />
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
                      Service Subtotal
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatINR(subtotalNum)}
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Tax Amount ({effectiveTaxRate}%)
                    </p>
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                      +{formatINR(calculatedTaxAmount)}
                    </p>
                  </div>

                  <div className="space-y-0.5 sm:border-l sm:border-border/60 sm:pl-3">
                    <div className="flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-emerald-500" />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Total Amount
                      </p>
                    </div>
                    <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
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
                  onStatusChange={(s) => setStatus(s as IncomeStatus)}
                  statusOptions={statusOptions}
                  totalAmount={calculatedTotalAmount}
                  settledAmount={receivedAmountNum}
                  onSettledAmountChange={(val) => setReceivedAmountInput(val > 0 ? String(val) : '')}
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
                  isIncome={true}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 mt-6 border-t border-border flex flex-col-reverse sm:flex-row items-center justify-between gap-3 sticky bottom-0 bg-card py-2">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>Settlement Amount:</span>
              <span className="font-bold text-foreground text-sm">
                {formatINR(receivedAmountNum)}
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
                className="w-full sm:w-auto h-9 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Confirm & Save Income'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
