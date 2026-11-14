import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseAuth/server';
import { safeRedirectPath } from '@/lib/supabaseAuth/redirect';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectTo = safeRedirectPath(searchParams.get('redirect'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(redirectTo, origin));
    }
  }

  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent('Could not authenticate user')}`, origin));
}
