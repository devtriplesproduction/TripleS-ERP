const fs = require('fs');
const file = 'lib/actions/eod.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\} else \{\s+\/\/ For local unauthenticated dev testing[\s\S]*?\}\s+\}/g, '}');

// Now inject a console log for debugging just in case
content = content.replace(/let status = 'Pending';/, "console.log('PAYLOAD ID:', payload.employee_id, 'CURRENT USER ID:', currentUser?.id);\n      let status = 'Pending';");

fs.writeFileSync(file, content);
