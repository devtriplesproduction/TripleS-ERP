'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import {
  Shield,
  MapPin,
  Phone,
  Mail,
  Globe,
  Heart,
  Calendar,
  Building,
  Briefcase,
  QrCode,
  Sparkles,
  Wifi,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EmployeeIdCardData {
  id?: string
  firstName?: string
  lastName?: string
  fullName?: string
  employeeId?: string
  designation?: string
  department?: string
  division?: string
  dob?: string
  joiningDate?: string
  bloodGroup?: string
  phone?: string
  email?: string
  emergencyContact?: string
  profilePhoto?: string | null
  status?: string
  workLocation?: string
  role?: string
}

export interface CompanyCardSettings {
  companyName?: string
  companyAddress?: string
  contactEmail?: string
  contactPhone?: string
  website?: string
  logoUrl?: string
}

interface EmployeeIdCardProps {
  employee: EmployeeIdCardData
  company?: CompanyCardSettings
  theme?: 'dark' | 'light'
  isFlipped?: boolean
  onFlip?: () => void
  interactive?: boolean
  className?: string
}

export const DEFAULT_COMPANY: CompanyCardSettings = {
  companyName: 'Triple S Production',
  companyAddress: 'Industrial Area Phase II, Okhla, New Delhi 110020, India',
  contactEmail: 'hr@triplesproduction.com',
  contactPhone: '+91 11 4567 8900',
  website: 'www.triplesproduction.com',
  logoUrl: '/logo.png',
}

/**
 * Robust Emergency Contact parser that handles:
 * - "John Doe - Father - +91 98765 43210"
 * - "John Doe - Father - +91-98765-43210" (hyphenated numbers preserved)
 * - "+91 98765 43210" (phone only)
 */
export function parseEmergencyContactDetails(contactStr?: string) {
  const fallback = { name: 'Company HR Desk', relation: 'Office', phone: '+91 11 4567 8900' }
  if (!contactStr || !contactStr.trim()) return fallback

  const trimmed = contactStr.trim()
  if (trimmed.includes(' - ')) {
    const parts = trimmed.split(' - ').map((p) => p.trim())
    if (parts.length >= 3) {
      return {
        name: parts[0] || fallback.name,
        relation: parts[1] || fallback.relation,
        phone: parts.slice(2).join(' - ') || fallback.phone,
      }
    } else if (parts.length === 2) {
      const isFirstMobile = /^[+\d\s()-]+$/.test(parts[0])
      if (isFirstMobile) {
        return { name: fallback.name, relation: parts[1] || fallback.relation, phone: parts[0] }
      }
      return { name: parts[0], relation: fallback.relation, phone: parts[1] }
    }
  }

  // Fallback split on single hyphens with space check
  const parts = trimmed.split('-').map((p) => p.trim())
  if (parts.length >= 3) {
    return {
      name: parts[0] || fallback.name,
      relation: parts[1] || fallback.relation,
      phone: parts.slice(2).join('-') || fallback.phone,
    }
  }

  return { name: fallback.name, relation: fallback.relation, phone: trimmed }
}

export function formatBadgeDate(dateStr?: string) {
  if (!dateStr || dateStr === '-' || dateStr === 'N/A') return 'N/A'
  try {
    // Prevent midnight-UTC timezone rollback by parsing YYYY-MM-DD components
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
    let d: Date
    if (isoMatch) {
      d = new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10))
    } else {
      d = new Date(dateStr)
    }
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

/**
 * Calculate card expiration date (defaults to 3 years from joining date or current year + 2)
 */
export function calculateExpiryDate(joiningDateStr?: string) {
  try {
    let base = new Date()
    if (joiningDateStr) {
      const isoMatch = joiningDateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (isoMatch) {
        base = new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10))
      } else {
        base = new Date(joiningDateStr)
      }
    }
    const validBase = isNaN(base.getTime()) ? new Date() : base
    const exp = new Date(validBase)
    exp.setFullYear(exp.getFullYear() + 3)
    const month = (exp.getMonth() + 1).toString().padStart(2, '0')
    const year = exp.getFullYear()
    return `${month}/${year}`
  } catch {
    return '11/2029'
  }
}

