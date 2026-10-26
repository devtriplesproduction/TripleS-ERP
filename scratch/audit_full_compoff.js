const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function runAudit() {
  console.log('Fetching Supabase data for Comp-Off audit...');

  const [
    { data: onboarding, error: onbErr },
    { data: profiles, error: profErr },
    { data: eods, error: eodErr },
    { data: holidays, error: holErr },
    { data: leaves, error: leaveErr },
    { data: ledger, error: ledErr }
  ] = await Promise.all([
    supabase.from('employee_onboarding').select('*'),
    supabase.from('profiles').select('*'),
    supabase.from('eod_reports').select('*').order('report_date', { ascending: true }),
    supabase.from('holidays').select('*').order('date', { ascending: true }),
    supabase.from('leave_requests').select('*').order('start_date', { ascending: true }),
    supabase.from('comp_off_ledger').select('*').order('created_at', { ascending: true })
  ]);

  if (onbErr || profErr || eodErr || holErr || leaveErr || ledErr) {
    console.error('Fetch error:', { onbErr, profErr, eodErr, holErr, leaveErr, ledErr });
    return;
  }

  const rawData = {
    onboardingCount: onboarding.length,
    profilesCount: profiles.length,
    eodsCount: eods.length,
    holidaysCount: holidays.length,
    leavesCount: leaves.length,
    ledgerCount: ledger.length,
    onboarding,
    profiles,
    eods,
    holidays,
    leaves,
    ledger
  };

  fs.writeFileSync('scratch/audit_raw_data.json', JSON.stringify(rawData, null, 2), 'utf-8');
  console.log('Successfully saved raw data to scratch/audit_raw_data.json');
  console.log(`Counts:
  - employee_onboarding: ${onboarding.length}
  - profiles: ${profiles.length}
  - eod_reports: ${eods.length}
  - holidays: ${holidays.length}
  - leave_requests: ${leaves.length}
  - comp_off_ledger: ${ledger.length}
  `);
}

runAudit();
