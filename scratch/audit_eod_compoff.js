const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function inspectAll() {
  const { data: eods, error } = await supabase
    .from('eod_reports')
    .select('id, employee_id, report_date, office_hours, status, submitted_at, approved_at')
    .order('report_date', { ascending: false });

  if (error) {
    console.error('Error fetching EODs:', error);
    return;
  }

  console.log(`Total EOD reports: ${eods.length}`);

  // Fetch all profiles and onboarding to map employee names
  const { data: profiles } = await supabase.from('profiles').select('id, employee_id, first_name, last_name');
  const { data: onboarding } = await supabase.from('employee_onboarding').select('id, employee_id_number, first_name, last_name');
  const profileMap = new Map((profiles || []).map(p => [p.id, p]));
  const onbByNum = new Map((onboarding || []).map(o => [o.employee_id_number, o]));
  const onbById = new Map((onboarding || []).map(o => [o.id, o]));

  // Fetch all comp_off_ledger entries
  const { data: ledger } = await supabase.from('comp_off_ledger').select('*');
  const ledgerByRef = new Map();
  (ledger || []).forEach(l => {
    if (!ledgerByRef.has(l.reference_id)) ledgerByRef.set(l.reference_id, []);
    ledgerByRef.get(l.reference_id).push(l);
  });

  console.log('\n--- Sample EOD Reports with office_hours & credits ---');
  for (const e of eods) {
    const prof = profileMap.get(e.employee_id);
    const empName = prof ? `${prof.first_name} ${prof.last_name} (${prof.employee_id})` : e.employee_id;
    const credits = ledgerByRef.get(e.id) || [];
    
    // Check if office_hours looks like legacy HH.MM
    // e.g. 8.05, 8.15, 8.28, 8.41, 8.45, etc.
    console.log(`${e.report_date} | ${empName.padEnd(28)} | office_hours: ${String(e.office_hours).padEnd(10)} | status: ${e.status.padEnd(8)} | credits: ${credits.map(c => `${c.transaction_type}: ${c.hours}h`).join(', ') || 'none'}`);
  }
}

inspectAll();
