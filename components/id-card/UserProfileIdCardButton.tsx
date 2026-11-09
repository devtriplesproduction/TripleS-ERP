'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CreditCard, Sparkles } from 'lucide-react'
import { EmployeeIdCardModal } from './EmployeeIdCardModal'
import { EmployeeIdCardData } from './EmployeeIdCard'

interface UserProfileIdCardButtonProps {
  user: {
    employee_name?: string | null
    email?: string | null
    employee_id?: string | null
    department?: string | null
    designation?: string | null
    role?: string | null
    phone_number?: string | null
    avatar_url?: string | null
  }
}

export function UserProfileIdCardButton({ user }: UserProfileIdCardButtonProps) {
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
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="gap-2 border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer font-semibold"
      >
        <CreditCard className="w-4 h-4 text-primary" />
        <span>View Digital ID Badge</span>
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

