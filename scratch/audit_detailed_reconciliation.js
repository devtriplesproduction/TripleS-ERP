const fs = require('fs');
const data = require('./audit_raw_data.json');

const LEGACY_HHMM_VALUES = {
  '8.05': 8 * 60 + 5,   // 485 min (8h 5m)
  '8.15': 8 * 60 + 15,  // 495 min (8h 15m)
  '8.45': 8 * 60 + 45,  // 525 min (8h 45m)
  '10.47': 10 * 60 + 47,// 647 min (10h 47m)
  '8.3': 8 * 60 + 30,   // 510 min (8h 30m)
  '11.3': 11 * 60 + 30, // 690 min (11h 30m)
};

function canonicalOfficeHoursToMinutes(officeHours) {
  if (!Number.isFinite(officeHours) || officeHours <= 0) return 0;
  const key = String(officeHours);
  if (LEGACY_HHMM_VALUES[key] !== undefined) {
    return LEGACY_HHMM_VALUES[key];
  }
  return Math.round(officeHours * 60);
}

function isSunday(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay() === 0;
}

function calculateExpectedCompOffMinutes(workedMinutes, context, status) {
  if (status !== 'Approved') return 0;
  if (workedMinutes <= 0) return 0;
  if (context === 'sunday' || context === 'paid_holiday' || context === 'approved_leave') {
    return workedMinutes;
  }
  return Math.max(0, workedMinutes - 480);
}

function formatMinutes(m) {
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (rem === 0) return `${h}h`;
  return `${h}h ${rem}m`;
}

// Build index maps
const paidHolidayDates = new Set(data.holidays.filter(h => h.holiday_type === 'PAID').map(h => h.date));
const eodMap = new Map(data.eods.map(e => [e.id, e]));
const onbMap = new Map(data.onboarding.map(o => [o.id, o]));
const profMap = new Map(data.profiles.map(p => [p.id, p]));

// Onboarding to Profile and Profile to Onboarding mapping
const profToOnb = new Map();
const onbToProf = new Map();

data.onboarding.forEach(o => {
  const p = data.profiles.find(pr => pr.employee_id === o.employee_id_number);
  if (p) {
    profToOnb.set(p.id, o.id);
    onbToProf.set(o.id, p.id);
  }
});

// Group ledger by reference_id and by employee_id
const ledgerByRef = new Map();
const ledgerByEmp = new Map();

data.ledger.forEach(row => {
  if (!ledgerByRef.has(row.reference_id)) ledgerByRef.set(row.reference_id, []);
  ledgerByRef.get(row.reference_id).push(row);

  if (!ledgerByEmp.has(row.employee_id)) ledgerByEmp.set(row.employee_id, []);
  ledgerByEmp.get(row.employee_id).push(row);
});

// Audit all 79 EOD reports
const eodAudit = [];

data.eods.forEach(e => {
  const prof = profMap.get(e.employee_id);
  const onbId = profToOnb.get(e.employee_id);
  const onb = onbId ? onbMap.get(onbId) : null;
  const empName = onb ? `${onb.first_name} ${onb.last_name || ''}` : (prof ? `${prof.first_name} ${prof.last_name || ''}` : e.employee_id);
  const empNumber = onb?.employee_id_number || prof?.employee_id || 'UNKNOWN';

  const dateStr = e.report_date;
  const isSun = isSunday(dateStr);
  const isHol = paidHolidayDates.has(dateStr);

  // Check approved leave
  const hasLeave = data.leaves.some(l => 
    (l.employee_id === onbId || l.employee_id === e.employee_id) &&
    l.start_date <= dateStr && l.end_date >= dateStr &&
    (l.status === 'Approved' || l.status === 'Approved HR') &&
    !l.is_half_day
  );

  let context = 'normal';
  if (isSun) context = 'sunday';
  else if (isHol) context = 'paid_holiday';
  else if (hasLeave) context = 'approved_leave';

  const rawHours = Number(e.office_hours);
  const canonicalMinutes = canonicalOfficeHoursToMinutes(rawHours);
  const expectedCompOffMins = calculateExpectedCompOffMinutes(canonicalMinutes, context, e.status);
  const expectedCompOffHours = Math.round((expectedCompOffMins / 60) * 100) / 100;

  const ledgerEntries = ledgerByRef.get(e.id) || [];
  const creditEntries = ledgerEntries.filter(l => l.transaction_type === 'CREDIT');
  const actualCreditHours = creditEntries.reduce((s, c) => s + Number(c.hours), 0);
  const actualCreditMins = Math.round(actualCreditHours * 60);

  const diffHours = Math.round((expectedCompOffHours - actualCreditHours) * 100) / 100;
  const diffMins = expectedCompOffMins - actualCreditMins;

  eodAudit.push({
    eodId: e.id,
    employeeId: onbId,
    profileId: e.employee_id,
    empNumber,
    empName,
    reportDate: dateStr,
    status: e.status,
    context,
    rawHours,
    canonicalMinutes,
    canonicalDuration: formatMinutes(canonicalMinutes),
    expectedCompOffMins,
    expectedCompOffHours,
    expectedDuration: formatMinutes(expectedCompOffMins),
    ledgerCount: creditEntries.length,
    actualCreditHours,
    actualCreditMins,
    actualDuration: formatMinutes(actualCreditMins),
    diffHours,
    diffMins,
    ledgerEntries,
    isMatch: Math.abs(diffHours) < 0.005
  });
});

fs.writeFileSync('scratch/eod_audit_results.json', JSON.stringify(eodAudit, null, 2), 'utf8');

console.log('=== EOD AUDIT COMPLETED ===');
console.log(`Total EODs audited: ${eodAudit.length}`);
const matched = eodAudit.filter(e => e.isMatch);
const mismatched = eodAudit.filter(e => !e.isMatch);
console.log(`Exact matches: ${matched.length}`);
console.log(`Discrepancies: ${mismatched.length}`);

if (mismatched.length > 0) {
  console.log('\n--- DETAILED DISCREPANCIES ---');
  mismatched.forEach(m => {
    console.log(`[${m.reportDate}] ${m.empName.padEnd(22)} (${m.empNumber}) | EOD Status: ${m.status} | Context: ${m.context} | Raw: ${m.rawHours} (${m.canonicalDuration}) | Exp Credit: ${m.expectedCompOffHours}h (${m.expectedDuration}) | Act Credit: ${m.actualCreditHours}h (${m.actualDuration}) | Diff: ${m.diffHours}h (${m.diffMins}m) | Ref: ${m.eodId}`);
  });
}
