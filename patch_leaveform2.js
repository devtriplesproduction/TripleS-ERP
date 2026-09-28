const fs = require('fs');
let code = fs.readFileSync('components/hr/leave/LeaveForm.tsx', 'utf8');

const oldCheck = `    if (leaveType === 'Compensatory Off') {
      const requiredHours = duration === 'Half Day' ? 4 : 8;
      if (compOffBalance < requiredHours) {
        toast.error(\`Insufficient Comp Off balance. Required: \${requiredHours}h, Available: \${compOffBalance}h.\`);
        return;
      }
    }`;

const newCheck = `    if (leaveType === 'Compensatory Off') {
      const sDate = new Date(startDate);
      const eDate = new Date(endDate);
      const diffTime = Math.abs(eDate.getTime() - sDate.getTime());
      let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      if (duration === 'Half Day') {
        diffDays = 0.5;
      }
      
      const requiredHours = diffDays * 8;
      if (compOffBalance < requiredHours) {
        toast.error(\`Insufficient Comp Off balance. Required: \${requiredHours}h (\${diffDays} day\${diffDays > 1 ? 's' : ''}), Available: \${compOffBalance}h.\`);
        return;
      }
    }`;

code = code.replace(oldCheck, newCheck);
fs.writeFileSync('components/hr/leave/LeaveForm.tsx', code);
console.log("Patched LeaveForm dates");
