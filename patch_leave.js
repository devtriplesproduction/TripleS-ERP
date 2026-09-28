const fs = require('fs');

function patchFile(filePath, targetLine, defaultEmployeeIdExpr) {
  let code = fs.readFileSync(filePath, 'utf8');
  if (!code.includes("getCompOffBalance")) {
    code = code.replace("import { createClient }", "import { createClient }\nimport { getCompOffBalance } from '@/lib/actions/compoff'");
  }
  
  if (filePath.includes("super-admin")) {
    code = code.replace(targetLine, `  const compOffBalance = 0; // Super admin doesn't apply for leave usually`);
  } else {
    code = code.replace(targetLine, `  const compOffBalance = employeeId ? await getCompOffBalance(employeeId) : 0;`);
  }
  fs.writeFileSync(filePath, code);
  console.log("Patched", filePath);
}

patchFile('app/(erp)/hr/employee-leave/page.tsx', '  const compOffBalance = 8');
patchFile('app/(erp)/hr/leave/page.tsx', '  const compOffBalance = 0');
patchFile('app/(erp)/super-admin/leave/page.tsx', '  const compOffBalance = 0');
