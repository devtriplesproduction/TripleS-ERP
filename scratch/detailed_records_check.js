const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data: eods } = await supabase
    .from('eod_reports')
    .select('id, employee_id, report_date, office_hours, status, tasks_accomplished, submitted_at, approved_at')
    .order('report_date', { ascending: false });

  const { data: profiles } = await supabase.from('profiles').select('id, employee_id, first_name, last_name');
  const profMap = new Map((profiles || []).map(p => [p.id, p]));

  const { data: ledger } = await supabase.from('comp_off_ledger').select('*');
  const ledgerMap = new Map();
  (ledger || []).forEach(l => {
    if (!ledgerMap.has(l.reference_id)) ledgerMap.set(l.reference_id, []);
    ledgerMap.get(l.reference_id).push(l);
  });

  const { data: holidays } = await supabase.from('holidays').select('*');
  const holidayDates = new Set((holidays || []).filter(h => h.holiday_type === 'PAID').map(h => h.date));

  const targetList = [];
  for (const e of eods) {
    const prof = profMap.get(e.employee_id);
    const empName = prof ? `${prof.first_name} ${prof.last_name}` : e.employee_id;
    const credits = ledgerMap.get(e.id) || [];
    targetList.push({
      id: e.id,
      date: e.report_date,
      emp: empName,
      hours: e.office_hours,
      status: e.status,
      submitted_at: e.submitted_at,
      credits: credits.map(c => ({ id: c.id, hours: c.hours, type: c.transaction_type })),
      tasks: (e.tasks_accomplished || '').slice(0, 70).replace(/\n|\r/g, ' ')
    });
  }

  const fs = require('fs');
  fs.writeFileSync('scratch/detailed_records.json', JSON.stringify(targetList, null, 2), 'utf8');
  console.log('Saved', targetList.length, 'records');
}

check();
