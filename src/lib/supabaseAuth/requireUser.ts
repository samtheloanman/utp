import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createCookieClient } from './server';

export type RequireUserResult =
  | { user: { id: string }; accessToken: string }
  | { error: Response };

function json(status: number, message: string): { error: Response } {
  return { error: Response.json({ message }, { status }) };
}

/**
 * The single way API routes resolve the canonical Supabase civic account.
 * Reads `Authorization: Bearer <jwt>` first, otherwise the cookie session.
 * The user id always comes from a validated Supabase session, never from
 * the request body.
 */
export async function requireUser(req: Request): Promise<RequireUserResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return json(503, 'Auth is not configured');

  const header = req.headers.get('authorization');
  const match = header ? /^Bearer\s+(.+)$/i.exec(header.trim()) : null;

  if (match) {
    const token = match[1].trim();
    const supabase = createSupabaseClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return json(401, 'Unauthorized');
    return { user: { id: data.user.id }, accessToken: token };
  }

  const supabase = await createCookieClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return json(401, 'Unauthorized');
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) return json(401, 'Unauthorized');
  return { user: { id: data.user.id }, accessToken };
}
