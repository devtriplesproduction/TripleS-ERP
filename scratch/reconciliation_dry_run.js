const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Canonical conversion logic
function isLegacyHHMM(officeHours) {
  const s = String(officeHours);
  // Specifically identified legacy values where minutes were entered directly as decimals
  return ['8.05', '8.15', '8.45', '10.47', '8.3', '11.3'].includes(s);
}

function isAmbiguous(officeHours) {
  const s = String(officeHours);
  return ['3.7'].includes(s);
}

function parseToCanonicalMinutes(officeHours) {
  const s = String(officeHours);
  if (isAmbiguous(officeHours)) {
    return { minutes: Math.round(officeHours * 60), isAmbiguous: true };
  }

  if (isLegacyHHMM(officeHours)) {
    const [hStr, mStr] = s.split('.');
    const h = parseInt(hStr, 10);
    let m = 0;
    if (mStr.length === 1) {
      // "8.3" means 8.30 = 30 mins
      m = parseInt(mStr, 10) * 10;
    } else {
      m = parseInt(mStr, 10);
    }
    return { minutes: h * 60 + m, isLegacy: true };
  }

  // True decimal hours (e.g. 8.083333, 8.5, 9.5, 8, etc.)
  return { minutes: Math.round(officeHours * 60), isLegacy: false };
}

function formatMinutes(m) {
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

async function runReconciliation() {
  const { data: eods } = await supabase
    .from('eod_reports')
    .select('*')
    .order('report_date', { ascending: false });

  const { data: onboarding } = await supabase
    .from('employee_onboarding')
    .select('id, employee_id_number, first_name, last_name');
  const onbByNum = new Map((onboarding || []).map(o => [o.employee_id_number, o]));
  const onbById = new Map((onboarding || []).map(o => [o.id, o]));

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, employee_id, first_name, last_name');
  const profMap = new Map((profiles || []).map(p => [p.id, p]));

  const { data: ledger } = await supabase
    .from('comp_off_ledger')
    .select('*');
  const ledgerMap = new Map();
  (ledger || []).forEach(l => {
    if (!ledgerMap.has(l.reference_id)) ledgerMap.set(l.reference_id, []);
    ledgerMap.get(l.reference_id).push(l);
  });

  const { data: holidays } = await supabase
    .from('holidays')
    .select('*');
  const paidHolidayDates = new Set(
    (holidays || []).filter(h => h.holiday_type === 'PAID').map(h => h.date)
  );

  const report = [];

  for (const e of eods) {
    const prof = profMap.get(e.employee_id);
    const empName = prof ? `${prof.first_name} ${prof.last_name}` : e.employee_id;
    const credits = ledgerMap.get(e.id) || [];
    const actualCreditHours = credits
      .filter(c => c.transaction_type === 'CREDIT')
      .reduce((sum, c) => sum + Number(c.hours), 0);
    const actualCreditMinutes = Math.round(actualCreditHours * 60);

    const dateStr = e.report_date;
    const [y, m, d] = dateStr.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    const isSun = dayOfWeek === 0;
    const isHoliday = paidHolidayDates.has(dateStr);

    let context = 'normal';
    if (isSun) context = 'sunday';
    else if (isHoliday) context = 'paid_holiday';

    const { minutes: canonicalMinutes, isLegacy, isAmbiguous: amb } = parseToCanonicalMinutes(e.office_hours);

    // Calculate expected credit in minutes
    let expectedCreditMinutes = 0;
    if (e.status === 'Approved') {
      if (context === 'sunday' || context === 'paid_holiday') {
        expectedCreditMinutes = canonicalMinutes;
      } else {
        if (canonicalMinutes < 240) {
          expectedCreditMinutes = canonicalMinutes; // Under 4h: credit all
        } else if (canonicalMinutes < 480) {
          expectedCreditMinutes = 0; // Half day: 0 credit
        } else if (canonicalMinutes === 480) {
          expectedCreditMinutes = 0; // Exactly 8h: 0 credit
        } else {
          expectedCreditMinutes = canonicalMinutes - 480; // Overtime only
        }
      }
    }

    const expectedCreditHours = Math.round((expectedCreditMinutes / 60) * 100) / 100;
    const diffMinutes = expectedCreditMinutes - actualCreditMinutes;
    const diffHours = Math.round((diffMinutes / 60) * 100) / 100;

    let classification = 'TRUE_DECIMAL';
    if (amb) classification = 'MANUAL_REVIEW';
    else if (isLegacy) classification = 'LEGACY_HHMM';
    else if (Number.isInteger(Number(e.office_hours))) classification = 'INTEGER_HOURS';

    let action = 'OK';
    if (amb) {
      action = 'FLAG_REVIEW';
    } else if (e.status === 'Pending') {
      action = 'PENDING';
    } else if (isLegacy || diffMinutes !== 0) {
      action = 'REPAIR';
    }

    report.push({
      eodId: e.id,
      date: e.report_date,
      emp: empName,
      status: e.status,
      context,
      rawOfficeHours: e.office_hours,
      canonicalMinutes,
      canonicalFormatted: formatMinutes(canonicalMinutes),
      canonicalDecimalHours: Number((canonicalMinutes / 60).toFixed(6)),
      expectedCreditMinutes,
      expectedCreditFormatted: formatMinutes(expectedCreditMinutes),
      expectedCreditHours,
      actualCreditMinutes,
      actualCreditFormatted: formatMinutes(actualCreditMinutes),
      actualCreditHours,
      diffMinutes,
      diffHours,
      classification,
      action,
      ledgerEntries: credits
    });
  }

  const fs = require('fs');
  fs.writeFileSync('scratch/reconciliation_dry_run_report.json', JSON.stringify(report, null, 2), 'utf8');

  console.log(`\n======================================================`);
  console.log(`RECONCILIATION DRY-RUN SUMMARY (Total: ${report.length})`);
  console.log(`======================================================`);
  console.log(`OK (No changes needed): ${report.filter(r => r.action === 'OK').length}`);
  console.log(`REPAIR (Eligible for repair): ${report.filter(r => r.action === 'REPAIR').length}`);
  console.log(`PENDING (Pending approval): ${report.filter(r => r.action === 'PENDING').length}`);
  console.log(`FLAG_REVIEW (Flagged for manual review): ${report.filter(r => r.action === 'FLAG_REVIEW').length}`);
  console.log(`------------------------------------------------------`);

  console.log(`\nREPAIR CANDIDATES:`);
  report.filter(r => r.action === 'REPAIR').forEach(r => {
    console.log(`[${r.date}] ${r.emp.padEnd(22)} | Stored: ${String(r.rawOfficeHours).padEnd(6)} -> Canon: ${r.canonicalFormatted.padEnd(7)} | Exp Credit: ${r.expectedCreditFormatted.padEnd(6)} | Act Credit: ${r.actualCreditFormatted.padEnd(6)} | Diff: ${r.diffMinutes}m (${r.diffHours}h) | Context: ${r.context}`);
  });

  console.log(`\nFLAGGED FOR MANUAL REVIEW:`);
  report.filter(r => r.action === 'FLAG_REVIEW').forEach(r => {
    console.log(`[${r.date}] ${r.emp.padEnd(22)} | Stored: ${String(r.rawOfficeHours).padEnd(6)} -> Canon: ${r.canonicalFormatted.padEnd(7)} | Reason: Fractional minutes cannot be resolved confidently`);
  });
}

runReconciliation();
