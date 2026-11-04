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

describe('classifyFreshness', () => {
  it('null is unavailable', () => expect(classifyFreshness(null, NOW, 1000)).toBe('unavailable'));
  it('old is stale', () => expect(classifyFreshness('2026-11-03T11:00:00.000Z', NOW, 1000)).toBe('stale'));
  it('recent is live', () => expect(classifyFreshness('2026-11-03T11:59:59.500Z', NOW, 1000)).toBe('live'));
});
