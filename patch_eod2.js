const fs = require('fs');
let code = fs.readFileSync('lib/actions/eod.ts', 'utf8');

code = code.replace(
  `.select('employee_id, status')
      .eq('id', eodId)`,
  `.select('employee_id, status, office_hours')
      .eq('id', eodId)`
);

code = code.replace(
  `import { format } from "date-fns";`,
  `import { format } from "date-fns";\nimport { processEODCompOff } from "./compoff";`
);

fs.writeFileSync('lib/actions/eod.ts', code);
console.log("Patched eod.ts again");
