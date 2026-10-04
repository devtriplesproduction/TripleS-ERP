const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const { processEODCompOff } = require('./lib/actions/compoff.ts'); // Wait, ts can't be required directly like this.
