const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function dumpLedger() {
  const { data: ledger } = await supabase
    .from('comp_off_ledger')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: onboarding } = await supabase
    .from('employee_onboarding')
    .select('id, employee_id_number, first_name, last_name');
  const onbMap = new Map((onboarding || []).map(o => [o.id, o]));

  const { data: eods } = await supabase
    .from('eod_reports')
    .select('id, report_date, office_hours, status');
  const eodMap = new Map((eods || []).map(e => [e.id, e]));

  const { data: leaves } = await supabase
    .from('leave_requests')
    .select('id, start_date, end_date, status, leave_type');
  const leaveMap = new Map((leaves || []).map(l => [l.id, l]));

  console.log(`Total ledger entries: ${ledger.length}\n`);
  for (const row of ledger) {
    const emp = onbMap.get(row.employee_id);
    const empName = emp ? `${emp.first_name} ${emp.last_name}` : row.employee_id;
    const eod = eodMap.get(row.reference_id);
    const leave = leaveMap.get(row.reference_id);
    const refInfo = eod ? `EOD ${eod.report_date} (${eod.office_hours}h)` : leave ? `LEAVE ${leave.start_date} (${leave.leave_type})` : row.reference_id;
    console.log(`${row.created_at.slice(0, 19)} | ${empName.padEnd(22)} | ${row.transaction_type.padEnd(8)} | ${String(row.hours).padStart(5)}h | Ref: ${refInfo}`);
  }
}

dumpLedger();
