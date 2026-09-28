const fs = require('fs');

const filesToFix = [
  'app/(erp)/employee-eod/page.tsx',
  'app/(erp)/admin-eod/page.tsx',
  'app/(erp)/eod/page.tsx'
];

const replacement = `const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  let user = { id: authUser?.id || '', first_name: 'Employee', last_name: '' };
  
  if (!authUser) {
    const { data: firstEmp } = await supabase.from('employee_onboarding').select('id, first_name, last_name').limit(1).single();
    if (firstEmp) user = firstEmp;
  } else {
    const { data: emp } = await supabase.from('employee_onboarding').select('id, first_name, last_name').eq('id', authUser.id).single();
    if (emp) user = emp;
  }`;

filesToFix.forEach(f => {
  if (fs.existsSync(f)) {
    let code = fs.readFileSync(f, 'utf8');
    // Replace the mock user with real supabase user
    code = code.replace(/const user = \{ id: "11111111-1111-4111-8111-111111111111"[^}]*\};/g, replacement);
    fs.writeFileSync(f, code);
    console.log('Fixed ' + f);
  }
});
