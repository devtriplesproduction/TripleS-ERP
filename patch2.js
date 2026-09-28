const fs = require('fs');

let code = fs.readFileSync('app/(erp)/eod/page.tsx', 'utf8');
const replacement = '<EODSubmissionForm employeeId={user.id} canEditDate={canManage} employees={canManage ? allEmployees : undefined} canManage={canManage} employeeName={`${user.first_name} ${user.last_name}`} employeeStringId="EMP-001" />';
code = code.replace(/<EODSubmissionForm[\s\S]*?\/>/, replacement);

// Also fix the RecentEODLogs to use the correct name
code = code.replace(/<RecentEODLogs history=\{history\} user=\{\{ first_name: user\.first_name, last_name: user\.last_name, employee_id: 'EMP-001' \}\} \/>/, '<RecentEODLogs history={history} user={{ first_name: user.first_name, last_name: user.last_name, employee_id: "EMP-001" }} />');

fs.writeFileSync('app/(erp)/eod/page.tsx', code);
console.log('Fixed HR tab UI');
