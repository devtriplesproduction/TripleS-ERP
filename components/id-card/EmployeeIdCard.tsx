'use client'

import React, { useState } from 'react'
import Image from 'next/image'
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
  contactPhone: '+91 8956183973',
  website: 'www.triplesproduction.com',
  logoUrl: '/logo.png',
}

/**
 * Robust Emergency Contact parser
 */
export function parseEmergencyContactDetails(contactStr?: string) {
  const fallback = { name: 'HR Desk', relation: 'Office', phone: '+91 8956183973' }
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
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
    let d: Date
    if (isoMatch) {
      d = new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10))
    } else {
      d = new Date(dateStr)
    }
    if (isNaN(d.getTime())) return dateStr
    const month = d.getMonth() + 1
    const day = d.getDate()
    const year = d.getFullYear()
    return `${month}/${day}/${year}`
  } catch {
    return dateStr
  }
}

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
    exp.setFullYear(exp.getFullYear() + 4)
    const month = (exp.getMonth() + 1).toString().padStart(2, '0')
    const year = exp.getFullYear()
    return `${month}/${year}`
  } catch {
    return '12/2030'
  }
}

/**
 * Modern stylized QR Code Matrix (Matching reference design)
 */
function IdBadgeQRCode({ className }: { className?: string }) {
  return (
    <div className={cn('w-10 h-10 text-white flex items-center justify-center shrink-0', className)}>
      <svg viewBox="0 0 40 40" className="w-full h-full fill-current">
        {/* Top-left position marker */}
        <rect x="2" y="2" width="10" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="7" cy="7" r="2" />
        {/* Top-right position marker */}
        <rect x="28" y="2" width="10" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="33" cy="7" r="2" />
        {/* Bottom-left position marker */}
        <rect x="2" y="28" width="10" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="7" cy="33" r="2" />
        {/* Dot pattern */}
        <circle cx="17.5" cy="7" r="1.8" />
        <circle cx="20" cy="20" r="2.2" />
        <circle cx="33" cy="20" r="1.8" />
        <circle cx="20" cy="33" r="1.8" />
        <circle cx="33" cy="33" r="1.8" />
      </svg>
    </div>
  )
}

