'use client'

import { useState } from 'react'
import { AccountingCompanySettings, BankAccount, PaymentMethod, PAYMENT_METHODS } from '@/types/accounting'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dropdown } from '@/components/ui/Dropdown'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AccountingNavTabs } from './AccountingNavTabs'
import { updateCompanySettingsAction } from '@/lib/actions/accounting'
import { toast } from 'sonner'
import {
  Settings,
  Building2,
  Mail,
  Phone,
  Coins,
  Calendar,
  FileCheck2,
  Wallet,
  Save,
  Loader2,
  ShieldCheck,
} from 'lucide-react'

interface CompanySettingsFormProps {
  initialSettings: AccountingCompanySettings
  bankAccounts: BankAccount[]
}

export function CompanySettingsForm({
  initialSettings,
  bankAccounts,
}: CompanySettingsFormProps) {
  const [settings, setSettings] = useState<AccountingCompanySettings>(initialSettings)
  const [companyName, setCompanyName] = useState(initialSettings.company_name || '')
  const [companyAddress, setCompanyAddress] = useState(initialSettings.company_address || '')
  const [contactEmail, setContactEmail] = useState(initialSettings.contact_email || '')
  const [contactPhone, setContactPhone] = useState(initialSettings.contact_phone || '')
  const [currency, setCurrency] = useState(initialSettings.currency || 'INR')
  const [currencySymbol, setCurrencySymbol] = useState(initialSettings.currency_symbol || '₹')
  const [fyStart, setFyStart] = useState(initialSettings.financial_year_start || '04-01')
  const [fyEnd, setFyEnd] = useState(initialSettings.financial_year_end || '03-31')
  const [taxGstNumber, setTaxGstNumber] = useState(initialSettings.tax_gst_number || '')
  const [panNumber, setPanNumber] = useState(initialSettings.pan_number || '')
  const [defaultBankAccountId, setDefaultBankAccountId] = useState(initialSettings.default_bank_account_id || '')
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<PaymentMethod>(
    (initialSettings.default_payment_method as PaymentMethod) || 'Bank Transfer'
  )

  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!companyName.trim()) {
      toast.error('Company Name is required.')
      return
    }

    setSaving(true)

    try {
      const res = await updateCompanySettingsAction({
        company_name: companyName.trim(),
        company_address: companyAddress.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        currency,
        currency_symbol: currencySymbol,
        financial_year_start: fyStart,
        financial_year_end: fyEnd,
        tax_gst_number: taxGstNumber.trim() || null,
        pan_number: panNumber.trim() || null,
        default_bank_account_id: defaultBankAccountId || null,
        default_payment_method: defaultPaymentMethod,
      })

      if (res.success && res.data) {
        setSettings(res.data)
        toast.success('Company accounting settings saved successfully.')
      } else {
        toast.error(res.error || 'Failed to update settings.')
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred.')
    } finally {
      setSaving(false)
    }
  }

  const bankOptions = [
    { value: '', label: 'None Selected (Manual Selection)' },
    ...bankAccounts.map((b) => ({ value: b.id, label: `${b.account_name} (${b.bank_name})` })),
  ]

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <PageHeader
        title="Company Accounting Settings"
        subtitle="Configure corporate identification, tax registration, financial years, and accounting defaults."
        icon={Settings}
      />

      <AccountingNavTabs />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Corporate Profile */}
        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="pb-4 border-b border-border/40">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Corporate Entity & Contact
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Official company details appearing on financial invoices, reports, and tax statements.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="company-name" className="text-sm font-medium">
                  Company Legal Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Triple S Production Pvt Ltd"
                  className="bg-input border-border"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="company-email" className="text-sm font-medium">
                  Finance & Accounts Email
                </Label>
                <Input
                  id="company-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="accounts@triplesproduction.com"
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="company-phone" className="text-sm font-medium">
                  Accounts Contact Phone
                </Label>
                <Input
                  id="company-phone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 11 2345 6789"
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="company-address" className="text-sm font-medium">
                  Registered Operating Address
                </Label>
                <Textarea
                  id="company-address"
                  rows={2}
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder="Street Address, Industrial Area, City, State, PIN, Country"
                  className="bg-input border-border resize-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Financial Year & Currency */}
        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="pb-4 border-b border-border/40">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Coins className="w-4 h-4 text-primary" />
              Currency & Fiscal Period
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Define functional currency notation and fiscal calendar accounting cycle.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="currency-code" className="text-sm font-medium">
                  Operating Currency Code
                </Label>
                <Dropdown
                  id="currency-code"
                  value={currency}
                  onChange={(val) => {
                    setCurrency(val)
                    if (val === 'INR') setCurrencySymbol('₹')
                    else if (val === 'USD') setCurrencySymbol('$')
                    else if (val === 'EUR') setCurrencySymbol('€')
                    else if (val === 'GBP') setCurrencySymbol('£')
                    else if (val === 'AED') setCurrencySymbol('AED')
                  }}
                  options={[
                    { value: 'INR', label: 'INR (Indian Rupee - ₹)' },
                    { value: 'USD', label: 'USD (United States Dollar - $)' },
                    { value: 'EUR', label: 'EUR (Euro - €)' },
                    { value: 'GBP', label: 'GBP (British Pound - £)' },
                    { value: 'AED', label: 'AED (UAE Dirham)' },
                  ]}
                  buttonClassName="bg-input border-border w-full"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="currency-symbol" className="text-sm font-medium">
                  Currency Symbol
                </Label>
                <Input
                  id="currency-symbol"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  placeholder="₹"
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fy-start" className="text-sm font-medium">
                  Financial Year Cycle
                </Label>
                <Dropdown
                  id="fy-start"
                  value={`${fyStart}_${fyEnd}`}
                  onChange={(val) => {
                    const [s, e] = val.split('_')
                    setFyStart(s)
                    setFyEnd(e)
                  }}
                  options={[
                    { value: '04-01_03-31', label: 'April 1st to March 31st (Standard Indian FY)' },
                    { value: '01-01_12-31', label: 'January 1st to December 31st (Calendar Year)' },
                    { value: '07-01_06-30', label: 'July 1st to June 30th (Mid-Year Fiscal Cycle)' },
                  ]}
                  buttonClassName="bg-input border-border w-full"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Fiscal Cycle Window</Label>
                <div className="h-10 px-3 flex items-center rounded-md border border-border bg-muted/40 text-xs font-mono text-muted-foreground">
                  Starts: {fyStart} &nbsp;•&nbsp; Closes: {fyEnd}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Tax & Regulatory Identifiers */}
        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="pb-4 border-b border-border/40">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-primary" />
              Tax, GST & Statutory Registration
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Tax identification numbers printed on invoices and compliance records.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="gst-number" className="text-sm font-medium">
                  GSTIN / Tax ID
                </Label>
                <Input
                  id="gst-number"
                  value={taxGstNumber}
                  onChange={(e) => setTaxGstNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. 07AAAAA0000A1Z5"
                  className="bg-input border-border font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pan-number" className="text-sm font-medium">
                  Permanent Account Number (PAN)
                </Label>
                <Input
                  id="pan-number"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. AAAAA0000A"
                  className="bg-input border-border font-mono uppercase"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Transaction Defaults */}
        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="pb-4 border-b border-border/40">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Default Accounts & Payment Methods
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Auto-fill defaults applied when recording income and expense entries.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="default-bank" className="text-sm font-medium">
                  Default Bank / Cash Account
                </Label>
                <Dropdown
                  id="default-bank"
                  value={defaultBankAccountId}
                  onChange={setDefaultBankAccountId}
                  options={bankOptions}
                  buttonClassName="bg-input border-border w-full"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="default-method" className="text-sm font-medium">
                  Default Payment Method
                </Label>
                <Dropdown
                  id="default-method"
                  value={defaultPaymentMethod}
                  onChange={(val) => setDefaultPaymentMethod(val as PaymentMethod)}
                  options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
                  buttonClassName="bg-input border-border w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save button bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="h-11 px-6 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Company Settings
          </Button>
        </div>
      </form>
    </div>
  )
}
