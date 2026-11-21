'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseAuth/client';
import { safeRedirectPath } from '@/lib/supabaseAuth/redirect';

/**
 * Canonical Supabase-Auth-backed civic sign-in. Powers TopBar Sign In / Sign Out,
 * VotePanel, /api/propose, and ERC-4361 SIWE wallet linking (wallet_links) via
 * auth.users + auth.uid() RLS.
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
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      callbackUrl.searchParams.set('redirect', redirectTo);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callbackUrl.toString() },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      }
      // On success the browser navigates to the provider; nothing else to do.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start sign-in');
      setLoading(false);
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
          <div role="alert" style={{ fontSize: 13, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleLogin}
            className="btn"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {loading ? 'Redirecting…' : 'Continue with Google'}
          </button>
        </div>
      </div>
    </div>
  );
}
