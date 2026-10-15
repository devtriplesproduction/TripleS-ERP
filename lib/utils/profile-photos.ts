import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Converts a relative employee storage path (e.g. 'profile-photos/xxx.jpg' or 'onboarding/yyy.png')
 * into a fully-qualified public URL pointing to the employee-documents bucket.
 */
export function getProfilePhotoUrl(photoPath: string | null | undefined): string | null {
  if (!photoPath) return null
  const trimmed = photoPath.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sfjerymoxnolxblhelho.supabase.co').replace(/\/+$/, '')
  let cleanPath = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed
  if (cleanPath.startsWith('employee-documents/')) {
    cleanPath = cleanPath.replace(/^employee-documents\//, '')
  }
  return `${supabaseUrl}/storage/v1/object/public/employee-documents/${cleanPath}`
}

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
    
    data.forEach((row: any) => {
      const url = getProfilePhotoUrl(row.profile_photo)
      photoMap.set(row.employee_id_number, url)
    })
    
    profiles.forEach(p => {
      if (p && p.employee_id) {
        p.profile_photo = photoMap.get(p.employee_id) || null
      }
    })
  }
}

