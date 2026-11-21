import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseAuth/server';
import { safeRedirectPath } from '@/lib/supabaseAuth/redirect';

/** Handles Allow/Deny submissions from src/app/oauth/consent/page.tsx. */
export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: 'Expected form-encoded OAuth consent payload' },
      { status: 400 },
    );
  }
  const rawAuthId = formData.get('authorization_id');
  const rawDecision = formData.get('decision');
  const authorizationId = typeof rawAuthId === 'string' ? rawAuthId.trim() : '';
  const decision = typeof rawDecision === 'string' ? rawDecision : null;

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
