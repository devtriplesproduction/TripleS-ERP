const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkBalances() {
  const { data: onboarding } = await supabase
    .from('employee_onboarding')
    .select('id, employee_id_number, first_name, last_name, department');

  const { data: ledger } = await supabase
    .from('comp_off_ledger')
    .select('*');

  const empMap = new Map();
  (onboarding || []).forEach(emp => {
    empMap.set(emp.id, {
      ...emp,
      credits: 0,
      debits: 0,
      reversals: 0,
      entries: 0
    });
  });

  (ledger || []).forEach(row => {
    const emp = empMap.get(row.employee_id);
    if (!emp) return;
    emp.entries++;
    const h = Number(row.hours) || 0;
    if (row.transaction_type === 'CREDIT') emp.credits += h;
    else if (row.transaction_type === 'DEBIT') emp.debits += h;
    else if (row.transaction_type === 'REVERSAL') emp.reversals += h;
  });

  console.log('CURRENT BALANCES FROM COMP_OFF_LEDGER:');
  console.log('-------------------------------------------------------------------------------------------------');
  for (const emp of empMap.values()) {
    if (emp.entries === 0) continue;
    const earned = Math.round(emp.credits * 100) / 100;
    const used = Math.round(Math.max(0, emp.debits - emp.reversals) * 100) / 100;
    const available = Math.round(Math.max(0, earned - used) * 100) / 100;
    const days = Math.floor(available / 8);
    console.log(`${emp.first_name} ${emp.last_name.padEnd(16)} | Earned: ${String(earned).padStart(5)}h | Used: ${String(used).padStart(4)}h | Available: ${String(available).padStart(5)}h (${days}d) | Entries: ${emp.entries}`);
  }
}

checkBalances();
