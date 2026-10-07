const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

async function check() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // List tables using PostgREST reflection / RPC, but usually not possible directly.
  // Instead, let's query information_schema or just fetch a known table to see if it works.
  
  const { data, error } = await supabase.from('projects').select('id').limit(1);
  console.log('projects table:', { data, error });
}
check();
