const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: users, error: uErr } = await supabase.auth.admin.listUsers();
  console.log('Auth users count:', users?.users?.length);
  if (users?.users) {
    users.users.forEach(u => {
      console.log('Auth user:', { id: u.id, email: u.email });
    });
  }
  
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, employee_id, first_name, last_name, role');
  console.log('Profiles:');
  profiles.forEach(p => {
    console.log('Profile:', { id: p.id, employee_id: p.employee_id, name: `${p.first_name} ${p.last_name}`, role: p.role });
  });
}

check();
