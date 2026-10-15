'use client'

import React, { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { getEmployeeAccountStatus } from '@/lib/actions/account'
import { Employee } from '@/lib/supabase/types'

export function HodStatusBadge({ employee, isHod: propIsHod }: { employee: Employee; isHod?: boolean }) {
  const [isHod, setIsHod] = useState<boolean>(Boolean(propIsHod ?? employee.is_hod ?? false))

  useEffect(() => {
    if (propIsHod !== undefined) {
      setIsHod(propIsHod)
    }
  }, [propIsHod])

  useEffect(() => {
    let isMounted = true
    async function checkStatus() {
      try {
        const status = await getEmployeeAccountStatus(employee.id)
        if (isMounted) {
          setIsHod(status.isHod)
        }
      } catch (err) {
        console.error('Error checking HOD status:', err)
      }
    }
    
    checkStatus()
    return () => {
      isMounted = false
    }
  }, [employee.id, employee.department])

  useEffect(() => {
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent
      if (
        customEvent.detail &&
        (customEvent.detail.employeeId === employee.id || 
         customEvent.detail.employeeIdNumber === employee.employee_id_number)
      ) {
        setIsHod(Boolean(customEvent.detail.isHod))
      }
    }
    window.addEventListener('hod-status-changed', handleCustomEvent)
    return () => window.removeEventListener('hod-status-changed', handleCustomEvent)
  }, [employee.id, employee.employee_id_number])

  if (!isHod) {
    return null
  }

  return (
    <Badge className="bg-indigo-500/15 text-indigo-400 border-indigo-500/25 hover:bg-indigo-500/20 text-[10px] px-2 py-0 h-5 font-semibold">
      HOD Active <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 ml-1" />
    </Badge>
  )
}
