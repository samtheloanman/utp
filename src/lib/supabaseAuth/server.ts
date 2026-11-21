import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Session-aware (cookie-backed) Supabase client for Server Components,
 * Server Actions, and Route Handlers. Pairs with client.ts's browser
 * client and src/middleware.ts, which refreshes the session cookie on
 * every request.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component -- safe to ignore since
            // middleware.ts refreshes sessions on every matched request.
          }
        },
      },
    }
  );
}
