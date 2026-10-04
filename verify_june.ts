import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { calculateMonthlyPayroll } from './lib/services/payroll.service';
import { isSunday, calculateCompOffMinutes } from './lib/utils/time';
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  console.log('=== RUNNING PAYROLL INTEGRATION FOR JUNE 2026 ===');
  
  const employeeId = '2b22862a-3817-4d87-9c60-9ecdb4e0a6c6';
  
  // 1. Run Calculate Payroll which now triggers processEODCompOff
  await calculateMonthlyPayroll(2026, 6, [employeeId]);
  
  console.log('=== GENERATING REPORT ===');
  
  // 2. Fetch June EODs
  const { data: onboarding } = await supabase.from('employee_onboarding').select('employee_id_number').eq('id', employeeId).single();
  const { data: profile } = await supabase.from('profiles').select('id').eq('employee_id', onboarding!.employee_id_number).single();
  const authId = profile!.id;
  
  const { data: eods } = await supabase
    .from('eod_reports')
    .select('*')
    .eq('employee_id', authId)
    .gte('report_date', '2026-06-01')
    .lte('report_date', '2026-06-30')
    .eq('status', 'Approved')
    .order('report_date', { ascending: true });
    
  // 3. Fetch Ledger for June EODs
  const refIds = eods!.map(e => e.id);
  const { data: ledger } = await supabase
    .from('comp_off_ledger')
    .select('*')
    .in('reference_id', refIds)
    .eq('transaction_type', 'CREDIT');
    
  // 4. Determine classifications
  const { data: holidays } = await supabase.from('holidays').select('*').gte('date', '2026-06-01').lte('date', '2026-06-30');
  
  let totalWorked = 0;
  let totalCompOff = 0;
  let duplicates = 0;
  const refMap: Record<string, boolean> = {};
  
  const report = [];
  
  for (const eod of eods!) {
    const workedHrs = Number(eod.office_hours);
    totalWorked += workedHrs;
    
    // Find ledger entry
    const credits = ledger!.filter(l => l.reference_id === eod.id);
    if (credits.length > 1) duplicates += credits.length - 1;
    
    const actualCredit = credits.reduce((sum, l) => sum + Number(l.hours), 0);
    totalCompOff += actualCredit;
    
    // Determine expected
    let context: 'normal' | 'sunday' | 'paid_holiday' = 'normal';
    if (isSunday(eod.report_date)) context = 'sunday';
    else if (holidays!.some(h => h.date === eod.report_date && h.holiday_type === 'PAID')) context = 'paid_holiday';
    
    const expectedMinutes = calculateCompOffMinutes(Math.round(workedHrs * 60), context, 'Approved');
    const expectedCredit = expectedMinutes / 60;
    
    let reason = 'Unknown';
    if (context === 'sunday') reason = 'Sunday';
    else if (context === 'paid_holiday') reason = 'Paid Holiday';
    else if (workedHrs < 4) reason = 'Normal <4h';
    else if (workedHrs >= 4 && workedHrs <= 8) reason = 'Normal 4h-8h';
    else if (workedHrs > 8) reason = 'Normal >8h extra';
    
    report.push({
      date: eod.report_date,
      workedHrs,
      expectedCredit,
      actualCredit,
      reason,
      match: expectedCredit === actualCredit
    });
  }
  
  console.log(`D. June EOD count: ${eods!.length}`);
  console.log(`E. June Comp-Off transaction count: ${ledger!.length}`);
  console.log(`F. June Comp-Off total: ${totalCompOff}h`);
  console.log(`\nG/H/I/J/K. Details:`);
  for (const r of report) {
    console.log(`Date: ${r.date} | Worked: ${r.workedHrs}h | Expected: ${r.expectedCredit}h | Actual: ${r.actualCredit}h | Reason: ${r.reason} | Match: ${r.match ? 'YES' : 'NO'}`);
  }
  
  console.log(`\nL. Duplicate reference IDs: ${duplicates}`);
  console.log(`M. Processing errors: ${report.filter(r => !r.match).length}`);
}

run();
