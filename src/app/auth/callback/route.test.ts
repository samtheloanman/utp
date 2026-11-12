import { beforeEach, describe, expect, it, vi } from 'vitest';

const exchangeCodeForSession = vi.fn();

vi.mock('@/lib/supabaseAuth/server', () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession } }),
}));

import { GET } from './route';

describe('GET /auth/callback', () => {
  beforeEach(() => exchangeCodeForSession.mockReset());

  it('never redirects off-site, even with a hostile redirect param', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const res = await GET(new Request('https://utp.test/auth/callback?code=c&redirect=@evil.com'));
    expect(new URL(res.headers.get('location')!).origin).toBe('https://utp.test');
  });

  it('redirects to a safe same-origin redirect param', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const res = await GET(new Request('https://utp.test/auth/callback?code=c&redirect=%2Foauth%2Fconsent%3Fauthorization_id%3Da'));
    expect(res.headers.get('location')).toBe('https://utp.test/oauth/consent?authorization_id=a');
  });

  it('sends exchange errors to same-origin /login?error=', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: 'bad' } });
    const res = await GET(new Request('https://utp.test/auth/callback?code=c&redirect=@evil.com'));
    const loc = new URL(res.headers.get('location')!);
    expect(loc.origin).toBe('https://utp.test');
    expect(loc.pathname).toBe('/login');
    expect(loc.searchParams.get('error')).toBeTruthy();
  });
});
