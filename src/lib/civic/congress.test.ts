import { describe, expect, it, vi } from 'vitest';
import { congressAdapter } from './congress';
import { classifyFreshness } from './freshness';

const NOW = new Date('2026-11-03T12:00:00.000Z');
const bill = (n: string, text = 'Referred to committee') => ({
  congress: 119, type: 'HR', number: n, title: `Bill ${n}`, originChamber: 'House',
  updateDate: '2026-11-02', latestAction: { actionDate: '2026-11-01', text },
  url: `https://api.congress.gov/v3/bill/119/hr/${n}?format=json`,
});
const ok = (bills: unknown[]) => vi.fn(async () => new Response(JSON.stringify({ bills }), { status: 200 }));
const mk = (f: typeof fetch, apiKey: string | null = 'k') =>
  congressAdapter({ apiKey: apiKey ?? undefined, fetch: f, now: () => NOW });

describe('congressAdapter', () => {
  it('is unavailable without an apiKey and does not fetch', async () => {
    const f = ok([]);
    const r = await mk(f as unknown as typeof fetch, null).fetchBills({ limit: 5 });
    expect(r.status).toBe('unavailable');
    expect(r.items).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });
  it('is unavailable on HTTP 500', async () => {
    const f = vi.fn(async () => new Response('x', { status: 500 }));
    expect((await mk(f as unknown as typeof fetch).fetchBills({ limit: 5 })).status).toBe('unavailable');
  });
  it('is unavailable on network error', async () => {
    const f = vi.fn(async () => { throw new Error('boom'); });
    const r = await mk(f as unknown as typeof fetch).fetchBills({ limit: 5 });
    expect(r.status).toBe('unavailable');
    expect(r.items).toEqual([]);
  });
  it('is unavailable on malformed JSON', async () => {
    const f = vi.fn(async () => new Response('{nope', { status: 200 }));
    expect((await mk(f as unknown as typeof fetch).fetchBills({ limit: 5 })).status).toBe('unavailable');
  });
  it('returns live items with sourceUrl, injected clock, and no fixtures', async () => {
    const r = await mk(ok([bill('100'), bill('200')]) as unknown as typeof fetch).fetchBills({ limit: 5 });
    expect(r.status).toBe('live');
    expect(r.items).toHaveLength(2);
    expect(r.fetchedAt).toBe(NOW.toISOString());
    for (const i of r.items) expect(i.sourceUrl).not.toBe('');
    const ids = r.items.map((i) => i.externalId);
    for (const bad of ['us-hr4763', 'us-s2281', 'us-hr5121']) expect(ids).not.toContain(bad);
  });
  it('hashes deterministically and changes with latestAction', async () => {
    const h = async (t?: string) =>
      (await mk(ok([bill('100', t)]) as unknown as typeof fetch).fetchBills({ limit: 1 })).items[0].recordHash;
    expect(await h()).toBe(await h());
    expect(await h()).not.toBe(await h('Passed House'));
    expect(await h()).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('congressAdapter hardening', () => {
  it('builds the public congress.gov URL and never leaks api_key', async () => {
    const r = await mk(ok([bill('123'), { ...bill('9'), type: 'SJRES' }]) as unknown as typeof fetch).fetchBills({ limit: 5 });
    expect(r.items[0].sourceUrl).toBe('https://www.congress.gov/bill/119th-congress/house-bill/123');
    expect(r.items[1].sourceUrl).toBe('https://www.congress.gov/bill/119th-congress/senate-joint-resolution/9');
    expect(JSON.stringify(r)).not.toContain('api_key');
  });
  it('skips rows with missing fields or unknown type and counts them', async () => {
    const rows = [bill('1'), { ...bill('2'), type: 'XYZ' }, { ...bill('3'), number: undefined }, { ...bill('4'), congress: undefined }];
    const r = await mk(ok(rows) as unknown as typeof fetch).fetchBills({ limit: 5 });
    expect(r.items).toHaveLength(1);
    expect(r.error).toContain('3');
  });
  it('sends key by header and passes a signal', async () => {
    const f = ok([bill('1')]);
    await mk(f as unknown as typeof fetch).fetchBills({ limit: 5 });
    const [url, init] = (f.mock.calls[0] as unknown as [string, RequestInit]);
    expect(url).not.toContain('api_key');
    expect((init.headers as Record<string, string>)['X-Api-Key']).toBe('k');
    expect(init.signal).toBeDefined();
  });
  it('times out a never-resolving fetch as unavailable', async () => {
    const f = ((_u: string, init: RequestInit) =>
      new Promise((_res, rej) => init.signal?.addEventListener('abort', () => rej(new Error('aborted'))))) as unknown as typeof fetch;
    const r = await congressAdapter({ apiKey: 'k', fetch: f, now: () => NOW, timeoutMs: 20 }).fetchBills({ limit: 5 });
    expect(r.status).toBe('unavailable');
  });
});

describe('classifyFreshness', () => {
  it('null is unavailable', () => expect(classifyFreshness(null, NOW, 1000)).toBe('unavailable'));
  it('old is stale', () => expect(classifyFreshness('2026-11-03T11:00:00.000Z', NOW, 1000)).toBe('stale'));
  it('recent is live', () => expect(classifyFreshness('2026-11-03T11:59:59.500Z', NOW, 1000)).toBe('live'));
});
