'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dropdown } from '@/components/ui/Dropdown'
import {
  CreditCard,
  Building2,
  Calendar,
  Hash,
  User,
  ShieldAlert,
  Wallet,
  Receipt,
  QrCode,
  DollarSign,
  AlertCircle,
} from 'lucide-react'
import {
  PaymentMethod,
  PAYMENT_METHODS,
  ChequeStatus,
  CHEQUE_STATUSES,
} from '@/types/accounting'

export interface DynamicPaymentFieldsProps {
  method: PaymentMethod
  onMethodChange: (method: PaymentMethod) => void
  status: string
  onStatusChange: (status: any) => void
  statusOptions: { value: string; label: string }[]
  totalAmount: number
  settledAmount: number // received_amount (income) or paid_amount (expense)
  onSettledAmountChange: (amount: number) => void
  pendingAmount: number
  paymentDate: string
  onPaymentDateChange: (date: string) => void
  // Dynamic fields
  upiId: string
  onUpiIdChange: (val: string) => void
  cardHolderName: string
  onCardHolderNameChange: (val: string) => void
  cardLast4: string
  onCardLast4Change: (val: string) => void
  bankName: string
  onBankNameChange: (val: string) => void
  accountName: string
  onAccountNameChange: (val: string) => void
  chequeNumber: string
  onChequeNumberChange: (val: string) => void
  chequeDate: string
  onChequeDateChange: (val: string) => void
  chequeStatus: ChequeStatus
  onChequeStatusChange: (status: ChequeStatus) => void
  paymentReference: string
  onPaymentReferenceChange: (ref: string) => void
  isIncome?: boolean
}

