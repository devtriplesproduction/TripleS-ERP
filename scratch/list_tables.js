const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function listTables() {
  const commonTables = [
    'eod_reports',
    'comp_off_ledger',
    'profiles',
    'employee_onboarding',
    'holidays',
    'leave_requests',
    'background_jobs',
    'personal_notes',
    'quick_tasks',
    'notification_clears'
  ];

  for (const t of commonTables) {
    const { error } = await supabase.from(t).select('id').limit(1);
    console.log(`Table ${t.padEnd(22)}: ${!error ? 'EXISTS' : error.message}`);
  }
}

listTables();
