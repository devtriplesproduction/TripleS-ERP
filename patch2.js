const fs = require('fs');
const path = 'c:/Users/HP/Desktop/Triple S Production/TripleS-ERP/lib/actions/eod.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /\/\/ Status should remain the same or be reset to Approved\?[\s\S]*?\/\/ Proxy submissions are automatically approved\. Updates by admin remain approved\.[\s\S]*?const status = 'Approved';/,
  `// Fetch the existing EOD to preserve its status
    const { data: existingEod } = await supabase
      .from('eod_reports')
      .select('status')
      .eq('employee_id', payload.employee_id)
      .eq('report_date', payload.report_date)
      .single();
      
    const status = existingEod?.status || 'Approved';`
);

fs.writeFileSync(path, content, 'utf8');
