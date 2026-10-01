require('dotenv').config({ path: '.env' });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const res = await fetch(`${url}/pgmeta/default/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({ query: 'SELECT 1;' })
  });

  if (!res.ok) {
    console.error('Error pgmeta:', await res.text());
  } else {
    console.log('Success pgmeta:', await res.text());
  }
}
run();
