const fs = require('fs');

// Fix 1: Bad import in leave pages
const files = [
  'app/(erp)/hr/employee-leave/page.tsx',
  'app/(erp)/hr/leave/page.tsx',
  'app/(erp)/super-admin/leave/page.tsx'
];

files.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(
    `import { createClient }\nimport { getCompOffBalance } from '@/lib/actions/compoff' from '@/lib/supabase/client'`,
    `import { createClient } from '@/lib/supabase/client'\nimport { getCompOffBalance } from '@/lib/actions/compoff'`
  );
  fs.writeFileSync(file, code);
  console.log('Fixed', file);
});

// Fix 2: Double import in eod.ts
let eodCode = fs.readFileSync('lib/actions/eod.ts', 'utf8');
eodCode = eodCode.replace(
  /import \{ processEODCompOff \} from "\.\/compoff";[\r\n]+import \{ processEODCompOff \} from "\.\/compoff";/,
  'import { processEODCompOff } from "./compoff";'
);
fs.writeFileSync('lib/actions/eod.ts', eodCode);
console.log('Fixed lib/actions/eod.ts');
