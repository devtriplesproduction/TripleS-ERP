const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function deepAudit() {
  const { data: eods } = await supabase
    .from('eod_reports')
    .select('*')
    .order('report_date', { ascending: false });

  const { data: profiles } = await supabase.from('profiles').select('id, employee_id, first_name, last_name');
  const profMap = new Map((profiles || []).map(p => [p.id, p]));

  const { data: ledger } = await supabase.from('comp_off_ledger').select('*');
  const ledgerMap = new Map();
  (ledger || []).forEach(l => {
    if (!ledgerMap.has(l.reference_id)) ledgerMap.set(l.reference_id, []);
    ledgerMap.get(l.reference_id).push(l);
  });

  console.log(`Auditing ${eods.length} EOD records...\n`);

  for (const e of eods) {
    const prof = profMap.get(e.employee_id);
    const empName = prof ? `${prof.first_name} ${prof.last_name}` : e.employee_id;
    const credits = ledgerMap.get(e.id) || [];
    const val = Number(e.office_hours);
    const valStr = String(e.office_hours);

    // Let's see decimal part
    const [hStr, decStr] = valStr.split('.');
    
    console.log(JSON.stringify({
      id: e.id,
      date: e.report_date,
      emp: empName,
      status: e.status,
      office_hours: e.office_hours,
      credits: credits.map(c => ({ id: c.id, hours: c.hours, type: c.transaction_type })),
      submitted_at: e.submitted_at
    }));
  }
}

deepAudit();