export function EmployeeIdCard({
  employee,
  company = DEFAULT_COMPANY,
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

  const employeeCode = employee.employeeId || employee.id || 'EMP-007'
  const department = employee.department || 'Development'
  const joinedDate = formatBadgeDate(employee.joiningDate) || '6/14/2026'
  const location = employee.workLocation || 'OFFICE'
  const bloodGroup = employee.bloodGroup || 'O+'
  const expiryDate = calculateExpiryDate(employee.joiningDate)
  const emergency = parseEmergencyContactDetails(employee.emergencyContact || employee.phone)

  // Reference alphanumeric token
  const refCode = (employee.id || employeeCode)
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 8)
    .toUpperCase() || 'B9EFCBDA'

  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'relative select-none [perspective:1200px] shrink-0',
        interactive ? 'cursor-pointer' : 'cursor-default',
        className
      )}
      style={{ width: '540px', maxWidth: '100%', height: '330px' }}
      title={interactive ? 'Click to flip card' : undefined}
    >
      <div
        className={cn(
          'relative w-full h-full duration-700 [transform-style:preserve-3d] transition-transform rounded-[22px]',
          isFlipped ? '[transform:rotateY(180deg)]' : ''
        )}
      >
        {/* ================================================================= */}
        {/* FRONT SIDE (LANDSCAPE)                                            */}
        {/* ================================================================= */}
        <div
          className="absolute inset-0 w-full h-full rounded-[22px] overflow-hidden flex flex-col justify-between shadow-2xl border border-zinc-800/90 bg-[#121316] text-white"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          {/* Top Brand Header Bar: Purple Accent */}
          <div className="h-12 bg-[#7c3aed] px-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white leading-none">
                {company.companyName || 'Triple S Production'}
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold tracking-[0.22em] uppercase text-white/95">
              AGENCY PERSONNEL
            </span>
          </div>

          {/* Main Body (Left Photo, Right Grid) */}
          <div className="flex-1 px-5 pt-4 pb-2 flex items-start gap-5">
            {/* Photo Container */}
            <div className="w-[100px] h-[112px] rounded-2xl overflow-hidden shrink-0 border border-zinc-700/60 bg-zinc-850 shadow-md">
              {employee.profilePhoto ? (
                <img
                  src={employee.profilePhoto}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-2xl tracking-wider text-zinc-300 bg-gradient-to-br from-zinc-800 to-zinc-900">
                  <span>{initials}</span>
                </div>
              )}
            </div>

            {/* Information Core */}
            <div className="flex-1 min-w-0 text-left">
              <h2 className="text-xl font-bold text-white tracking-tight leading-tight truncate">
                {fullName}
              </h2>
              <span className="inline-block text-[11px] font-extrabold text-emerald-400 tracking-wider uppercase mt-0.5">
                EMPLOYEE
              </span>

              {/* 2x2 Details Grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 mt-2.5 text-left">
                {/* ID Number */}
                <div className="min-w-0">
                  <span className="text-[8.5px] uppercase font-bold text-zinc-400 tracking-wider block">
                    ID NUMBER
                  </span>
                  <span className="text-xs font-bold text-white font-mono break-all block leading-tight mt-0.5 truncate">
                    {employeeCode}
                  </span>
                </div>

                {/* Department */}
                <div className="min-w-0">
                  <span className="text-[8.5px] uppercase font-bold text-zinc-400 tracking-wider block">
                    DEPARTMENT
                  </span>
                  <span className="text-xs font-semibold text-white block mt-0.5 truncate">
                    {department}
                  </span>
                </div>

                {/* Joined */}
                <div className="min-w-0">
                  <span className="text-[8.5px] uppercase font-bold text-zinc-400 tracking-wider block">
                    JOINED
                  </span>
                  <span className="text-xs font-semibold text-white block mt-0.5">
                    {joinedDate}
                  </span>
                </div>

                {/* Location */}
                <div className="min-w-0">
                  <span className="text-[8.5px] uppercase font-bold text-zinc-400 tracking-wider block">
                    LOCATION
                  </span>
                  <span className="text-xs font-semibold text-white uppercase block mt-0.5">
                    {location}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Lower Strip: QR Code, Valid Thru, and Authorized Signature */}
          <div className="h-16 bg-[#0c0d10] px-5 border-t border-zinc-800/80 flex items-center justify-between shrink-0">
            {/* Left QR Pattern */}
            <IdBadgeQRCode />

            {/* Right Meta (Valid Thru + White Signature Box) */}
            <div className="flex items-center gap-3">
              {/* Valid Thru Pill */}
              <div className="px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[10.5px] font-mono text-zinc-400 flex items-center gap-1.5">
                <span>VALID THRU</span>
                <span className="text-white font-bold">{expiryDate}</span>
              </div>

              {/* White Signature Card */}
              <div className="rounded-lg bg-white px-5 py-1.5 shadow-sm text-center">
                <span className="font-serif italic text-base font-bold text-zinc-900 leading-tight block">
                  Triple S Admin
                </span>
                <span className="text-[7.5px] font-black uppercase tracking-wider text-zinc-600 block mt-0.5">
                  AUTHORIZED SIGNATURE
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* BACK SIDE (LANDSCAPE)                                             */}
        {/* ================================================================= */}
        <div
          className="absolute inset-0 w-full h-full rounded-[22px] overflow-hidden flex flex-col justify-between shadow-2xl border border-zinc-800/90 bg-[#121316] text-white [transform:rotateY(180deg)]"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          {/* Top Brand Header Bar: Purple Accent */}
          <div className="h-12 bg-[#7c3aed] px-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white leading-none">
                {company.companyName || 'Triple S Production'}
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold tracking-[0.22em] uppercase text-white/95">
              AGENCY PERSONNEL
            </span>
          </div>

          {/* Back Core Body */}
          <div className="flex-1 px-5 py-3.5 flex flex-col justify-between text-left">
            {/* Section Header */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#a855f7] block">
                EMERGENCY CONTACT & MEDICAL
              </span>

              {/* 2-Column Emergency Data */}
              <div className="mt-2.5 flex items-start justify-between gap-6">
                <div>
                  <span className="text-[8.5px] uppercase font-bold text-zinc-400 tracking-wider block">
                    CONTACT NAME / PHONE
                  </span>
                  <span className="text-xs font-bold text-white block mt-0.5">
                    {emergency.phone || company.contactPhone || '+91 8956183973'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[8.5px] uppercase font-bold text-zinc-400 tracking-wider block">
                    BLOOD GROUP
                  </span>
                  <span className="text-xs font-bold text-white block mt-0.5">
                    {bloodGroup}
                  </span>
                </div>
              </div>
            </div>

            {/* White Digital Signature Strip */}
            <div className="w-full rounded-md py-2 px-3 bg-white text-center text-xs font-medium italic text-zinc-600 shadow-sm border border-zinc-200">
              Authorizing Digital Signature...
            </div>

            {/* Legal / Property Disclaimer */}
            <p className="text-[9.5px] text-zinc-400 leading-relaxed text-left">
              This ID remains property of {company.companyName || 'Triple S Production'}. If found, please return to HR or contact{' '}
              {emergency.phone || company.contactPhone || '+91 8956183973'}. Unauthorized use is prohibited.
            </p>
          </div>

          {/* Lower Strip: QR Code & Reference Code */}
          <div className="h-14 bg-[#0c0d10] px-5 border-t border-zinc-800/80 flex items-center justify-between shrink-0">
            {/* Left QR Pattern */}
            <IdBadgeQRCode />

            {/* Right Reference Token */}
            <span className="text-xs font-mono font-bold tracking-widest text-zinc-500 uppercase">
              REF: {refCode}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
