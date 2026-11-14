'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseAuth/client';
import { safeRedirectPath } from '@/lib/supabaseAuth/redirect';

/**
 * Supabase-Auth-backed social login. Separate from the Privy "Sign In"
 * button in TopBar (src/components/ui/Shared.tsx), which drives wallet /
 * embedded-wallet auth and is unaffected by this page. This path exists
 * because user_profiles and tracked_bills (supabase/migrations/
 * 20260711000000_add_bill_actions_profiles_tracked.sql) already key off
 * auth.users + auth.uid() via RLS -- that only works for users who signed
 * in through Supabase Auth, which nothing in the app did until now.
 */
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get('redirect'));
  const callbackError = searchParams.get('error');
  const [error, setError] = useState<string | null>(callbackError);
  const [loading, setLoading] = useState<'google' | 'github' | null>(null);

  const handleLogin = async (provider: 'google' | 'github') => {
    setError(null);
    setLoading(provider);
    try {
      const supabase = createClient();
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      callbackUrl.searchParams.set('redirect', redirectTo);

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callbackUrl.toString() },
      });
      if (error) {
        setError(error.message);
        setLoading(null);
      }
      // On success the browser navigates to the provider; nothing else to do.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start sign-in');
      setLoading(null);
    }
  };

  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380, background: 'var(--card, #fff)', border: '1px solid var(--border, #e5e5e5)', borderRadius: 16, padding: 32 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Sign in</h1>
        <p style={{ fontSize: 13, color: 'var(--muted, #666)', marginBottom: 20 }}>
          Sign in to track bills, vote, and manage your profile.
        </p>

        {error && (
          <div style={{ fontSize: 13, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => handleLogin('google')}
            className="btn"
            style={{ width: '100%', justifyContent: 'center', opacity: loading && loading !== 'google' ? 0.5 : 1 }}
          >
            {loading === 'google' ? 'Redirecting…' : 'Continue with Google'}
          </button>
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => handleLogin('github')}
            className="btn"
            style={{ width: '100%', justifyContent: 'center', opacity: loading && loading !== 'github' ? 0.5 : 1 }}
          >
            {loading === 'github' ? 'Redirecting…' : 'Continue with GitHub'}
          </button>
        </div>
      </div>
    </div>
  );
}
