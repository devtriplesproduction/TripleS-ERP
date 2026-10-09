import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Attaches profile photos from employee_onboarding to a list of profile objects.
 * Modifies the profile objects in place.
 */
export async function attachProfilePhotos(admin: SupabaseClient, profilesInput: any[]) {
  // PostgREST sometimes returns 1:1 relations as arrays, so we flatten first
  const profiles = profilesInput.flat(Infinity).filter(Boolean)
  const employeeIds = Array.from(new Set(profiles.map(p => p?.employee_id).filter(Boolean)))
  if (employeeIds.length === 0) return

  const { data } = await admin
    .from('employee_onboarding')
    .select('employee_id_number, profile_photo')
    .in('employee_id_number', employeeIds)

  if (data) {
    const photoMap = new Map()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    
    data.forEach((row: any) => {
      let url = row.profile_photo
      if (url && !url.startsWith('http')) {
        // url is like 'profile-photos/xxx.jpg', bucket is 'employee-documents'
        url = `${supabaseUrl}/storage/v1/object/public/employee-documents/${url}`
      }
      photoMap.set(row.employee_id_number, url)
    })
    
    profiles.forEach(p => {
      if (p && p.employee_id) {
        p.profile_photo = photoMap.get(p.employee_id) || null
      }
    })
  }
}
