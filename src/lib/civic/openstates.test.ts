import { describe, expect, it, vi } from 'vitest';
import { openStatesAdapter } from './openstates';

const NOW = new Date('2026-11-03T12:00:00.000Z');
const row = (id: string, act = 'In committee') => ({
  id: `ocd-bill/${id}`, identifier: `AB ${id}`, title: `T${id}`, latest_action_description: act,
  updated_at: '2026-11-02T00:00:00Z', first_action_date: '2026-01-05', openstates_url: `https://openstates.org/ca/bills/2025/AB${id}/`,
});
const ok = (results: unknown[]) => vi.fn(async () => new Response(JSON.stringify({ results }), { status: 200 })) as unknown as typeof fetch;
const mk = (f: typeof fetch, apiKey: string | null = 'k') => openStatesAdapter({ apiKey: apiKey ?? undefined, fetch: f, now: () => NOW });

describe('openStatesAdapter (mocked)', () => {
  it('unavailable without key', async () => {
    const r = await mk(ok([]), null).fetchBills({ limit: 5 });
    expect(r.status).toBe('unavailable'); expect(r.items).toEqual([]);
  });
  it('unavailable on 500, network error, malformed JSON', async () => {
    for (const f of [
      vi.fn(async () => new Response('x', { status: 500 })),
      vi.fn(async () => { throw new Error('boom'); }),
      vi.fn(async () => new Response('{nope', { status: 200 })),
    ]) {
      const r = await mk(f as unknown as typeof fetch).fetchBills({ limit: 5 });
      expect(r.status).toBe('unavailable'); expect(r.items).toEqual([]);
    }
  });
  it('live with items, sourceUrl, clock', async () => {
    const r = await mk(ok([row('1'), row('2')])).fetchBills({ limit: 5 });
    expect(r.status).toBe('live'); expect(r.fetchedAt).toBe(NOW.toISOString());
    expect(r.items).toHaveLength(2);
    for (const i of r.items) { expect(i.sourceUrl).not.toBe(''); expect(i.jurisdictionCode).toBe('US-CA'); }
  });
  it('hash stable and sensitive to latest action', async () => {
    const h = async (a?: string) => (await mk(ok([row('1', a)])).fetchBills({ limit: 1 })).items[0].recordHash;
    expect(await h()).toBe(await h());
    expect(await h()).not.toBe(await h('Passed'));
  });
});
