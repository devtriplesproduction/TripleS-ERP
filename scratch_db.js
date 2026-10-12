const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

async function check() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // List tables using PostgREST reflection / RPC, but usually not possible directly.
  // Instead, let's query information_schema or just fetch a known table to see if it works.
  
  const { data: nData, error: nErr } = await supabase.from('notifications').select('id').limit(1);
  console.log('notifications table:', { nData, nErr });
  const { data: aData, error: aErr } = await supabase.from('activity_logs').select('id').limit(1);
  console.log('activity_logs table:', { aData, aErr });
  const { data: annData, error: annErr } = await supabase.from('announcements').select('id').limit(1);
  console.log('announcements table:', { annData, annErr });
}
check();
