const fs = require('fs');

let code = fs.readFileSync('lib/actions/eod.ts', 'utf8');

code = code.replace(/if \(\!currentUser\) return \{ success: false, error: "Unauthorized" \};/g, 'if (!currentUser) return { success: false, error: "Unauthorized" };\n    const supabase = _authSupabase;');

fs.writeFileSync('lib/actions/eod.ts', code);
console.log('Fixed supabase');
