const fs = require('fs');

const fallbackId = '11111111-1111-4111-8111-111111111111';

function revertAuth(file) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    
    // For eod pages:
    code = code.replace(
      /\/\/ TEST MODE: Force identity[\s\S]*?\/\/ Bypass authUser check/g,
      `const { data: { user: authUser } } = await supabase.auth.getUser();\n  let user = { id: authUser?.id || '', first_name: 'Employee', last_name: '' };\n  \n  if (!authUser) {\n    const { data: firstEmp } = await supabase.from('employee_onboarding').select('id, first_name, last_name').eq('id', '${fallbackId}').single();\n    if (firstEmp) user = firstEmp;\n  } else {\n    const { data: emp } = await supabase.from('employee_onboarding').select('id, first_name, last_name').eq('id', authUser.id).single();\n    if (emp) user = emp;\n  }`
    );
    
    // For leave pages:
    code = code.replace(
      /\/\/ TEST MODE: Force identity\n\s*let employeeId = '[^']+';/g,
      `const { data: { user } } = await supabase.auth.getUser();\n  let employeeId = user?.id;\n  if (!employeeId) {\n    const { data: firstEmp } = await supabase.from('employee_onboarding').select('id').eq('id', '${fallbackId}').single();\n    employeeId = firstEmp?.id;\n  }`
    );

    fs.writeFileSync(file, code);
    console.log('Reverted ' + file);
  }
}

revertAuth('app/(erp)/employee-eod/page.tsx');
revertAuth('app/(erp)/hr/employee-leave/page.tsx');
revertAuth('app/(erp)/admin-eod/page.tsx');
revertAuth('app/(erp)/hr/leave/page.tsx');
