import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabaseAuth/server';

/**
 * Consent screen for Supabase's OAuth 2.1 Server feature, which lets this
 * project act as an OAuth/OIDC identity provider for third-party apps
 * ("Sign in with UTP"). Supabase Auth redirects the user's browser here
 * with `?authorization_id=...`. Path must match the "Authorization Path"
 * configured in Supabase Dashboard > Authentication > OAuth Server.
 * Docs: https://supabase.com/docs/guides/auth/oauth-server
 */
export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string }>;
}) {
  const { authorization_id: authorizationId } = await searchParams;

  if (!authorizationId) {
    return <Shell><p>Missing authorization request. Close this tab and try again from the requesting app.</p></Shell>;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`)}`);
  }

  const { data: authorization, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

  if (error || !authorization) {
    return <Shell><p>{error?.message ?? 'This authorization request is invalid or has expired.'}</p></Shell>;
  }

  // getAuthorizationDetails returns a union: full details when consent is
  // still needed, or a bare redirect when this user already approved this
  // client before. In the latter case skip the screen entirely.
  if (!('authorization_id' in authorization)) {
    redirect(authorization.redirect_url);
  }

  const scopes: string[] = authorization.scope ? authorization.scope.split(' ').filter(Boolean) : [];

  return (
    <Shell>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
        {authorization.client.name || 'A third-party app'} wants to access your account
      </h1>
      <p style={{ fontSize: 13, color: 'var(--muted, #666)', marginBottom: 12 }}>Signed in as {user.email}</p>

      {scopes.length > 0 && (
        <ul style={{ fontSize: 13, background: 'rgba(0,0,0,0.03)', borderRadius: 8, padding: '10px 16px', margin: '0 0 16px', listStyle: 'none' }}>
          {scopes.map((scope) => (
            <li key={scope}>• {scope}</li>
          ))}
        </ul>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <form action="/api/oauth/decision" method="POST" style={{ flex: 1 }}>
          <input type="hidden" name="authorization_id" value={authorizationId} />
          <input type="hidden" name="decision" value="deny" />
          <button type="submit" className="btn btn-quiet" style={{ width: '100%', justifyContent: 'center' }}>Deny</button>
        </form>
        <form action="/api/oauth/decision" method="POST" style={{ flex: 1 }}>
          <input type="hidden" name="authorization_id" value={authorizationId} />
          <input type="hidden" name="decision" value="approve" />
          <button type="submit" className="btn" style={{ width: '100%', justifyContent: 'center' }}>Allow</button>
        </form>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400, background: 'var(--card, #fff)', border: '1px solid var(--border, #e5e5e5)', borderRadius: 16, padding: 32 }}>
        {children}
      </div>
    </div>
  );
}
