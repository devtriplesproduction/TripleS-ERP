import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { getTasks } from './lib/actions/tasks'

dotenv.config({ path: '.env' })

async function run() {
  const res = await getTasks()
  console.log(JSON.stringify(res.data[0].assignees, null, 2))
}

run()
