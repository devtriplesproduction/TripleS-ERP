const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const dates = ['2026-09-08', '2026-09-17', '2026-09-30'];
  
  for (const date of dates) {
    const { data: holiday } = await supabase.from('holidays').select('*').eq('date', date).single();
    if (holiday) {
      console.log(`\n=== HOLIDAY: ${holiday.date} ===`);
      console.log(`ID: ${holiday.id}`);
      console.log(`Name: ${holiday.name}`);
      console.log(`Type: ${holiday.holiday_type}`);
      console.log(`Created At: ${holiday.created_at}`);
      console.log(`Updated At: ${holiday.updated_at}`);
      console.log(`Created By: ${holiday.created_by}`);
      console.log(`Full Object:`, JSON.stringify(holiday, null, 2));
    }
  }
}
run();
