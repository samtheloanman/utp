import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireUser } from '@/lib/supabaseAuth/requireUser';
import { createUserScopedClient } from '@/lib/supabaseAuth/userClient';
import { parseVoteInput } from '@/lib/votes/parseVoteInput';

function hashIP(ip: string, salt: string): string {
  return crypto.createHash('sha256').update(ip + salt).digest('hex').substring(0, 16);
}

export async function POST(req: NextRequest) {
  const salt = process.env.IP_SALT;
  if (!salt && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ message: 'Voting is not configured' }, { status: 503 });
  }

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
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';
    // Outside production an unset salt stores no IP hash rather than a guessable one.
    const ipHash = salt ? hashIP(ip, salt) : null;

    const supabase = createUserScopedClient(auth.accessToken);
    const { error } = await supabase.from('shadow_votes').upsert(
      {
        bill_id: input.billId,
        user_id: auth.user.id,
        vote: input.vote,
        ip_hash: ipHash,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'bill_id,user_id' },
    );
    if (error) {
      console.error('vote upsert failed', { code: (error as { code?: string }).code });
      return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
    return NextResponse.json({ message: 'Vote recorded' });
  } catch {
    console.error('vote handler failed');
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
