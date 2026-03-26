import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/propose
 * Creates a voting proposal from a news article.
 * Stores in Supabase `voting_proposals` table.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, sourceUrl, bias, category, description } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Check for duplicate proposals (same source URL)
    if (sourceUrl) {
      const { data: existing } = await supabase
        .from('voting_proposals')
        .select('id')
        .eq('source_url', sourceUrl)
        .single();

      if (existing) {
        return NextResponse.json({ error: 'This article has already been proposed', id: existing.id }, { status: 409 });
      }
    }

    const { data, error } = await supabase
      .from('voting_proposals')
      .insert({
        title,
        description: description || '',
        source_url: sourceUrl || '',
        bias_score: bias || 'center',
        category: category || 'General',
        status: 'active',
        votes_for: 0,
        votes_against: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: 'Failed to create proposal' }, { status: 500 });
    }

    return NextResponse.json({ success: true, proposal: data }, { status: 201 });
  } catch (err) {
    console.error('Propose error:', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

/**
 * GET /api/propose
 * Lists all active voting proposals.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'active';
  const limit = parseInt(searchParams.get('limit') || '20');

  const { data, error } = await supabase
    .from('voting_proposals')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Supabase fetch error:', error);
    return NextResponse.json({ proposals: [], error: 'Failed to fetch proposals' }, { status: 500 });
  }

  return NextResponse.json({
    proposals: data || [],
    total: data?.length || 0,
    timestamp: new Date().toISOString(),
  });
}
