const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkState() {
  console.log("Checking EMP-003 state...");

  const { data: onboarding, error: onbErr } = await supabase
    .from('employee_onboarding')
    .select('id, employee_id_number, is_hod')
    .eq('employee_id_number', 'EMP-003')
    .single();

  if (onbErr) console.error("Onboarding Error:", onbErr);
  else console.log("Onboarding Record:", onboarding);

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('id, employee_id, is_hod, role')
    .eq('employee_id', 'EMP-003')
    .single();

  if (profErr) console.error("Profile Error:", profErr);
  else console.log("Profile Record:", profile);
}

checkState();
