import { NextResponse } from 'next/server';
import { getAllEODs } from '@/lib/actions/eod';

export async function GET() {
  const result = await getAllEODs({ branchId: 'all' });
  return NextResponse.json(result);
}
