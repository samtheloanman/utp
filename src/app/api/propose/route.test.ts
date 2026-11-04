import { describe, it, expect, vi, beforeEach } from 'vitest';

const requireUser = vi.fn();
vi.mock('@/lib/supabaseAuth/requireUser', () => ({ requireUser }));

const single = vi.fn();
const limit = vi.fn();
const insert = vi.fn();
const chain: Record<string, unknown> = {};
chain.insert = insert.mockReturnValue(chain);
const select = vi.fn<(cols?: string) => unknown>(() => chain);
chain.select = select;
chain.eq = vi.fn(() => chain);
chain.order = vi.fn(() => chain);
chain.single = single;
chain.limit = limit;
const from = vi.fn(() => chain);
const createClient = vi.fn(() => ({ from }));
vi.mock('@supabase/supabase-js', () => ({ createClient }));

const USER = '11111111-2222-4333-8444-555555555555';

function post(body: unknown) {
  return new Request('http://localhost/api/propose', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer tok' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function load() {
  vi.resetModules();
  return import('./route');
}

describe('/api/propose', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    requireUser.mockReset().mockResolvedValue({ user: { id: USER }, accessToken: 'tok' });
    insert.mockClear();
    select.mockClear();
    single.mockReset().mockResolvedValue({ data: { id: 'p1' }, error: null });
    limit.mockReset().mockResolvedValue({ data: [], error: null });
    from.mockClear();
    createClient.mockClear();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
  });

  it('POST without auth returns 401 and touches no DB', async () => {
    requireUser.mockResolvedValue({ error: Response.json({ message: 'Unauthorized' }, { status: 401 }) });
    const { POST } = await load();
    const res = await POST(post({ title: 'x' }) as never);
    expect(res.status).toBe(401);
    expect(insert).not.toHaveBeenCalled();
  });

  it('rejects empty, blank, non-string and over-200-char titles with 400', async () => {
    const { POST } = await load();
    for (const title of ['', '   ', 123, 'a'.repeat(201), undefined]) {
      const res = await POST(post({ title }) as never);
      expect(res.status).toBe(400);
    }
    expect((await POST(post('{bad') as never)).status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it('rejects a sourceUrl that is not http(s)', async () => {
    const { POST } = await load();
    for (const sourceUrl of ['javascript:alert(1)', 'ftp://x.test/a', 'not a url', 'data:text/html,hi']) {
      const res = await POST(post({ title: 'T', sourceUrl }) as never);
      expect(res.status).toBe(400);
    }
    expect(insert).not.toHaveBeenCalled();
  });

  it('maps a unique violation on source_url to 409', async () => {
    single.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key' } });
    const { POST } = await load();
    const res = await POST(post({ title: 'T', sourceUrl: 'https://example.test/a' }) as never);
    expect(res.status).toBe(409);
  });

  it('inserts proposer_id from the session and never votes_for/votes_against from the body', async () => {
    const { POST } = await load();
    const res = await POST(
      post({
        title: ' Hello ',
        sourceUrl: 'https://example.test/a',
        proposer_id: 'someone-else',
        votes_for: 999,
        votes_against: 5,
      }) as never,
    );
    expect(res.status).toBe(201);
    const row = insert.mock.calls[0][0];
    expect(row.proposer_id).toBe(USER);
    expect(row.title).toBe('Hello');
    expect(row).not.toHaveProperty('votes_for');
    expect(row).not.toHaveProperty('votes_against');
    const [, key, opts] = createClient.mock.calls.at(-1) as unknown as [string, string, { global: { headers: Record<string, string> } }];
    expect(key).toBe('anon-key');
    expect(opts.global.headers.Authorization).toBe('Bearer tok');
  });

  it('returns a generic 500 without leaking DB error text', async () => {
    single.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'secret_table exploded' } });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { POST } = await load();
    const res = await POST(post({ title: 'T' }) as never);
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain('secret_table');
    spy.mockRestore();
  });

  it('GET clamps limit=100000 to 50 and falls back to 20 for limit=abc', async () => {
    const { GET } = await load();
    await GET(new Request('http://localhost/api/propose?limit=100000') as never);
    expect(limit).toHaveBeenLastCalledWith(50);
    await GET(new Request('http://localhost/api/propose?limit=abc') as never);
    expect(limit).toHaveBeenLastCalledWith(20);
    await GET(new Request('http://localhost/api/propose?limit=0') as never);
    expect(limit).toHaveBeenLastCalledWith(20);
    await GET(new Request('http://localhost/api/propose?limit=7') as never);
    expect(limit).toHaveBeenLastCalledWith(7);
  });

  it('GET selects an explicit column list that excludes proposer_id', async () => {
    const { GET } = await load();
    await GET(new Request('http://localhost/api/propose') as never);
    const cols = select.mock.calls.at(-1)?.[0] as string;
    expect(cols).not.toBe('*');
    expect(cols).not.toContain('proposer_id');
    expect(cols).toContain('title');
    expect(cols).toContain('source_url');
  });
});
