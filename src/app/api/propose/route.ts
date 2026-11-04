import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireUser } from '@/lib/supabaseAuth/requireUser';
import { createUserScopedClient } from '@/lib/supabaseAuth/userClient';

const MAX_TITLE = 200;
const MAX_DESCRIPTION = 2000;
const MAX_URL = 2048;
const MAX_SHORT = 50;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function optionalString(v: unknown, max: number): string | null | undefined {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string' || v.length > max) return undefined;
  return v.trim();
}

function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * POST /api/propose
 * Creates a voting proposal. Requires a signed-in user; the proposer is always
 * the session user and vote counts are never accepted from the client.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ('error' in auth) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;

  const title = typeof b.title === 'string' ? b.title.trim() : '';
  if (!title || title.length > MAX_TITLE) {
    return NextResponse.json({ error: `Title is required (1-${MAX_TITLE} characters)` }, { status: 400 });
  }

  const sourceUrl = optionalString(b.sourceUrl, MAX_URL);
  if (sourceUrl === undefined || (sourceUrl !== null && !isHttpUrl(sourceUrl))) {
    return NextResponse.json({ error: 'sourceUrl must be an http(s) URL' }, { status: 400 });
  }
  const description = optionalString(b.description, MAX_DESCRIPTION);
  const bias = optionalString(b.bias, MAX_SHORT);
  const category = optionalString(b.category, MAX_SHORT);
  if (description === undefined || bias === undefined || category === undefined) {
    return NextResponse.json({ error: 'Invalid field length or type' }, { status: 400 });
  }

  try {
    const client = createUserScopedClient(auth.accessToken);
    const { data, error } = await client
      .from('voting_proposals')
      .insert({
        title,
        description: description ?? '',
        source_url: sourceUrl,
        bias_score: bias ?? 'center',
        category: category ?? 'General',
        status: 'active',
        proposer_id: auth.user.id,
      })
      .select()
      .single();

    if (error) {
      if ((error as { code?: string }).code === '23505') {
        return NextResponse.json({ error: 'This article has already been proposed' }, { status: 409 });
      }
      console.error('propose insert failed', { code: (error as { code?: string }).code });
      return NextResponse.json({ error: 'Failed to create proposal' }, { status: 500 });
    }
    return NextResponse.json({ success: true, proposal: data }, { status: 201 });
  } catch {
    console.error('propose handler failed');
    return NextResponse.json({ error: 'Failed to create proposal' }, { status: 500 });
  }
}

/**
 * GET /api/propose
 * Lists voting proposals (public read). limit defaults to 20, max 50.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'active';
  const parsed = parseInt(searchParams.get('limit') || '', 10);
  const limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, MAX_LIMIT) : DEFAULT_LIMIT;

  const { data, error } = await supabase
    .from('voting_proposals')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('propose fetch failed', { code: (error as { code?: string }).code });
    return NextResponse.json({ proposals: [], error: 'Failed to fetch proposals' }, { status: 500 });
  }

  return NextResponse.json({
    proposals: data || [],
    total: data?.length || 0,
    timestamp: new Date().toISOString(),
  });
}
