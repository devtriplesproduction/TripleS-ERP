const fs = require('fs');

const michaelId = 'a0ef8d37-d4fd-49c7-b20d-b8ed9a512379';
const omkarId = '889bab81-e196-4f40-9793-7cdac9524ed3';

// 2. Fix Employee EOD Tab to pass correct UI props
let empTabCode = fs.readFileSync('app/(erp)/employee-eod/page.tsx', 'utf8');
empTabCode = empTabCode.replace(/<EODSubmissionForm[\s\S]*?\/>/, `<EODSubmissionForm employeeId={user.id} canEditDate={false} canManage={false} employeeName={\`${user.first_name} ${user.last_name}\`} employeeStringId="EMP-002" />`);
if (!empTabCode.includes(michaelId)) {
  empTabCode = empTabCode.replace(/const \{ data: \{ user: authUser \} \} = await supabase\.auth\.getUser\(\);[\s\S]*?if \(emp\) user = emp;\n  \}/g, `const { data: user } = await supabase.from('employee_onboarding').select('id, first_name, last_name').eq('id', '${michaelId}').single();`);
}
fs.writeFileSync('app/(erp)/employee-eod/page.tsx', empTabCode);

// 3. Fix HR EOD Tab to pass correct UI props and test identity
let hrTabCode = fs.readFileSync('app/(erp)/eod/page.tsx', 'utf8');
if (!hrTabCode.includes(omkarId)) {
  hrTabCode = hrTabCode.replace(/const \{ data: \{ user: authUser \} \} = await supabase\.auth\.getUser\(\);[\s\S]*?if \(emp\) user = emp;\n  \}/g, `const { data: user } = await supabase.from('employee_onboarding').select('id, first_name, last_name').eq('id', '${omkarId}').single();`);
  hrTabCode = hrTabCode.replace(/<EODSubmissionForm employeeId=\{user\.id\} canEditDate=\{canManage\} employees=\{canManage \? allEmployees : undefined\} canManage=\{canManage\} \/>/, `<EODSubmissionForm employeeId={user.id} canEditDate={canManage} employees={canManage ? allEmployees : undefined} canManage={canManage} employeeName={\`${user.first_name} ${user.last_name}\`} employeeStringId="EMP-001" />`);
  fs.writeFileSync('app/(erp)/eod/page.tsx', hrTabCode);
}

// 4. Fix Admin EOD Tab
let adminTabCode = fs.readFileSync('app/(erp)/admin-eod/page.tsx', 'utf8');
if (!adminTabCode.includes(omkarId)) {
  adminTabCode = adminTabCode.replace(/const \{ data: \{ user: authUser \} \} = await supabase\.auth\.getUser\(\);[\s\S]*?if \(emp\) user = emp;\n  \}/g, `const { data: user } = await supabase.from('employee_onboarding').select('id, first_name, last_name').eq('id', '${omkarId}').single();`);
  fs.writeFileSync('app/(erp)/admin-eod/page.tsx', adminTabCode);
}

// 5. Fix HR leave
let hrLeaveCode = fs.readFileSync('app/(erp)/hr/leave/page.tsx', 'utf8');
if (!hrLeaveCode.includes(omkarId)) {
  hrLeaveCode = hrLeaveCode.replace(/const \{ data: \{ user \} \} = await supabase\.auth\.getUser\(\);\n  let employeeId = user\?\.id;\n  if \(\!employeeId\) \{[\s\S]*?employeeId = firstEmp\?\.id;\n  \}/g, `let employeeId = '${omkarId}';`);
  fs.writeFileSync('app/(erp)/hr/leave/page.tsx', hrLeaveCode);
}

// 6. Fix Employee leave
let empLeaveCode = fs.readFileSync('app/(erp)/hr/employee-leave/page.tsx', 'utf8');
if (!empLeaveCode.includes(michaelId)) {
  empLeaveCode = empLeaveCode.replace(/const \{ data: \{ user \} \} = await supabase\.auth\.getUser\(\);\n  let employeeId = user\?\.id;\n  if \(\!employeeId\) \{[\s\S]*?employeeId = firstEmp\?\.id;\n  \}/g, `let employeeId = '${michaelId}';`);
  fs.writeFileSync('app/(erp)/hr/employee-leave/page.tsx', empLeaveCode);
}

console.log('Fixed UI overrides safely!');
