'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dropdown } from '@/components/ui/Dropdown'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Building2,
  Briefcase,
  MapPin,
  PhoneCall,
  Globe,
  Mail,
  Phone,
  Save,
  RotateCcw,
  Shield,
  Hash,
} from 'lucide-react'

const BUSINESS_TYPE_OPTIONS = [
  { value: 'Private Limited Company (Pvt. Ltd.)', label: 'Private Limited Company (Pvt. Ltd.)' },
  { value: 'Limited Liability Partnership (LLP)', label: 'Limited Liability Partnership (LLP)' },
  { value: 'Partnership Firm', label: 'Partnership Firm' },
  { value: 'Sole Proprietorship', label: 'Sole Proprietorship' },
  { value: 'Public Limited Company (Ltd.)', label: 'Public Limited Company (Ltd.)' },
  { value: 'One Person Company (OPC)', label: 'One Person Company (OPC)' },
  { value: 'Not-for-Profit / Section 8', label: 'Not-for-Profit / Section 8 Company' },
]

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi (NCT)',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
].map((s) => ({ value: s, label: s }))

export function CompanySettingsView() {
  // All fields initially empty (no dummy or sample data)
  const [companyName, setCompanyName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [gstin, setGstin] = useState('')
  const [addressLine, setAddressLine] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [telephone, setTelephone] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')

  const [saving, setSaving] = useState(false)

  // Handle Save
  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      toast.success('Company settings saved successfully.')
    }, 400)
  }

  // Handle Reset / Cancel
  const handleReset = () => {
    setCompanyName('')
    setBusinessType('')
    setGstin('')
    setAddressLine('')
    setCity('')
    setState('')
    setZipCode('')
    setTelephone('')
    setMobileNumber('')
    setEmail('')
    setWebsite('')
    toast.info('All fields have been reset to empty.')
  }

  // Helper formatting for Section 1 Overview
  const fullAddress = [addressLine, city, state, zipCode].filter(Boolean).join(', ')
  const contactChannels = [
    telephone ? `Tel: ${telephone}` : '',
    mobileNumber ? `Mob: ${mobileNumber}` : '',
  ]
    .filter(Boolean)
    .join(' • ')

  const digitalChannels = [
    email ? email : '',
    website ? website : '',
  ]
    .filter(Boolean)
    .join(' • ')

  return (
    <div className="space-y-6 pb-12">
      <form onSubmit={handleSave} className="space-y-6">
        {/* ========================================================= */}
        {/* SIDE-BY-SIDE TWO-COLUMN GRID ON DESKTOP                   */}
        {/* STACKS VERTICALLY ON MOBILE/TABLETS                       */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* ========================================================= */}
          {/* LEFT COLUMN: SECTION 1: COMPANY OVERVIEW                  */}
          {/* ========================================================= */}
          <Card className="border border-border/70 shadow-xs bg-card/60 backdrop-blur-xs flex flex-col h-full">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Company Overview
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Summary card for company registration and contact profile
                  </CardDescription>
                </div>
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
                  Overview
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-3.5 flex-1">
              {/* 1. Company Name */}
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 transition-all hover:bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Company Name</span>
                </div>
                <p className="text-sm font-semibold truncate text-foreground pl-7">
                  {companyName.trim() ? (
                    companyName
                  ) : (
                    <span className="text-muted-foreground/60 italic font-normal text-xs">Not configured</span>
                  )}
                </p>
              </div>

              {/* 2. Business Type */}
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 transition-all hover:bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Business Type</span>
                </div>
                <p className="text-sm font-semibold truncate text-foreground pl-7">
                  {businessType ? (
                    businessType
                  ) : (
                    <span className="text-muted-foreground/60 italic font-normal text-xs">Not specified</span>
                  )}
                </p>
              </div>

              {/* 3. GSTIN */}
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 transition-all hover:bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                    <Hash className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">GSTIN</span>
                </div>
                <p className="text-sm font-mono font-medium truncate text-foreground uppercase pl-7">
                  {gstin.trim() ? (
                    gstin
                  ) : (
                    <span className="text-muted-foreground/60 italic font-normal font-sans text-xs">Not registered</span>
                  )}
                </p>
              </div>

              {/* 4. Registered Address */}
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 transition-all hover:bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Registered Address</span>
                </div>
                <p className="text-sm truncate text-foreground pl-7">
                  {fullAddress ? (
                    fullAddress
                  ) : (
                    <span className="text-muted-foreground/60 italic font-normal text-xs">No address provided</span>
                  )}
                </p>
              </div>

              {/* 5. Contact Channels */}
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 transition-all hover:bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Contact Channels</span>
                </div>
                <p className="text-sm truncate text-foreground pl-7">
                  {contactChannels ? (
                    contactChannels
                  ) : (
                    <span className="text-muted-foreground/60 italic font-normal text-xs">No phone numbers added</span>
                  )}
                </p>
              </div>

              {/* 6. Digital Channels */}
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 transition-all hover:bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                    <Globe className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Digital Channels</span>
                </div>
                <p className="text-sm truncate text-foreground pl-7">
                  {digitalChannels ? (
                    digitalChannels
                  ) : (
                    <span className="text-muted-foreground/60 italic font-normal text-xs">No email or website configured</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: SECTION 2: COMPANY IDENTITY FORM            */}
          {/* ========================================================= */}
          <Card className="border border-border/70 shadow-xs bg-card flex flex-col h-full">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Company Identity
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                Core information shown on all documents
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1">
              {/* Row 1: Company Name & Business Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Company Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="company-name" className="text-sm font-medium text-foreground">
                    Company Name
                  </Label>
                  <Input
                    id="company-name"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter registered company name"
                    className="bg-input border-border/70 h-10"
                  />
                </div>

                {/* Business Type */}
                <div className="space-y-1.5">
                  <Label htmlFor="business-type" className="text-sm font-medium text-foreground">
                    Business Type
                  </Label>
                  <Dropdown
                    id="business-type"
                    value={businessType}
                    onChange={setBusinessType}
                    options={BUSINESS_TYPE_OPTIONS}
                    placeholder="Select business type"
                    buttonClassName="bg-input border-border/70 h-10 w-full"
                  />
                </div>
              </div>

              {/* Row 2: GSTIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="gstin" className="text-sm font-medium text-foreground">
                    GSTIN
                  </Label>
                  <Input
                    id="gstin"
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="Enter 15-digit GSTIN"
                    maxLength={15}
                    className="bg-input border-border/70 font-mono uppercase h-10"
                  />
                </div>
              </div>

              {/* Row 3: Address Line */}
              <div className="space-y-1.5">
                <Label htmlFor="address-line" className="text-sm font-medium text-foreground">
                  Address Line
                </Label>
                <Textarea
                  id="address-line"
                  rows={2}
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="Enter street address, building, floor, or suite details"
                  className="bg-input border-border/70 resize-none min-h-[72px]"
                />
              </div>

              {/* Row 4: City, State, ZIP */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* City */}
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-sm font-medium text-foreground">
                    City
                  </Label>
                  <Input
                    id="city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Enter city"
                    className="bg-input border-border/70 h-10"
                  />
                </div>

                {/* State */}
                <div className="space-y-1.5">
                  <Label htmlFor="state" className="text-sm font-medium text-foreground">
                    State
                  </Label>
                  <Dropdown
                    id="state"
                    value={state}
                    onChange={setState}
                    options={INDIAN_STATES}
                    placeholder="Select state / UT"
                    buttonClassName="bg-input border-border/70 h-10 w-full"
                  />
                </div>

                {/* ZIP / Postal Code */}
                <div className="space-y-1.5">
                  <Label htmlFor="zip-code" className="text-sm font-medium text-foreground">
                    ZIP / Postal Code
                  </Label>
                  <Input
                    id="zip-code"
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="Enter ZIP code"
                    className="bg-input border-border/70 h-10"
                  />
                </div>
              </div>

              {/* Row 5: Telephone & Mobile Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Telephone */}
                <div className="space-y-1.5">
                  <Label htmlFor="telephone" className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    Telephone
                  </Label>
                  <Input
                    id="telephone"
                    type="tel"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="Enter telephone number"
                    className="bg-input border-border/70 h-10"
                  />
                </div>

                {/* Mobile Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="mobile-number" className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5 text-muted-foreground" />
                    Mobile Number
                  </Label>
                  <Input
                    id="mobile-number"
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="Enter mobile phone number"
                    className="bg-input border-border/70 h-10"
                  />
                </div>
              </div>

              {/* Row 6: Email & Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter official email"
                    className="bg-input border-border/70 h-10"
                  />
                </div>

                {/* Website */}
                <div className="space-y-1.5">
                  <Label htmlFor="website" className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                    Website
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="bg-input border-border/70 h-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========================================================= */}
        {/* ACTIONS BAR                                               */}
        {/* ========================================================= */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="w-full sm:w-auto h-11 px-6 border-border/80 hover:bg-muted/70 text-foreground font-medium"
          >
            <RotateCcw className="mr-2 h-4 w-4 text-muted-foreground" />
            Cancel / Reset
          </Button>

          <Button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto h-11 px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-xs"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
