'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CreditCard } from 'lucide-react'
import { EmployeeIdCardModal } from './EmployeeIdCardModal'
import { EmployeeIdCardData } from './EmployeeIdCard'
import { type AuthUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'

interface NavbarIdBadgeTriggerProps {
  user: AuthUser
}

export function NavbarIdBadgeTrigger({ user }: NavbarIdBadgeTriggerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [cardData, setCardData] = useState<EmployeeIdCardData>({
    fullName: user.employee_name || 'Staff Member',
    email: user.email || '',
    employeeId: user.employee_id || 'EMP-001',
    department: user.department || 'Operations',
    designation: user.designation || user.role || 'Staff Member',
    profilePhoto: (user as any).avatar_url,
    status: 'Active',
    bloodGroup: 'O+',
  })

  // Prevent rendering on Admin side
  if (user.role === 'Admin' || user.role === 'HR') {
    return null
  }

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient()
        let query = supabase.from('employee_onboarding').select('*')
        if (user.onboarding_id) {
          query = query.eq('id', user.onboarding_id)
        } else if (user.employee_id) {
          query = query.eq('employee_id_number', user.employee_id)
        } else if (user.email) {
          query = query.eq('email', user.email)
        } else {
          return
        }

        const { data } = await query.maybeSingle()
        if (data) {
          let photoUrl = data.profile_photo
          if (photoUrl && !photoUrl.startsWith('http://') && !photoUrl.startsWith('https://') && !photoUrl.startsWith('data:') && !photoUrl.startsWith('/')) {
            photoUrl = supabase.storage.from('employee-documents').getPublicUrl(photoUrl).data.publicUrl
          }
          setCardData({
            id: data.id,
            fullName: `${data.first_name || ''} ${data.last_name || ''}`.trim() || user.employee_name || 'Staff Member',
            firstName: data.first_name,
            lastName: data.last_name,
            email: data.email || user.email || '',
            employeeId: data.employee_id_number || user.employee_id || 'EMP-001',
            department: data.department || user.department || 'Operations',
            designation: data.designation || data.job_title || user.designation || 'Staff Member',
            joiningDate: data.joining_date || undefined,
            bloodGroup: data.blood_group || 'O+',
            phone: data.phone || undefined,
            emergencyContact: data.emergency_contact || undefined,
            profilePhoto: photoUrl || undefined,
            workLocation: data.work_location || 'OFFICE',
            status: data.employment_status || 'Active',
          })
        }
      } catch {
        // Fallback to basic user profile data
      }
    }
    loadProfile()
  }, [user])

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-9 px-2 sm:px-2.5 bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground gap-1.5 text-xs font-semibold shrink-0 cursor-pointer"
        title="View Official TripleS ID Badge"
        aria-label="View Official TripleS ID Badge"
      >
        <CreditCard className="h-4 w-4 text-primary" />
        <span className="hidden md:inline">ID Badge</span>
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

