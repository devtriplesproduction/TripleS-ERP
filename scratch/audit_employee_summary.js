const fs = require('fs');
const data = require('./audit_raw_data.json');

const LEGACY_HHMM_VALUES = {
  '8.05': 8 * 60 + 5,   // 8h 5m = 485 min
  '8.15': 8 * 60 + 15,  // 8h 15m = 495 min
  '8.45': 8 * 60 + 45,  // 8h 45m = 525 min
  '10.47': 10 * 60 + 47,// 10h 47m = 647 min
  '8.3': 8 * 60 + 30,   // 8h 30m = 510 min
  '11.3': 11 * 60 + 30, // 11h 30m = 690 min
  '8.27': 8 * 60 + 27,  // 8h 27m = 507 min (Prince Oct 19)
  '10.55': 10 * 60 + 55,// 10h 55m = 655 min (Prince Oct 18 Sunday)
};

function canonicalOfficeHoursToMinutes(officeHours, dateStr) {
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

const paidHolidayDates = new Set(data.holidays.filter(h => h.holiday_type === 'PAID').map(h => h.date));

// Map profiles and onboarding
const profToOnb = new Map();
const onbToProf = new Map();
data.onboarding.forEach(o => {
  const p = data.profiles.find(pr => pr.employee_id === o.employee_id_number);
  if (p) {
    profToOnb.set(p.id, o.id);
    onbToProf.set(o.id, p.id);
  }
});

// Employee summaries
const employees = data.onboarding.map(emp => {
  const profId = onbToProf.get(emp.id);
  const prof = profId ? data.profiles.find(p => p.id === profId) : null;
  return {
    onboardingId: emp.id,
    profileId: profId || null,
    employee_id_number: emp.employee_id_number,
    name: `${emp.first_name} ${emp.last_name || ''}`.trim(),
    department: emp.department,
    job_title: emp.job_title
  };
});

// Calculate current ledger balances
const reconciliation = employees.map(emp => {
  const empLedger = data.ledger.filter(l => l.employee_id === emp.onboardingId);
  
  let currentEarned = 0;
  let currentDebits = 0;
  let currentReversals = 0;

  empLedger.forEach(row => {
    const h = Number(row.hours) || 0;
    if (row.transaction_type === 'CREDIT') currentEarned += h;
    else if (row.transaction_type === 'DEBIT') currentDebits += h;
    else if (row.transaction_type === 'REVERSAL') currentReversals += h;
  });

  const currentUsed = Math.round(Math.max(0, currentDebits - currentReversals) * 100) / 100;
  const currentEarnedRounded = Math.round(currentEarned * 100) / 100;
  const currentAvailable = Math.round(Math.max(0, currentEarnedRounded - currentUsed) * 100) / 100;
  const currentDays = Math.floor(currentAvailable / 8);

  // Now calculate expected credits from EODs
  const empEods = data.eods.filter(e => e.employee_id === emp.profileId);
  const approvedEods = empEods.filter(e => e.status === 'Approved');
  const pendingEods = empEods.filter(e => e.status === 'Pending');

  // Also check if Sept 30 is treated as holiday vs normal
  let expectedEarnedMinutesCanonical = 0;
  let expectedEarnedMinutesIfSept30Normal = 0;

  const eodBreakdown = approvedEods.map(e => {
    const isSun = isSunday(e.report_date);
    const isHol = paidHolidayDates.has(e.report_date);
    const context = isSun ? 'sunday' : (isHol ? 'paid_holiday' : 'normal');

    const canonicalMins = canonicalOfficeHoursToMinutes(Number(e.office_hours), e.report_date);
    
    let compOffMins = 0;
    if (context === 'sunday' || context === 'paid_holiday') {
      compOffMins = canonicalMins;
    } else {
      compOffMins = Math.max(0, canonicalMins - 480);
    }

    // Alternative: if Sept 30 was treated as normal day
    let altMins = compOffMins;
    if (e.report_date === '2026-09-30') {
      altMins = Math.max(0, canonicalMins - 480); // 690 - 480 = 210 mins (3h 30m = 3.5h)
    }

    expectedEarnedMinutesCanonical += compOffMins;
    expectedEarnedMinutesIfSept30Normal += altMins;

    const existingCredit = empLedger.find(l => l.reference_id === e.id && l.transaction_type === 'CREDIT');

    return {
      eodId: e.id,
      date: e.report_date,
      context,
      rawOfficeHours: e.office_hours,
      canonicalMins,
      compOffMins,
      compOffHours: Math.round((compOffMins / 60) * 100) / 100,
      actualCreditHours: existingCredit ? Number(existingCredit.hours) : 0,
      ledgerEntryId: existingCredit ? existingCredit.id : null
    };
  });

  const expectedEarnedCanonical = Math.round((expectedEarnedMinutesCanonical / 60) * 100) / 100;
  const expectedEarnedSept30Normal = Math.round((expectedEarnedMinutesIfSept30Normal / 60) * 100) / 100;

  // Expected Debits from Approved Leaves
  const empLeaves = data.leaves.filter(l => l.employee_id === emp.onboardingId && l.leave_type === 'Compensatory Off');
  const approvedCompLeaves = empLeaves.filter(l => l.status === 'Approved');

  let expectedDebits = 0;
  approvedCompLeaves.forEach(l => {
    const sDate = new Date(l.start_date);
    const eDate = new Date(l.end_date);
    const diffDays = Math.ceil(Math.abs(eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const days = l.is_half_day ? 0.5 : diffDays;
    expectedDebits += days * 8;
  });

  const expectedUsed = expectedDebits;
  const expectedAvailableCanonical = Math.round(Math.max(0, expectedEarnedCanonical - expectedUsed) * 100) / 100;
  const expectedDaysCanonical = Math.floor(expectedAvailableCanonical / 8);

  const expectedAvailableSept30Normal = Math.round(Math.max(0, expectedEarnedSept30Normal - expectedUsed) * 100) / 100;
  const expectedDaysSept30Normal = Math.floor(expectedAvailableSept30Normal / 8);

  return {
    ...emp,
    ledgerCount: empLedger.length,
    approvedEodCount: approvedEods.length,
    pendingEodCount: pendingEods.length,
    current: {
      earned: currentEarnedRounded,
      used: currentUsed,
      available: currentAvailable,
      days: currentDays,
      debits: currentDebits,
      reversals: currentReversals
    },
    expectedCanonical: {
      earned: expectedEarnedCanonical,
      used: expectedUsed,
      available: expectedAvailableCanonical,
      days: expectedDaysCanonical,
      diffEarned: Math.round((expectedEarnedCanonical - currentEarnedRounded) * 100) / 100,
      diffAvailable: Math.round((expectedAvailableCanonical - currentAvailable) * 100) / 100
    },
    expectedSept30Normal: {
      earned: expectedEarnedSept30Normal,
      used: expectedUsed,
      available: expectedAvailableSept30Normal,
      days: expectedDaysSept30Normal,
      diffEarned: Math.round((expectedEarnedSept30Normal - currentEarnedRounded) * 100) / 100,
      diffAvailable: Math.round((expectedAvailableSept30Normal - currentAvailable) * 100) / 100
    },
    eodBreakdown
  };
});

fs.writeFileSync('scratch/reconciliation_summary.json', JSON.stringify(reconciliation, null, 2), 'utf8');

console.log('========================================================================================================================');
console.log('EMPLOYEE-WISE COMP-OFF RECONCILIATION TABLE (CURRENT LEDGER vs CANONICAL CALCULATION)');
console.log('========================================================================================================================');
console.log('Emp ID   | Name                   | Current (Earn/Used/Avail/Days) | Expected (Earn/Used/Avail/Days) | Diff (Earn/Avail) | Status');
console.log('---------+------------------------+--------------------------------+---------------------------------+-------------------+-------');

reconciliation.forEach(r => {
  const curStr = `${String(r.current.earned).padStart(5)}h / ${String(r.current.used).padStart(4)}h / ${String(r.current.available).padStart(5)}h / ${r.current.days}d`;
  const expStr = `${String(r.expectedCanonical.earned).padStart(5)}h / ${String(r.expectedCanonical.used).padStart(4)}h / ${String(r.expectedCanonical.available).padStart(5)}h / ${r.expectedCanonical.days}d`;
  const diffStr = `${(r.expectedCanonical.diffEarned >= 0 ? '+' : '') + r.expectedCanonical.diffEarned}h / ${(r.expectedCanonical.diffAvailable >= 0 ? '+' : '') + r.expectedCanonical.diffAvailable}h`;
  const status = Math.abs(r.expectedCanonical.diffEarned) < 0.01 ? 'MATCH' : 'MISMATCH';
  console.log(`${r.employee_id_number.padEnd(8)} | ${r.name.padEnd(22)} | ${curStr} | ${expStr} | ${diffStr.padStart(17)} | ${status}`);
});

console.log('\n========================================================================================================================');
console.log('IF SEPT 30 (ANANT CHATURTHI) WAS TREATED AS NORMAL WORKING DAY (8H SUBTRACTED):');
console.log('========================================================================================================================');
reconciliation.filter(r => r.current.earned > 0 || r.expectedSept30Normal.earned > 0).forEach(r => {
  const curStr = `${String(r.current.earned).padStart(5)}h / ${String(r.current.used).padStart(4)}h / ${String(r.current.available).padStart(5)}h / ${r.current.days}d`;
  const expStr = `${String(r.expectedSept30Normal.earned).padStart(5)}h / ${String(r.expectedSept30Normal.used).padStart(4)}h / ${String(r.expectedSept30Normal.available).padStart(5)}h / ${r.expectedSept30Normal.days}d`;
  const diffStr = `${(r.expectedSept30Normal.diffEarned >= 0 ? '+' : '') + r.expectedSept30Normal.diffEarned}h / ${(r.expectedSept30Normal.diffAvailable >= 0 ? '+' : '') + r.expectedSept30Normal.diffAvailable}h`;
  console.log(`${r.employee_id_number.padEnd(8)} | ${r.name.padEnd(22)} | ${curStr} | ${expStr} | ${diffStr.padStart(17)}`);
});
