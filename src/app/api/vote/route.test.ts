import { describe, it, expect, vi, beforeEach } from 'vitest';

const requireUser = vi.fn();
vi.mock('@/lib/supabaseAuth/requireUser', () => ({ requireUser }));

const upsert = vi.fn();
const from = vi.fn(() => ({ upsert }));
const createClient = vi.fn(() => ({ from }));
vi.mock('@supabase/supabase-js', () => ({ createClient }));

const BILL = '3f2b6c1e-8a4d-4c2b-9e1f-0a1b2c3d4e5f';
const USER = '11111111-2222-4333-8444-555555555555';

function req(body: unknown) {
  return new Request('http://localhost/api/vote', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer tok', 'x-forwarded-for': '1.2.3.4' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function load() {
  vi.resetModules();
  return (await import('./route')).POST;
}

describe('POST /api/vote', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    requireUser.mockReset();
    upsert.mockReset().mockResolvedValue({ error: null });
    from.mockClear();
    createClient.mockClear();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
    vi.stubEnv('IP_SALT', 'salt');
  });

  it('passes through 401 from requireUser', async () => {
    requireUser.mockResolvedValue({ error: Response.json({ message: 'Unauthorized' }, { status: 401 }) });
    const POST = await load();
    const res = await POST(req({ billId: BILL, vote: 'for' }) as never);
    expect(res.status).toBe(401);
    expect(createClient).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid input with no DB call', async () => {
    requireUser.mockResolvedValue({ user: { id: USER }, accessToken: 'tok' });
    const POST = await load();
    for (const b of [{ billId: 'nope', vote: 'for' }, { billId: BILL, vote: 'maybe' }, '{bad json']) {
      const res = await POST(req(b) as never);
      expect(res.status).toBe(400);
    }
    expect(upsert).not.toHaveBeenCalled();
  });

  it('upserts once with the session user, ignoring body user_id, using anon key + caller auth', async () => {
    requireUser.mockResolvedValue({ user: { id: USER }, accessToken: 'tok' });
    const POST = await load();
    const res = await POST(req({ billId: BILL, vote: 'for', user_id: 'someone-else' }) as never);
    expect(res.status).toBe(200);
    expect(upsert).toHaveBeenCalledTimes(1);
    const [row, opts] = upsert.mock.calls[0];
    expect(row.user_id).toBe(USER);
    expect(row.bill_id).toBe(BILL);
    expect(row.vote).toBe('for');
    expect(opts).toEqual({ onConflict: 'bill_id,user_id' });
    expect(createClient).toHaveBeenCalledTimes(1);
    const [, key, cOpts] = createClient.mock.calls[0] as unknown as [string, string, { global: { headers: Record<string, string> } }];
    expect(key).toBe('anon-key');
    expect(key).not.toBe('service-key');
    expect(cOpts.global.headers.Authorization).toBe('Bearer tok');
  });

  it('returns generic 500 without leaking DB error text', async () => {
    requireUser.mockResolvedValue({ user: { id: USER }, accessToken: 'tok' });
    upsert.mockResolvedValue({ error: { message: 'relation secret_table violates policy' } });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const POST = await load();
    const res = await POST(req({ billId: BILL, vote: 'for' }) as never);
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain('secret_table');
    spy.mockRestore();
  });

  it('returns 503 in production when IP_SALT is unset', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('IP_SALT', '');
    requireUser.mockResolvedValue({ user: { id: USER }, accessToken: 'tok' });
    const POST = await load();
    const res = await POST(req({ billId: BILL, vote: 'for' }) as never);
    expect(res.status).toBe(503);
    expect(upsert).not.toHaveBeenCalled();
  });
});
