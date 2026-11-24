import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabaseAuth/requireUser';
import { createUserScopedClient } from '@/lib/supabaseAuth/userClient';
import { parseVoteInput } from '@/lib/votes/parseVoteInput';

/**
 * POST /api/vote
 * Casts or changes the caller's vote on a bill. The database function
 * cast_bill_vote appends to the vote ledger and returns a receipt; the voter
 * is always the session user.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ('error' in auth) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const input = parseVoteInput(body);
  if (!input.ok) return NextResponse.json({ message: input.message }, { status: 400 });

  try {
    const supabase = createUserScopedClient(auth.accessToken);
    const { data, error } = await supabase.rpc('cast_bill_vote', { p_bill_id: input.billId, p_vote: input.vote });
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === 'P0002') return NextResponse.json({ message: 'That bill is not stored here' }, { status: 404 });
      if (code === 'P0001') return NextResponse.json({ message: 'Voting on this bill is closed' }, { status: 409 });
      if (code === '55000') {
        // The ledger has no signing secret: a server fault, not a closed ballot.
        console.error('vote ledger is not configured', { code });
        return NextResponse.json({ message: 'Voting is temporarily unavailable' }, { status: 503 });
      }
      console.error('vote failed', { code });
      return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
    return NextResponse.json({ message: 'Vote recorded', receipt: data });
  } catch {
    console.error('vote handler failed');
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
