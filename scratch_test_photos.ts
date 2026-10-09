import { createClient } from '@supabase/supabase-js'
import { attachProfilePhotos } from './lib/utils/profile-photos'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function run() {
  const allProfiles = [
    { id: '6af63eb6-12a6-4809-97c6-ef0792eeab53', first_name: 'Prince', employee_id: 'EMP-001' },
    { id: 'ca706582-629a-4630-9fbf-efa0ada8ba81', first_name: 'Shital', employee_id: 'EMP-004' }
  ]
  console.log('Before:', allProfiles)
  await attachProfilePhotos(admin, allProfiles)
  console.log('After:', allProfiles)
}

run()
