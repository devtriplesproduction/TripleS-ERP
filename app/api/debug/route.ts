import { NextResponse } from 'next/server';
import { getAllEODs } from '@/lib/actions/eod';

export async function GET() {
  const { createClient } = require('@supabase/supabase-js');
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy', { auth: { persistSession: false } });
  const result = await s.from('eod_reports').select('report_date');
  return NextResponse.json(result);
}
