'use client'

import React, { useState, useEffect } from 'react'
import { KeyRound } from 'lucide-react'
import { Employee } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'
import { ChangePasswordModal } from '@/components/hr/onboarding/change-password-modal'

export function ChangePasswordAction({ employee }: { employee: Employee }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(true)

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
              const role = profile.role
              setIsAuthorized(role === 'Admin' || role === 'HR')
            }
          })
      }
    })
  }, [])

  if (!isAuthorized) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer"
      >
        <KeyRound className="w-3.5 h-3.5" /> Change Password
      </button>

      {isOpen && (
        <ChangePasswordModal
          employee={employee}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
