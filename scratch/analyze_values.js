const fs = require('fs');

const data = JSON.parse(fs.readFileSync('scratch/all_eod_audit.json', 'utf8'));

console.log('Total records:', data.length);

const patterns = [];

for (const row of data) {
  const val = Number(row.office_hours);
  const valStr = String(row.office_hours);
  const hasDec = valStr.includes('.');
  const decPart = hasDec ? valStr.split('.')[1] : '';

  patterns.push({
    date: row.date,
    emp: row.emp,
    val: row.office_hours,
    decPart,
    decLen: decPart.length,
    credits: row.credits
  });
}

console.table(patterns);
