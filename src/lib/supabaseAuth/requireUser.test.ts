import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const bearerGetUser = vi.fn();
const cookieGetUser = vi.fn();
const cookieGetSession = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ auth: { getUser: bearerGetUser } })),
}));
vi.mock('./server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: cookieGetUser, getSession: cookieGetSession },
  })),
}));

import { requireUser } from './requireUser';

const ENV_KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const;
const saved: Record<string, string | undefined> = {};

function req(headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/x', { headers });
}

describe('requireUser', () => {
  beforeEach(() => {
    for (const k of ENV_KEYS) saved[k] = process.env[k];
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-test-key';
    bearerGetUser.mockReset();
    cookieGetUser.mockReset();
    cookieGetSession.mockReset();
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('returns 401 with no header and no session', async () => {
    cookieGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } });
    const res = await requireUser(req());
    expect('error' in res).toBe(true);
    if ('error' in res) {
      expect(res.error.status).toBe(401);
      expect(await res.error.json()).toEqual({ message: 'Unauthorized' });
    }
  });

  it('returns 401 for an invalid bearer token', async () => {
    bearerGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad jwt' } });
    const res = await requireUser(req({ authorization: 'Bearer bad' }));
    expect('error' in res && res.error.status).toBe(401);
    expect(cookieGetUser).not.toHaveBeenCalled();
  });

  it('returns user id and echoes token for a valid bearer', async () => {
    bearerGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    const res = await requireUser(req({ authorization: 'Bearer tok-123' }));
    expect(res).toEqual({ user: { id: 'user-1' }, accessToken: 'tok-123' });
    expect(bearerGetUser).toHaveBeenCalledWith('tok-123');
  });

  it('resolves the cookie session when no bearer is sent', async () => {
    cookieGetUser.mockResolvedValue({ data: { user: { id: 'user-2' } }, error: null });
    cookieGetSession.mockResolvedValue({ data: { session: { access_token: 'cookie-tok' } } });
    const res = await requireUser(req());
    expect(res).toEqual({ user: { id: 'user-2' }, accessToken: 'cookie-tok' });
  });

  it('returns 503 and never calls getUser when env is unset', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const res = await requireUser(req({ authorization: 'Bearer tok' }));
    expect('error' in res && res.error.status).toBe(503);
    expect(bearerGetUser).not.toHaveBeenCalled();
    expect(cookieGetUser).not.toHaveBeenCalled();
  });
});
