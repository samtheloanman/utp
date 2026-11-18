import { NextRequest, NextResponse } from 'next/server';
import { getLegislature, getLocalLegislature } from '@/lib/civic/legislature';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const local = searchParams.get('local');
  if (local) return NextResponse.json(await getLocalLegislature(local));
  return NextResponse.json(await getLegislature(searchParams.get('country') || 'US'));
}
