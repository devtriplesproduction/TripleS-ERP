const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
  const { data: eods } = await supabase.from('eod_reports').select('*').eq('status', 'Pending');
  if (eods && eods.length > 0) {
    console.log(`Approving pending EOD ${eods[0].id} with ${eods[0].office_hours} hours...`);
    const { error } = await supabase.rpc('review_eod_rpc', {
      p_eod_id: eods[0].id,
      p_status: 'Approved',
      p_rejection_reason: null
    });
    
    if (error) {
      console.error('Error approving EOD:', error);
      return;
    }
    
    console.log('Approved successfully! Now testing processEODCompOff server logic by running node process-test.js directly...');
  }
}
run();
