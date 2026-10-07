'use client'

import React, { useEffect, useState } from 'react'
import { ShieldAlert, Loader2, UserCheck, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { assignHod, removeHod, getHodAssignmentsForEmployee } from '@/lib/actions/hod'
import { useToast } from '@/hooks/use-toast'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { createEmployeeAccount, getEmployeeAccountStatus } from '@/lib/actions/account'
import { Employee } from '@/lib/supabase/types'

export function HodAssignmentAction({ employee }: { employee: Employee }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isHod, setIsHod] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasAccount, setHasAccount] = useState(false)
  const [resolvedAuthId, setResolvedAuthId] = useState<string | null>(null)
  const { toast } = useToast()

  const checkStatus = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
          
        if (profile && (profile.role === 'Admin' || profile.role === 'HR')) {
          setIsAdmin(true)
        }
      }

      const status = await getEmployeeAccountStatus(employee.id)
      if (status.hasAccount) {
        setHasAccount(true)
        setResolvedAuthId(status.authUserId)
        setIsHod(status.isHod)
      } else {
        setHasAccount(false)
        setIsHod(false)
        setResolvedAuthId(null)
      }
    } catch (err) {
      console.error('Error checking HOD status:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkStatus()
  }, [employee.id, employee.department])
  const handleMakeHod = async () => {
    if (!employee.department || !employee.employee_id_number) {
      toast({
        title: 'Missing Details',
        description: 'Employee must have a department and employee ID number.',
        variant: 'destructive'
      })
      return
    }

    setIsProcessing(true)
    const res = await assignHod(resolvedAuthId!, employee.employee_id_number, employee.department)
    setIsProcessing(false)

    if (res.success) {
      await checkStatus()
      toast({
        title: 'Success',
        description: `${employee.first_name} is now the HOD of ${employee.department}.`
      })
    } else {
      toast({
        title: 'Error',
        description: res.error,
        variant: 'destructive'
      })
    }
  }

  const handleRemoveHod = async () => {
    if (!employee.department || !employee.employee_id_number) return

    setIsProcessing(true)
    const res = await removeHod(resolvedAuthId!, employee.employee_id_number, employee.department)
    setIsProcessing(false)

    if (res.success) {
      await checkStatus()
      toast({
        title: 'Success',
        description: `${employee.first_name} has been removed as HOD.`
      })
    } else {
      toast({
        title: 'Error',
        description: res.error,
        variant: 'destructive'
      })
    }
  }

  const handleCreateAccount = async () => {
    setIsProcessing(true)
    const res = await createEmployeeAccount(employee.id)
    setIsProcessing(false)
    if (res.success) {
      toast({
        title: 'Success',
        description: 'Account created and linked successfully! You can now Make HOD.'
      })
      await checkStatus()
    } else {
      toast({
        title: 'Error',
        description: res.error,
        variant: 'destructive'
      })
    }
  }

  if (isLoading || !isAdmin || !employee.department) return null

  if (!hasAccount) {
    return (
      <ConfirmModal
        title="Create Login Account"
        description={`This employee doesn't have a login account yet. Do you want to create an authentication account for ${employee.first_name}? They will be able to log in with their work email.`}
        onConfirm={handleCreateAccount}
        confirmText="Create Account"
      >
        <button className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-xl text-sm bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors" disabled={isProcessing}>
          {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
          Create Login Account
        </button>
      </ConfirmModal>
    )
  }

  return (
    <>
      {isHod ? (
        <ConfirmModal
          title="Remove HOD"
          description={`Are you sure you want to remove ${employee.first_name} as the Head of Department for ${employee.department}?`}
          onConfirm={handleRemoveHod}
          confirmText="Remove HOD"
        >
          <button className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-xl text-sm bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors" disabled={isProcessing}>
            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
            Remove from HOD
          </button>
        </ConfirmModal>
      ) : (
        <ConfirmModal
          title="Make HOD"
          description={`Are you sure you want to assign ${employee.first_name} as the Head of Department for ${employee.department}? This will replace any existing HOD for this department.`}
          onConfirm={handleMakeHod}
          confirmText="Assign HOD"
        >
          <button className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-xl text-sm bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors" disabled={isProcessing}>
            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
            Make HOD
          </button>
        </ConfirmModal>
      )}
    </>
  )
}
