const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkHolidaysAndLeaves() {
  const { data: holidays } = await supabase.from('holidays').select('*');
  console.log('Holidays:', holidays);

  const { data: leaves } = await supabase.from('leave_requests').select('*');
  console.log('Leaves count:', leaves ? leaves.length : 0);
  if (leaves && leaves.length > 0) {
    console.log('Leaves:', leaves);
  }
}

checkHolidaysAndLeaves();
