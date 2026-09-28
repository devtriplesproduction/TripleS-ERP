const fs = require('fs');

let code = fs.readFileSync('lib/actions/eod.ts', 'utf8');

// The replacement for `submitEOD` and `reviewEOD`
const oldUserPattern = /const currentUser = \{ id: "11111111-1111-4111-8111-111111111111", roles: \["SUPER_ADMIN", "HR"\] \};/g;

const newUserPattern = `const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Attempt to get roles or fallback to super admin for testing if no user
    // Since the system relies on role, we need to extract it
    let currentUser: { id: string, roles: string[], email?: string } | null = null;
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('roles, email').eq('id', user.id).single();
      currentUser = {
        id: user.id,
        email: user.email || profile?.email || 'unknown',
        roles: profile?.roles || ['EMPLOYEE']
      };
    } else {
      // For local unauthenticated dev testing, fallback to a real existing employee ID
      // so it matches the DB actually.
      const { data: firstEmp } = await supabase.from('employee_onboarding').select('id, email').limit(1).single();
      if (firstEmp) {
        currentUser = {
          id: firstEmp.id,
          email: firstEmp.email,
          roles: ['SUPER_ADMIN', 'HR'] // Assume admin if no auth is set up locally
        }
      }
    }
`;

// In both functions, `const supabase = await createClient();` is already present below `const currentUser = ...;`
// We need to carefully replace the old pattern and remove the duplicate `const supabase = await createClient();`
code = code.replace(oldUserPattern, newUserPattern);

// Clean up duplicate supabase client creations
code = code.replace(/const supabase = await createClient\(\);\s*\n\s*const supabase = await createClient\(\);/g, 'const supabase = await createClient();');
// But since the original code had:
// const currentUser = ...
// if (!currentUser) return ...
// const supabase = await createClient();
// We can just replace the original `const supabase = await createClient();` with nothing.
code = code.replace(/if \(\!currentUser\) return \{ success: false, error: "Unauthorized" \};\s*\n\s*const supabase = await createClient\(\);/g, 'if (!currentUser) return { success: false, error: "Unauthorized" };');

fs.writeFileSync('lib/actions/eod.ts', code);
console.log('Fixed eod.ts auth mapping');
