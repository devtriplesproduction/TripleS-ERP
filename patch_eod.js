const fs = require('fs');
let code = fs.readFileSync('lib/actions/eod.ts', 'utf8');

const target = `    if (error) {
      console.error("Failed to update EOD report:", error);
      return { success: false, error: "Failed to review EOD" };
    }

    // Log Activity`;

const replacement = `    if (error) {
      console.error("Failed to update EOD report:", error);
      return { success: false, error: "Failed to review EOD" };
    }

    if (newStatus === 'Approved') {
      await processEODCompOff(eodId, eod.employee_id, eod.office_hours, newStatus);
    }

    // Log Activity`;

code = code.replace(target, replacement);
fs.writeFileSync('lib/actions/eod.ts', code);
console.log("Patched eod.ts");
