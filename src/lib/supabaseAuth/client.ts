'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Session-aware (cookie-backed) Supabase client for browser components.
 * Separate from src/lib/supabase.ts, which is a plain anon-key client used
 * for public reads and predates any Supabase Auth session handling here.
 * Use this one specifically for signInWithOAuth / getSession / onAuthStateChange.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
