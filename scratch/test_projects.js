const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data: projects, error } = await supabase.from('projects').select('id, name');
  console.log("PROJECTS:", projects);

  const { data: tasks } = await supabase.from('tasks').select('id, title, project_id, project:projects(id, name)');
  console.log("TASKS SAMPLE:", tasks.slice(0, 10));
}
test();
