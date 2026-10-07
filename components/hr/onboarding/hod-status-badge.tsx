'use client'

import React, { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { getEmployeeAccountStatus } from '@/lib/actions/account'
import { Employee } from '@/lib/supabase/types'
import { Loader2 } from 'lucide-react'

export function HodStatusBadge({ employee }: { employee: Employee }) {
  const [isLoading, setIsLoading] = useState(true)
  const [isHod, setIsHod] = useState(false)

  useEffect(() => {
    async function checkStatus() {
      try {
        const supabase = createClient()
        const status = await getEmployeeAccountStatus(employee.id)
        setIsHod(status.isHod)
      } catch (err) {
        console.error('Error checking HOD status:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    checkStatus()
  }, [employee.id, employee.department])

  if (isLoading) {
    return <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
  }

  if (isHod) {
    return (
      <Badge className="bg-indigo-500/15 text-indigo-400 border-indigo-500/25 hover:bg-indigo-500/20 text-[10px] px-2 py-0 h-5 font-semibold">
        HOD Active <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 ml-1" />
      </Badge>
    )
  }

  return (
    <Badge className="bg-muted/30 text-muted-foreground border-border/40 text-[10px] px-2 py-0 h-5 font-medium">
      Not assigned
    </Badge>
  )
}
