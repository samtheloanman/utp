import { describe, expect, it, vi } from 'vitest';
import { getLegislature } from './legislature';

const NOW = new Date('2026-11-03T12:00:00.000Z');
const resp = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('getLegislature', () => {
  it('EU is not_integrated', async () => {
    const r = await getLegislature('eu', { now: () => NOW });
    expect(r.status).toBe('not_integrated');
    expect(r.items).toEqual([]);
    expect(r.country).toBe('EU');
  });
  it('US without key is unavailable', async () => {
    const r = await getLegislature('US', { apiKey: undefined, now: () => NOW });
    expect(r.status).toBe('unavailable');
    expect(r.bills).toEqual([]);
  });
  it('US live via injected fetch', async () => {
    const f = resp({ bills: [{ congress: 119, type: 'S', number: '5', title: 'T', updateDate: '2026-11-01', latestAction: { text: 'x' } }] });
    const r = await getLegislature('US', { apiKey: 'k', fetch: f, now: () => NOW });
    expect(r.status).toBe('live');
    expect(r.items[0].sourceUrl).toBe('https://www.congress.gov/bill/119th-congress/senate-bill/5');
  });
  it('UK upstream error is unavailable, not live', async () => {
    const r = await getLegislature('UK', { fetch: resp({}, 500), now: () => NOW });
    expect(r.status).toBe('unavailable');
  });
  it('UK success hashes items', async () => {
    const f = resp({ items: [{ billId: 1, shortTitle: 'A', currentHouse: 'Commons', lastUpdate: '2026-11-01' }] });
    const r = await getLegislature('UK', { fetch: f, now: () => NOW });
    expect(r.status).toBe('live');
    expect(r.items[0].recordHash).toMatch(/^[0-9a-f]{64}$/);
  });
});
