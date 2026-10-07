const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      id,
      title,
      project_id,
      project:projects(id, name)
    `)
    .limit(5);
    
  console.log(JSON.stringify(data, null, 2));
}
test();
