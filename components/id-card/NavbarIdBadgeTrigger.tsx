'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CreditCard } from 'lucide-react'
import { EmployeeIdCardModal } from './EmployeeIdCardModal'
import { EmployeeIdCardData } from './EmployeeIdCard'
import { type AuthUser } from '@/lib/auth'

interface NavbarIdBadgeTriggerProps {
  user: AuthUser
}

export function NavbarIdBadgeTrigger({ user }: NavbarIdBadgeTriggerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const cardData: EmployeeIdCardData = {
    fullName: user.employee_name || 'Staff Member',
    email: user.email || '',
    employeeId: user.employee_id || 'EMP-001',
    department: user.department || 'Operations',
    designation: user.designation || user.role || 'Staff Member',
    profilePhoto: user.avatar_url,
    status: 'Active',
    bloodGroup: 'O+',
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-9 px-2 sm:px-2.5 bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground gap-1.5 text-xs font-semibold shrink-0 cursor-pointer"
        title="View Official TripleS ID Badge"
        aria-label="View Official TripleS ID Badge"
      >
        <CreditCard className="h-4 w-4 text-primary" />
        <span className="hidden md:inline">ID Badge</span>
      </Button>

      {isOpen && (
        <EmployeeIdCardModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          employee={cardData}
        />
      )}
    </>
  )
}

