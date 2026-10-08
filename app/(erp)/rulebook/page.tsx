import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { getRules, getAcknowledgments } from '@/lib/actions/rulebook'
import { RulebookClient } from '@/components/rulebook/RulebookClient'
import { PageHeader } from '@/components/PageHeader'

export const metadata = {
  title: 'Company Rulebook | TripleS ERP',
}

export const dynamic = 'force-dynamic'

export default async function RulebookPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let role: 'Admin' | 'HR' | 'Employee' = 'Employee'
  let employeeId = user?.id || 'a0ef8d37-d4fd-49c7-b20d-b8ed9a512379' // fallback for local testing
  
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role, employee_id').eq('id', user.id).single()
    if (profile?.role) {
      const normalizedRole = profile.role.toUpperCase()
      if (normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'ADMIN') role = 'Admin'
      else if (normalizedRole === 'HR') role = 'HR'
    }
    if (profile?.employee_id) employeeId = profile.employee_id
  } else {
    // Local testing mocks
    role = 'Admin' 
    employeeId = '889bab81-e196-4f40-9793-7cdac9524ed3'
  }

  const rules = await getRules(role)
  const acks = await getAcknowledgments(employeeId)

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <PageHeader 
        title="Company Rulebook"
        subtitle="View and acknowledge the latest company policies and rules."
      />

      <RulebookClient 
        initialRules={rules || []} 
        userRole={role} 
        employeeId={employeeId} 
        acknowledgedRules={acks || []} 
      />
    </div>
  )
}
