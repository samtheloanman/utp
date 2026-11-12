import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * A Supabase client that acts as the calling user: anon key plus the
 * caller's access token, so Row Level Security applies. Never uses the
 * service-role key.
 */
export function createUserScopedClient(accessToken: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Supabase is not configured');
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
