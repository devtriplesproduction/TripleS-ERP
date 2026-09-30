import { OnboardWizard } from '@/components/hr/onboarding/onboard-wizard'
import { requireRole } from '@/lib/auth'

export default async function AddEmployeePage() {
  await requireRole('/hr/onboarding')
  
  return (
    <div className="w-full h-[calc(100vh-6rem)] flex flex-col overflow-hidden">
      <OnboardWizard />
    </div>
  )
}
