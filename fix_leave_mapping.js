const fs = require('fs');

const files = [
  'app/(erp)/hr/employee-leave/page.tsx',
  'app/(erp)/hr/leave/page.tsx',
  'app/(erp)/super-admin/leave/page.tsx'
];

files.forEach(f => {
  let code = fs.readFileSync(f, 'utf8');
  code = code.replace(
    /const employeeId = '11111111-1111-4111-8111-111111111111'; \/\/ Mock user matching EOD flow/g,
    `const { data: { user } } = await supabase.auth.getUser();
  let employeeId = user?.id;
  if (!employeeId) {
    const { data: firstEmp } = await supabase.from('employee_onboarding').select('id').limit(1).single();
    employeeId = firstEmp?.id;
  }`
  );
  fs.writeFileSync(f, code);
});
console.log('Fixed Leave Pages UI mapping');
