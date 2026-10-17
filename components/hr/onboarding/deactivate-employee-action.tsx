'use client'

import React, { useState, useEffect } from 'react'
import { UserX, UserCheck } from 'lucide-react'
import { Employee } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'
import { DeactivateEmployeeModal } from '@/components/hr/onboarding/deactivate-employee-modal'

interface DeactivateEmployeeActionProps {
  employee: Employee
  currentStatus?: string
  onStatusChange?: (newStatus: string) => void
}

export function DeactivateEmployeeAction({
  employee,
  currentStatus = 'Active',
  onStatusChange,
}: DeactivateEmployeeActionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)

  const isInactive =
    currentStatus === 'Inactive' ||
    currentStatus === 'Terminated' ||
    employee.employment_status === 'Inactive' ||
    employee.employment_status === 'Terminated'

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              const roleLower = (profile.role || '').toLowerCase()
              // Admin role is required for employee deactivation/reactivation
              setIsAuthorized(roleLower === 'admin' || roleLower === 'super admin')
            }
          })
      }
    })
  }, [])

  // If user is not an Admin, do not show deactivation action in Quick Actions
  if (!isAuthorized) {
    return null
  }

  return (
    <>
      {isInactive ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-xl text-sm bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer select-none"
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Reactivate Employee</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-xl text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer select-none"
        >
          <UserX className="w-3.5 h-3.5" />
          <span>Deactivate Employee</span>
        </button>
      )}

      {isOpen && (
        <DeactivateEmployeeModal
          employee={employee}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          currentStatus={currentStatus}
          onStatusChange={onStatusChange}
        />
      )}
    </>
  )
}
