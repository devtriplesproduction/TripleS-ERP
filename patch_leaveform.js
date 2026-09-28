const fs = require('fs');
let code = fs.readFileSync('components/hr/leave/LeaveForm.tsx', 'utf8');

code = code.replace(
  `export function LeaveForm({ onCancel, currentEmployeeId, onSuccess, initialStatus = "Pending HR" }: { onCancel: () => void, currentEmployeeId: string, onSuccess: (leave: any) => void, initialStatus?: string }) {`,
  `export function LeaveForm({ onCancel, currentEmployeeId, onSuccess, initialStatus = "Pending HR", compOffBalance = 0 }: { onCancel: () => void, currentEmployeeId: string, onSuccess: (leave: any) => void, initialStatus?: string, compOffBalance?: number }) {`
);

code = code.replace(
  `    if (!currentEmployeeId) {\r\n      toast.error("User context missing")\r\n      return\r\n    }`,
  `    if (!currentEmployeeId) {\n      toast.error("User context missing")\n      return\n    }\n\n    if (leaveType === 'Compensatory Off') {\n      const requiredHours = duration === 'Half Day' ? 4 : 8;\n      if (compOffBalance < requiredHours) {\n        toast.error(\`Insufficient Comp Off balance. Required: \${requiredHours}h, Available: \${compOffBalance}h.\`);\n        return;\n      }\n    }`
);

code = code.replace(
  `              <SelectItem value="Compensatory Off">Compensatory Off</SelectItem>`,
  `              <SelectItem value="Compensatory Off" disabled={compOffBalance <= 0}>Compensatory Off {compOffBalance <= 0 ? "— 0 hours available" : \`(\${compOffBalance}h available)\`}</SelectItem>`
);

// Fallback if \r\n vs \n issues
code = code.replace(
  `    if (!currentEmployeeId) {\n      toast.error("User context missing")\n      return\n    }\n\n    setLoading(true)`,
  `    if (!currentEmployeeId) {\n      toast.error("User context missing")\n      return\n    }\n\n    if (leaveType === 'Compensatory Off') {\n      const requiredHours = duration === 'Half Day' ? 4 : 8;\n      if (compOffBalance < requiredHours) {\n        toast.error(\`Insufficient Comp Off balance. Required: \${requiredHours}h, Available: \${compOffBalance}h.\`);\n        return;\n      }\n    }\n\n    setLoading(true)`
);

fs.writeFileSync('components/hr/leave/LeaveForm.tsx', code);
console.log("Patched LeaveForm");
