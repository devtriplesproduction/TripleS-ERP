const fs = require('fs');
const records = JSON.parse(fs.readFileSync('scratch/detailed_records.json', 'utf8'));

const targets = records.filter(r => 
  ['8.3', '11.3', '3.7', '4.2', '8.5', '9.5', '10.5', '4.25'].includes(String(r.hours))
);

console.log(JSON.stringify(targets, null, 2));
