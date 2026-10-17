const fs = require('fs');

const report = JSON.parse(fs.readFileSync('scratch/reconciliation_dry_run_report.json', 'utf8'));

const repairs = report.filter(r => r.action === 'REPAIR');
const flags = report.filter(r => r.action === 'FLAG_REVIEW');
const pendings = report.filter(r => r.action === 'PENDING');
const ok = report.filter(r => r.action === 'OK');

console.log(`TOTAL RECORDS AUDITED: ${report.length}`);
console.log(`- OK (No action needed): ${ok.length}`);
console.log(`- PENDING: ${pendings.length}`);
console.log(`- REPAIR CANDIDATES: ${repairs.length}`);
console.log(`- FLAGGED FOR MANUAL REVIEW: ${flags.length}\n`);

console.log('='.repeat(120));
console.log('REPAIR CANDIDATES (11 RECORDS)');
console.log('='.repeat(120));

repairs.forEach((r, idx) => {
  console.log(`${idx + 1}. [${r.date}] ${r.emp}`);
  console.log(`   EOD ID:           ${r.eodId}`);
  console.log(`   Context:          ${r.context}`);
  console.log(`   Original Stored:  ${r.rawOfficeHours}`);
  console.log(`   Interpreted:      ${r.canonicalFormatted} (${r.canonicalMinutes} mins)`);
  console.log(`   New Canonical:    ${r.canonicalDecimalHours} hrs`);
  console.log(`   Actual Credit:    ${r.actualCreditHours}h (${r.actualCreditFormatted})`);
  console.log(`   Expected Credit:  ${r.expectedCreditHours}h (${r.expectedCreditFormatted})`);
  console.log(`   Difference:       ${r.diffHours >= 0 ? '+' : ''}${r.diffHours}h (${r.diffMinutes >= 0 ? '+' : ''}${r.diffMinutes} mins)`);
  console.log(`   Ledger Ref:       ${r.ledgerEntries.map(l => l.id).join(', ')}`);
  console.log('-'.repeat(120));
});

console.log('\n' + '='.repeat(120));
console.log('FLAGGED FOR MANUAL REVIEW (1 RECORD)');
console.log('='.repeat(120));

flags.forEach((r, idx) => {
  console.log(`${idx + 1}. [${r.date}] ${r.emp}`);
  console.log(`   EOD ID:           ${r.eodId}`);
  console.log(`   Context:          ${r.context} (Sunday)`);
  console.log(`   Original Stored:  ${r.rawOfficeHours}`);
  console.log(`   Reason:           Value 3.7 has fractional .7 (70 min is invalid for HH.MM). Cannot resolve intended duration without human confirmation.`);
  console.log(`   Actual Credit:    ${r.actualCreditHours}h (${r.actualCreditFormatted})`);
});