export function DynamicPaymentFields({
  method,
  onMethodChange,
  status,
  onStatusChange,
  statusOptions,
  totalAmount,
  settledAmount,
  onSettledAmountChange,
  pendingAmount,
  paymentDate,
  onPaymentDateChange,
  upiId,
  onUpiIdChange,
  cardHolderName,
  onCardHolderNameChange,
  cardLast4,
  onCardLast4Change,
  bankName,
  onBankNameChange,
  accountName,
  onAccountNameChange,
  chequeNumber,
  onChequeNumberChange,
  chequeDate,
  onChequeDateChange,
  chequeStatus,
  onChequeStatusChange,
  paymentReference,
  onPaymentReferenceChange,
  isIncome = true,
}: DynamicPaymentFieldsProps) {
  const isPartial = status === 'Partially Received' || status === 'Partially Paid'
  const settledLabel = isIncome ? 'Received Amount' : 'Paid Amount'
  const pendingLabel = 'Pending Amount'

  const methodOptions = PAYMENT_METHODS.map((m) => ({
    value: m,
    label: m,
  }))

  const chequeStatusOptions = CHEQUE_STATUSES.map((s) => ({
    value: s,
    label: s,
  }))

  const handleMethodSelect = (newMethod: string) => {
    const m = newMethod as PaymentMethod
    onMethodChange(m)
  }

  return (
    <div className="space-y-4">
      {/* 1. Payment Method & Status Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-primary" />
            Payment Method <span className="text-rose-500">*</span>
          </Label>
          <Dropdown
            value={method}
            onChange={handleMethodSelect}
            options={methodOptions}
            buttonClassName="bg-background border-border text-sm h-9 w-full justify-between"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-primary" />
            Payment Status <span className="text-rose-500">*</span>
          </Label>
          <Dropdown
            value={status}
            onChange={onStatusChange}
            options={statusOptions}
            buttonClassName="bg-background border-border text-sm h-9 w-full justify-between"
          />
        </div>
      </div>

      {/* 2. Partial Payment Breakdown (shown when Partially Received or Partially Paid) */}
      {isPartial && (
        <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-amber-700 dark:text-amber-400">
              Partial Settlement Breakdown
            </span>
            <span className="text-[11px] text-muted-foreground">
              Total: ₹{totalAmount.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-foreground">
                {settledLabel} (₹) <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                max={totalAmount}
                step="any"
                value={settledAmount === 0 ? '' : settledAmount}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0
                  onSettledAmountChange(val)
                }}
                className="bg-background border-border text-xs h-8"
                placeholder="Enter amount"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-foreground">
                {pendingLabel} (₹)
              </Label>
              <Input
                type="text"
                readOnly
                value={`₹${pendingAmount.toLocaleString('en-IN')}`}
                className="bg-muted/50 border-border text-xs h-8 font-semibold text-rose-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. DYNAMIC METHOD-SPECIFIC FIELDS */}

      {/* --- UPI --- */}
      {method === 'UPI' && (
        <div className="p-3 rounded-lg border border-border bg-card/40 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <QrCode className="w-3.5 h-3.5 text-primary" />
            <span>UPI Payment Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="upi-id" className="text-xs font-medium">
                UPI ID <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="upi-id"
                placeholder="e.g. company@upi or business@okhdfcbank"
                value={upiId}
                onChange={(e) => onUpiIdChange(e.target.value)}
                className="bg-background border-border text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="upi-ref" className="text-xs font-medium">
                Transaction / UTR Number
              </Label>
              <Input
                id="upi-ref"
                placeholder="e.g. 429188271012"
                value={paymentReference}
                onChange={(e) => onPaymentReferenceChange(e.target.value)}
                className="bg-background border-border text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="upi-date" className="text-xs font-medium">
                Payment Date
              </Label>
              <Input
                id="upi-date"
                type="date"
                value={paymentDate}
                onChange={(e) => onPaymentDateChange(e.target.value)}
                className="bg-background border-border text-xs h-9"
              />
            </div>
          </div>
        </div>
      )}

      {/* --- CREDIT CARD --- */}
      {method === 'Credit Card' && (
        <div className="p-3 rounded-lg border border-border bg-card/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <CreditCard className="w-3.5 h-3.5 text-primary" />
              <span>Credit Card Details</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-3 h-3" />
              <span>PCI-DSS: Never enter CVV or full card number</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cc-holder" className="text-xs font-medium">
                Card Holder Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="cc-holder"
                placeholder="e.g. Rahul Sharma"
                value={cardHolderName}
                onChange={(e) => onCardHolderNameChange(e.target.value)}
                className="bg-background border-border text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cc-last4" className="text-xs font-medium">
                Last 4 Digits of Card <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="cc-last4"
                maxLength={4}
                placeholder="e.g. 4021"
                value={cardLast4}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                  onCardLast4Change(val)
                }}
                className="bg-background border-border text-xs h-9 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cc-ref" className="text-xs font-medium">
                Transaction / Reference Number
              </Label>
              <Input
                id="cc-ref"
                placeholder="e.g. AUTH-992014"
                value={paymentReference}
                onChange={(e) => onPaymentReferenceChange(e.target.value)}
                className="bg-background border-border text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cc-date" className="text-xs font-medium">
                Payment Date
              </Label>
              <Input
                id="cc-date"
                type="date"
                value={paymentDate}
                onChange={(e) => onPaymentDateChange(e.target.value)}
                className="bg-background border-border text-xs h-9"
              />
            </div>
          </div>
        </div>
      )}

      {/* --- DEBIT CARD --- */}
      {method === 'Debit Card' && (
        <div className="p-3 rounded-lg border border-border bg-card/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <CreditCard className="w-3.5 h-3.5 text-primary" />
              <span>Debit Card Details</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-3 h-3" />
              <span>PCI-DSS: Never enter CVV or full card number</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dc-holder" className="text-xs font-medium">
                Card Holder Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="dc-holder"
                placeholder="e.g. Priya Patel"
                value={cardHolderName}
                onChange={(e) => onCardHolderNameChange(e.target.value)}
                className="bg-background border-border text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dc-last4" className="text-xs font-medium">
                Last 4 Digits of Card <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="dc-last4"
                maxLength={4}
                placeholder="e.g. 8192"
                value={cardLast4}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                  onCardLast4Change(val)
                }}
                className="bg-background border-border text-xs h-9 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dc-ref" className="text-xs font-medium">
                Transaction / Reference Number
              </Label>
              <Input
                id="dc-ref"
                placeholder="e.g. POS-554102"
                value={paymentReference}
                onChange={(e) => onPaymentReferenceChange(e.target.value)}
                className="bg-background border-border text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dc-date" className="text-xs font-medium">
                Payment Date
              </Label>
              <Input
                id="dc-date"
                type="date"
                value={paymentDate}
                onChange={(e) => onPaymentDateChange(e.target.value)}
                className="bg-background border-border text-xs h-9"
              />
            </div>
          </div>
        </div>
      )}

      {/* --- BANK TRANSFER --- */}
      {method === 'Bank Transfer' && (
        <div className="p-3 rounded-lg border border-border bg-card/40 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Building2 className="w-3.5 h-3.5 text-primary" />
            <span>Bank Transfer (NEFT / RTGS / IMPS) Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bt-bank" className="text-xs font-medium">
                Bank Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="bt-bank"
                placeholder="e.g. HDFC Bank, ICICI Bank, SBI..."
                value={bankName}
                onChange={(e) => onBankNameChange(e.target.value)}
                className="bg-background border-border text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bt-account" className="text-xs font-medium">
                Account Name
              </Label>
              <Input
                id="bt-account"
                placeholder="e.g. Agency Corporate Current A/c"
                value={accountName}
                onChange={(e) => onAccountNameChange(e.target.value)}
                className="bg-background border-border text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bt-utr" className="text-xs font-medium">
                Transaction / UTR Number <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="bt-utr"
                placeholder="e.g. UTR-HDFC9821734"
                value={paymentReference}
                onChange={(e) => onPaymentReferenceChange(e.target.value)}
                className="bg-background border-border text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bt-date" className="text-xs font-medium">
                Payment Date
              </Label>
              <Input
                id="bt-date"
                type="date"
                value={paymentDate}
                onChange={(e) => onPaymentDateChange(e.target.value)}
                className="bg-background border-border text-xs h-9"
              />
            </div>
          </div>
        </div>
      )}

      {/* --- CHEQUE --- */}
      {method === 'Cheque' && (
        <div className="p-3 rounded-lg border border-border bg-card/40 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Receipt className="w-3.5 h-3.5 text-primary" />
            <span>Cheque Payment Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="chq-number" className="text-xs font-medium">
                Cheque Number <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="chq-number"
                placeholder="e.g. 004819"
                value={chequeNumber}
                onChange={(e) => onChequeNumberChange(e.target.value)}
                className="bg-background border-border text-xs h-9 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="chq-bank" className="text-xs font-medium">
                Bank Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="chq-bank"
                placeholder="e.g. State Bank of India"
                value={bankName}
                onChange={(e) => onBankNameChange(e.target.value)}
                className="bg-background border-border text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="chq-date" className="text-xs font-medium">
                Cheque Date
              </Label>
              <Input
                id="chq-date"
                type="date"
                value={chequeDate}
                onChange={(e) => onChequeDateChange(e.target.value)}
                className="bg-background border-border text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Cheque Status <span className="text-rose-500">*</span>
              </Label>
              <Dropdown
                value={chequeStatus}
                onChange={(val) => onChequeStatusChange(val as ChequeStatus)}
                options={chequeStatusOptions}
                buttonClassName="bg-background border-border text-xs h-9 w-full justify-between"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="chq-ref" className="text-xs font-medium">
                Payment Reference (Deposit Slip / Clearing Ref)
              </Label>
              <Input
                id="chq-ref"
                placeholder="e.g. DEP-SLIP-8192"
                value={paymentReference}
                onChange={(e) => onPaymentReferenceChange(e.target.value)}
                className="bg-background border-border text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="chq-pay-date" className="text-xs font-medium">
                Payment / Clearance Date
              </Label>
              <Input
                id="chq-pay-date"
                type="date"
                value={paymentDate}
                onChange={(e) => onPaymentDateChange(e.target.value)}
                className="bg-background border-border text-xs h-9"
              />
            </div>
          </div>
        </div>
      )}

      {/* --- CASH --- */}
      {method === 'Cash' && (
        <div className="p-3 rounded-lg border border-border bg-card/40 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            <span>Cash Payment Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cash-date" className="text-xs font-medium">
                Payment Date
              </Label>
              <Input
                id="cash-date"
                type="date"
                value={paymentDate}
                onChange={(e) => onPaymentDateChange(e.target.value)}
                className="bg-background border-border text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cash-ref" className="text-xs font-medium">
                Payment Reference (Optional)
              </Label>
              <Input
                id="cash-ref"
                placeholder="e.g. Receipt Voucher # / Petty Cash Slip"
                value={paymentReference}
                onChange={(e) => onPaymentReferenceChange(e.target.value)}
                className="bg-background border-border text-xs h-9"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
