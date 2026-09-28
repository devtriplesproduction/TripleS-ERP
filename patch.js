const fs = require('fs');

let code = fs.readFileSync('app/(erp)/employee-eod/page.tsx', 'utf8');
const replacement = '<EODSubmissionForm employeeId={user.id} canEditDate={false} canManage={false} employeeName={`${user.first_name} ${user.last_name}`} employeeStringId="EMP-002" />';
code = code.replace(/<EODSubmissionForm[\s\S]*?\/>/, replacement);
fs.writeFileSync('app/(erp)/employee-eod/page.tsx', code);
console.log('Fixed');
