import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function hashIP(ip: string): string {
  const salt = process.env.IP_SALT || 'default_salt';
  return crypto.createHash('sha256')
    .update(ip + salt)
    .digest('hex')
    .substring(0, 16);
}

export async function POST(req: NextRequest) {
  try {
    const { billId, vote } = await req.json();
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1';
    const ipHash = hashIP(ip);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Upsert vote
    const { error: voteError } = await supabase
      .from('shadow_votes')
      .upsert({
        bill_id: billId,
        user_id: user.id,
        vote,
        ip_hash: ipHash,
        created_at: new Date().toISOString(),
      }, { onConflict: 'bill_id,user_id' });

    if (voteError) {
      throw voteError;
    }

    // Update aggregates (In a real app, this might be a database trigger)
    // For this prototype, we can do it manually or assume a trigger exists.
    // Let's assume a RPC or trigger handles it for better consistency.

    return NextResponse.json({ message: 'Vote recorded' });
  } catch (err: any) {
    console.error('Error in vote API:', err);
    return NextResponse.json({ message: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
