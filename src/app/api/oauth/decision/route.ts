import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseAuth/server';
import { safeRedirectPath } from '@/lib/supabaseAuth/redirect';

/** Handles Allow/Deny submissions from src/app/oauth/consent/page.tsx. */
export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const formData = await request.formData();
  const authorizationId = formData.get('authorization_id') as string | null;
  const decision = formData.get('decision') as string | null;

  if (!authorizationId || (decision !== 'approve' && decision !== 'deny')) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent('Malformed OAuth consent submission')}`, origin));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const consentPath = safeRedirectPath(`/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`);
    return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(consentPath)}`, origin));
  }

  const { data, error } =
    decision === 'approve'
      ? await supabase.auth.oauth.approveAuthorization(authorizationId)
      : await supabase.auth.oauth.denyAuthorization(authorizationId);

  if (error || !data?.redirect_url) {
    return NextResponse.redirect(
      new URL(
        `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}&error=${encodeURIComponent(error?.message ?? 'Could not process decision')}`,
        origin,
      ),
    );
  }

  return NextResponse.redirect(data.redirect_url);
}
