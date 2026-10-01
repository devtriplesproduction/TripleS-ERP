import { getEmployeeById } from '@/lib/actions/onboarding'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, User, Mail, Phone, Briefcase, Calendar, Building2 } from 'lucide-react'
import { notFound } from 'next/navigation'
import { ChecklistItem } from '@/components/hr/onboarding/checklist-item'
import { DeleteEmployeeButton } from '@/components/hr/onboarding/delete-employee-button'
import { cn } from '@/lib/utils'
import { EmployeeDetailsClient } from '@/components/hr/onboarding/employee-details-modal'
import { requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function EmployeeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('/hr/onboarding')
  const { id } = await params
  const { employee, tasks } = await getEmployeeById(id)

  if (!employee) {
    notFound()
  }

  const completedTasksCount = tasks.filter(t => t.is_completed).length
  const totalTasksCount = tasks.length
  const progressPercentage = totalTasksCount === 0 ? 0 : Math.round((completedTasksCount / totalTasksCount) * 100)

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 min-w-0 overflow-hidden">
      <EmployeeDetailsClient employee={employee} />
    </div>
  )
}
