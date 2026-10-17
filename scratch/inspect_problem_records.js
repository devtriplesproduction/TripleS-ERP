const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkDetails() {
  const ids = [
    '4dd973d0-efbf-4cbc-934e-90bb1bef62ed', // Omkar 2026-10-06: 8.05
    '3435137d-f92c-4d8e-9051-6a9f2f26b869', // Omkar 2026-10-03: 8.05
    '7451a7a4-eba6-4b01-b546-e4c99e5f5e8d', // Omkar 2026-10-02: 8.15
    '3bef9726-d06b-49b6-a872-374dabc5456a', // Omkar 2026-10-01: 10.47
    '693a1c02-d25e-4bc2-a3cd-e66cbf477b1b', // Omkar 2026-09-30: 11.3
    '7e67b707-9f1c-4d60-baf0-628084725bd5', // Omkar 2026-10-12: 8.45
    'c373bc04-3387-4418-a91d-99057297595c', // Shital 2026-10-06: 8.3
    '93649091-4d31-46d9-82c8-5dcab4980f6f', // Shital 2026-10-07: 8.3
    '7bcf952d-9860-4966-8d18-97ff9cf63c7b', // Shital 2026-10-10: 8.05 (or find id)
  ];

  const { data: eods } = await supabase
    .from('eod_reports')
    .select('*')
    .in('id', ids);

  for (const e of eods) {
    console.log(e.report_date, e.office_hours, e.tasks_accomplished.slice(0, 50).replace(/\n|\r/g, ' '));
  }
}

checkDetails();
