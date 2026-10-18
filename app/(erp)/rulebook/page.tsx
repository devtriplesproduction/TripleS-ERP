import React from 'react'
import { requireRole } from '@/lib/auth'
import { getRules, getAcknowledgments } from '@/lib/actions/rulebook'
import { RulebookClient } from '@/components/rulebook/RulebookClient'

export const metadata = {
  title: 'Company Rulebook | TripleS ERP',
}

export const dynamic = 'force-dynamic'

export default async function RulebookPage() {
  const authUser = await requireRole('/rulebook')

  const role: 'Admin' | 'HR' | 'Employee' =
    authUser.role === 'Admin' ? 'Admin' : authUser.role === 'HR' ? 'HR' : 'Employee'
  const employeeId = authUser.employee_id || authUser.id

  const rules = await getRules(role)
  const acks = await getAcknowledgments(employeeId)

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <RulebookClient
        initialRules={rules || []}
        userRole={role}
        employeeId={employeeId}
        acknowledgedRules={acks || []}
      />
    </div>
  )
}
