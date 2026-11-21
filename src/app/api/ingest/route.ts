import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LEGISTAR_JURISDICTIONS, legistarAdapter } from '@/lib/civic/legistar';
import { ingestBills, legistarTarget } from '@/lib/civic/ingest';

export const runtime = 'nodejs';
export const maxDuration = 60;
const PER_PLACE = 10;

/**
 * Pulls recent local legislation and stores it so bills get stable ids that
 * votes can reference. Called by Vercel Cron (GET) or by hand (POST), both
 * with `Authorization: Bearer $CRON_SECRET`. `?local=<client>` limits it to one place.
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!secret || !serviceKey || !url) return NextResponse.json({ message: 'Ingest is not configured' }, { status: 503 });
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const local = new URL(req.url).searchParams.get('local')?.toLowerCase();
  const places = local ? LEGISTAR_JURISDICTIONS.filter((j) => j.client === local) : LEGISTAR_JURISDICTIONS;
  if (places.length === 0) return NextResponse.json({ message: 'Unknown place' }, { status: 400 });

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const results = await Promise.all(
    places.map(async (j) => {
      const fetched = await legistarAdapter(j).fetchBills({ limit: PER_PLACE });
      return { place: j.client, ...(await ingestBills(db, legistarTarget(j), fetched)) };
    }),
  );
  const stored = results.reduce((n, r) => n + (r.ok ? r.stored : 0), 0);
  return NextResponse.json({ stored, results });
}

export const GET = handle;
export const POST = handle;
