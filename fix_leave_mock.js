const fs = require('fs');

const files = [
  'app/(erp)/hr/employee-leave/page.tsx',
  'app/(erp)/hr/leave/page.tsx',
  'app/(erp)/super-admin/leave/page.tsx'
];

files.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  
  // Replace employeeId logic to use the auth mock
  code = code.replace(
    /const \{ data: firstEmp \}[\s\S]*?const employeeId = firstEmp\?\.id \|\| null/,
    `const employeeId = '11111111-1111-4111-8111-111111111111'; // Mock user matching EOD flow`
  );
  code = code.replace(
    /const \{ data: emps \}[\s\S]*?const employeeId = emps\?\.\[1\]\?\.id \|\| emps\?\.\[0\]\?\.id \|\| null/,
    `const employeeId = '11111111-1111-4111-8111-111111111111'; // Mock user matching EOD flow`
  );
  
  fs.writeFileSync(file, code);
  console.log('Fixed auth mock in', file);
});
