const { createServerClient } = require('@supabase/ssr');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/)[1].trim();

async function run() {
  let cookiesMap = new Map();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return Array.from(cookiesMap.entries()).map(([name, value]) => ({ name, value }));
      },
      setAll(cookies) {
        cookies.forEach(c => cookiesMap.set(c.name, c.value));
      }
    }
  });

  const { data: auth, error } = await supabase.auth.signInWithPassword({
    email: 'admin@triples.com',
    password: 'Password@123'
  });

  if (error) {
    console.error('Sign in error:', error);
    return;
  }

  console.log('User signed in successfully:', auth.user.email);
  const cookieHeader = Array.from(cookiesMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ');

  console.log('Fetching /super-admin/leave with valid session cookies...');
  const res = await fetch('http://localhost:3000/super-admin/leave', {
    headers: {
      cookie: cookieHeader,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0'
    },
    redirect: 'manual'
  });

  console.log('Status code:', res.status);
  const html = await res.text();
  console.log('Includes Leave & WFH Request:', html.includes('Leave &amp; WFH Request') || html.includes('Leave & WFH Request'));
  console.log('Includes My Leaves:', html.includes('My Leaves'));
  console.log('Includes Approvals:', html.includes('Approvals'));
  console.log('Includes Apply Leave:', html.includes('Apply Leave'));
  console.log('Includes Review Leave / WFH in sidebar:', html.includes('Review Leave / WFH'));
}

run().catch(console.error);
