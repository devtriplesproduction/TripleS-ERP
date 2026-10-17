const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSecAudit() {
  const { data, error } = await supabase.from('security_audit_logs').select('*').limit(1);
  console.log('security_audit_logs accessible:', !error);
}

checkSecAudit();
