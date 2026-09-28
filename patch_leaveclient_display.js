const fs = require('fs');
let code = fs.readFileSync('components/hr/leave/LeaveClientPage.tsx', 'utf8');

const oldDisplay = `<span className="font-medium text-foreground">{compOffBalance} hours</span>`;

const newDisplay = `<span className="font-medium text-foreground">{compOffBalance >= 8 ? \`\${Math.floor(compOffBalance / 8)} Day\${Math.floor(compOffBalance / 8) > 1 ? 's' : ''} \${compOffBalance % 8 > 0 ? \`\${compOffBalance % 8} Hour\${compOffBalance % 8 > 1 ? 's' : ''}\` : ''}\` : \`\${compOffBalance} Hour\${compOffBalance > 1 || compOffBalance === 0 ? 's' : ''}\`}</span>`;

code = code.replace(oldDisplay, newDisplay);
fs.writeFileSync('components/hr/leave/LeaveClientPage.tsx', code);
console.log("Patched LeaveClientPage display");
