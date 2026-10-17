const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkDuplicates() {
  const { data: ledger } = await supabase.from('comp_off_ledger').select('*');
  const counts = new Map();
  for (const row of ledger) {
    if (row.transaction_type === 'CREDIT') {
      const count = counts.get(row.reference_id) || 0;
      counts.set(row.reference_id, count + 1);
    }
  }

  let dupes = 0;
  for (const [ref, count] of counts.entries()) {
    if (count > 1) {
      console.log(`Duplicate found for reference_id: ${ref} (count: ${count})`);
      dupes++;
    }
  }
  if (dupes === 0) {
    console.log('No duplicate credits found in comp_off_ledger.');
  }
}

checkDuplicates();
