const fs = require('fs');

const michaelId = 'a0ef8d37-d4fd-49c7-b20d-b8ed9a512379';
const omkarId = '889bab81-e196-4f40-9793-7cdac9524ed3';

function replaceAuth(file, targetId) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    
    // For eod pages:
    code = code.replace(
      /const \{ data: \{ user: authUser \} \} = await supabase\.auth\.getUser\(\);[\s\S]*?if \(emp\) user = emp;\n  \}/g,
      `// TEST MODE: Force identity\n  const { data: user } = await supabase.from('employee_onboarding').select('id, first_name, last_name').eq('id', '${targetId}').single();\n  // Bypass authUser check`
    );
    
    // For leave pages:
    code = code.replace(
      /const \{ data: \{ user \} \} = await supabase\.auth\.getUser\(\);\n  let employeeId = user\?\.id;\n  if \(\!employeeId\) \{[\s\S]*?employeeId = firstEmp\?\.id;\n  \}/g,
      `// TEST MODE: Force identity\n  let employeeId = '${targetId}';`
    );
    
    // For HR leave page, replace my previous manual fix:
    code = code.replace(
      /\/\/ Use Michael for HR testing\n\s*employeeId = 'a0ef8d37-d4fd-49c7-b20d-b8ed9a512379';/g,
      `// TEST MODE: Force identity\n  let employeeId = '${targetId}';`
    );

    fs.writeFileSync(file, code);
    console.log('Fixed ' + file);
  }
}

replaceAuth('app/(erp)/employee-eod/page.tsx', michaelId);
replaceAuth('app/(erp)/hr/employee-leave/page.tsx', michaelId);

replaceAuth('app/(erp)/admin-eod/page.tsx', omkarId);
replaceAuth('app/(erp)/hr/leave/page.tsx', omkarId);
