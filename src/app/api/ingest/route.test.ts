import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchBills, ingestBills, createClient } = vi.hoisted(() => ({
  fetchBills: vi.fn(), ingestBills: vi.fn(), createClient: vi.fn(() => ({})),
}));
vi.mock('@/lib/civic/legistar', () => ({
  LEGISTAR_JURISDICTIONS: [
    { client: 'sfgov', name: 'San Francisco', ocdId: 'ocd-division/country:us/state:ca/place:san_francisco' },
    { client: 'lacounty', name: 'Los Angeles County', ocdId: 'ocd-division/country:us/state:ca/county:los_angeles' },
  ],
  legistarAdapter: () => ({ fetchBills }),
}));
vi.mock('@/lib/civic/ingest', () => ({ ingestBills, legistarTarget: (j: { client: string }) => ({ sourceSlug: j.client }) }));
vi.mock('@supabase/supabase-js', () => ({ createClient }));

import { GET, POST } from './route';

const req = (auth?: string, qs = '') =>
  new Request('http://localhost/api/ingest' + qs, { method: 'POST', headers: auth ? { authorization: auth } : {} });

describe('/api/ingest', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    fetchBills.mockReset().mockResolvedValue({ status: 'live', items: [] });
    ingestBills.mockReset().mockResolvedValue({ ok: true, stored: 3 });
    createClient.mockClear();
    vi.stubEnv('CRON_SECRET', 's3');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'svc');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  });

  it('is 503 when not configured', async () => {
    vi.stubEnv('CRON_SECRET', '');
    expect((await POST(req('Bearer s3'))).status).toBe(503);
  });

  it('rejects a missing or wrong secret without touching the database', async () => {
    expect((await POST(req())).status).toBe(401);
    expect((await POST(req('Bearer nope'))).status).toBe(401);
    expect(createClient).not.toHaveBeenCalled();
  });

  it('ingests every place and totals what was stored', async () => {
    const res = await GET(req('Bearer s3'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stored).toBe(6);
    expect(body.results.map((r: { place: string }) => r.place)).toEqual(['sfgov', 'lacounty']);
  });

  it('limits to one place and counts failures as zero', async () => {
    ingestBills.mockResolvedValue({ ok: false, error: 'source unavailable' });
    const body = await (await POST(req('Bearer s3', '?local=SFGOV'))).json();
    expect(body).toEqual({ stored: 0, results: [{ place: 'sfgov', ok: false, error: 'source unavailable' }] });
  });

  it('is 400 for an unknown place', async () => {
    expect((await POST(req('Bearer s3', '?local=atlantis'))).status).toBe(400);
  });
});
