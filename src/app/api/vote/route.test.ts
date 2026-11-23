import { describe, it, expect, vi, beforeEach } from 'vitest';

const requireUser = vi.fn();
vi.mock('@/lib/supabaseAuth/requireUser', () => ({ requireUser }));

const rpc = vi.fn();
const createClient = vi.fn(() => ({ rpc }));
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
    rpc.mockReset().mockResolvedValue({ data: { event_seq: 7, row_hash: 'ab', changed: true }, error: null });
    createClient.mockClear();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
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
    expect(rpc).not.toHaveBeenCalled();
  });

  it('casts through the ledger function as the session user and returns the receipt', async () => {
    requireUser.mockResolvedValue({ user: { id: USER }, accessToken: 'tok' });
    const POST = await load();
    const res = await POST(req({ billId: BILL, vote: 'for', user_id: 'someone-else' }) as never);
    expect(res.status).toBe(200);
    expect((await res.json()).receipt).toEqual({ event_seq: 7, row_hash: 'ab', changed: true });
    expect(rpc).toHaveBeenCalledTimes(1);
    // Only the bill and the choice are sent; the voter comes from the caller's token.
    expect(rpc).toHaveBeenCalledWith('cast_bill_vote', { p_bill_id: BILL, p_vote: 'for' });
    const [, key, cOpts] = createClient.mock.calls[0] as unknown as [string, string, { global: { headers: Record<string, string> } }];
    expect(key).toBe('anon-key');
    expect(cOpts.global.headers.Authorization).toBe('Bearer tok');
  });

  it('answers 404 for a bill that is not stored and 409 when voting is closed', async () => {
    requireUser.mockResolvedValue({ user: { id: USER }, accessToken: 'tok' });
    const POST = await load();
    rpc.mockResolvedValue({ data: null, error: { code: 'P0002', message: 'unknown bill' } });
    expect((await POST(req({ billId: BILL, vote: 'for' }) as never)).status).toBe(404);
    rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'ballot is not open' } });
    expect((await POST(req({ billId: BILL, vote: 'for' }) as never)).status).toBe(409);
  });

  it('answers 503 and logs when the ledger is not configured, instead of calling the ballot closed', async () => {
    requireUser.mockResolvedValue({ user: { id: USER }, accessToken: 'tok' });
    rpc.mockResolvedValue({ data: null, error: { code: '55000', message: 'vote ledger is not configured' } });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const POST = await load();
    const res = await POST(req({ billId: BILL, vote: 'for' }) as never);
    expect(res.status).toBe(503);
    expect((await res.json()).message).not.toMatch(/closed/i);
    expect(spy).toHaveBeenCalledWith('vote ledger is not configured', { code: '55000' });
    spy.mockRestore();
  });

  it('returns generic 500 without leaking DB error text', async () => {
    requireUser.mockResolvedValue({ user: { id: USER }, accessToken: 'tok' });
    rpc.mockResolvedValue({ data: null, error: { message: 'relation secret_table violates policy' } });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const POST = await load();
    const res = await POST(req({ billId: BILL, vote: 'for' }) as never);
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain('secret_table');
    spy.mockRestore();
  });
});
