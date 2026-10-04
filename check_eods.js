const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: eods } = await supabase
    .from('eod_reports')
    .select('report_date, office_hours, status')
    .eq('employee_id', '3f1a7db7-0ebf-45a7-b5a9-f9a0a393c023')
    .eq('status', 'Approved')
    .gte('report_date', '2026-08-01')
    .lte('report_date', '2026-08-31');

  let total = 0;
  eods.forEach(e => {
    console.log(`${e.report_date}: ${e.office_hours} (Approved)`);
    total += Number(e.office_hours);
  });
  console.log('Total:', total);
}

check();
