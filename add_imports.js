const fs = require('fs');
const filesToFix = [
  'app/(erp)/employee-eod/page.tsx',
  'app/(erp)/admin-eod/page.tsx',
  'app/(erp)/eod/page.tsx'
];
filesToFix.forEach(f => {
  if (fs.existsSync(f)) {
    let code = fs.readFileSync(f, 'utf8');
    if (!code.includes('import { createClient }')) {
      code = "import { createClient } from '@/lib/supabase/server';\n" + code;
      fs.writeFileSync(f, code);
      console.log('Added import to ' + f);
    }
  }
});
