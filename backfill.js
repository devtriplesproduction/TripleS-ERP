const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const SUPABASE_URL = urlMatch ? urlMatch[1].trim() : '';
const SUPABASE_KEY = keyMatch ? keyMatch[1].trim() : '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing supabase URL or key in .env");
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function backfill() {
  console.log('[EOD COMP OFF DEBUG] Starting backfill');
  
  const { data: eods, error: eodError } = await supabase
    .from('eod_reports')
    .select('id, employee_id, office_hours, status')
    .eq('status', 'Approved');

  if (eodError) {
    console.error('Error fetching EODs:', eodError);
    return;
  }

  for (const eod of eods) {
    console.log('[EOD COMP OFF DEBUG] Processing EOD ' + eod.id + ' for employee ' + eod.employee_id + ' - office_hours: ' + eod.office_hours);
    
    // Check if already processed (check both CREDIT and DEBIT just in case, though only one should exist)
    const { data: existing } = await supabase
      .from('comp_off_ledger')
      .select('id')
      .eq('reference_id', eod.id)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('[EOD COMP OFF DEBUG] Already processed, skipping');
      continue;
    }

    const diff = Number(eod.office_hours) - 8;
    if (diff === 0) {
      console.log('[EOD COMP OFF DEBUG] No diff, skipping');
      continue;
    }

    // Get current balance
    const { data: ledger } = await supabase
      .from('comp_off_ledger')
      .select('hours, transaction_type')
      .eq('employee_id', eod.employee_id);
      
    const currentBalance = ledger ? ledger.reduce((sum, row) => {
      if (row.transaction_type === 'CREDIT' || row.transaction_type === 'REVERSAL') return sum + Number(row.hours);
      if (row.transaction_type === 'DEBIT') return sum - Number(row.hours);
      return sum;
    }, 0) : 0;

    const newBalance = Math.max(0, currentBalance + diff);
    const actualDiff = newBalance - currentBalance;
    
    console.log('[EOD COMP OFF DEBUG] Current Balance: ' + currentBalance + ', Diff: ' + diff + ', Actual Credit/Debit: ' + actualDiff);

    if (actualDiff !== 0) {
      const transactionType = actualDiff > 0 ? 'CREDIT' : 'DEBIT';
      
      const { error: insertError } = await supabase.from('comp_off_ledger').insert({
        employee_id: eod.employee_id,
        transaction_type: transactionType,
        hours: Math.abs(actualDiff),
        reference_id: eod.id
      });
      
      if (insertError) {
        console.error('[EOD COMP OFF DEBUG] Insert error:', insertError);
      } else {
        console.log('[EOD COMP OFF DEBUG] Successfully added ledger transaction');
      }
    }
  }
}
backfill();
