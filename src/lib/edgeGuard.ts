import { NextResponse } from 'next/server';

/** Vercel Firewall rate-limit rule IDs (Project → Firewall → Rate limit, "Rate limiting SDK" rules). */
export type GuardRule = 'vote' | 'propose' | 'oauth-decision';

const LIMIT_TIMEOUT_MS = 800;

/**
 * Rejects bots (Vercel BotID) and callers over the Firewall rate limit before a
 * write route does any work. Returns a response to send, or null to continue.
 *
 * Only runs on Vercel. A limiter outage fails open with a log line so voting
 * does not go down with it; a positive bot verdict fails closed.
 */
export async function guardRequest(request: Request, rule: GuardRule): Promise<NextResponse | null> {
  if (!process.env.VERCEL) return null;
  const [{ checkBotId }, { checkRateLimit }] = await Promise.all([import('botid/server'), import('@vercel/firewall')]);

  const bot = await checkBotId();
  if (bot.isBot) return NextResponse.json({ message: 'Access denied' }, { status: 403 });

  try {
    const { rateLimited } = await checkRateLimit(rule, { request, timeout: LIMIT_TIMEOUT_MS });
    if (rateLimited) {
      return NextResponse.json({ message: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
    }
  } catch (error) {
    console.error('rate limit check failed; allowing request', { rule, error: String(error) });
  }
  return null;
}
