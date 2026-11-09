'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CreditCard } from 'lucide-react'
import { EmployeeIdCardModal } from './EmployeeIdCardModal'
import { EmployeeIdCardData } from './EmployeeIdCard'
import { createClient } from '@/lib/supabase/client'

interface UserProfileIdCardButtonProps {
  user: {
    id?: string | null
    employee_name?: string | null
    email?: string | null
    employee_id?: string | null
    department?: string | null
    designation?: string | null
    role?: string | null
    phone_number?: string | null
    avatar_url?: string | null
    onboarding_id?: string | null
  }
}

export function UserProfileIdCardButton({ user }: UserProfileIdCardButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [cardData, setCardData] = useState<EmployeeIdCardData>({
    fullName: user.employee_name || 'Staff Member',
    email: user.email || '',
    employeeId: user.employee_id || 'EMP-001',
    department: user.department || 'Operations',
    designation: user.designation || user.role || 'Staff Member',
    profilePhoto: user.avatar_url,
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
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="gap-2 border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer font-semibold"
      >
        <CreditCard className="w-4 h-4 text-primary" />
        <span>View Digital ID Badge</span>
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

