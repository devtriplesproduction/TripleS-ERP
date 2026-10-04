const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: ledger } = await supabase
    .from('comp_off_ledger')
    .select('*')
    .eq('employee_id', '2b22862a-3817-4d87-9c60-9ecdb4e0a6c6');
    
  let credit = 0;
  let debit = 0;
  let reversal = 0;
  
  for(let l of ledger) {
    if(l.transaction_type === 'CREDIT') credit += l.hours;
    else if(l.transaction_type === 'DEBIT') debit += l.hours;
    else if(l.transaction_type === 'REVERSAL') reversal += l.hours;
  }
  
  console.log(`Credit: ${credit}, Debit: ${debit}, Reversal: ${reversal}`);
  console.log(`Total: ${credit + reversal - debit}`);
}
run();
