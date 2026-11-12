import { NextRequest, NextResponse } from 'next/server';
import { getLegislature } from '@/lib/civic/legislature';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  return NextResponse.json(await getLegislature(searchParams.get('country') || 'US'));
}
