import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { isSunday } from './lib/utils/time';
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  // Manual credit reference IDs to ignore
  const manualRefIds = [
    '20bbbd83-5156-4251-91d0-4585dba587af',
    '9b2b46af-90b0-4f58-9178-1f61b839b21d',
    'c0e9ad46-fc7e-4d21-b35e-1e520fc46d9d'
  ];

  const { data: ledger } = await supabase
    .from('comp_off_ledger')
    .select('*')
    .eq('employee_id', '2b22862a-3817-4d87-9c60-9ecdb4e0a6c6')
    .eq('transaction_type', 'CREDIT');

  const generatedCredits = ledger!.filter(l => !manualRefIds.includes(l.reference_id!));
  const refIds = generatedCredits.map(l => l.reference_id);

  const { data: eods } = await supabase
    .from('eod_reports')
    .select('*')
    .in('id', refIds);

  const { data: holidays } = await supabase.from('holidays').select('*');

  const eodMap = new Map();
  for (const e of eods!) {
    eodMap.set(e.id, e);
  }

  const grouped: Record<string, any[]> = {};
  let grandTotal = 0;

  for (const credit of generatedCredits) {
    const eod = eodMap.get(credit.reference_id);
    if (!eod) continue;

    const date = eod.report_date; // YYYY-MM-DD
    const month = date.substring(0, 7); // YYYY-MM
    
    if (!grouped[month]) grouped[month] = [];

    // Determine reason
    let reason = 'Unknown';
    let isHol = false;
    const hol = holidays!.find(h => h.date === date);
    if (hol && hol.holiday_type === 'PAID') {
      isHol = true;
    }

    const hrs = Number(eod.office_hours);

    if (isSunday(date)) {
      reason = 'Sunday';
    } else if (isHol) {
      reason = 'Paid Holiday';
    } else {
      if (hrs < 4) reason = 'Normal <4h';
      else if (hrs > 8) reason = 'Normal >8h extra';
      else reason = 'Other/Unknown';
    }

    grouped[month].push({
      date,
      refId: credit.reference_id,
      workedHours: hrs,
      creditHours: credit.hours,
      reason
    });

    grandTotal += credit.hours;
  }

  for (const month of Object.keys(grouped).sort()) {
    console.log(`\n=== ${month} ===`);
    const entries = grouped[month];
    entries.sort((a, b) => a.date.localeCompare(b.date));
    
    let total = 0;
    for (const entry of entries) {
      total += entry.creditHours;
      console.log(`Date: ${entry.date} | Worked: ${entry.workedHours}h | Credited: ${entry.creditHours}h | Reason: ${entry.reason} | Ref: ${entry.refId}`);
    }
    console.log(`Count: ${entries.length} credits`);
    console.log(`Total credited for ${month}: ${total}h`);
  }

  console.log(`\n=== GRAND TOTAL ===`);
  console.log(`Total generated EOD credits: ${grandTotal}h`);
}

run();