export function EmployeeIdCard({
  employee,
  company = DEFAULT_COMPANY,
  theme = 'dark',
  isFlipped: controlledFlipped,
  onFlip,
  interactive = true,
  className,
}: EmployeeIdCardProps) {
  const [internalFlipped, setInternalFlipped] = useState(false)
  const isFlipped = controlledFlipped !== undefined ? controlledFlipped : internalFlipped

  const handleCardClick = () => {
    if (!interactive) return
    if (onFlip) {
      onFlip()
    } else {
      setInternalFlipped(!internalFlipped)
    }
  }

  const fullName =
    employee.fullName ||
    [employee.firstName, employee.lastName].filter(Boolean).join(' ') ||
    'Staff Member'

  const employeeCode = employee.employeeId || 'EMP-001'
  const designation = (employee.designation || employee.role || 'Team Member')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
  const department = employee.department || 'Operations'
  const bloodGroup = employee.bloodGroup || 'O+'
  const joiningDateFormatted = formatBadgeDate(employee.joiningDate)
  const expiryFormatted = calculateExpiryDate(employee.joiningDate)
  const emergency = parseEmergencyContactDetails(employee.emergencyContact)
  const isWorking = employee.status?.toLowerCase() === 'working' || employee.status?.toLowerCase() === 'active'

  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  const isDark = theme === 'dark'

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'relative select-none [perspective:1200px] shrink-0',
        interactive ? 'cursor-pointer' : 'cursor-default',
        className
      )}
      style={{ width: '280px', height: '440px' }}
      title={interactive ? 'Click to flip card' : undefined}
    >
      <div
        className={cn(
          'relative w-full h-full duration-700 [transform-style:preserve-3d] transition-transform rounded-[20px]',
          isFlipped ? '[transform:rotateY(180deg)]' : ''
        )}
      >
        {/* ================================================================= */}
        {/* FRONT SIDE                                                        */}
        {/* ================================================================= */}
        <div
          className={cn(
            'absolute inset-0 w-full h-full rounded-[20px] overflow-hidden flex flex-col justify-between shadow-2xl border',
            isDark
              ? 'bg-gradient-to-b from-zinc-900 via-zinc-950 to-black text-zinc-100 border-zinc-800/90 shadow-[0_20px_50px_rgba(0,0,0,0.85)]'
              : 'bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-800 border-slate-300/80 shadow-[0_20px_45px_rgba(15,23,42,0.15)]'
          )}
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          {/* Subtle Background Pattern & Glows */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className={cn(
                'absolute -top-20 -right-20 w-52 h-52 rounded-full blur-3xl opacity-20',
                isDark ? 'bg-emerald-500' : 'bg-blue-400'
              )}
            />
            <div
              className={cn(
                'absolute -bottom-24 -left-24 w-52 h-52 rounded-full blur-3xl opacity-15',
                isDark ? 'bg-indigo-500' : 'bg-indigo-400'
              )}
            />
            {/* Holographic Security Micro-Grid Lines */}
            <div
              className="absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
                backgroundSize: '16px 16px',
              }}
            />
          </div>

          {/* FRONT HEADER: Prominent Brand & Badge Title */}
          <div
            className={cn(
              'relative z-10 px-3.5 pt-2.5 pb-2 flex items-center justify-between border-b',
              isDark
                ? 'border-zinc-800/80 bg-zinc-950/60'
                : 'border-slate-200 bg-slate-100/70'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center p-1 shrink-0 border shadow-xs',
                  isDark
                    ? 'bg-zinc-900 border-zinc-700/90'
                    : 'bg-white border-slate-200'
                )}
              >
                <Image
                  src={company.logoUrl || '/logo.png'}
                  alt="Triple S Production"
                  width={20}
                  height={20}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="leading-tight truncate text-left">
                <span
                  className={cn(
                    'block text-xs font-black tracking-wider uppercase truncate',
                    isDark ? 'text-zinc-100' : 'text-slate-900'
                  )}
                >
                  {company.companyName || 'Triple S Production'}
                </span>
                <span
                  className={cn(
                    'block text-[8px] tracking-[0.18em] font-bold uppercase',
                    isDark ? 'text-emerald-400' : 'text-emerald-600'
                  )}
                >
                  Staff Identity Card
                </span>
              </div>
            </div>

            {/* Contactless / NFC Wave Icon */}
            <div className="flex items-center pl-1.5 shrink-0">
              <Wifi
                className={cn(
                  'w-3.5 h-3.5 rotate-90 stroke-[2.2]',
                  isDark ? 'text-zinc-400' : 'text-slate-500'
                )}
              />
            </div>
          </div>

          {/* FRONT BODY: Photo, Smart Chip, and Identity Core */}
          <div className="relative z-10 px-3.5 flex flex-col items-center pt-1 pb-1 text-center">
            {/* Smart EMV Chip Graphic + Hologram Pill */}
            <div className="w-full flex items-center justify-between px-0.5 mb-1">
              <div
                className={cn(
                  'w-7 h-5 rounded border flex items-center justify-center relative overflow-hidden shadow-xs',
                  isDark
                    ? 'bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 border-amber-300/60'
                    : 'bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 border-amber-400'
                )}
                title="Secure Smart NFC"
              >
                <div className="absolute inset-0 border border-black/20 grid grid-cols-2 grid-rows-2">
                  <div className="border-r border-b border-black/25" />
                  <div className="border-b border-black/25" />
                  <div className="border-r border-black/25" />
                  <div />
                </div>
              </div>

              {/* Holographic Pill */}
              <div
                className={cn(
                  'text-[7.5px] font-extrabold tracking-widest uppercase px-2 py-0.5 rounded-full border flex items-center gap-1',
                  isDark
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                )}
              >
                <Sparkles className="w-2.5 h-2.5" />
                <span>Verified</span>
              </div>
            </div>

            {/* Photo Container */}
            <div className="relative mt-0.5 mb-1.5">
              <div
                className={cn(
                  'w-[84px] h-[94px] rounded-2xl overflow-hidden p-1 shadow-md border-2',
                  isDark
                    ? 'bg-zinc-900 border-zinc-700/80 shadow-[0_4px_16px_rgba(0,0,0,0.6)]'
                    : 'bg-white border-slate-200 shadow-[0_4px_12px_rgba(0,0,0,0.08)]'
                )}
              >
                {employee.profilePhoto ? (
                  <img
                    src={employee.profilePhoto}
                    alt={fullName}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div
                    className={cn(
                      'w-full h-full rounded-xl flex flex-col items-center justify-center font-bold text-lg tracking-wider',
                      isDark
                        ? 'bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-300'
                        : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700'
                    )}
                  >
                    <span>{initials}</span>
                  </div>
                )}
              </div>

              {/* Status Indicator Pip */}
              <div
                className={cn(
                  'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 flex items-center justify-center text-white text-[7.5px] shadow-sm',
                  isDark ? 'border-zinc-950' : 'border-white',
                  isWorking ? 'bg-emerald-500' : 'bg-neutral-500'
                )}
                title={isWorking ? 'Active' : 'Offline'}
              >
                <CheckCircle2 className="w-2.5 h-2.5" />
              </div>
            </div>

            {/* Employee Name & Code */}
            <h2 className="text-[14px] font-black tracking-tight leading-snug line-clamp-1">
              {fullName}
            </h2>
            <div className="mt-0.5 mb-1 flex items-center gap-1.5">
              <span
                className={cn(
                  'text-[9px] font-mono font-bold px-1.5 py-0.5 rounded tracking-wider border',
                  isDark
                    ? 'bg-zinc-900 text-zinc-300 border-zinc-700/80'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                )}
              >
                {employeeCode}
              </span>
              <span className="text-[9px] text-muted-foreground font-semibold">•</span>
              <span className="text-[9.5px] font-semibold text-primary">{department}</span>
            </div>

            <p className="text-[10px] font-medium text-muted-foreground line-clamp-1 max-w-[240px]">
              {designation}
            </p>

            {/* 3-Column Quick Metrics Block */}
            <div
              className={cn(
                'w-full grid grid-cols-3 gap-1 rounded-xl p-1.5 mt-2 border text-left',
                isDark ? 'bg-zinc-900/70 border-zinc-800/80' : 'bg-slate-50 border-slate-200'
              )}
            >
              <div>
                <span className="text-[7px] uppercase tracking-wider font-bold text-muted-foreground block">
                  Joined
                </span>
                <span className="text-[8.5px] font-semibold truncate block">
                  {joiningDateFormatted}
                </span>
              </div>
              <div className="border-x px-1 border-border/40">
                <span className="text-[7px] uppercase tracking-wider font-bold text-muted-foreground block">
                  Blood Grp
                </span>
                <span className="text-[8.5px] font-bold text-rose-500 flex items-center gap-0.5">
                  <Heart className="w-2.5 h-2.5 fill-rose-500" />
                  {bloodGroup}
                </span>
              </div>
              <div className="pl-0.5">
                <span className="text-[7px] uppercase tracking-wider font-bold text-muted-foreground block">
                  Valid Thru
                </span>
                <span className="text-[8.5px] font-semibold truncate block">
                  {expiryFormatted}
                </span>
              </div>
            </div>
          </div>

          {/* FRONT FOOTER: Holographic Strip & Authorized Signatory */}
          <div className="relative z-10 px-3.5 pb-2.5 pt-1">
            <div className="flex items-end justify-between border-t border-border/40 pt-1.5">
              <div className="flex flex-col text-left">
                <span className="text-[6.5px] font-mono tracking-widest text-muted-foreground uppercase">
                  CARD ID: TSP-{employeeCode.replace(/\D/g, '').padStart(4, '0')}
                </span>
                <span className="text-[6px] text-muted-foreground/80">
                  SYSTEM GENERATED • SECURE IDENTIFIER
                </span>
              </div>

              {/* Stylized Executive Signatory */}
              <div className="flex flex-col items-center">
                <div className="h-4 w-16 flex items-center justify-center">
                  <svg viewBox="0 0 100 30" className="w-full h-full stroke-current opacity-75">
                    <path
                      d="M 5 22 Q 25 5 45 18 T 85 10 T 95 24"
                      fill="none"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="w-16 border-t border-muted-foreground/40 mt-0.5" />
                <span className="text-[6px] font-bold tracking-wider text-muted-foreground uppercase mt-0.5">
                  Authorized Signatory
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* BACK SIDE                                                         */}
        {/* ================================================================= */}
        <div
          className={cn(
            'absolute inset-0 w-full h-full rounded-[20px] overflow-hidden flex flex-col justify-between shadow-2xl border [transform:rotateY(180deg)]',
            isDark
              ? 'bg-gradient-to-b from-zinc-900 via-zinc-950 to-black text-zinc-100 border-zinc-800/90 shadow-[0_20px_50px_rgba(0,0,0,0.85)]'
              : 'bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-800 border-slate-300/80 shadow-[0_20px_45px_rgba(15,23,42,0.15)]'
          )}
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          {/* Top Magnetic Security Stripe */}
          <div>
            <div
              className={cn(
                'w-full h-7 flex items-center px-3.5 justify-between border-b',
                isDark
                  ? 'bg-gradient-to-r from-zinc-800 via-zinc-900 to-zinc-800 border-zinc-700/80'
                  : 'bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 border-slate-700 text-white'
              )}
            >
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="text-[7.5px] font-mono tracking-[0.16em] text-zinc-300 uppercase font-semibold truncate">
                  {company.companyName || 'Triple S Production'}
                </span>
                <span className="text-[7px] text-zinc-500">•</span>
                <span className="text-[7px] font-mono tracking-[0.2em] text-zinc-400 uppercase shrink-0">
                  SECURITY SMART ENCODING
                </span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0 ml-1" />
            </div>

            {/* Corporate HQ Directory */}
            <div className="px-3.5 pt-2 pb-1 space-y-1 text-[8.5px]">
              <div className="flex items-start gap-1.5">
                <MapPin className="w-2.5 h-2.5 text-primary shrink-0 mt-0.5" />
                <p className="text-muted-foreground leading-snug line-clamp-2">
                  {company.companyAddress || DEFAULT_COMPANY.companyAddress}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <Phone className="w-2.5 h-2.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">
                  {company.contactPhone || DEFAULT_COMPANY.contactPhone}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Mail className="w-2.5 h-2.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">
                  {company.contactEmail || DEFAULT_COMPANY.contactEmail}
                </span>
              </div>
            </div>
          </div>

          {/* BACK MIDDLE: Emergency & QR Code Verification */}
          <div className="px-3.5 py-1 space-y-1.5">
            {/* Emergency Contact Block */}
            <div
              className={cn(
                'rounded-lg p-1.5 border',
                isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-slate-50 border-slate-200'
              )}
            >
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1 text-rose-500 font-bold text-[8px] uppercase tracking-wider">
                  <AlertCircle className="w-2.5 h-2.5" />
                  <span>In Case of Emergency</span>
                </div>
                <span className="text-[7px] text-muted-foreground font-mono">EMERGENCY SOS</span>
              </div>
              <div className="text-[8.5px] space-y-0.5">
                <p className="font-bold text-foreground">
                  {emergency.name}{' '}
                  <span className="text-muted-foreground font-normal">({emergency.relation})</span>
                </p>
                <p className="font-mono text-primary font-semibold">{emergency.phone}</p>
              </div>
            </div>

            {/* Live Verification QR Block */}
            <div
              className={cn(
                'rounded-lg p-1.5 border flex items-center gap-2',
                isDark ? 'bg-zinc-900/50 border-zinc-800/80' : 'bg-white border-slate-200'
              )}
            >
              {/* SVG QR Code Pattern */}
              <div className="p-1 rounded bg-white shrink-0 border border-slate-200 shadow-xs">
                <svg viewBox="0 0 45 45" className="w-9 h-9 fill-zinc-950">
                  <rect x="2" y="2" width="12" height="12" fill="none" stroke="#000" strokeWidth="2.5" />
                  <rect x="5.5" y="5.5" width="5" height="5" />
                  <rect x="31" y="2" width="12" height="12" fill="none" stroke="#000" strokeWidth="2.5" />
                  <rect x="34.5" y="5.5" width="5" height="5" />
                  <rect x="2" y="31" width="12" height="12" fill="none" stroke="#000" strokeWidth="2.5" />
                  <rect x="5.5" y="31.5" width="5" height="5" />
                  <rect x="18" y="4" width="3" height="3" />
                  <rect x="24" y="4" width="3" height="3" />
                  <rect x="18" y="10" width="3" height="3" />
                  <rect x="4" y="18" width="3" height="3" />
                  <rect x="10" y="18" width="3" height="3" />
                  <rect x="18" y="18" width="3" height="3" />
                  <rect x="24" y="18" width="3" height="3" />
                  <rect x="32" y="18" width="3" height="3" />
                  <rect x="38" y="18" width="3" height="3" />
                  <rect x="4" y="24" width="3" height="3" />
                  <rect x="18" y="24" width="3" height="3" />
                  <rect x="24" y="24" width="3" height="3" />
                  <rect x="38" y="24" width="3" height="3" />
                  <rect x="18" y="32" width="3" height="3" />
                  <rect x="24" y="32" width="3" height="3" />
                  <rect x="32" y="32" width="3" height="3" />
                  <rect x="38" y="38" width="3" height="3" />
                </svg>
              </div>

              <div className="flex-1 text-left">
                <span className="text-[8px] font-bold text-foreground block">
                  Scan to Verify Badge
                </span>
                <span className="text-[7px] text-muted-foreground leading-tight block mt-0.5">
                  Point camera to confirm real-time identity & employment clearance on TripleS OS.
                </span>
              </div>
            </div>
          </div>

          {/* BACK FOOTER: Terms & Barcode */}
          <div className="px-3.5 pb-2 pt-0.5 space-y-1">
            <ol className="list-decimal pl-3 text-[6.5px] text-muted-foreground leading-tight space-y-0.5 text-left">
              <li>This card remains the property of {company.companyName || 'Triple S Production'}.</li>
              <li>Display visibly during office hours and client field visits.</li>
              <li>If found, please return to the corporate address above.</li>
            </ol>

            {/* Alphanumeric Barcode Strip */}
            <div className="pt-0.5 flex flex-col items-center">
              <div className="h-4.5 w-full flex items-center justify-center gap-[2px] opacity-80">
                <div className="w-[3px] h-full bg-current" />
                <div className="w-[1px] h-full bg-current" />
                <div className="w-[4px] h-full bg-current" />
                <div className="w-[2px] h-full bg-current" />
                <div className="w-[1px] h-full bg-current" />
                <div className="w-[3px] h-full bg-current" />
                <div className="w-[2px] h-full bg-current" />
                <div className="w-[5px] h-full bg-current" />
                <div className="w-[1px] h-full bg-current" />
                <div className="w-[3px] h-full bg-current" />
                <div className="w-[2px] h-full bg-current" />
                <div className="w-[4px] h-full bg-current" />
                <div className="w-[1px] h-full bg-current" />
                <div className="w-[3px] h-full bg-current" />
                <div className="w-[2px] h-full bg-current" />
                <div className="w-[4px] h-full bg-current" />
                <div className="w-[1px] h-full bg-current" />
                <div className="w-[3px] h-full bg-current" />
                <div className="w-[5px] h-full bg-current" />
                <div className="w-[2px] h-full bg-current" />
                <div className="w-[1px] h-full bg-current" />
                <div className="w-[3px] h-full bg-current" />
              </div>
              <span className="text-[6px] font-mono tracking-[0.25em] text-muted-foreground uppercase mt-0.5">
                *{employeeCode}-{expiryFormatted.replace('/', '')}*
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
