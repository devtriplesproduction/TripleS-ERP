const fs = require('fs');

let eodCode = fs.readFileSync('lib/actions/eod.ts', 'utf8');

const target = `    // Log Activity
    await logEodActivity(
      action === 'Approve' ? 'EOD_APPROVED' : 'EOD_REJECTED',
      currentUser.email || 'unknown',
      currentUser.id,
      eod.employee_id,
      { eod_id: eodId, reason: rejectionReason } as Json
    );`;

const replacement = `    // Log Activity
    await logEodActivity(
      action === 'Approve' ? 'EOD_APPROVED' : 'EOD_REJECTED',
      currentUser.email || 'unknown',
      currentUser.id,
      eod.employee_id,
      { eod_id: eodId, reason: rejectionReason } as Json
    );

    // Process Comp Off
    if (newStatus === 'Approved') {
      await processEODCompOff(eodId, eod.employee_id, eod.office_hours, newStatus);
    }`;

if (!eodCode.includes('await processEODCompOff(eodId')) {
  eodCode = eodCode.replace(target, replacement);
  fs.writeFileSync('lib/actions/eod.ts', eodCode);
  console.log('Injected processEODCompOff into reviewEOD');
} else {
  console.log('Already injected processEODCompOff');
}
