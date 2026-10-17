const fs = require('fs');

const records = JSON.parse(fs.readFileSync('scratch/detailed_records.json', 'utf8'));

console.log(`Total records: ${records.length}\n`);

// Group by value of office_hours
const byHours = new Map();

for (const r of records) {
  const h = r.hours;
  if (!byHours.has(h)) byHours.set(h, []);
  byHours.get(h).push(r);
}

console.log('Unique office_hours values:');
for (const [val, list] of byHours.entries()) {
  console.log(`Value: ${val} (count: ${list.length})`);
  for (const item of list) {
    const creditsStr = item.credits.map(c => `${c.type}:${c.hours}`).join(', ') || 'none';
    console.log(`   ${item.date} | ${item.emp.padEnd(24)} | status: ${item.status.padEnd(8)} | credits: ${creditsStr}`);
  }
}
